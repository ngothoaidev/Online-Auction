import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { startApp } from "../helpers/app.js";

let t, seller, buyer, tokens, categoryId, dir;
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40, 7)]);

before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "auction-public-"));
  t = await startApp({ PUBLIC_MEDIA_DIR: dir, CLOUDINARY_CLOUD_NAME: "", CLOUDINARY_API_KEY: "", CLOUDINARY_API_SECRET: "" });
  seller = await t.createUser("seller", { role: "seller" });
  buyer = await t.createUser("buyer");
  tokens = { seller: await t.tokenFor(seller), buyer: await t.tokenFor(buyer) };
  [{ id: categoryId }] = await t.sql`INSERT INTO categories (name) VALUES ('c') RETURNING category_id AS id`;
});
after(async () => { await t.stop(); await fs.rm(dir, { recursive: true, force: true }); });

const create = async (fields, { photos = 3, who = "seller", photo = PNG, name = "p.png" } = {}) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  for (let i = 0; i < photos; i++) fd.append("images", new Blob([photo], { type: "image/png" }), name);
  const res = await fetch(`${t.base}/auction`, { method: "POST", headers: { Authorization: `Bearer ${tokens[who]}` }, body: fd });
  return { status: res.status, body: await res.json().catch(() => null) };
};
const valid = () => ({ title: "Seeded lot", description: "<p>fine</p><script>x()</script>", categoryId: String(categoryId), startingPrice: "1000000", stepPrice: "50000", buyNowPrice: "", endTime: new Date(Date.now() + 86400000).toISOString(), autoExtend: "false", allowNewbies: "false" });

test("a seller can create a listing with 3 photos without any cloud credentials; photos are served publicly and read-only", async () => {
  const r = await create(valid());
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const id = r.body.auction.id;
  const [a] = await t.sql`SELECT starting_price, step_price, buy_now_price, auto_extend, allow_newbies, current_price, description, status FROM auctions WHERE auction_id = ${id}`;
  assert.deepEqual([a.starting_price, a.step_price, a.buy_now_price, a.auto_extend, a.allow_newbies, a.current_price, a.status], ["1000000", "50000", null, false, false, "1000000", "active"], "'false' multipart booleans are really false");
  assert.doesNotMatch(a.description, /script/);
  const imgs = await t.sql`SELECT image_url, is_primary FROM auction_images WHERE auction_id = ${id} ORDER BY image_id`;
  assert.equal(imgs.length, 3);
  assert.equal(imgs[0].is_primary, true);
  const res = await fetch(imgs[0].image_url);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "image/png");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal((await fetch(`${t.base}/media/public/..%2f..%2fetc%2fpasswd`)).status >= 400, true);
  assert.equal((await fetch(`${t.base}/media/public/missing.png`)).status, 404);
});

test("create rules: fewer than 3 photos, SVG, bad money, past/short deadline and non-sellers are refused", async () => {
  assert.equal((await create(valid(), { photos: 2 })).status, 400);
  assert.equal((await create(valid(), { photo: Buffer.from("<svg><script>1</script></svg>"), name: "p.png" })).status, 415);
  for (const bad of [{ startingPrice: "10.5" }, { stepPrice: "0" }, { startingPrice: "-1" }, { buyNowPrice: "1000000" }, { endTime: new Date(Date.now() - 1000).toISOString() }, { title: "" }, { categoryId: "abc" }]) {
    const r = await create({ ...valid(), ...bad });
    assert.equal(r.status, 400, JSON.stringify(bad));
    assert.equal(r.body.code, "VALIDATION_ERROR");
  }
  assert.equal((await create(valid(), { who: "buyer" })).status, 403);
  assert.equal((await t.sql`SELECT count(*)::int AS n FROM auctions`)[0].n, 1, "only the first valid listing exists");
});

test("avatar upload uses the same local fallback without cloud credentials", async () => {
  const put = async (photo) => {
    const fd = new FormData();
    fd.append("avatar", new Blob([photo], { type: "image/png" }), "a.png");
    const res = await fetch(`${t.base}/users/avatar`, { method: "PUT", headers: { Authorization: `Bearer ${tokens.buyer}` }, body: fd });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const r = await put(PNG);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.user.avatarUrl, r.body.new_url);
  assert.equal((await fetch(r.body.new_url)).headers.get("content-type"), "image/png");
  assert.equal((await put(Buffer.from("<svg/>"))).status, 415);
});
