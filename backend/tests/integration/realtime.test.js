import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import { startApp } from "../helpers/app.js";

let t, realtime, seller, categoryId, bidders, tokens;
const streams = new Set();

before(async () => {
  t = await startApp({ BID_RATE_LIMIT_MAX: "100000", SSE_POLL_MS: "200", SSE_HEARTBEAT_MS: "300", SSE_REPLAY_LIMIT: "5", SSE_MAX_PER_IP: "6" });
  realtime = await import("../../services/realtime.ts");
  seller = await t.createUser("rseller", { role: "seller" });
  [{ id: categoryId }] = await t.sql`INSERT INTO categories (name) VALUES ('rc') RETURNING category_id AS id`;
  bidders = []; tokens = [];
  for (let i = 0; i < 3; i++) { const u = await t.createUser(`rb${i}`); bidders.push(u); tokens.push(await t.tokenFor(u)); }
});
after(async () => { for (const s of streams) s.close(); await sleep(50); await t.stop(); });

const newAuction = async () => (await t.sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, end_time)
  VALUES (${seller.id}, ${categoryId}, 'lot', 'd', 1000, 1000, 100, now() + interval '1 hour') RETURNING auction_id AS id`)[0].id;
const bid = (a, i, amount) => t.call("POST", `/auction/${a}/bid`, { token: tokens[i], body: { amount: String(amount) } });

/** Minimal SSE client over fetch: collects parsed blocks ({ id, event, data, comment }). */
async function subscribe(path, headers = {}) {
  const ac = new AbortController();
  const res = await fetch(t.base + path, { headers, signal: ac.signal });
  const blocks = [];
  const stream = { res, blocks, close: () => { ac.abort(); streams.delete(stream); } };
  streams.add(stream);
  if (res.headers.get("content-type")?.startsWith("text/event-stream")) {
    (async () => {
      const dec = new TextDecoder();
      let buf = "";
      try {
        for await (const chunk of res.body) {
          buf += dec.decode(chunk, { stream: true });
          let i;
          while ((i = buf.indexOf("\n\n")) >= 0) {
            const b = { at: Date.now() };
            for (const line of buf.slice(0, i).split("\n")) {
              if (line.startsWith(":")) b.comment = line.slice(1).trim();
              else { const [k, ...v] = line.split(": "); b[k] = v.join(": "); }
            }
            if (b.data) b.data = JSON.parse(b.data);
            blocks.push(b);
            buf = buf.slice(i + 2);
          }
        }
      } catch { /* aborted */ }
    })();
  }
  stream.waitFor = async (pred, ms = 5000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) { const hit = blocks.find(pred); if (hit) return hit; await sleep(10); }
    throw new Error(`no matching SSE block; got ${JSON.stringify(blocks)}`);
  };
  return stream;
}
const events = (s) => s.blocks.filter((b) => b.data && !b.event);

test("a bid reaches every subscriber as a public event with id auctionId:version; private data never leaves", async () => {
  const a = await newAuction();
  const [s1, s2] = [await subscribe(`/auction/${a}/events?since=0`), await subscribe(`/auction/${a}/events?since=0`)];
  assert.equal(s1.res.status, 200);
  assert.match(s1.res.headers.get("cache-control"), /no-cache/);
  assert.equal((await bid(a, 0, 7000)).status, 200);
  assert.equal((await bid(a, 1, 9000)).status, 200);

  for (const s of [s1, s2]) {
    const e = await s.waitFor((b) => b.data?.version === 2);
    assert.equal(e.id, `${a}:2`);
    assert.equal(e.data.type, "auction.bid_placed");
    assert.equal(e.data.currentPrice, "7100");
    assert.deepEqual(Object.keys(e.data).sort(), ["auctionId", "bidCount", "currentPrice", "endTime", "serverTime", "status", "type", "version"]);
    assert.ok(!JSON.stringify(s.blocks).includes("9000"), "the leader's maximum never appears on the public stream");
    assert.deepEqual(events(s).map((b) => b.data.version), [1, 2], "each subscriber reads independently, in version order, no duplicates");
  }
  s1.close(); s2.close();
});

test("reconnect with Last-Event-ID replays exactly the missed events; too far behind gets a reset", async () => {
  const a = await newAuction();
  for (let i = 0; i < 3; i++) await bid(a, i % 2, 2000 + i * 1000);
  const [{ version }] = await t.sql`SELECT version FROM auctions WHERE auction_id = ${a}`;
  assert.equal(version, 3);

  const s = await subscribe(`/auction/${a}/events?since=0`, { "Last-Event-ID": `${a}:1` });
  await s.waitFor((b) => b.data?.version === 3);
  assert.deepEqual(events(s).map((b) => b.data.version), [2, 3], "Last-Event-ID wins over ?since");
  s.close();

  for (let i = 0; i < 6; i++) await bid(a, (i + 1) % 2, 10_000 + i * 1000); // 6 more versions > SSE_REPLAY_LIMIT=5
  const behind = await subscribe(`/auction/${a}/events?since=1`);
  const r = await behind.waitFor((b) => b.event === "reset");
  assert.equal(r.data.version, 9);
  assert.equal(events(behind).length, 0, "no partial replay before the reset");
  behind.close();

  const future = await subscribe(`/auction/${a}/events?since=999`);
  assert.equal((await future.waitFor((b) => b.event === "reset")).data.version, 9);
  future.close();
});

test("settlement by the worker is pushed too", async () => {
  const a = await newAuction();
  const s = await subscribe(`/auction/${a}/events`); // no cursor: start from the current version
  await bid(a, 0, 5000);
  await t.sql`UPDATE auctions SET end_time = now() - interval '1 second' WHERE auction_id = ${a}`;
  const { settleDue } = await import("../../services/settlement.ts");
  await settleDue();
  const ended = await s.waitFor((b) => b.data?.type === "auction.ended");
  assert.equal(ended.data.status, "ended");
  assert.equal(ended.data.closeReason, "ended");
  s.close();
});

test("heartbeat, unknown auction, per-IP limit and cleanup on disconnect", async () => {
  const a = await newAuction();
  const before = realtime.connectionCount();
  const s = await subscribe(`/auction/${a}/events`);
  await s.waitFor((b) => b.comment === "ping", 2000);

  const missing = await subscribe(`/auction/999999/events`);
  assert.equal(missing.res.status, 404);
  assert.equal((await missing.res.json()).code, "NOT_FOUND");

  const more = [];
  for (let i = 0; i < 5; i++) more.push(await subscribe(`/auction/${a}/events`)); // 6 open = SSE_MAX_PER_IP
  const refused = await subscribe(`/auction/${a}/events`);
  assert.equal(refused.res.status, 429);
  assert.equal((await refused.res.json()).code, "TOO_MANY_STREAMS");

  for (const m of [s, ...more]) m.close();
  const end = Date.now() + 2000;
  while (realtime.connectionCount() !== before && Date.now() < end) await sleep(20);
  assert.equal(realtime.connectionCount(), before, "closed connections are released");
});

test("update latency: commit -> subscriber, 20 bids (poll 200ms here; default 1s)", async () => {
  const a = await newAuction();
  const s = await subscribe(`/auction/${a}/events`);
  const lags = [];
  for (let i = 0; i < 20; i++) {
    const sent = Date.now(); // includes the bid round trip: an upper bound on commit -> subscriber
    const r = await bid(a, i % 2, 2000 + i * 500);
    const e = await s.waitFor((b) => b.data?.version === r.body.version);
    lags.push(e.at - sent);
  }
  s.close();
  lags.sort((x, y) => x - y);
  const p95 = lags[Math.ceil(lags.length * 0.95) - 1];
  console.log(JSON.stringify({ metric: "sse_update_latency_ms", pollMs: 200, n: lags.length, p50: lags[9], p95, max: lags.at(-1) }));
  assert.ok(p95 <= 2000, `p95 ${p95}ms over the 2s target`);
});
