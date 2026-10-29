import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { startApp } from "../helpers/app.js";

let t, seller, buyer, outsider, tokens, categoryId, mediaDir, media;
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 2)]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0x40, 0, 0, 0]), Buffer.from("WEBP"), Buffer.alloc(64, 3)]);

before(async () => {
  mediaDir = await fs.mkdtemp(path.join(os.tmpdir(), "auction-media-"));
  t = await startApp({ MEDIA_DIR: mediaDir });
  media = await import("../../services/media.js");
  seller = await t.createUser("seller", { role: "seller" });
  buyer = await t.createUser("buyer");
  outsider = await t.createUser("outsider");
  tokens = {};
  for (const [k, u] of Object.entries({ seller, buyer, outsider })) tokens[k] = await t.tokenFor(u);
  [{ id: categoryId }] = await t.sql`INSERT INTO categories (name) VALUES ('c') RETURNING category_id AS id`;
});
after(async () => { await t.stop(); await fs.rm(mediaDir, { recursive: true, force: true }); });

const makeOrder = async (status = "pending_payment") => {
  const [{ id: auctionId }] = await t.sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, end_time, status, winner_id, settled_at)
    VALUES (${seller.id}, ${categoryId}, 'lot', 'd', 1000, 5000, 100, now() - interval '1 hour', 'ended', ${buyer.id}, now()) RETURNING auction_id AS id`;
  const [{ id }] = await t.sql`INSERT INTO orders (auction_id, buyer_id, seller_id, final_price, status, payment_due_at) VALUES (${auctionId}, ${buyer.id}, ${seller.id}, 5000, ${status}, now() + interval '2 days') RETURNING order_id AS id`;
  return id;
};
const upload = async (orderId, who, purpose, buf, { name = "proof.png", type = "image/png" } = {}) => {
  const fd = new FormData();
  fd.append("file", new Blob([buf], { type }), name);
  const res = await fetch(`${t.base}/order/${orderId}/proofs?purpose=${purpose}`, { method: "POST", headers: who ? { Authorization: `Bearer ${tokens[who]}` } : {}, body: fd });
  let body;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body };
};
const files = async () => (await fs.readdir(mediaDir)).length;
const pay = (orderId, extra = {}) => t.call("POST", `/order/${orderId}/payment`, { token: tokens.buyer, body: { shippingAddress: "1 Main St, District 1", buyerPhone: "0123456789", ...extra } });

test("real multipart upload round-trips: private storage, protected read, correct headers", async () => {
  const order = await makeOrder();
  for (const [buf, mime] of [[PNG, "image/png"], [JPEG, "image/jpeg"], [WEBP, "image/webp"]]) {
    const r = await upload(order, "buyer", "payment", buf, { type: "application/octet-stream" });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.mime, mime, "type is decided by content, not by what the client declared");
    assert.equal(r.body.previewPath, `/order/${order}/proofs/${r.body.assetId}`);
    const got = await fetch(`${t.base}${r.body.previewPath}`, { headers: { Authorization: `Bearer ${tokens.seller}` } });
    assert.equal(got.status, 200);
    assert.equal(got.headers.get("content-type"), mime);
    assert.equal(got.headers.get("cache-control"), "private, no-store");
    assert.equal(got.headers.get("x-content-type-options"), "nosniff");
    assert.ok(Buffer.from(await got.arrayBuffer()).equals(buf));
  }
  const { assetId } = (await upload(order, "buyer", "payment", PNG)).body;
  assert.equal((await fetch(`${t.base}/order/${order}/proofs/${assetId}`)).status, 401);
  assert.equal((await fetch(`${t.base}/order/${order}/proofs/${assetId}`, { headers: { Authorization: `Bearer ${tokens.outsider}` } })).status, 403);
  assert.deepEqual((await fs.readdir(mediaDir)).filter((f) => !/^[0-9a-f-]{36}$/.test(f)), [], "file names are server generated UUIDs only");
});

test("content and size checks: SVG/HTML/GIF disguised as images, empty and oversize files are refused and leave nothing behind", async () => {
  const order = await makeOrder();
  const before = await files();
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  const html = Buffer.from("<html><script>alert(1)</script></html>");
  const gif = Buffer.concat([Buffer.from("GIF89a"), Buffer.alloc(32)]);
  for (const [buf, name, type] of [[svg, "p.png", "image/png"], [html, "p.jpg", "image/jpeg"], [gif, "p.gif", "image/gif"], [Buffer.alloc(0), "empty.png", "image/png"]]) {
    const r = await upload(order, "buyer", "payment", buf, { name, type });
    assert.ok([400, 415].includes(r.status), `${name}: ${r.status}`);
  }
  const big = await upload(order, "buyer", "payment", Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]));
  assert.equal(big.status, 413);
  assert.equal(big.body.code, "FILE_TOO_LARGE");
  assert.equal(await files(), before);
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM media_assets WHERE order_id = ${order}`)[0].n, 0);
  assert.equal((await upload(order, "buyer", "payment", PNG)).status, 201);
});

test("authorisation happens before the upload is read: outsider, wrong role, wrong purpose, wrong state, guest", async () => {
  const order = await makeOrder();
  const before = await files();
  assert.equal((await upload(order, null, "payment", PNG)).status, 401);
  assert.equal((await upload(order, "outsider", "payment", PNG)).status, 403);
  assert.equal((await upload(order, "seller", "payment", PNG)).status, 403, "seller cannot upload the buyer's payment proof");
  assert.equal((await upload(order, "buyer", "shipping", PNG)).status, 403, "buyer cannot upload shipping proof");
  assert.equal((await upload(order, "buyer", "bogus", PNG)).status, 400);
  assert.equal((await upload(order, "seller", "shipping", PNG)).status, 409, "nothing to ship yet");
  assert.equal((await upload(99999, "buyer", "payment", PNG)).status, 404);
  assert.equal(await files(), before, "refused requests never reached storage");
  await t.sql`UPDATE orders SET status = 'cancelled' WHERE order_id = ${order}`;
  assert.equal((await upload(order, "buyer", "payment", PNG)).status, 409);
});

