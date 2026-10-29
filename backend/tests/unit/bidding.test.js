import { test } from "node:test";
import assert from "node:assert/strict";
import { decideBid, recompute, rank, competitivePrice, extendedEndTime, BidRejection, FIVE_MIN_MS, viewerPosition } from "../../domain/bidding.js";
import { checkBidderEligibility, buyNowAvailable } from "../../domain/eligibility.js";

const S = 1000n, I = 100n;
const fresh = () => ({ startingPrice: S, step: I, currentPrice: S, maxima: [] });

/** apply a sequence of [bidder, amount] and return the per-step results (state threads through) */
function play(steps, state = fresh()) {
  const out = [];
  steps.forEach(([bidderId, amount], i) => {
    const r = decideBid(state, { bidderId, amount: BigInt(amount), sequence: i + 1 });
    state = { ...state, currentPrice: r.currentPrice, maxima: r.maxima };
    out.push({ ...r, state });
  });
  return out;
}

test("worked example from the bidding rules", () => {
  const r = play([["A", 2000], ["B", 1500], ["A", 2500], ["B", 2500], ["C", 2600]]);
  assert.deepEqual(r.map((x) => [x.leaderId, Number(x.currentPrice), x.outcome]), [
    ["A", 1000, "success"], ["A", 1600, "outbid"], ["A", 1600, "updated"], ["A", 2500, "outbid"], ["C", 2600, "success"],
  ]);
  assert.deepEqual(r.map((x) => x.events.length), [1, 1, 0, 1, 1], "leader raise emits no public event");
});

test("public events never carry a private ceiling and are attributed to the price holder", () => {
  const r = play([["A", 5000], ["B", 1500]]);
  assert.deepEqual(r[1].events, [{ bidderId: "A", amount: 1600n, type: "auto" }]);
  assert.ok(!r.flatMap((x) => x.events).some((e) => e.amount === 5000n || e.amount === 1500n));
});

test("minimums: first bid >= starting price; challenger >= current + step; leader must RAISE", () => {
  assert.throws(() => decideBid(fresh(), { bidderId: "A", amount: 999n, sequence: 1 }), (e) => e instanceof BidRejection && e.code === "BID_TOO_LOW" && e.minimum === 1000n);
  const [a] = play([["A", 2000]]);
  assert.throws(() => decideBid(a.state, { bidderId: "B", amount: 1099n, sequence: 2 }), (e) => e.code === "BID_TOO_LOW" && e.minimum === 1100n);
  assert.throws(() => decideBid(a.state, { bidderId: "A", amount: 2000n, sequence: 2 }), (e) => e.code === "BID_NOT_HIGHER");
  assert.throws(() => decideBid(a.state, { bidderId: "A", amount: 1500n, sequence: 2 }), (e) => e.code === "BID_NOT_HIGHER");
  assert.equal(decideBid(a.state, { bidderId: "B", amount: 1100n, sequence: 2 }).currentPrice, 1200n);
});

test("equal ceilings: the earlier one keeps the lead, price equals the ceiling; leader raise gets a new priority", () => {
  const r = play([["A", 2000], ["B", 2000]]);
  assert.equal(r[1].leaderId, "A");
  assert.equal(r[1].currentPrice, 2000n);
  assert.equal(r[1].outcome, "outbid");
  // B later raises above A and A raises to tie with B: B reached 2500 first, so B leads
  const r2 = play([["A", 2000], ["B", 2400], ["B", 2500], ["A", 2500]]);
  assert.equal(r2[3].leaderId, "B");
});

test("price never decreases in normal bidding and never exceeds the leader's ceiling", () => {
  const r = play([["A", 1300], ["B", 1100], ["C", 1300]]);
  for (let i = 1; i < r.length; i++) assert.ok(r[i].currentPrice >= r[i - 1].currentPrice);
  const lead = rank(r.at(-1).state.maxima)[0];
  assert.ok(r.at(-1).currentPrice <= lead.max);
});

test("price is capped by the leader's ceiling even when the challenger is one step below it", () => {
  const r = play([["A", 1250], ["B", 1200]]);
  assert.equal(r[1].currentPrice, 1250n); // min(1250, 1200 + 100)
  assert.equal(r[1].leaderId, "A");
});

