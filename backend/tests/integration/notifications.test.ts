import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startApp } from "../helpers/app.ts";
import type { TestApp, TestUser } from "../helpers/app.ts";

let t: TestApp, outbox: typeof import("../../services/outbox.ts"), notif: typeof import("../../services/notifications.ts"), seller: TestUser, a: TestUser, b: TestUser, admin: TestUser, tokens: Record<string, string>, categoryId: number;

before(async () => {
  t = await startApp({ BID_RATE_LIMIT_MAX: "100000" });
  outbox = await import("../../services/outbox.ts");
  notif = await import("../../services/notifications.ts");
  seller = await t.createUser("nseller", { role: "seller" });
  a = await t.createUser("nbuyerA");
  b = await t.createUser("nbuyerB");
  admin = await t.createUser("nadmin", { role: "admin" });
  tokens = { seller: await t.tokenFor(seller), a: await t.tokenFor(a), b: await t.tokenFor(b), admin: await t.tokenFor(admin) };
  [{ id: categoryId }] = await t.sql`INSERT INTO categories (name) VALUES ('nc') RETURNING category_id AS id`;
});
after(() => t.stop());

const dispatch = (opts = {}) => outbox.dispatch({ consumers: [notif.consumer], baseDelayMs: 0, ...opts });
const lot = async (title = "Brass sextant") => (await t.sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, end_time)
  VALUES (${seller.id}, ${categoryId}, ${title}, 'd', 1000, 1000, 100, now() + interval '1 hour') RETURNING auction_id AS id`)[0].id;
const bid = (id, who, amount) => t.call("POST", `/auction/${id}/bid`, { token: tokens[who], body: { amount: String(amount) } });
const inbox = (who) => t.call("GET", "/notifications", { token: tokens[who] });
const mails = (user) => t.mailSink.filter((m) => m.to === user.email);
const rows = (user, kind) => t.sql`SELECT * FROM notifications WHERE recipient_id = ${user.id} AND kind = ${kind} ORDER BY channel`;

test("outbid: the previous leader gets one in-app notification and one email; the new leader's maximum never appears", async () => {
  const id = await lot("Brass <sextant> & case");
  await bid(id, "a", 5000);
  await bid(id, "b", 98765);
  await dispatch();

  const got = await inbox("a");
  assert.equal(got.status, 200);
  const outbid = got.body.items.filter((n) => n.kind === "outbid");
  assert.equal(outbid.length, 1);
  assert.equal(outbid[0].link, `/auction/${id}`);
  assert.equal(outbid[0].read, false);
  assert.equal(got.body.unread, 1);
  const mail = mails(a).filter((m) => m.subject.includes("outbid"));
  assert.equal(mail.length, 1);
  assert.match(mail[0].html, /Brass &lt;sextant&gt; &amp; case/, "lot titles are escaped in email HTML");
  assert.ok(!mail[0].html.includes("98765") && !mail[0].html.includes("98.765") && !JSON.stringify(got.body).includes("98.765"), "no maximum anywhere");
  assert.equal((await inbox("b")).body.items.filter((n) => n.kind === "outbid").length, 0, "the new leader is not told they were outbid");
});

test("a redelivered event adds no rows; sequential redelivery sends no second email (concurrent redelivery may: at least once)", async () => {
  const id = await lot();
  await bid(id, "a", 2000);
  await bid(id, "b", 3000);
  const [event] = await t.sql`SELECT * FROM outbox_events WHERE aggregate_id = ${id} AND aggregate_version = 2`;
  const e = { eventId: event.event_id, aggregateType: "auction", aggregateId: id, aggregateVersion: 2, eventType: event.event_type, publicPayload: event.public_payload, privatePayload: event.private_payload };
  const before = mails(a).length;
  for (let i = 0; i < 3; i++) await notif.handle(e);
  assert.equal(mails(a).length - before, 1, "exactly one email for sequential redeliveries");
  await Promise.all([notif.handle(e), notif.handle(e), notif.handle(e)]);
  await dispatch(); // the real dispatcher seeing the same event adds nothing either
  const r = await t.sql`SELECT channel, status FROM notifications WHERE dedupe_key = ${`${e.eventId}:outbid`} ORDER BY channel`;
  assert.deepEqual(r.map((x) => [x.channel, x.status]), [["email", "sent"], ["in_app", "delivered"]]);
});

test("mail outage: the bid is committed, in-app is there, email is retried by the outbox and sent after recovery", async () => {
  const id = await lot();
  process.env.EMAIL_TRANSPORT = "local-fail";
  try {
    await bid(id, "a", 2000);
    assert.equal((await bid(id, "b", 3000)).status, 200, "delivery problems never affect the domain command");
    const r1 = await dispatch();
    assert.equal(r1.failed.length, 1);
    assert.match(r1.failed[0].message, /^notifications: email delivery failed/);
    const [email] = await t.sql`SELECT * FROM notifications WHERE recipient_id = ${a.id} AND channel = 'email' AND kind = 'outbid' AND link = ${`/auction/${id}`}`;
    assert.equal(email.status, "failed");
    assert.equal(email.attempts, 1);
    assert.match(email.last_error, /unavailable/);
    const adminView = await t.call("GET", "/notifications/admin/deliveries?status=failed", { token: tokens.admin });
    assert.ok(adminView.body.items.some((d) => d.id === email.id && d.recipient === "nbuyerA" && d.attempts === 1));
  } finally {
    process.env.EMAIL_TRANSPORT = "local";
  }
  // "restart": a later dispatcher pass picks the event up again
  const r2 = await dispatch();
  assert.equal(r2.failed.length, 0);
  const [sent] = await t.sql`SELECT * FROM notifications WHERE recipient_id = ${a.id} AND channel = 'email' AND kind = 'outbid' AND link = ${`/auction/${id}`}`;
  assert.equal(sent.status, "sent");
  assert.equal(sent.attempts, 2);
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM notifications WHERE recipient_id = ${a.id} AND channel = 'in_app' AND link = ${`/auction/${id}`}`)[0].n, 1);
});

