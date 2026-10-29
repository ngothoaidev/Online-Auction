import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startApp } from "../helpers/app.js";

let t, seller, a, b, tokens, parentId, childId, lotChild, lotParent;

before(async () => {
  t = await startApp();
  seller = await t.createUser("seller", { role: "seller" });
  a = await t.createUser("alice");
  b = await t.createUser("bob");
  tokens = { a: await t.tokenFor(a), b: await t.tokenFor(b), seller: await t.tokenFor(seller) };
  [{ id: parentId }] = await t.sql`INSERT INTO categories (name) VALUES ('Watches') RETURNING category_id AS id`;
  [{ id: childId }] = await t.sql`INSERT INTO categories (name, parent_id) VALUES ('Vintage Watches', ${parentId}) RETURNING category_id AS id`;
  const mk = async (cat, title) => (await t.sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, end_time)
    VALUES (${seller.id}, ${cat}, ${title}, 'd', 1000, 1000, 100, now() + interval '1 day') RETURNING auction_id AS id`)[0].id;
  lotChild = await mk(childId, "Child lot");
  lotParent = await mk(parentId, "Parent lot");
});
after(() => t.stop());

const put = (id, favorited, who = "a") => t.call("PUT", `/users/favorites/${id}`, { token: tokens[who], body: { favorited } });
const ids = async (who = "a") => (await t.call("GET", "/users/favorites", { token: tokens[who] })).body.auctionIds.sort();

test("favourites are a desired-state PUT: replays, double clicks and races converge; lists are per user", async () => {
  assert.equal((await put(lotChild, true)).status, 200);
  assert.equal((await put(lotChild, true)).status, 200, "replay is harmless");
  assert.deepEqual(await ids(), [lotChild]);
  assert.deepEqual(await ids("b"), [], "another user sees nothing");
  const burst = await Promise.all(Array.from({ length: 20 }, (_, i) => put(lotParent, i % 2 === 0)));
  assert.ok(burst.every((r) => r.status === 200));
  const final = await put(lotParent, true);
  assert.equal(final.body.favorited, true);
  assert.deepEqual(await ids(), [lotChild, lotParent].sort());
  assert.equal((await put(lotChild, false)).body.favorited, false);
  assert.deepEqual(await ids(), [lotParent]);
});

test("favourites: guest 401, unknown lot 404, body validated", async () => {
  assert.equal((await t.call("PUT", `/users/favorites/${lotChild}`, { body: { favorited: true } })).status, 401);
  assert.equal((await put(999999, true)).status, 404);
  assert.equal((await t.call("PUT", `/users/favorites/${lotChild}`, { token: tokens.a, body: { favorited: "yes" } })).status, 400);
  assert.equal((await t.call("PUT", "/users/favorites/abc", { token: tokens.a, body: { favorited: true } })).status, 400);
});

test("search with a token hydrates isFavorited; without one it is false", async () => {
  const withToken = (await t.call("GET", "/search", { token: tokens.a })).body.data;
  assert.equal(withToken.find((x) => x.id === lotParent).isFavorited, true);
  assert.equal(withToken.find((x) => x.id === lotChild).isFavorited, false);
  const guest = (await t.call("GET", "/search")).body.data;
  assert.ok(guest.every((x) => x.isFavorited === false));
});

test("a parent category also returns lots filed under its children; a child returns only its own", async () => {
  const parent = (await t.call("GET", "/search?category=Watches")).body.data.map((x) => x.id).sort();
  assert.deepEqual(parent, [lotChild, lotParent].sort());
  const child = (await t.call("GET", "/search?category=Vintage%20Watches")).body.data.map((x) => x.id);
  assert.deepEqual(child, [lotChild]);
});

test("a seller with no reviews has rating null (not 100%); with reviews it is the real percentage", async () => {
  let card = (await t.call("GET", "/auction/top")).body[0];
  assert.equal(card.seller.rating, null);
  assert.equal(card.seller.ratingCount, 0);
  assert.equal((await t.call("GET", `/auction/${lotParent}`)).body.seller.rating, null);
  const profile = async () => (await t.call("GET", `/users/profile?username=${seller.username}`)).body.rating;
  assert.equal((await profile()).percentage, null, "the public profile too");
  await t.sql`UPDATE users SET rating_count = 4, positive_rating_count = 3 WHERE user_id = ${seller.id}`;
  card = (await t.call("GET", "/auction/top")).body[0];
  assert.equal(card.seller.rating, 75);
  assert.equal((await t.call("GET", `/auction/${lotParent}`)).body.seller.rating, 75);
  assert.deepEqual(await profile(), { positive: 3, negative: 1, percentage: 75 });
});

test("a lot with no bids has no top bid object (the card must not invent a price)", async () => {
  const card = (await t.call("GET", "/auction/top")).body[0];
  assert.equal(card.bids, undefined);
  assert.equal(card.currentPrice, "1000");
});

test("profile 'Won' counts only closed, settled lots (never a current leader) and equals the Wins tab; no reviews is a null rate", async () => {
  const lot = async (status, settled) => (await t.sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, end_time, status, winner_id, settled_at)
    VALUES (${seller.id}, ${parentId}, ${"won? " + status}, 'd', 1000, 1000, 100, now() + interval '1 day', ${status}, ${b.id}, ${settled ? t.sql`now()` : null}) RETURNING auction_id AS id`)[0].id;
  await lot("active", false); // b is only leading
  await lot("ended", false); // closed, settlement still pending
  const won = [await lot("ended", true), await lot("sold", true)];

  const profile = (await t.call("GET", `/users/profile?username=${b.username}`)).body;
  assert.equal(profile.counts.totalWonAuctions, 2);
  assert.equal(profile.counts.reviewsReceived.positiveRate, null);
  const tab = await t.call("GET", `/auction/profile?username=${b.username}&status=won-auctions`);
  assert.equal(tab.status, 200);
  assert.deepEqual(tab.body.map((x) => x.id).sort(), won.sort());
});