test("payment proof must be an upload of the buyer for THIS order: client URLs, other orders and reuse are refused (IDOR)", async () => {
  const a = await makeOrder();
  const b = await makeOrder();
  const proofA = (await upload(a, "buyer", "payment", PNG)).body.assetId;
  const proofB = (await upload(b, "buyer", "payment", PNG)).body.assetId;
  assert.equal((await pay(a, { paymentProofUrl: "https://evil.example/x.png" })).status, 400, "arbitrary external URLs are no longer proofs");
  assert.equal((await pay(a, { paymentProofAssetId: proofB })).status, 400, "an asset of another order");
  assert.equal((await pay(a, { paymentProofAssetId: "00000000-0000-0000-0000-000000000000" })).status, 400);
  assert.equal((await t.sql`SELECT status FROM orders WHERE order_id = ${a}`)[0].status, "pending_payment");

  const ok = await pay(a, { paymentProofAssetId: proofA });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal(ok.body.order.paymentProofUrl, `/order/${a}/proofs/${proofA}`);
  assert.equal((await t.sql`SELECT state FROM media_assets WHERE id = ${proofA}`)[0].state, "attached");
  assert.equal((await pay(a, { paymentProofAssetId: proofA })).status, 409);
  assert.equal((await fetch(`${t.base}${ok.body.order.paymentProofUrl}`, { headers: { Authorization: `Bearer ${tokens.seller}` } })).status, 200);
});

test("retry after a failed submit: the same unused upload can be reused; a refused command does not consume it", async () => {
  const order = await makeOrder();
  const { assetId } = (await upload(order, "buyer", "payment", PNG)).body;
  const bad = await pay(order, { paymentProofAssetId: assetId, buyerPhone: "" });
  assert.equal(bad.status, 400);
  assert.equal((await t.sql`SELECT state FROM media_assets WHERE id = ${assetId}`)[0].state, "pending", "validation failure rolled the attach back");
  assert.equal((await pay(order, { paymentProofAssetId: assetId })).status, 200);
});

test("seller ships with a shipping-proof upload (tracking optional); a raw URL is not a proof", async () => {
  const order = await makeOrder("pending_confirmation");
  const shipAsset = (await upload(order, "seller", "shipping", JPEG)).body.assetId;
  const res = await t.call("POST", `/order/${order}/confirm`, { token: tokens.seller, body: { shippingProofAssetId: shipAsset } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.order.shippingProofUrl, `/order/${order}/proofs/${shipAsset}`);
  const o2 = await makeOrder("pending_confirmation");
  assert.equal((await t.call("POST", `/order/${o2}/confirm`, { token: tokens.seller, body: { shippingProofUrl: "https://evil.example/x" } })).status, 400);
});

test("per-order upload cap and abandoned-upload cleanup", async () => {
  const order = await makeOrder();
  const results = [];
  for (let i = 0; i < 7; i++) results.push((await upload(order, "buyer", "payment", PNG)).status);
  assert.deepEqual(results, [201, 201, 201, 201, 201, 429, 429]);
  const before = await files();
  await t.sql`UPDATE media_assets SET created_at = now() - interval '2 hours' WHERE order_id = ${order}`;
  const cleaned = await media.cleanupPending();
  assert.equal(cleaned.removed, 5);
  assert.equal(await files(), before - 5);
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM media_assets WHERE order_id = ${order}`)[0].n, 0);
});

test("messages: images are private uploads, GETs never write, mark-read is explicit and only touches the other party's messages", async () => {
  const order = await makeOrder();
  const img = (await upload(order, "buyer", "message", PNG)).body.assetId;
  const sent = await t.call("POST", `/order/${order}/messages`, { token: tokens.buyer, body: { message: "photo attached", imageAssetId: img, imageUrl: "https://evil.example/pixel.gif" } });
  assert.equal(sent.status, 201, JSON.stringify(sent.body));
  assert.equal(sent.body.data.imageUrl, `/order/${order}/proofs/${img}`, "client supplied URL is ignored");
  await t.call("POST", `/order/${order}/messages`, { token: tokens.seller, body: { message: "got it" } });

  const unread = () => t.sql`SELECT sender_id, is_read FROM order_messages WHERE order_id = ${order} ORDER BY message_id`;
  await t.call("GET", `/order/${order}/messages`, { token: tokens.seller });
  await t.call("GET", `/order/${order}`, { token: tokens.seller });
  assert.deepEqual((await unread()).map((m) => m.is_read), [false, false], "reading changes nothing");

  assert.equal((await t.call("POST", `/order/${order}/messages/read`, { token: tokens.outsider, body: {} })).status, 403);
  assert.equal((await t.call("POST", `/order/${order}/messages/read`, { token: tokens.seller, body: {} })).status, 200);
  assert.deepEqual((await unread()).map((m) => [m.sender_id === buyer.id, m.is_read]), [[true, true], [false, false]], "seller read the buyer's message only");
  await t.call("POST", `/order/${order}/messages/read`, { token: tokens.buyer, body: {} });
  assert.deepEqual((await unread()).map((m) => m.is_read), [true, true]);
});
