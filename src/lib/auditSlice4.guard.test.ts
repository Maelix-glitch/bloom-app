// @vitest-environment jsdom
/**
 * M-205 (Final Audit Slice 4 — Surface Pass) guards.
 *
 * Each pin is written against the rule or markup the page ACTUALLY
 * renders (the house cascade lesson): the winning CSS block, the
 * rendered component's own source. Behavioural pins for F-28, F-13,
 * F-30 and F-37 live beside their components (MomentsGrid.test.tsx,
 * CoachThread.attribution.test.tsx, AssessmentEntry.test.tsx,
 * PaywallSheet.test.tsx); this file carries the CSS/source pins for
 * the rest of the slice and the F-25 masking unit tests.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { maskEmail } from "@/components/rewards/RewardsAdminPage";

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

const WELCOME_CSS = read("styles/welcome.css");
const INVITE_CSS = read("styles/invite.css");
const STYLES_CSS = read("styles.css");
const CYCLE_CSS = read("styles/cycle.css");
const PROGRESSION_CSS = read("styles/progression.css");
const PROFILE_HERO = read("components/profile/ProfileHero.tsx");
const LOG_PANEL = read("components/ci/LogPanel.tsx");
const ADMIN_PROGRESSION = read("routes/admin/progression.tsx");
const REWARDS_ADMIN = read("components/rewards/RewardsAdminPage.tsx");
const GOALS = read("components/progression/Goals.tsx");
const BLOOM_HEADER = read("components/BloomHeader.tsx");
const SUMMARY_VIEW = read("components/assessment/AssessmentSummaryView.tsx");

/** The LAST rule block for a selector — the one that wins the cascade. */
function lastRule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...css.matchAll(new RegExp(`${escaped} \\{([^}]*)\\}`, "g"))];
  return matches.length ? (matches[matches.length - 1]?.[1] ?? "") : "";
}

describe("F-29 — no placeholder bio on the hero", () => {
  it("the placeholder sentence is gone and the line renders only with a bio", () => {
    expect(PROFILE_HERO).not.toContain("A line about you");
    expect(PROFILE_HERO).toContain("identity.bio ?");
  });
});

describe("F-33 — the waiting Welcome CTA stays readable", () => {
  it("the disabled rule no longer fades the whole pill", () => {
    const rule = lastRule(WELCOME_CSS, ".wl-next:disabled");
    expect(rule).not.toContain("0.38");
    expect(rule).toContain("opacity: 1");
    expect(rule).toContain("cursor: not-allowed");
  });
});

describe("F-35 — gate confirmation email and placeholder", () => {
  it("the sent-state email cannot wrap mid-domain", () => {
    const rule = lastRule(INVITE_CSS, ".ag-email");
    expect(rule).toContain("word-break: normal");
    expect(rule).toContain("white-space: nowrap");
  });
  it("the field placeholder reads at the raised mix", () => {
    const rule = lastRule(INVITE_CSS, ".ag-input::placeholder");
    expect(rule).toContain("82%");
  });
});

describe("F-36 — summary stat rows share one baseline", () => {
  it("the summary modifier carries the grid, size step and hairline", () => {
    expect(SUMMARY_VIEW).toContain("vstats--summary");
    expect(lastRule(STYLES_CSS, ".vstats--summary .vstat")).toContain(
      "grid-template-rows: 1fr auto",
    );
    expect(lastRule(STYLES_CSS, ".vstats--summary .vstat b")).toContain(
      "font-size: var(--text-card)",
    );
    /* The base .vstats--summary rule (not the media-query restatement)
       carries the hairline. */
    const summaryBlocks = [
      ...STYLES_CSS.matchAll(/\.vstats--summary \{([^}]*)\}/g),
    ].map((m) => m[1] ?? "");
    expect(summaryBlocks.some((b) => b.includes("border-bottom: 1px solid"))).toBe(true);
    expect(STYLES_CSS).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
  });
});

describe("F-31 — one scale shape in the cycle log panel", () => {
  it("the symptom counter is computed from the set the chips show", () => {
    expect(LOG_PANEL).toContain("symptoms.length}/{SYMPTOMS.length}");
    expect(LOG_PANEL).not.toContain("symptoms.length}/12");
  });
  it("scale groups use the even grid; numeric scales are circles", () => {
    expect(LOG_PANEL.match(/ci-seg--grid/g)?.length).toBe(3);
    expect(LOG_PANEL.match(/ci-seg-item--scale/g)?.length).toBe(2);
    expect(lastRule(CYCLE_CSS, ".ci-seg--grid")).toContain("display: grid");
    expect(lastRule(CYCLE_CSS, ".ci-seg--grid")).toContain("repeat(var(--ci-seg-cols, 5)");
    const scale = lastRule(CYCLE_CSS, ".ci-seg-item--scale");
    expect(scale).toContain("border-radius: 50%");
    expect(scale).toContain("aspect-ratio: 1");
  });
});

describe("F-24 — the point audit reads in plain words", () => {
  it("ids ride in title attributes; names and titles stand alone", () => {
    expect(ADMIN_PROGRESSION).toContain("title={row.profile_id}");
    expect(ADMIN_PROGRESSION).toContain("title={row.ref_id}");
    expect(ADMIN_PROGRESSION).not.toContain("row.profile_id.slice(0, 8)");
    expect(ADMIN_PROGRESSION).not.toContain("<code");
    expect(ADMIN_PROGRESSION).toContain("checked by the server against the");
  });
});

describe("F-25 — reward admin: masking + draft grouping", () => {
  it("maskEmail keeps the first letter and the domain", () => {
    expect(maskEmail("singh0500aashi@gmail.com")).toBe("s•••@gmail.com");
    expect(maskEmail("a@x.io")).toBe("a•••@x.io");
    expect(maskEmail("not-an-email")).toBe("not-an-email");
  });
  it("lists render the masked form with the full address in title", () => {
    expect(REWARDS_ADMIN).toContain("maskEmail(user.email)");
    expect(REWARDS_ADMIN).toContain("title={user.email ?? undefined}");
    expect(REWARDS_ADMIN).toContain("title={user?.email ?? undefined}");
  });
  it("same-title drafts group behind one disclosure", () => {
    expect(REWARDS_ADMIN).toContain("draft-group");
    expect(REWARDS_ADMIN).toContain("drafts with this title");
    expect(REWARDS_ADMIN).toContain("aria-expanded={open}");
  });
});

describe("F-38 — rewards goals: collapsed filters, segmented sorts", () => {
  it("the filter row lives behind a disclosure; the row's closed state is pinned", () => {
    expect(GOALS).toContain("pg-filter-toggle");
    expect(GOALS).toContain("hidden={!filtersOpen}");
    expect(GOALS).toContain("activeFilterLabel");
    expect(lastRule(PROGRESSION_CSS, ".pg-chip-row[hidden]")).toContain("display: none");
  });
  it("the sorts render as one segmented control", () => {
    expect(GOALS).toContain('className="pg-seg"');
    expect(lastRule(PROGRESSION_CSS, ".pg-seg")).toContain("display: inline-flex");
  });
});

describe("F-39 — the legacy header names its section once", () => {
  it("/dashboard gets its own section label instead of a second 'Bloom'", () => {
    expect(BLOOM_HEADER).toContain("dashboardActive");
    expect(BLOOM_HEADER).toContain('"Dashboard"');
  });
});