test("privacy: only the recipient lists or reads a notification; admin-only delivery status", async () => {
  const [mine] = (await inbox("a")).body.items;
  assert.equal((await t.call("POST", `/notifications/${mine.id}/read`, { token: tokens.b })).status, 404, "someone else's id looks like a missing one");
  assert.ok((await inbox("b")).body.items.every((n) => n.id !== mine.id));
  assert.equal((await t.call("GET", "/notifications")).status, 401);
  assert.equal((await t.call("GET", "/notifications/admin/deliveries", { token: tokens.a })).status, 403);

  const read = await t.call("POST", `/notifications/${mine.id}/read`, { token: tokens.a });
  assert.equal(read.status, 200);
  assert.equal((await inbox("a")).body.items.find((n) => n.id === mine.id).read, true);
  await t.call("POST", "/notifications/read-all", { token: tokens.a });
  assert.equal((await t.call("GET", "/notifications/unread-count", { token: tokens.a })).body.unread, 0);
});

test("payment reminders: one per order per window, only the tightest window applies, delivered once", async () => {
  const mk = async (dueIn) => {
    const [{ id: auctionId }] = await t.sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, end_time, status, winner_id, settled_at)
      VALUES (${seller.id}, ${categoryId}, 'Reminder lot', 'd', 1000, 5000, 100, now() - interval '1 hour', 'ended', ${a.id}, now()) RETURNING auction_id AS id`;
    const [{ id }] = await t.sql`INSERT INTO orders (auction_id, buyer_id, seller_id, final_price, status, payment_due_at)
      VALUES (${auctionId}, ${a.id}, ${seller.id}, 5000, 'pending_payment', now() + ${dueIn}::interval) RETURNING order_id AS id`;
    return id;
  };
  const far = await mk("40 hours");
  const day = await mk("20 hours");
  const late = await mk("1 hour"); // created late: must not get the 24h reminder as well

  assert.equal((await notif.enqueuePaymentReminders()).queued, 2);
  assert.equal((await notif.enqueuePaymentReminders()).queued, 0, "re-running never duplicates");
  const keyed = async (orderId) => (await t.sql`SELECT aggregate_version FROM outbox_events WHERE aggregate_type = 'payment_reminder' AND aggregate_id = ${orderId} ORDER BY 1`).map((r) => r.aggregate_version);
  assert.deepEqual(await keyed(far), []);
  assert.deepEqual(await keyed(day), [24]);
  assert.deepEqual(await keyed(late), [2]);

  await t.sql`UPDATE orders SET payment_due_at = now() + interval '90 minutes' WHERE order_id = ${day}`;
  assert.equal((await notif.enqueuePaymentReminders()).queued, 1);
  assert.deepEqual(await keyed(day), [2, 24]);

  await dispatch();
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM notifications WHERE recipient_id = ${a.id} AND kind = 'payment_reminder' AND channel = 'in_app'`)[0].n, 3);
  assert.equal(mails(a).filter((m) => m.subject.startsWith("Payment due soon")).length, 3);
});

test("order lifecycle notifications reach the right party: won/sold, gateway payment, shipped", async () => {
  const id = await lot("Pocket chronometer");
  await bid(id, "a", 7000);
  await t.sql`UPDATE auctions SET end_time = now() - interval '1 second' WHERE auction_id = ${id}`;
  await (await import("../../services/settlement.ts")).settleDue();
  await dispatch();
  assert.equal((await rows(a, "auction_won")).length, 2);
  assert.equal((await rows(seller, "auction_sold")).length, 2);
  assert.match((await rows(a, "auction_won"))[1].body, /Pay before/);
  assert.equal((await rows(b, "auction_won")).length, 0);

  const [order] = await t.sql`SELECT order_id AS id FROM orders WHERE auction_id = ${id}`;
  const start = await t.call("POST", `/order/${order.id}/payment-attempts`, { token: tokens.a, body: { shippingAddress: "1 Main St", buyerPhone: "0123456789" } });
  await t.call("POST", `/payments/mock/${start.body.attempt.reference}/simulate`, { token: tokens.a, body: { outcome: "succeeded" } });
  await t.call("POST", `/order/${order.id}/shipping`, { token: tokens.seller, body: { trackingNumber: "VN-1" } });
  await dispatch();
  assert.equal((await rows(seller, "payment_received")).length, 2);
  assert.equal((await rows(a, "payment_confirmed")).length, 1, "in-app only for the buyer");
  assert.equal((await rows(a, "shipped")).length, 2);
  assert.equal((await rows(seller, "shipped")).length, 0);
  const proofLeak = await t.sql`SELECT count(*)::int AS n FROM notifications WHERE body LIKE '%/proofs/%'`;
  assert.equal(proofLeak[0].n, 0);
});
