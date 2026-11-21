import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Premium Pass 3 guards (M-210..M-212) — the owner's directive
 * (2026-11-21): more premiumness and structure, Apple-professional
 * finish, more spacing; the Trackers targets redesigned; the
 * Settings icons replaced with a high-quality family. These pins
 * name the surfaces the pages actually render (the M-176 lesson):
 *
 *   1. The Targets display list (Targets.tsx renders it) carries the
 *      designed row: glyph medallion, figure/unit split, progress
 *      whisper — and trackers.css styles those exact classes in the
 *      cascade-end M-210 block, in tokens.
 *   2. Every Settings row glyph comes from the one drawn family
 *      (SettingsIcons.tsx: 24px grid, 1.5px stroke, 20px render);
 *      no settings component imports the stock icon set any more.
 *   3. The section rhythm is tokens at the shared steps: Settings /
 *      Profile sections at --space-10, Rewards sections at the
 *      content pages' --space-14 (was a lone 5.5rem literal).
 */

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

const TARGETS_TSX = read("components/tk/Targets.tsx");
const TRACKERS_CSS = read("styles/trackers.css");
const ICONS = read("components/profile/SettingsIcons.tsx");

const m210 = TRACKERS_CSS.indexOf("Premium Pass 3 (M-210)");
const BLOCK210 = m210 >= 0 ? TRACKERS_CSS.slice(m210) : "";

describe("premium pass 3 — trackers targets (M-210)", () => {
  it("the M-210 block exists at the cascade end of trackers.css", () => {
    expect(m210).toBeGreaterThan(TRACKERS_CSS.indexOf("De-box COMPLETE — Trackers (M-190"));
  });

  it("the rendered row carries the designed parts", () => {
    expect(TARGETS_TSX).toContain('className="tk2-targets-display"');
    expect(TARGETS_TSX).toContain("tk2-target-glyph");
    expect(TARGETS_TSX).toContain("tk2-target-figure");
    expect(TARGETS_TSX).toContain("tk2-target-unit");
    expect(TARGETS_TSX).toContain("tk2-target-track");
  });

  it("the block styles those classes, in tokens", () => {
    expect(BLOCK210).toContain(".tk2-root .tk2-target-glyph");
    expect(BLOCK210).toContain("padding: var(--space-4) 0;");
    expect(BLOCK210).toContain("font-size: var(--text-title);");
    expect(BLOCK210).toContain("font-variant-numeric: tabular-nums;");
    expect(BLOCK210).toContain(".tk2-root .tk2-targets-edit");
  });

  it("progress is the core's own figure, never a new computation", () => {
    expect(TARGETS_TSX).toContain("store.analysis?.trackers[def.id]");
    expect(TARGETS_TSX).toContain("stat.progress");
  });
});

describe("premium pass 3 — settings icon family (M-211)", () => {
  it("the family is one grid, one stroke, one render size", () => {
    expect(ICONS).toContain('viewBox="0 0 24 24"');
    expect(ICONS).toContain("strokeWidth={1.5}");
    expect(ICONS).toContain('className = "size-5"');
    expect(ICONS).toContain("strokeLinecap=\"round\"");
  });

  it("no settings component imports the stock icon set", () => {
    for (const rel of [
      "components/profile/AccountRow.tsx",
      "components/profile/AccountSettings.tsx",
      "components/profile/ConsentSection.tsx",
      "components/profile/TrustSection.tsx",
      "components/profile/SessionsSection.tsx",
    ]) {
      expect(read(rel), rel).not.toContain("lucide-react");
    }
  });

  it("the rows render family glyphs", () => {
    expect(read("components/profile/AccountRow.tsx")).toContain("IconMail");
    expect(read("components/profile/ConsentSection.tsx")).toContain("IconShieldCheck");
    expect(read("components/profile/SessionsSection.tsx")).toContain("IconDevices");
  });
});

describe("premium pass 3 — section rhythm (M-212)", () => {
  it("profile/settings sections breathe at the 40px token step", () => {
    const profile = read("styles/profile.css");
    const bodies = [...profile.matchAll(/\.pf-section \{([^}]*)\}/g)].map((m) => m[1]);
    expect(bodies.join("\n")).toContain("margin-top: var(--space-10);");
    expect(bodies.join("\n")).not.toContain("margin-top: var(--space-6);");
  });

  it("rewards sections join the content pages' 56px token step", () => {
    const progression = read("styles/progression.css");
    const bodies = [...progression.matchAll(/\.pg-section \{([^}]*)\}/g)].map((m) => m[1]);
    expect(bodies.join("\n")).toContain("margin-top: var(--space-14);");
    /* The rendered rhythm rides the reveal wrapper (the section's own
       margin is zeroed inside it) — pin the wrapper too, so the guard
       cannot pass against a surface the page does not use. */
    const reveals = [...progression.matchAll(/\.pg-reveal \{([^}]*)\}/g)].map((m) => m[1]);
    expect(reveals.join("\n")).toContain("margin-top: var(--space-14);");
    expect(reveals.join("\n")).toContain("margin-top: var(--space-12);");
    expect(progression).not.toContain("margin-top: 5.5rem");
    expect(progression).not.toContain("margin-top: 4rem");
  });

  it("settings sections no longer stack a utility margin on the rhythm", () => {
    expect(read("components/profile/AccountSettings.tsx")).not.toContain("pf-jump mt-10");
  });
});
