import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Shell guard — Brief v6 Slice 2, pinned structurally.
 *
 * Four owner-visible defects, one guard each:
 *
 *  1. Every page had its own container measure (Today fluid, Trackers /
 *     Nutrition / Rewards 1280px, Profile 1040px, Mood / Cycle uncapped —
 *     M-127). v6 sets ONE: `--container: 1120px`, centred, 24px gutters,
 *     consumed through the `.page` class or the token by every page shell.
 *     This supersedes the 2026-11-17 "cards not wide enough" 1280px choice
 *     (M-76, resolved by v6). Document/content measures (the 880px
 *     clinician report, dialog widths, hero copy) are not page shells and
 *     are out of scope here.
 *  2. The floating "Reflect & log today" pill on Trackers covered content
 *     at three scroll positions (M-130). It is deleted; its one action —
 *     opening the MetricsEntryModal sheet — survives as a dock action in
 *     the global `.dock`, dispatched over the house window-event bus
 *     (the paywall.ts pattern), and TrackersPage opens the sheet with the
 *     exact handler the pill called.
 *  3. Touch targets under the 44px floor on coarse pointers: the Today
 *     hero chips (36px), the habit "…" menu trigger (36px), the habit
 *     "yesterday" chip (~28px), Nutrition chips (36px), rail links (~40px).
 *     The house pattern is a `@media (pointer: coarse)` block lifting the
 *     named classes to the floor; desktop density is untouched.
 *  4. One heading style: every page H1 in the serif display token. The
 *     census found exactly one outlier — Trackers' `.at-title` in bold
 *     sans (M-127). The guard re-runs the census so the next sans H1
 *     fails here first.
 */

const SRC = join(process.cwd(), "src");

function walk(dir: string, keep: (name: string) => boolean, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name.startsWith("_backup") || name === "node_modules") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, keep, out);
    /* Test files quote the patterns they guard against (this one included). */
    else if (keep(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

const toRel = (p: string) => p.slice(SRC.length + 1).split(sep).join("/");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

/** The first flat rule block for a selector: from `selector {` to its `}`. */
function ruleBlock(css: string, selector: string): string {
  return ruleBlocks(css, selector)[0] ?? "";
}

/** Every flat rule block for a selector (base rule + media overrides). */
function ruleBlocks(css: string, selector: string): string[] {
  const blocks: string[] = [];
  let from = 0;
  for (;;) {
    const start = css.indexOf(`${selector} {`, from);
    if (start === -1) return blocks;
    const end = css.indexOf("}", start);
    if (end === -1) return blocks;
    blocks.push(css.slice(start, end));
    from = end + 1;
  }
}

/** All `@media (pointer: coarse)` blocks in a stylesheet, brace-matched. */
function coarseBlocks(css: string): string {
  const blocks: string[] = [];
  let from = 0;
  for (;;) {
    const start = css.indexOf("@media (pointer: coarse)", from);
    if (start === -1) return blocks.join("\n");
    let depth = 0;
    let i = css.indexOf("{", start);
    const open = i;
    for (; i < css.length; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    blocks.push(css.slice(open, i + 1));
    from = i + 1;
  }
}

describe("Shell guard: one container (M-127, M-76 resolved by v6)", () => {
  it("the token exists and the .page class consumes it", () => {
    const css = read("styles.css");
    expect(css).toContain("--container: 1120px;");
    const page = ruleBlock(css, ".page");
    expect(page).toContain("max-width: var(--container)");
    expect(page).toContain("margin-inline: auto");
    expect(page).toContain("padding-inline: var(--space-5)");
  });

  it("every CSS page shell takes its measure from the token", () => {
    const shells: [string, string][] = [
      ["styles/trackers.css", ".at"],
      ["styles/nutrition.css", ".nut-wrap.nut-page"],
      ["styles/progression.css", ".pg-main"],
      ["styles/health-tools.css", ".bt-shell"],
      ["styles/cycle.css", ".ci-shell"],
    ];
    for (const [file, selector] of shells) {
      expect(
        ruleBlock(read(file), selector),
        `${selector} in ${file} must cap at var(--container)`,
      ).toContain("max-width: var(--container)");
    }
  });

  it("no stylesheet keeps a 1280px page measure", () => {
    const files = [...walk(join(SRC, "styles"), (n) => n.endsWith(".css")), join(SRC, "styles.css")];
    const offenders = files.filter((f) => /max-width:\s*1280px/.test(readFileSync(f, "utf8"))).map(toRel);
    expect(offenders, "the 1280px measure is superseded by --container (1120px)").toEqual([]);
  });

  it("the Tailwind-classed page shells carry the .page class", () => {
    const mains: [string, RegExp][] = [
      ["routes/index.tsx", /<main[^>]*className="[^"]*\bpage\b/],
      ["routes/profile.tsx", /<main[^>]*className="[^"]*\bpage\b/],
      ["routes/settings.tsx", /<main[^>]*className="[^"]*\bpage\b/],
      ["routes/dashboard.tsx", /className="page[^"]*"/],
      ["routes/admin/progression.tsx", /<main[^>]*className="[^"]*\bpage\b/],
      ["components/rewards/RewardsAdminPage.tsx", /<main[^>]*className="[^"]*\bpage\b/],
      ["components/mood/page/MoodPage.tsx", /className="[^"]*\bpage\b[^"]*space-y-10/],
      ["routes/trackers.tsx", /className="page[^"]*"[\s\S]{0,80}<HealthTools/],
    ];
    for (const [file, pattern] of mains) {
      expect(read(file), `${file}'s page shell must consume .page`).toMatch(pattern);
    }
  });

  it("no route keeps a literal page width (1040 / 1100 / 1200 / 1280)", () => {
    const files = walk(SRC, (n) => /\.tsx$/.test(n));
    const offenders = files
      .filter((f) => /max-w-\[(1040|1100|1200|1280)px\]/.test(readFileSync(f, "utf8")))
      .map(toRel);
    expect(offenders, "page widths come from .page / var(--container), never a literal").toEqual([]);
  });
});

