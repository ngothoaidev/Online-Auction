import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startApp } from "../helpers/app.js";

let t, seller, bidderA, bidderB, auctionId, token;

const FORBIDDEN_KEYS = ["maxAmount", "max_amount", "encryptedPassword", "encrypted_password", "otp", "googleId", "facebookId", "authVersion", "auth_version"];

function leaks(value, path = "$") {
  const found = [];
  if (Array.isArray(value)) value.forEach((v, i) => found.push(...leaks(v, `${path}[${i}]`)));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.includes(k)) found.push(`${path}.${k}`);
      found.push(...leaks(v, `${path}.${k}`));
    }
  }
  return found;
}

before(async () => {
  t = await startApp();
  seller = await t.createUser("seller1", { role: "seller" });
  bidderA = await t.createUser("bidder_a");
  bidderB = await t.createUser("bidder_b");
  await t.sql`UPDATE users SET otp='123456', google_id='g-secret', facebook_id='f-secret' WHERE user_id IN (${bidderA.id}, ${bidderB.id})`;
  const [{ id: categoryId }] = await t.sql`INSERT INTO categories (name) VALUES ('Watches') RETURNING category_id AS id`;
  [{ id: auctionId }] = await t.sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, buy_now_price, end_time, bid_count, winner_id)
    VALUES (${seller.id}, ${categoryId}, 'Vintage watch', '<p>fine</p><script>alert(1)</script><img src=x onerror=alert(2)>', 1000000, 1200000, 100000, 9000000, now() + interval '2 days', 2, ${bidderB.id})
    RETURNING auction_id AS id`;
  await t.sql`INSERT INTO auction_images (auction_id, image_url, is_primary) VALUES (${auctionId}, 'https://img.example/1.jpg', true)`;
  await t.sql`INSERT INTO bids (auction_id, bidder_id, amount, max_amount) VALUES (${auctionId}, ${bidderA.id}, 1100000, 5000000), (${auctionId}, ${bidderB.id}, 1200000, 6000000)`;
  await t.sql`INSERT INTO description_logs (auction_id, content_snapshot) VALUES (${auctionId}, '<p onclick="x()">old</p><script>bad()</script>')`;
  token = await t.login(bidderA);
});
after(() => t.stop());

test("no public/auth'd JSON exposes private bidder fields, password hashes, OTPs or emails", async () => {
  const urls = [
    "/auction/top", "/auction/top?sortBy=mostBids", `/auction/profile?username=${bidderA.username}&status=active-bids`,
    `/auction/profile?username=${seller.username}&status=my-listings`, `/auction/images/${auctionId}`, `/auction/bids/${auctionId}`,
    `/auction/description/${auctionId}`, `/auction/comments/${auctionId}`, `/auction/${auctionId}`, "/search?q=watch", "/search",
    `/users/profile?username=${bidderA.username}`, "/categories",
  ];
  for (const withToken of [undefined, token]) {
    for (const url of urls) {
      const r = await t.call("GET", url, { token: withToken });
      assert.equal(r.status, 200, `${url} -> ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
      assert.deepEqual(leaks(r.body), [], `${url} leaks`);
      const ownProfile = withToken && url === `/users/profile?username=${bidderA.username}`; // owners may see their own email
      if (!ownProfile) assert.ok(!JSON.stringify(r.body).includes("@example.test"), `${url} exposes an email`);
    }
  }
});

test("catalog and history still carry what the UI needs (amount, bidder username, seller rating, image)", async () => {
  const top = (await t.call("GET", "/auction/top")).body;
  assert.equal(top[0].bids.amount, "1200000");
  assert.equal(top[0].bids.bidder.username, "bidder_b");
  assert.equal(top[0].seller.username, "seller1");
  assert.equal(top[0].image, "https://img.example/1.jpg");
  const history = (await t.call("GET", `/auction/bids/${auctionId}`)).body;
  assert.equal(history.length, 2);
  assert.ok(history.every((b) => b.amount && b.bidTime && b.bidder.username));
});

test("own email is shown to the owner on the profile endpoint, never to others", async () => {
  const own = await t.call("GET", `/users/profile?username=${bidderA.username}`, { token });
  assert.equal(own.body.email, bidderA.email);
  const other = await t.call("GET", `/users/profile?username=${bidderB.username}`, { token });
  assert.equal(other.body.email, undefined);
});

test("rich text is sanitized on read, including legacy dirty rows and description history", async () => {
  const detail = (await t.call("GET", `/auction/${auctionId}`)).body;
  assert.doesNotMatch(detail.description, /<script|onerror/i);
  assert.match(detail.description, /<p>fine<\/p>/);
  const d = (await t.call("GET", `/auction/description/${auctionId}`)).body;
  assert.doesNotMatch(JSON.stringify(d), /<script|onclick|onerror/i);
});

