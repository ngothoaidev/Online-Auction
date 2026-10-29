// Load test (T23). Zero dependencies beyond the backend's own. Run AFTER the correctness suites, against a dedicated DB:
//   DATABASE_URL=.../auction_load LOAD_API=http://localhost:3002 node scripts/loadtest.js [--out=../docs/validation/load-t23.json]
// The API under test must run with the same DATABASE_URL/JWT_SECRET and a raised BID_RATE_LIMIT_MAX (the default
// 30 bids/min/user would measure the limiter, not the system); the worker must be running (settlement phase).
// Phases: catalog reads -> 50 bidders on ONE lot (+20 SSE subscribers) -> 50 bidders over 20 lots -> 30 lots closing at once.
// Reported: p50/p95/p99/max latency, throughput, HTTP errors (5xx/network) separately from business refusals (4xx by rule).
import dotenv from "dotenv";
dotenv.config();
import os from "node:os";
import fs from "node:fs";
import bcrypt from "bcrypt";
import { sql } from "drizzle-orm";
import db, { client } from "../db/index.js";
import authService from "../services/auth.js";

const API = process.env.LOAD_API || "http://localhost:3002";
const SECONDS = Number(process.env.LOAD_SECONDS || 20);
const outArg = process.argv.find((a) => a.startsWith("--out="))?.slice(6);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (xs, p) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return Math.round(s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]); };
const stats = (xs) => ({ n: xs.length, p50: pct(xs, 50), p95: pct(xs, 95), p99: pct(xs, 99), max: xs.length ? Math.round(Math.max(...xs)) : null });

class Recorder {
  constructor() { this.lat = []; this.ok = 0; this.refused = {}; this.errors = {}; this.start = performance.now(); }
  async time(fn) {
    const t0 = performance.now();
    try {
      const res = await fn();
      this.lat.push(performance.now() - t0);
      if (res.status >= 500) this.errors[res.status] = (this.errors[res.status] || 0) + 1;
      else if (res.status >= 400) { const code = res.code || res.status; this.refused[code] = (this.refused[code] || 0) + 1; } else this.ok += 1;
      return res;
    } catch (e) {
      this.errors[e.code || e.name] = (this.errors[e.code || e.name] || 0) + 1;
      return null;
    }
  }
  report() {
    const total = this.ok + Object.values(this.refused).reduce((a, b) => a + b, 0) + Object.values(this.errors).reduce((a, b) => a + b, 0);
    const errs = Object.values(this.errors).reduce((a, b) => a + b, 0);
    return { requests: total, rps: Math.round(total / ((performance.now() - this.start) / 1000)), latencyMs: stats(this.lat), ok: this.ok, refusedByRule: this.refused, errors: this.errors, errorRate: total ? +(errs / total).toFixed(4) : 0 };
  }
}

const call = async (method, path, token, body) => {
  const res = await fetch(API + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => null);
  return { status: res.status, code: json?.code, body: json };
};
const until = (deadline, fn) => (async () => { while (performance.now() < deadline) await fn(); })();

// --- fixtures (direct SQL: fast and independent of the API under test) ---
async function fixtures() {
  const hash = await bcrypt.hash("Passw0rd!load", 4);
  const mk = async (username, role) => (await db.execute(sql`INSERT INTO users (username, email, encrypted_password, role, is_verified, status)
    VALUES (${username}, ${username + "@load.test"}, ${hash}, ${role}, true, 'active')
    ON CONFLICT (username) DO UPDATE SET status = 'active' RETURNING user_id AS id, username, email`))[0];
  const seller = await mk("load_seller", "seller");
  const buyers = [];
  for (let i = 0; i < 50; i++) buyers.push(await mk(`load_buyer_${i}`, "buyer"));
  const token = (u) => authService.generateUserToken({ id: u.id, username: u.username, email: u.email, authVersion: 0 });
  const [{ id: categoryId }] = await db.execute(sql`INSERT INTO categories (name) VALUES ('Load test') RETURNING category_id AS id`);
  const lot = async (endsInSec) => (await db.execute(sql`INSERT INTO auctions (seller_id, category_id, title, description, starting_price, current_price, step_price, end_time)
    VALUES (${seller.id}, ${categoryId}, 'Load lot', '<p>load</p>', 100000, 100000, 1000, now() + ${endsInSec} * interval '1 second') RETURNING auction_id AS id`))[0].id;
  return { seller, buyers: await Promise.all(buyers.map(async (b) => ({ ...b, token: await token(b) }))), lot }; // generateUserToken is async
}

async function bidLoop(rec, buyer, lotId, sent) {
  const view = await call("GET", `/auction/${lotId}`);
  const min = BigInt(view.body?.minimumNextBid ?? "100000");
  const amount = (min + BigInt(Math.floor(Math.random() * 20)) * 1000n).toString();
  const t0 = performance.now();
  const r = await rec.time(() => call("POST", `/auction/${lotId}/bid`, buyer.token, { amount }));
  if (r?.status === 200 && r.body?.version !== undefined && sent && !sent.has(r.body.version)) sent.set(r.body.version, t0);
}

/** SSE subscriber over fetch: records arrival time per version. */
function subscribe(lotId, onEvent) {
  const ac = new AbortController();
  (async () => {
    const res = await fetch(`${API}/auction/${lotId}/events?since=0`, { signal: ac.signal });
    const dec = new TextDecoder();
    let buf = "";
    try {
      for await (const chunk of res.body) {
        buf += dec.decode(chunk, { stream: true });
        let i;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const block = buf.slice(0, i); buf = buf.slice(i + 2);
          const data = block.split("\n").find((l) => l.startsWith("data: "));
          if (data && !block.includes("event: reset")) onEvent(JSON.parse(data.slice(6)), performance.now());
        }
      }
    } catch { /* aborted */ }
  })();
  return () => ac.abort();
}