describe("Shell guard: the floating pill is gone, its action lives in the dock (M-130)", () => {
  it("no source file names the pill or its dock", () => {
    const files = [
      ...walk(SRC, (n) => /\.tsx$/.test(n)),
      ...walk(join(SRC, "styles"), (n) => n.endsWith(".css")),
      join(SRC, "styles.css"),
    ];
    const offenders = files
      .filter((f) => /premium-action-dock|premium-log-cta/.test(readFileSync(f, "utf8")))
      .map(toRel);
    expect(offenders, "the floating pill was deleted in v6 Slice 2 — do not resurrect it").toEqual([]);
  });

  it("the metrics-entry bus exists (the paywall pattern)", () => {
    const bus = join(SRC, "lib", "trackers", "entrySheet.ts");
    expect(existsSync(bus), "src/lib/trackers/entrySheet.ts must exist").toBe(true);
    const text = readFileSync(bus, "utf8");
    expect(text).toContain("bloom:metrics-entry");
    expect(text).toContain("requestMetricsEntry");
    expect(text).toContain("onMetricsEntryRequest");
  });

  it("the dock carries the log action on the Trackers route only", () => {
    const orb = read("components/coach/CoachOrb.tsx");
    expect(orb).toContain("requestMetricsEntry");
    expect(orb).toContain('pathname === "/trackers"');
    expect(orb).toContain('className="dock__log"');
    expect(orb).toContain('aria-label="Reflect & log today"');
    /* Same 48px chrome as the back-to-top fab beside it. */
    expect(ruleBlock(read("styles.css"), ".dock__log")).toContain("height: 48px");
  });

  it("TrackersPage opens its sheet from the bus, with the pill's own handler", () => {
    const page = read("components/tk/TrackersPage.tsx");
    expect(page).toContain("onMetricsEntryRequest");
    expect(page).toContain("setSheetOpen(true)");
    expect(page).not.toContain("dockVisibility");
  });
});

describe("Shell guard: 44px touch floor on coarse pointers", () => {
  it("the shell coarse block lifts the named offenders", () => {
    const coarse = coarseBlocks(read("styles.css"));
    for (const selector of [".home-chip", ".home-habit-menu-btn", ".home-habit-yesterday-btn", ".app-nav-link"]) {
      const block = ruleBlock(coarse, selector);
      expect(block, `${selector} must reach the 44px floor on coarse pointers`).toMatch(
        /min-(height|width|block-size|inline-size):\s*(44px|var\(--bloom-touch-min\))/,
      );
    }
  });

  it("Nutrition chips reach the floor on coarse pointers", () => {
    const coarse = coarseBlocks(read("styles/nutrition.css"));
    expect(ruleBlock(coarse, ".nut-chip")).toMatch(/min-height:\s*(44px|var\(--bloom-touch-min\))/);
  });

  it("the habit offenders carry their expansion classes", () => {
    const habits = read("components/home/HabitsSection.tsx");
    expect(habits).toContain("home-habit-menu-btn");
    expect(habits).toContain("home-habit-yesterday-btn");
  });
});

describe("Shell guard: one heading style (M-127)", () => {
  it("Trackers' H1 is set in the display serif, not the sans", () => {
    const blocks = ruleBlocks(read("styles/trackers.css"), ".at-title");
    expect(blocks.join("\n")).toContain("font-family: var(--ci-font-display)");
    expect(blocks.join("\n")).not.toContain("--ci-font-sans");
  });

  it("the H1 census: every page heading class resolves to the display token", () => {
    const census: [string, string][] = [
      ["styles/cycle.css", ".ci-display"],
      ["styles/progression.css", ".pg-title"],
      ["styles/profile.css", ".pf-name"],
      ["styles/profile.css", ".pf-title"],
      ["styles/coach.css", ".coach-header-title"],
      ["styles/coach.css", ".coach-welcome-title"],
      ["styles/welcome.css", ".wl-title"],
      ["styles/access.css", ".ag-title"],
      ["styles/trackers.css", ".at-title"],
    ];
    for (const [file, selector] of census) {
      expect(
        ruleBlocks(read(file), selector).join("\n"),
        `${selector} in ${file} must set its H1 in the display serif`,
      ).toMatch(/font-family:\s*var\(--(ci-)?font-display/);
    }
  });
});
