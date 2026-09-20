/**
 * Visual QA for the premium notification bell (src/styles/bell.css).
 *
 * Captures the bell in every header it lives in — the phone brand bar, the
 * Today toolbar, the Mood top bar — across read/unread/hover/open states, at
 * desktop and phone widths. Output lands in snapshots/bell-qa/ (gitignored).
 *
 * Usage:  npm run dev  (in another shell)  then  node scripts/bell-qa.mjs
 * Requires the `playwright` package + its chromium build (QA-only tooling).
 */

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "snapshots", "bell-qa");
const BASE = process.env.BLOOM_QA_URL ?? "http://localhost:5173";

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("bell-qa needs the `playwright` package: npm i -D playwright");
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

function seedNotices(n) {
  const kinds = ["habit", "period", "evening", "insight", "system"];
  return Array.from({ length: n }, (_, i) => ({
    id: `qa-${i}`,
    at: new Date(Date.now() - i * 3_600_000).toISOString(),
    kind: kinds[i % kinds.length],
    title: `QA notice ${i + 1}`,
    body: "A seeded notification for bell screenshots.",
    url: "/",
    read: false,
  }));
}

async function newPage(browser, { width, height, unread }) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
  });
  if (unread > 0) {
    await context.addInitScript((notices) => {
      window.localStorage.setItem("bloom.notifications.v1", JSON.stringify(notices));
    }, seedNotices(unread));
  } else {
    await context.addInitScript(() => {
      window.localStorage.removeItem("bloom.notifications.v1");
    });
  }
  const page = await context.newPage();
  return { context, page };
}

/** The bell the user actually sees (one instance hides per breakpoint). */
async function visibleBell(page) {
  const bells = page.locator(".bloom-bell-wrap");
  const count = await bells.count();
  for (let i = 0; i < count; i++) {
    const b = bells.nth(i);
    if (await b.isVisible()) return b;
  }
  throw new Error("no visible bell found");
}

async function settle(page) {
  await page.waitForSelector(".bloom-bell-wrap >> visible=true", { timeout: 60_000 });
  // let the ring-on-mount finish so "rest" shots are truly at rest
  await page.waitForTimeout(1600);
}

async function headerShot(page, name) {
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  const bell = await visibleBell(page);
  await bell.screenshot({ path: join(OUT, `${name}--bell.png`) });
}

const browser = await chromium.launch();

try {
  // 1 — Today, desktop, read (quiet glass disc)
  {
    const { context, page } = await newPage(browser, { width: 1440, height: 900, unread: 0 });
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await settle(page);
    await headerShot(page, "01-today-desktop-read");
    await context.close();
  }

  // 2 — Today, desktop, 3 unread (gold bell + pill)
  {
    const { context, page } = await newPage(browser, { width: 1440, height: 900, unread: 3 });
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await settle(page);
    await headerShot(page, "02-today-desktop-3unread");
    // hover: lean + glow
    const bell = await visibleBell(page);
    await bell.hover();
    await page.waitForTimeout(500);
    await bell.screenshot({ path: join(OUT, "03-bell-hover.png") });
    await context.close();
  }

  // 3 — Today, desktop, 12 unread (two-digit pill)
  {
    const { context, page } = await newPage(browser, { width: 1440, height: 900, unread: 12 });
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await settle(page);
    await headerShot(page, "04-today-desktop-12unread");
    await context.close();
  }

  // 4 — Today, phone, 3 unread (brand bar bell + profile button)
  {
    const { context, page } = await newPage(browser, { width: 390, height: 844, unread: 3 });
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await settle(page);
    await headerShot(page, "05-today-phone-3unread");
    await context.close();
  }

  // 5 — Today, phone, read
  {
    const { context, page } = await newPage(browser, { width: 390, height: 844, unread: 0 });
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await settle(page);
    await headerShot(page, "06-today-phone-read");
    await context.close();
  }

  // 6 — Mood, desktop, 3 unread (bell + gift + avatar row)
  {
    const { context, page } = await newPage(browser, { width: 1440, height: 900, unread: 3 });
    await page.goto(`${BASE}/mood`, { waitUntil: "networkidle" });
    await settle(page);
    await headerShot(page, "07-mood-desktop-3unread");
    await context.close();
  }

  // 7 — the sheet still opens from the new bell
  {
    const { context, page } = await newPage(browser, { width: 1440, height: 900, unread: 2 });
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await settle(page);
    await (await visibleBell(page)).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(OUT, "08-sheet-open.png") });
    await context.close();
  }

  // 8 — mid-ring: inject an arrival, catch the swing
  {
    const { context, page } = await newPage(browser, { width: 1440, height: 900, unread: 1 });
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await settle(page);
    await page.evaluate(() => {
      const raw = window.localStorage.getItem("bloom.notifications.v1") ?? "[]";
      const list = JSON.parse(raw);
      list.unshift({
        id: `qa-live-${Date.now()}`,
        at: new Date().toISOString(),
        kind: "habit",
        title: "Live arrival",
        body: "Injected mid-session to catch the ring.",
        url: "/",
        read: false,
      });
      window.localStorage.setItem("bloom.notifications.v1", JSON.stringify(list));
      window.dispatchEvent(new Event("bloom:center-changed"));
    });
    await page.waitForTimeout(280);
    const bell = await visibleBell(page);
    await bell.screenshot({ path: join(OUT, "09-bell-midring.png") });
    await context.close();
  }

  console.log(`bell-qa done → ${OUT}`);
} finally {
  await browser.close();
}
