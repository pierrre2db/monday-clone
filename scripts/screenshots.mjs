// Generate README screenshots from the running app.
// Usage: APP_URL=http://localhost:4000 APP_PASSWORD=change-me node scripts/screenshots.mjs
// Requires the app running and `playwright` installed (npm i -D playwright && npx playwright install chromium).
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = process.env.APP_URL ?? "http://localhost:4000";
const PASSWORD = process.env.APP_PASSWORD ?? "change-me";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "screenshots");

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();

  // --- Desktop, light ---
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 }, colorScheme: "light", deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  // login
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);

  // open the (first) board
  await page.click('a[href^="/board/"]');
  await page.waitForSelector("text=Table");
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, "table.png") });

  // kanban
  await page.click('button:has-text("Kanban")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, "kanban.png") });

  // calendar → next month (seed due date is next month)
  await page.click('button:has-text("Calendar")');
  await page.waitForTimeout(300);
  await page.click('button[aria-label="Mois suivant"], button:has-text("›")').catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, "calendar.png") });

  // focus personne / my work
  await page.goto(`${BASE}/people`);
  await page.waitForTimeout(400);
  await page.getByText("Alice", { exact: false }).first().click().catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, "people.png") });

  await ctx.close();

  // --- Dark board ---
  const darkCtx = await browser.newContext({ viewport: { width: 1280, height: 820 }, colorScheme: "dark", deviceScaleFactor: 2 });
  const dp = await darkCtx.newPage();
  await dp.goto(`${BASE}/login`);
  await dp.fill('input[type="password"]', PASSWORD);
  await dp.click('button[type="submit"]');
  await dp.waitForURL(`${BASE}/`);
  await dp.click('a[href^="/board/"]');
  await dp.waitForSelector("text=Table");
  await dp.waitForTimeout(500);
  await dp.screenshot({ path: join(OUT, "table-dark.png") });
  await darkCtx.close();

  // --- Mobile (stacked cards) ---
  const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "light", deviceScaleFactor: 2, isMobile: true });
  const mp = await mob.newPage();
  await mp.goto(`${BASE}/login`);
  await mp.fill('input[type="password"]', PASSWORD);
  await mp.click('button[type="submit"]');
  await mp.waitForURL(`${BASE}/`);
  await mp.click('a[href^="/board/"]');
  await mp.waitForSelector("text=Table");
  await mp.waitForTimeout(500);
  await mp.screenshot({ path: join(OUT, "mobile.png"), fullPage: true });
  await mob.close();

  await browser.close();
  console.log("Screenshots written to", OUT);
}
main().catch((e) => { console.error(e); process.exit(1); });