async function main() {
  const [{ version: pg }] = await db.execute(sql`SELECT version()`);
  const env = {
    when: new Date().toISOString(), api: API, secondsPerPhase: SECONDS,
    hardware: { cpu: os.cpus()[0].model, cores: os.cpus().length, memGB: Math.round(os.totalmem() / 2 ** 30), os: `${os.type()} ${os.release()}` },
    node: process.version, postgres: pg.split(",")[0], topology: "API, worker, PostgreSQL (Docker Desktop) and this load generator on ONE machine",
  };
  const f = await fixtures();
  const result = { env, phases: {} };

  // 1) catalog reads
  const reads = new Recorder();
  const browseLots = [];
  for (let i = 0; i < 20; i++) browseLots.push(await f.lot(3600));
  let end = performance.now() + SECONDS * 1000;
  await Promise.all(Array.from({ length: 20 }, (_, i) => until(end, () => reads.time(() =>
    [() => call("GET", "/auction/top?sortBy=endingSoon"), () => call("GET", "/search?q=load&page=1"), () => call("GET", `/auction/${browseLots[i % 20]}`)][Math.floor(Math.random() * 3)]()))));
  result.phases.catalogReads = { concurrency: 20, ...reads.report() };
  console.log("catalog reads", result.phases.catalogReads);

  // 2) contention: 50 bidders on one lot, 20 SSE subscribers
  const hot = await f.lot(3600);
  const sent = new Map();
  const arrivals = [];
  const unsub = Array.from({ length: 20 }, () => subscribe(hot, (e, at) => { if (sent.has(e.version)) arrivals.push(at - sent.get(e.version)); }));
  await sleep(500);
  const hotRec = new Recorder();
  end = performance.now() + SECONDS * 1000;
  await Promise.all(f.buyers.map((b) => until(end, () => bidLoop(hotRec, b, hot, sent))));
  await sleep(2500); // let the last events arrive (SSE poll 1s)
  unsub.forEach((u) => u());
  const [hotRow] = await db.execute(sql`SELECT bid_count, version FROM auctions WHERE auction_id = ${hot}`);
  result.phases.contendedBidding = { bidders: 50, lots: 1, ...hotRec.report(), lot: { bidCount: hotRow.bid_count, version: hotRow.version },
    realtime: { subscribers: 20, note: "send of the bid that created a version -> SSE arrival at each subscriber (upper bound: includes the bid's own processing)", latencyMs: stats(arrivals) } };
  console.log("contended bidding", result.phases.contendedBidding);

  // 3) spread bidding: 50 bidders over 20 lots
  const spread = await Promise.all(Array.from({ length: 20 }, () => f.lot(3600)));
  const spreadRec = new Recorder();
  end = performance.now() + SECONDS * 1000;
  await Promise.all(f.buyers.map((b, i) => until(end, () => bidLoop(spreadRec, b, spread[(i + Math.floor(Math.random() * 20)) % 20]))));
  result.phases.spreadBidding = { bidders: 50, lots: 20, ...spreadRec.report() };
  console.log("spread bidding", result.phases.spreadBidding);

  // 4) settlement lag: 30 lots with a bid, closing together; the worker must settle them
  const closing = [];
  for (let i = 0; i < 30; i++) {
    const id = await f.lot(8);
    await call("POST", `/auction/${id}/bid`, f.buyers[i % 50].token, { amount: "150000" });
    closing.push(id);
  }
  const deadline = performance.now() + 90_000;
  let rows = [];
  while (performance.now() < deadline) {
    rows = await db.execute(sql`SELECT EXTRACT(EPOCH FROM settled_at - end_time) * 1000 AS lag FROM auctions WHERE auction_id IN ${sql.raw(`(${closing.join(",")})`)} AND settled_at IS NOT NULL`);
    if (rows.length === closing.length) break;
    await sleep(500);
  }
  const [{ orders }] = await db.execute(sql`SELECT count(*)::int AS orders FROM orders WHERE auction_id IN ${sql.raw(`(${closing.join(",")})`)}`);
  result.phases.settlement = { lots: closing.length, settled: rows.length, orders, lagMs: stats(rows.map((r) => Number(r.lag))), workerPollMs: Number(process.env.WORKER_POLL_MS || 5000) };
  console.log("settlement", result.phases.settlement);

  // invariants after load: no lot has two orders, every leader is a real maxima row, prices never exceed the leader's maximum
  const [inv] = await db.execute(sql`SELECT
      (SELECT count(*) FROM (SELECT auction_id FROM orders GROUP BY auction_id HAVING count(*) > 1) d)::int AS duplicate_orders,
      (SELECT count(*) FROM auctions a WHERE a.winner_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM bidder_maxima m WHERE m.auction_id = a.auction_id AND m.bidder_id = a.winner_id AND m.disqualified_at IS NULL))::int AS leader_without_maximum,
      (SELECT count(*) FROM auctions a JOIN bidder_maxima m ON m.auction_id = a.auction_id AND m.bidder_id = a.winner_id WHERE a.current_price > m.max_amount)::int AS price_above_leader_max`);
  result.invariants = inv;
  console.log("invariants", inv);

  if (outArg) fs.writeFileSync(outArg, JSON.stringify(result, null, 1));
  await client.end();
}

main().catch(async (e) => { console.error(e); await client.end(); process.exit(1); });
