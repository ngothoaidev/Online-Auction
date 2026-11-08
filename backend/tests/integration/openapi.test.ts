import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { startApp } from "../helpers/app.ts";
import type { TestApp } from "../helpers/app.ts";

// The spec is published by the SPA host (frontend/public/openapi.json); this keeps it in step with the real routes.
const spec = JSON.parse(await fs.readFile(new URL("../../../frontend/public/openapi.json", import.meta.url), "utf8"));
let t: TestApp;

before(async () => { t = await startApp(); });
after(() => t.stop());

test("openapi.json is a well-formed OpenAPI 3.1 document: every path parameter is declared, every $ref resolves", () => {
  assert.equal(spec.openapi, "3.1.0");
  assert.ok(spec.info.title && spec.info.version);
  const resolve = (ref) => ref.replace(/^#\//, "").split("/").reduce((o, k) => o?.[k], spec);
  JSON.stringify(spec, (k, v) => { if (k === "$ref") assert.ok(resolve(v), `unresolved ${v}`); return v; });
  const ids = new Set<string>();
  type Operation = { operationId: string; parameters?: { $ref?: string; in?: string; name?: string }[] };
  for (const [path, item] of Object.entries(spec.paths as Record<string, Record<string, Operation>>)) {
    for (const op of Object.values(item)) {
      assert.ok(!ids.has(op.operationId), `duplicate operationId ${op.operationId}`);
      ids.add(op.operationId);
      const declared = (op.parameters ?? []).map((p) => (p.$ref ? resolve(p.$ref) : p)).filter((p) => p.in === "path").map((p) => p.name);
      assert.deepEqual(declared.sort(), [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort(), path);
    }
  }
});

test("every documented GET path is a real route (not the catch-all 404)", async () => {
  for (const path of Object.keys(spec.paths).filter((p) => spec.paths[p].get)) {
    const url = `${t.base}${path.replace(/\{\w+\}/g, "1")}${path === "/users/profile" ? "?username=nobody" : ""}`;
    const ac = new AbortController();
    const res = await fetch(url, { signal: ac.signal }); // resolves on headers, so the SSE path does not hang
    const body = res.headers.get("content-type")?.startsWith("application/json") ? await res.json() : null;
    ac.abort();
    assert.ok(!(res.status === 404 && body?.message?.startsWith("Not Found - ")), `${path} is not routed`);
  }
});