test("description writes are sanitized before storage", async () => {
  const sellerToken = await t.login(seller);
  const r = await t.call("PUT", `/auction/${auctionId}/description`, { token: sellerToken, body: { description: '<p>hello</p><script>x()</script><a href="javascript:alert(1)">l</a>' } });
  assert.equal(r.status, 200);
  const [{ description }] = await t.sql`SELECT description FROM auctions WHERE auction_id=${auctionId}`;
  assert.doesNotMatch(description, /<script|javascript:/i);
  assert.match(description, /hello/);
});

test("seller mass assignment is rejected and nothing changes; allowlisted fields still work", async () => {
  const sellerToken = await t.login(seller);
  const before = await t.sql`SELECT winner_id, current_price, seller_id, status, bid_count FROM auctions WHERE auction_id=${auctionId}`;
  for (const body of [{ winnerId: seller.id }, { currentPrice: 1 }, { sellerId: bidderA.id }, { status: "sold" }, { bidCount: 0 }, { title: "ok", winnerId: seller.id }]) {
    const r = await t.call("PUT", `/auction/${auctionId}`, { token: sellerToken, body });
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.equal(r.body.code, "VALIDATION_ERROR");
  }
  assert.deepEqual(await t.sql`SELECT winner_id, current_price, seller_id, status, bid_count FROM auctions WHERE auction_id=${auctionId}`, before);
  const ok = await t.call("PUT", `/auction/${auctionId}`, { token: sellerToken, body: { title: "Renamed lot" } });
  assert.equal(ok.status, 200);
  assert.equal((await t.call("GET", `/auction/${auctionId}`)).body.title, "Renamed lot");
  const stranger = await t.call("PUT", `/auction/${auctionId}`, { token, body: { title: "x" } });
  assert.equal(stranger.status, 403);
});

test("input validation: bad ids, queries and bid amounts get a 400 envelope, not a 500", async () => {
  for (const url of ["/auction/abc", "/auction/-1", "/auction/0", "/auction/bids/1e9x", "/search?minPrice=abc", "/search?sortBy=drop", "/search?page=99999999", "/auction/top?status=weird", "/auction/profile?username=a&status=nope", "/auction/bids/1?f=hax"]) {
    const r = await t.call("GET", url);
    assert.equal(r.status, 400, url);
    assert.equal(r.body.code, "VALIDATION_ERROR", url);
  }
  for (const amount of [0, -5, "abc", "1.5", 1.5, "1".repeat(16), null, "", "1e3"]) {
    const r = await t.call("POST", `/auction/${auctionId}/bid`, { token, body: { amount } });
    assert.equal(r.status, 400, `amount=${JSON.stringify(amount)} -> ${r.status}`);
  }
});

test("error envelope: JSON for unknown routes and malformed bodies, request id echoed, headers hardened", async () => {
  const res = await fetch(`${t.base}/nope`);
  const body = await res.json();
  assert.equal(res.status, 404);
  assert.equal(body.code, "NOT_FOUND");
  assert.equal(body.requestId, res.headers.get("x-request-id"));
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  const bad = await fetch(`${t.base}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{not json" });
  assert.equal(bad.status, 400);
  assert.equal((await bad.json()).code, "BAD_REQUEST");
});

test("comments: a verified user can post and the response exposes only public user fields", async () => {
  const r = await t.call("POST", `/auction/${auctionId}/comments`, { token, body: { content: "Nice piece" } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.content, "Nice piece");
  assert.deepEqual(leaks(r.body), []);
  assert.equal((await t.call("POST", `/auction/${auctionId}/comments`, { token, body: { content: "   " } })).status, 400);
});

test("profile update responses never include credentials", async () => {
  const r = await t.call("PUT", "/users/info", { token, body: { fullName: "New Name", bio: "hi" } });
  assert.equal(r.status, 200);
  assert.deepEqual(leaks(r.body), []);
  assert.equal(r.body.user.fullName, "New Name");
});

test("business-rule failures keep their message and get a meaningful status (not a masked 500)", async () => {
  const missing = await t.call("POST", "/auction/99999/bid", { token, body: { amount: 2000000 } });
  assert.equal(missing.status, 404);
  assert.equal(missing.body.message, "Auction not found");
  const own = await t.call("POST", `/auction/${auctionId}/bid`, { token: await t.login(seller), body: { amount: 2000000 } });
  assert.equal(own.status, 400);
  assert.equal(own.body.code, "OWN_LISTING");
});
