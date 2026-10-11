// Usage: node scripts/qa-screenshots.mjs <label> [--pages=home,search,...]
// Captures full-page screenshots at 390/768/1280/1440 in light and dark into docs/validation/screenshots/<label>/.
// Requires the API (:3000) + Vite dev server (:5173) running against a seeded DB. Not part of the unit suite.
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const label = process.argv[2] || "run";
const only = (process.argv.find((a) => a.startsWith("--pages=")) || "").replace("--pages=", "").split(",").filter(Boolean);
const base = process.env.E2E_BASE_URL || "http://localhost:5173";
const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../docs/validation/screenshots", label);

const PAGES = {
  home: "/",
  search: "/search?q=",
  detail: "/auction/1",
  login: "/login",
  register: "/register",
};
const WIDTHS = [390, 768, 1280, 1440];
const THEMES = ["light", "dark"];

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const errors = [];
for (const theme of THEMES) {
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    await context.addInitScript((t) => { try { localStorage.setItem("theme", t); } catch { /* ignore */ } }, theme);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(`${theme}/${width}: ${e.message}`));
    for (const [name, route] of Object.entries(PAGES)) {
      if (only.length && !only.includes(name)) continue;
      await page.goto(base + route, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(outDir, `${name}-${width}-${theme}.jpg`), fullPage: true, type: "jpeg", quality: 55 });
    }
    await context.close();
  }
}
await browser.close();
console.log(JSON.stringify({ label, outDir, pageErrors: errors }, null, 2));