test("inconsistent legacy state (price above the leader's ceiling) aborts instead of guessing", () => {
  const bad = { startingPrice: S, step: I, currentPrice: 5000n, maxima: [{ bidderId: "A", max: 2000n, priority: 1 }] };
  assert.throws(() => decideBid(bad, { bidderId: "B", amount: 6000n, sequence: 2 }), (e) => e.code === "INVARIANT_VIOLATION");
});

test("recompute after removing the leader may lower the price; no eligible bidder -> starting price, no leader", () => {
  const [, , c] = play([["A", 3000], ["B", 2000], ["C", 2200]]);
  const withoutA = c.state.maxima.filter((m) => m.bidderId !== "A");
  assert.deepEqual(recompute({ startingPrice: S, step: I, maxima: withoutA }), { leaderId: "C", currentPrice: 2100n });
  assert.deepEqual(recompute({ startingPrice: S, step: I, maxima: [] }), { leaderId: null, currentPrice: S });
  assert.equal(competitivePrice(S, I, []), null);
});

test("anti-sniping extends the original deadline once, only for public events inside the last 5 minutes", () => {
  const end = new Date("2026-01-01T12:00:00Z");
  const at = (msBefore) => new Date(end.getTime() - msBefore);
  const base = { endTime: end, autoExtend: true, producedPublicEvent: true };
  assert.equal(extendedEndTime({ ...base, now: at(FIVE_MIN_MS - 1) }).getTime(), end.getTime() + FIVE_MIN_MS);
  assert.equal(extendedEndTime({ ...base, now: at(FIVE_MIN_MS) }).getTime(), end.getTime(), "exactly 5 minutes left is outside the window");
  assert.equal(extendedEndTime({ ...base, now: at(1000), producedPublicEvent: false }).getTime(), end.getTime(), "leader raising max does not extend");
  assert.equal(extendedEndTime({ ...base, now: at(1000), autoExtend: false }).getTime(), end.getTime());
});

// --- randomized invariants against the committed order (seeded, reproducible) ---
function prng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

test("property: 500 random sequences keep the proxy-bidding invariants", () => {
  for (let seed = 1; seed <= 500; seed++) {
    const rnd = prng(seed);
    const S2 = BigInt(1 + Math.floor(rnd() * 5) * 500), I2 = BigInt(1 + Math.floor(rnd() * 4) * 50);
    let state = { startingPrice: S2, step: I2, currentPrice: S2, maxima: [] };
    let seq = 0, count = 0, events = 0;
    for (let n = 0; n < 40; n++) {
      const bidderId = "u" + Math.floor(rnd() * 5);
      const amount = S2 + BigInt(Math.floor(rnd() * 60)) * 50n;
      let r;
      try { r = decideBid(state, { bidderId, amount, sequence: ++seq }); } catch (e) { if (e instanceof BidRejection) { seq--; continue; } throw e; }
      const priceBefore = state.currentPrice;
      state = { ...state, currentPrice: r.currentPrice, maxima: r.maxima };
      count++; events += r.events.length;

      const [lead, second] = rank(state.maxima);
      assert.equal(state.maxima.length, new Set(state.maxima.map((m) => m.bidderId)).size, "one ceiling per bidder");
      assert.ok(state.currentPrice >= priceBefore, `seed ${seed}: price decreased`);
      assert.ok(state.currentPrice <= lead.max, `seed ${seed}: price above leader ceiling`);
      assert.ok(state.currentPrice >= S2, `seed ${seed}: price below starting price`);
      assert.equal(r.leaderId, lead.bidderId);
      if (second) assert.equal(state.currentPrice >= (second.max < lead.max ? second.max : lead.max), true, `seed ${seed}: price below runner-up`);
      if (r.outcome === "updated") assert.equal(r.events.length, 0);
      if (r.outcome === "outbid") assert.notEqual(r.leaderId, bidderId);
      if (r.outcome === "success") assert.equal(r.leaderId, bidderId);
    }
    assert.ok(events <= count);
  }
});

