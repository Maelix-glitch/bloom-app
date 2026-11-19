import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Plan B information-architecture guards (senior diagnosis slice 5).
 *
 * This file REPLACES profileNav.guard.test.ts. That guard pinned Plan A
 * (senior audit slice C): a pill-chip account nav stacked on /profile.
 * Plan A was an interim stage — the owner chose Plan B on 2026-11-18
 * (rulebook §10.1 PG4: graduate to a separate Settings page), so the
 * chip nav is gone by decision, not by drift, and its guard retired
 * with it. What must not drift now is the Plan B contract:
 *   1. /settings is a real route rendering the moved sections, in
 *      order, under their original section ids (anchors survive);
 *   2. /profile renders none of the account sections any more, and
 *      groups its health content under a named Health region, with
 *      the assessment keeping #pf-assessment (the getting-started
 *      card's pinned anchor);
 *   3. the sidebar's Settings gear points at /settings;
 *   4. the Nutrition today view carries a sub-nav whose chips land on
 *      real section anchors, with a jump margin clearing the chrome.
 */

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");
const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, " ");

const profile = read("routes/profile.tsx");
const settings = read("routes/settings.tsx");
const accountSettings = read("components/profile/AccountSettings.tsx");
const sidebar = read("components/home/HomeSidebar.tsx");
const nutritionPage = read("components/nutrition/NutritionPage.tsx");
const profileCss = stripComments(read("styles/profile.css"));
const nutritionCss = stripComments(read("styles/nutrition.css"));

const SECTION_IDS = [
  "pf-account-data",
  "pf-membership",
  "pf-trainer",
  "pf-household",
  "pf-sessions",
];

describe("Plan B: settings is its own route, holding the moved sections", () => {
  it("the /settings route exists and renders AccountSettings", () => {
    expect(existsSync(join(SRC, "routes", "settings.tsx"))).toBe(true);
    expect(settings).toContain('createFileRoute("/settings")');
    expect(settings).toContain("<AccountSettings");
  });

  it("AccountSettings mounts the five sections under their original ids, in order", () => {
    const positions = SECTION_IDS.map((id) => accountSettings.indexOf(`id="${id}"`));
    for (const pos of positions) expect(pos).toBeGreaterThan(-1);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    for (const component of [
      "<AccountRow",
      "<PremiumSection",
      "<TrainerSection",
      "<HouseholdSection",
      "<SessionsSection",
    ]) {
      expect(accountSettings).toContain(component);
    }
  });

  it("the moved sections keep their .pf-jump clearance", () => {
    const margins = [...profileCss.matchAll(/\.pf-jump\s*\{\s*scroll-margin-top:\s*(\d+)px/g)].map(
      (m) => Number(m[1]),
    );
    expect(margins.length).toBe(2);
    expect(margins[0]).toBeGreaterThanOrEqual(60);
    expect(margins[1]).toBeGreaterThanOrEqual(120);
  });
});

describe("Plan B: profile is identity, story, record and health", () => {
  it("renders none of the account sections or the Plan A chip nav", () => {
    for (const gone of [
      "ACCOUNT_NAV",
      "pf-account-nav",
      "<AccountRow",
      "<PremiumSection",
      "<TrainerSection",
      "<HouseholdSection",
      "<SessionsSection",
      ...SECTION_IDS.map((id) => `id="${id}"`),
    ]) {
      expect(profile, `profile.tsx still carries ${gone}`).not.toContain(gone);
    }
  });

  it("groups the health content under a Health region, assessment anchor intact", () => {
    expect(profile).toContain('aria-label="Health"');
    expect(profile).toContain('id="pf-assessment"');
    const healthAt = profile.indexOf('aria-label="Health"');
    const assessmentAt = profile.indexOf('id="pf-assessment"');
    const labsAt = profile.indexOf('aria-label="Lab reports"');
    expect(healthAt).toBeGreaterThan(-1);
    expect(assessmentAt).toBeGreaterThan(healthAt);
    expect(labsAt).toBeGreaterThan(assessmentAt);
  });
});

describe("Plan B: entry points", () => {
  it("the sidebar Settings gear points at /settings", () => {
    const gear = /<Link\s+to="(\/settings|\/profile)"\s+aria-label="Settings"/.exec(sidebar);
    expect(gear).not.toBeNull();
    expect(gear![1]).toBe("/settings");
  });

  it("the settings page links back to the profile", () => {
    expect(settings).toContain('to="/profile"');
  });
});

describe("Plan B: nutrition sub-navigation", () => {
  const entries = [...nutritionPage.matchAll(/href="#(nut-[a-z-]+)"/g)].map((m) => m[1]!);
  const anchors = [...nutritionPage.matchAll(/id="(nut-[a-z-]+)"/g)].map((m) => m[1]!);

  it("renders the sub-nav with an entry for each anchored section", () => {
    expect(nutritionPage).toContain('aria-label="Nutrition sections"');
    expect(entries).toEqual(["nut-plan", "nut-grocery", "nut-modes", "nut-programmes", "nut-dishes"]);
    expect(anchors).toEqual(entries);
  });

  it("jump margins clear the fixed brand bar", () => {
    const jump = /\.nut-jump\s*\{\s*scroll-margin-top:\s*(\d+)px/.exec(nutritionCss);
    expect(jump).not.toBeNull();
    expect(Number(jump![1])).toBeGreaterThanOrEqual(60);
  });

  it("sub-nav chips keep the touch floor", () => {
    const rule = /\.nut-subnav \.nut-chip\s*\{([^}]*)\}/.exec(nutritionCss);
    expect(rule).not.toBeNull();
    expect(rule![1]).toContain("min-height: var(--bloom-touch-min)");
  });
});
