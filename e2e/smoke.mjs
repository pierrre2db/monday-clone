// End-to-end UI smoke test — drives the real app in a headless browser and asserts
// role-based behavior and core flows. Exits non-zero if any check fails (CI-friendly).
//
// Self-provisioning: it logs in as the admin (env creds), creates two throwaway test
// users (a member and a viewer) via the API, runs the role checks against them, then
// deletes them — so it does NOT depend on the seed's demo passwords staying unchanged.
//
// Prereqs: the app running (default http://localhost:4000), and Playwright installed on
// demand (NOT a committed dependency to keep installs lean):
//   npm i -D playwright && npx playwright install chromium
// Run:
//   APP_URL=http://localhost:4000 ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=change-me-admin node e2e/smoke.mjs
import { chromium } from "playwright";

const BASE = process.env.APP_URL ?? "http://localhost:4000";
const ADMIN = {
  email: process.env.ADMIN_EMAIL ?? "admin@example.com",
  password: process.env.ADMIN_PASSWORD ?? "change-me-admin",
};
const stamp = Date.now();
const MEMBER = { name: "E2E Member", email: `e2e-member-${stamp}@test.local`, password: "e2e-pass-member", role: "member" };
const VIEWER = { name: "E2E Viewer", email: `e2e-viewer-${stamp}@test.local`, password: "e2e-pass-viewer", role: "viewer" };

const results = [];
function check(name, cond) {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
}

async function login(page, { email, password }) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(800);
}

async function openFirstBoard(page) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForSelector('a[href^="/board/"]', { timeout: 15000 });
  await page.click('a[href^="/board/"]');
  await page.waitForSelector("text=Table", { timeout: 15000 });
  await page.waitForTimeout(500);
}

async function main() {
  const browser = await chromium.launch();
  let createdIds = [];

  // --- login page renders + wrong password rejected ---
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`);
    check("login page has email + password fields",
      (await page.locator('input[type="email"]').count()) === 1 &&
      (await page.locator('input[type="password"]').count()) === 1);
    await login(page, { email: ADMIN.email, password: "definitely-wrong" });
    check("wrong password does not authenticate (stays on /login)", page.url().includes("/login"));
    await ctx.close();
  }

  // --- admin: log in, provision test users, run admin UI checks ---
  const adminCtx = await browser.newContext();
  {
    const page = await adminCtx.newPage();
    await login(page, ADMIN);
    const me = await page.evaluate(async () => (await fetch("/api/auth/me")).json());
    check("admin logs in with env creds", me?.authenticated === true && me?.user?.role === "admin");
    if (me?.user?.role !== "admin") { console.error("Cannot proceed without admin; check ADMIN_EMAIL/ADMIN_PASSWORD."); await browser.close(); process.exit(1); }

    // provision the two test users via the admin-gated API
    for (const u of [MEMBER, VIEWER]) {
      const res = await page.evaluate(async (u) => {
        const r = await fetch("/api/members", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(u) });
        return { status: r.status, body: await r.json().catch(() => ({})) };
      }, u);
      check(`admin can create test ${u.role}`, res.status === 201 && res.body?.id);
      if (res.body?.id) createdIds.push(res.body.id);
    }

    await openFirstBoard(page);
    check("admin sees + Group", (await page.getByRole("button", { name: /\+ Group/i }).count()) > 0);
    check("admin sees + Column", (await page.getByText(/\+ Column/i).count()) > 0);
    check("admin sees Utilisateurs button", (await page.getByRole("button", { name: /Utilisateurs/i }).count()) > 0);
    check("admin sees Déconnexion", (await page.getByText(/Déconnexion|Logout/i).count()) > 0);
  }

  // --- member: content yes, structure no ---
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, MEMBER);
    await openFirstBoard(page);
    check("member does NOT see + Group", (await page.getByRole("button", { name: /\+ Group/i }).count()) === 0);
    check("member does NOT see + Column", (await page.getByText(/\+ Column…/i).count()) === 0);
    check("member CAN add an item", (await page.getByText(/\+ Ajouter un item|\+ Add item/i).count()) > 0);
    await ctx.close();
  }

  // --- viewer: read-only ---
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, VIEWER);
    await openFirstBoard(page);
    check("viewer does NOT see + Group", (await page.getByRole("button", { name: /\+ Group/i }).count()) === 0);
    check("viewer does NOT see add-item control", (await page.getByText(/\+ Ajouter un item|\+ Add item/i).count()) === 0);
    check("viewer board has no editable cell inputs", (await page.locator('input[type="text"], .cell-input').count()) === 0);
    await page.goto(`${BASE}/people`);
    check("viewer can open /people", (await page.getByText(/Focus personne/i).count()) > 0);
    await ctx.close();
  }

  // --- cleanup: delete the test users (as admin) ---
  {
    const page = await adminCtx.newPage();
    await page.goto(`${BASE}/`); // give relative fetch a same-origin base
    for (const id of createdIds) {
      const st = await page.evaluate(async (id) => (await fetch(`/api/members/${id}`, { method: "DELETE" })).status, id);
      check(`cleanup deleted test user ${id.slice(0, 6)}…`, st === 200);
    }
    await adminCtx.close();
  }

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) {
    console.error("FAILED:", failed.map((r) => r.name).join(" | "));
    process.exit(1);
  }
  console.log("E2E smoke: all good.");
}
main().catch((e) => { console.error(e); process.exit(1); });
