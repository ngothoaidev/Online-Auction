// Usage: node scripts/qa-a11y.mjs [--pages=home,search,...]  — axe-core on each page at 390 and 1440, light and dark.
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const base = process.env.E2E_BASE_URL || "http://localhost:5173";
const only = (process.argv.find((a) => a.startsWith("--pages=")) || "").replace("--pages=", "").split(",").filter(Boolean);
const PAGES = { home: "/", search: "/search?q=", detail: "/auction/1", login: "/login", register: "/register" };
const browser = await chromium.launch();
const report = [];
for (const theme of ["light", "dark"]) {
  for (const width of [390, 1440]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    await ctx.addInitScript((t) => localStorage.setItem("theme", t), theme);
    const page = await ctx.newPage();
    for (const [name, route] of Object.entries(PAGES)) {
      if (only.length && !only.includes(name)) continue;
      await page.goto(base + route, { waitUntil: "networkidle" });
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
