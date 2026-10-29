import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startApp } from "../helpers/app.js";
import { connect, wipeDatabase, applyMigrations } from "../helpers/db.js";
import { planReviewRepair, applyReviewRepair, recomputeRatings } from "../../services/reviewRepair.ts";

let t, seller, buyer, outsider, tokens, categoryId;

before(async () => {
  t = await startApp();
  seller = await t.createUser("seller", { role: "seller" });
  buyer = await t.createUser("buyer");
  outsider = await t.createUser("outsider");
  tokens = {};
  for (const [k, u] of Object.entries({ seller, buyer, outsider })) tokens[k] = await t.tokenFor(u);
  [{ id: categoryId }] = await t.sql`INSERT INTO categories (name) VALUES ('c') RETURNING category_id AS id`;
});
after(() => t.stop());

const makeOrder = async (status = "pending_review") => {
  const [{ id: auctionId }] = await t.sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, end_time, status, winner_id, settled_at)
    VALUES (${seller.id}, ${categoryId}, 'lot', 'd', 1000, 5000, 100, now() - interval '1 hour', 'sold', ${buyer.id}, now()) RETURNING auction_id AS id`;
  const [{ id }] = await t.sql`INSERT INTO orders (auction_id, buyer_id, seller_id, final_price, status, payment_due_at) VALUES (${auctionId}, ${buyer.id}, ${seller.id}, 5000, ${status}, now() + interval '2 days') RETURNING order_id AS id`;
  return { id, auctionId };
};
const review = (id, who, isGoodRating, comment = "ok", extra = {}) => t.call("POST", `/order/${id}/review`, { token: tokens[who], body: { isGoodRating, comment, ...extra } });
const counters = async (u) => (await t.sql`SELECT rating_count AS total, positive_rating_count AS pos FROM users WHERE user_id = ${u.id}`)[0];
const reset = () => t.sql`UPDATE users SET rating_count = 0, positive_rating_count = 0`;
const rows = (auctionId) => t.sql`SELECT reviewer_id, target_user_id, is_good_rating FROM reviews WHERE auction_id = ${auctionId} ORDER BY reviewer_id`;

test("reviews open only after the buyer confirmed receipt; cancelled/expired/unfinished orders refuse them", async () => {
  await reset();
  for (const status of ["pending_payment", "pending_confirmation", "pending_delivery", "pending_receipt", "cancelled", "payment_expired"]) {
    const { id, auctionId } = await makeOrder(status);
    const r = await review(id, "buyer", true);
    assert.equal(r.status, 409, status);
    assert.equal(r.body.code, "REVIEW_NOT_ALLOWED");
    assert.equal((await rows(auctionId)).length, 0);
  }
  assert.deepEqual([await counters(seller), await counters(buyer)], [{ total: 0, pos: 0 }, { total: 0, pos: 0 }]);
});

test("only participants review, the target is always the counterpart, and input is strict", async () => {
  await reset();
  const { id, auctionId } = await makeOrder();
  assert.equal((await review(id, "outsider", true)).status, 403);
  assert.equal((await review(id, "buyer", "true")).status, 400);
  assert.equal((await review(id, "buyer", 1)).status, 400);
  assert.equal((await review(id, "buyer", true, "great", { targetId: buyer.id, reviewerId: seller.id })).status, 200, "client-chosen target/reviewer fields are ignored");
  assert.equal((await review(id, "seller", false, "late payment")).status, 200);
  assert.deepEqual((await rows(auctionId)).map((r) => [r.reviewer_id, r.target_user_id, r.is_good_rating]), [[seller.id, buyer.id, false], [buyer.id, seller.id, true]]);
  assert.deepEqual([await counters(seller), await counters(buyer)], [{ total: 1, pos: 1 }, { total: 1, pos: 0 }]);
});

test("both reviews complete the order exactly once, even when submitted at the same instant (20 rounds)", async () => {
  for (let round = 0; round < 20; round++) {
    await reset();
    const { id, auctionId } = await makeOrder();
    const [a, b] = await Promise.all([review(id, "buyer", true), review(id, "seller", round % 2 === 0)]);
    assert.deepEqual([a.status, b.status], [200, 200], `round ${round}`);
    assert.equal((await t.sql`SELECT status FROM orders WHERE order_id = ${id}`)[0].status, "completed");
    assert.equal((await t.sql`SELECT count(*)::int AS n FROM order_transitions WHERE order_id = ${id} AND command = 'complete'`)[0].n, 1, `round ${round}`);
    assert.equal((await rows(auctionId)).length, 2);
    assert.deepEqual(await counters(seller), { total: 1, pos: 1 });
    assert.deepEqual(await counters(buyer), { total: 1, pos: round % 2 === 0 ? 1 : 0 });
  }
});

test("replay and parallel duplicates of the same review change the counters once", async () => {
  await reset();
  const { id, auctionId } = await makeOrder();
  const results = await Promise.all(Array.from({ length: 10 }, () => review(id, "buyer", true, "same")));
  assert.ok(results.every((r) => r.status === 200));
  assert.equal(results.filter((r) => r.body.message === "Review submitted").length, 1);
  assert.equal((await rows(auctionId)).length, 1);
  assert.deepEqual(await counters(seller), { total: 1, pos: 1 });

  const key = (n) => fetch(`${t.base}/order/${id}/review`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokens.seller}`, "Idempotency-Key": "review-key-001" }, body: JSON.stringify({ isGoodRating: false, comment: "x" }) }).then((r) => r.status + (n ? "" : ""));
  assert.deepEqual(await Promise.all([key(1), key(2), key(3)]), ["200", "200", "200"]);
  assert.deepEqual(await counters(buyer), { total: 1, pos: 0 });
});