test("eligibility and Buy Now availability", () => {
  const auction = { id: 1, sellerId: 9, allowNewbies: true, status: "active", buyNowPrice: "5000", currentPrice: "4000", endTime: new Date(Date.now() + 1000) };
  const ok = { id: 1, status: "active", isVerified: true, role: "buyer", ratingCount: 0, positiveRatingCount: 0 };
  assert.equal(checkBidderEligibility(ok, auction), null);
  assert.equal(checkBidderEligibility({ ...ok, role: "seller" }, auction), null);
  const code = (u, a = auction, o) => checkBidderEligibility(u, a, o)?.code;
  assert.equal(code({ ...ok, status: "banned" }), "ACCOUNT_BANNED");
  assert.equal(code({ ...ok, isVerified: false }), "EMAIL_NOT_VERIFIED");
  assert.equal(code({ ...ok, role: "admin" }), "ROLE_NOT_ALLOWED");
  assert.equal(code({ ...ok, role: "unauthorized" }), "ROLE_NOT_ALLOWED");
  assert.equal(code({ ...ok, id: 9 }), "OWN_LISTING");
  assert.equal(code(ok, auction, { disqualified: true }), "BIDDER_DISQUALIFIED");
  assert.equal(code({ ...ok, ratingCount: 10, positiveRatingCount: 7 }), "RATING_TOO_LOW");
  assert.equal(code({ ...ok, ratingCount: 10, positiveRatingCount: 8 }), undefined, "exactly 80% is allowed");
  assert.equal(code(ok, { ...auction, allowNewbies: false }), "NEWBIES_NOT_ALLOWED");
  assert.equal(code({ ...ok, ratingCount: 5, positiveRatingCount: 5 }, { ...auction, allowNewbies: false }), undefined, "newbie rule only applies to unrated users");

  const now = new Date();
  assert.equal(buyNowAvailable(auction, now), true);
  assert.equal(buyNowAvailable({ ...auction, currentPrice: "5000" }, now), false, "price reached the Buy Now price");
  assert.equal(buyNowAvailable({ ...auction, endTime: new Date(now.getTime() - 1) }, now), false);
  assert.equal(buyNowAvailable({ ...auction, endTime: now }, now), false, "equality is already ended");
  assert.equal(buyNowAvailable({ ...auction, buyNowPrice: null }, now), false);
  assert.equal(buyNowAvailable({ ...auction, status: "ended" }, now), false);
});

test("viewerPosition.minimumBid is exactly the floor decideBid enforces, for every bidder in random states", () => {
  for (let seed = 1; seed <= 300; seed++) {
    const rnd = prng(seed);
    const S2 = BigInt(1 + Math.floor(rnd() * 5) * 500), I2 = BigInt(1 + Math.floor(rnd() * 4) * 50);
    let state = { startingPrice: S2, step: I2, currentPrice: S2, maxima: [] };
    let seq = 0;
    for (let n = 0; n < 25; n++) {
      for (const bidderId of ["u0", "u1", "u2", "u3"]) {
        const { minimumBid, isLeading, yourMaximum } = viewerPosition(state, bidderId);
        const own = state.maxima.find((m) => m.bidderId === bidderId);
        assert.equal(yourMaximum, own?.max ?? null);
        assert.equal(isLeading, Boolean(state.maxima.length) && rank(state.maxima)[0].bidderId === bidderId);
        const accepts = (amount) => { try { decideBid(state, { bidderId, amount, sequence: seq + 1 }); return true; } catch (e) { if (e instanceof BidRejection) return false; throw e; } };
        assert.equal(accepts(minimumBid), true, `seed ${seed}: ${bidderId} refused at the shown minimum ${minimumBid}`);
        assert.equal(accepts(minimumBid - 1n), false, `seed ${seed}: ${bidderId} accepted below the shown minimum ${minimumBid}`);
      }
      const bidderId = "u" + Math.floor(rnd() * 4);
      const amount = S2 + BigInt(Math.floor(rnd() * 60)) * 50n;
      try {
        const r = decideBid(state, { bidderId, amount, sequence: ++seq });
        state = { ...state, currentPrice: r.currentPrice, maxima: r.maxima };
      } catch (e) { if (e instanceof BidRejection) seq--; else throw e; }
    }
  }
});
