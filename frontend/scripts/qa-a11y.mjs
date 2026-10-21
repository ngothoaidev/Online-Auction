// Usage: node scripts/qa-a11y.mjs [--pages=home,search,...]  — axe-core on each page at 390 and 1440, light and dark.
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const base = process.env.E2E_BASE_URL || "http://localhost:5173";
const only = (process.argv.find((a) => a.startsWith("--pages=")) || "").replace("--pages=", "").split(",").filter(Boolean);
const PAGES = { home: "/", search: "/search?q=", detail: `/auction/${process.env.QA_LOT || 1}`, login: "/login", register: "/register", forgot: "/forgot-password", profile: "/profile/demo_seller", become: "/become-seller", create: "/create-auction", admin: "/admin", notifications: "/notifications" };
const AS = { become: "demo_buyer1", create: "demo_seller", admin: "demo_admin", notifications: "demo_buyer1" }; // pages that need a signed-in role
const API = process.env.E2E_API_URL || "http://localhost:3000";
const tokens = {};
async function tokenFor(name) {
  if (!tokens[name]) {
    const r = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier: name, password: "Passw0rd!demo" }) });
    tokens[name] = (await r.json()).token;
  }
  return tokens[name];
}
const browser = await chromium.launch();
const report = [];
for (const theme of ["light", "dark"]) {
  for (const width of [390, 1440]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    await ctx.addInitScript((t) => localStorage.setItem("theme", t), theme);
    const page = await ctx.newPage();
    for (const [name, route] of Object.entries(PAGES)) {
      if (only.length && !only.includes(name)) continue;
      const who = AS[name];
      await page.addInitScript((t) => { if (t) localStorage.setItem("authToken", t); else localStorage.removeItem("authToken"); }, who ? await tokenFor(who) : null);
      await page.goto(base + route, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      for (const v of violations) report.push({ page: name, theme, width, id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes[0]?.target?.join(" ") });
    }
    await ctx.close();
  }
}
await browser.close();
const byId = {};
for (const r of report) byId[r.id] = (byId[r.id] ?? 0) + r.nodes;
console.log(JSON.stringify({ totalViolationEntries: report.length, byRule: byId, details: report }, null, 2));