test("editing: good -> bad -> good keeps positive/total exact, also on top of existing history, and on completed orders", async () => {
  await reset();
  await t.sql`UPDATE users SET rating_count = 5, positive_rating_count = 4 WHERE user_id = ${seller.id}`;
  const { id, auctionId } = await makeOrder();
  await review(id, "buyer", true);
  assert.deepEqual(await counters(seller), { total: 6, pos: 5 });
  await review(id, "buyer", false, "changed my mind");
  assert.deepEqual(await counters(seller), { total: 6, pos: 4 });
  await review(id, "buyer", false, "still bad");
  assert.deepEqual(await counters(seller), { total: 6, pos: 4 }, "same value again is a no-op for the counters");
  await review(id, "buyer", true, "resolved");
  assert.deepEqual(await counters(seller), { total: 6, pos: 5 });

  await review(id, "seller", true);
  assert.equal((await t.sql`SELECT status FROM orders WHERE order_id = ${id}`)[0].status, "completed");
  const edit = await review(id, "seller", false, "edited after completion");
  assert.equal(edit.status, 200);
  assert.equal(edit.body.review.isGoodRating, false);
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM order_transitions WHERE order_id = ${id}`)[0].n, 1, "no second transition");
  assert.deepEqual(await counters(buyer), { total: 1, pos: 0 });
  assert.equal((await rows(auctionId)).length, 2);
});

test("counters always equal what the review rows say (randomised edit sequence across many orders)", async () => {
  await reset();
  await t.sql`DELETE FROM reviews`;
  const orders = [];
  for (let i = 0; i < 6; i++) orders.push(await makeOrder());
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const jobs = [];
  for (let n = 0; n < 60; n++) jobs.push(review(orders[Math.floor(rnd() * orders.length)].id, rnd() < 0.5 ? "buyer" : "seller", rnd() < 0.5));
  const res = await Promise.all(jobs);
  assert.ok(res.every((r) => r.status === 200));
  for (const u of [seller, buyer]) {
    const [fromRows] = await t.sql`SELECT count(*)::int AS total, count(*) FILTER (WHERE is_good_rating)::int AS pos FROM reviews WHERE target_user_id = ${u.id}`;
    assert.deepEqual(await counters(u), fromRows);
  }
  await t.sql`UPDATE users SET rating_count = 99 WHERE user_id = ${seller.id}`;
  await recomputeRatings(t.sql, [seller.id]);
  const [fromRows] = await t.sql`SELECT count(*)::int AS total FROM reviews WHERE target_user_id = ${seller.id}`;
  assert.equal((await counters(seller)).total, fromRows.total, "the repair helper restores exact counters");
});

test("GET /reviews: an empty set is 200 with null percentage; rows carry the camelCase fields the pages read", async () => {
  const empty = await t.call("GET", `/reviews?targetId=${outsider.id}`);
  assert.equal(empty.status, 200);
  assert.deepEqual(empty.body.data.stats, { totalReviews: 0, positiveReviews: 0, negativeReviews: 0, positivePercentage: null });
  assert.equal(empty.body.data.pagination.total, 0);
  assert.equal((await t.call("GET", `/reviews/stats?reviewerId=${outsider.id}`)).status, 200);

  await reset();
  await t.sql`DELETE FROM reviews`;
  const { id } = await makeOrder();
  await review(id, "buyer", true, "fine");
  const r = await t.call("GET", `/reviews?targetId=${seller.id}`);
  assert.equal(r.status, 200);
  const [row] = r.body.data.reviews;
  assert.equal(row.reviewerUsername, buyer.username);
  assert.equal(row.auctionTitle, "lot");
  assert.ok(!Number.isNaN(Date.parse(row.createdAt)));
  assert.equal(Number(r.body.data.stats.positivePercentage), 100);
});

test("database constraints back the rules: one review per reviewer per auction, no self reviews, real users/auctions only", async () => {
  const { auctionId } = await makeOrder();
  await t.sql`INSERT INTO reviews (reviewer_id, target_user_id, auction_id, is_good_rating) VALUES (${buyer.id}, ${seller.id}, ${auctionId}, true)`;
  await assert.rejects(t.sql`INSERT INTO reviews (reviewer_id, target_user_id, auction_id, is_good_rating) VALUES (${buyer.id}, ${seller.id}, ${auctionId}, false)`, /reviews_auction_reviewer_uniq/);
  await assert.rejects(t.sql`INSERT INTO reviews (reviewer_id, target_user_id, auction_id, is_good_rating) VALUES (${buyer.id}, ${buyer.id}, ${auctionId + 999}, true)`, /reviews_no_self_chk|violates/);
  await assert.rejects(t.sql`INSERT INTO reviews (reviewer_id, target_user_id, auction_id, is_good_rating) VALUES (99999, ${seller.id}, ${auctionId}, true)`, /violates foreign key/);
  await assert.rejects(t.sql`INSERT INTO reviews (reviewer_id, target_user_id, auction_id, is_good_rating) VALUES (${seller.id}, ${buyer.id}, NULL, true)`, /null value/);
});

test("legacy data: migration 0005 refuses duplicates, the repair archives instead of deleting, flags cancellation reviews, then migration succeeds", async () => {
  const sql = connect();
  try {
    await wipeDatabase(sql);
    await applyMigrations(sql, { upTo: 4 }); // schema before the review constraints
    await sql`INSERT INTO users (username, email, encrypted_password, rating_count, positive_rating_count) VALUES ('s','s@e.t','x',3,1),('b','b@e.t','x',3,1),('c','c@e.t','x',0,0)`;
    await sql`INSERT INTO categories (name) VALUES ('c')`;
    await sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, end_time, status, winner_id) VALUES (1,1,'a','d',1000,1000,100,now(),'ended',2),(1,1,'b','d',1000,1000,100,now(),'ended',2)`;
    await sql`INSERT INTO orders (auction_id, buyer_id, seller_id, final_price, status, cancelled_by, cancel_reason) VALUES (2,2,1,1000,'cancelled',1,'no payment')`;
    await sql`INSERT INTO reviews (reviewer_id, target_user_id, auction_id, is_good_rating, comment, created_at) VALUES
      (2,1,1,true,'first','2026-01-01'),(2,1,1,false,'second (duplicate)','2026-01-02'),
      (1,2,2,false,'no payment','2026-01-03'),
      (NULL,1,1,true,'null reviewer',now()),(3,3,1,true,'self',now()),(3,1,777,true,'orphan auction',now())`;

    await assert.rejects(applyMigrations(sql, { from: 5 }), /duplicate|NULL|orphan|self/);
    assert.equal((await sql`SELECT count(*)::int AS n FROM reviews`)[0].n, 6, "failed migration changed nothing");

    const plan = await planReviewRepair(sql);
    assert.equal(plan.duplicateGroups.length, 1);
    assert.equal(plan.invalid.length, 3);
    assert.equal(plan.cancellationLikeFlagged, 1);
    const applied = await applyReviewRepair(sql, plan);
    assert.equal(applied.archived, 4);
    assert.equal((await sql`SELECT count(*)::int AS n FROM reviews_legacy_archive`)[0].n, 4, "nothing is lost");
    assert.deepEqual((await sql`SELECT comment FROM reviews ORDER BY review_id`).map((r) => r.comment), ["second (duplicate)", "no payment"], "the latest review of a duplicate pair survives");
    const [seller1] = await sql`SELECT rating_count, positive_rating_count FROM users WHERE user_id = 1`;
    assert.deepEqual([seller1.rating_count, seller1.positive_rating_count], [1, 0], "counters recomputed from the surviving rows");

    await applyMigrations(sql, { from: 5 });
    assert.deepEqual((await sql`SELECT comment, source FROM reviews ORDER BY review_id`).map((r) => [r.comment, r.source]), [["second (duplicate)", "participant"], ["no payment", "legacy_cancellation"]]);
  } finally {
    await sql.end();
  }
});
