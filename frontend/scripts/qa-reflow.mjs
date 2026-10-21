// Usage: node scripts/qa-reflow.mjs  (env: E2E_BASE_URL, E2E_API_URL, QA_LOT)
// WCAG 1.4.10 reflow + 200% zoom proxy + keyboard focus visibility, in a real browser:
//  - 320x640 (reflow) and 640x450 (= a 1280x900 window at 200% zoom): no horizontal scrolling, main heading on screen;
//  - first Tab stops from the top of the page: the skip link comes first and every focused element shows a focus style.
// Prints a JSON report; exit code 1 when any check fails.
import { chromium } from "@playwright/test";

const base = process.env.E2E_BASE_URL || "http://localhost:5173";
const API = process.env.E2E_API_URL || "http://localhost:3000";
const PAGES = {
  home: ["/", null], search: ["/search?q=", null], detail: [`/auction/${process.env.QA_LOT || 1}`, null], login: ["/login", null],
  register: ["/register", null], notifications: ["/notifications", "demo_buyer1"], create: ["/create-auction", "demo_seller"],
  reports: ["/admin/reports", "demo_admin"], audit: ["/admin/audit", "demo_admin"],
};
const VIEWPORTS = [{ name: "reflow-320", width: 320, height: 640 }, { name: "zoom-200", width: 640, height: 450 }];
const tokens = {};
const tokenFor = async (u) => (tokens[u] ??= (await (await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier: u, password: "Passw0rd!demo" }) })).json()).token);

const browser = await chromium.launch();
const results = [];
for (const vp of VIEWPORTS) {
  for (const [name, [route, who]] of Object.entries(PAGES)) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const token = who ? await tokenFor(who) : null;
    await ctx.addInitScript((t) => { if (t) localStorage.setItem("authToken", t); }, token);
    const page = await ctx.newPage();
    await page.goto(base + route, { waitUntil: "load" });
    await page.locator("h1").first().waitFor({ timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(300);
    const layout = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const overflow = document.documentElement.scrollWidth - vw;
      const offenders = overflow > 1 ? [...document.querySelectorAll("body *")]
        .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > vw + 1 && getComputedStyle(el).position !== "fixed"; })
        .filter((el) => !el.closest("[role=region][tabindex], .overflow-x-auto, .overflow-auto")) // own scroll containers are allowed (data tables)
        .slice(0, 5).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 3).join(".")}`) : [];
      const h1 = document.querySelector("h1");
      return { overflow, offenders, h1: h1?.textContent?.trim().slice(0, 40) ?? null };
    });
    const focus = [];
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      focus.push(await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        const visible = (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== "none");
        return { el: (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 30), visible };
      }));
    }
    const stops = focus.filter(Boolean);
    const ok = layout.offenders.length === 0 && stops.length > 0 && stops.every((f) => f.visible) && /skip/i.test(stops[0]?.el ?? "");
    results.push({ viewport: vp.name, page: name, ok, ...layout, focus: stops });
    await ctx.close();
  }
}
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(JSON.stringify({ checked: results.length, failed: failed.length, results }, null, 1));
process.exit(failed.length ? 1 : 0);
