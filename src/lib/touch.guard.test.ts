import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Touch-floor guard (M-202, Final Audit F-11).
 *
 * Every interactive control meets a 44px touch floor on both axes —
 * the floor the house already states as --bloom-touch-min. The audit
 * found the floor applied unevenly: whole families (Coach chips,
 * Profile buttons, the Stories editor, sheet controls) sat at
 * 26–40px, or met 44px only inside a phone/coarse-pointer media block
 * while desktop and tablet pointers got the small size.
 *
 * Two honest ways to meet the floor, both pinned here the way the
 * cascade actually resolves them:
 *   - GROW: a text control takes a min-height/min-width (or outright
 *     size) of 44px in a block that comes AFTER every sub-44 sizing
 *     block for that selector in its home stylesheet — order is what
 *     wins at equal specificity, so "a 44px rule exists somewhere" is
 *     not enough; the floor must be the last word.
 *   - TAP AREA: a glyph-sized control keeps its drawn size and grows
 *     an invisible ::after tap area (the pattern .sv-icon-btn and
 *     .se-rz already used); the exact inset is pinned per control.
 */

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");
const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, " ");

/* Innermost rule blocks of a stylesheet, comments stripped (as sheet.guard). */
function blocks(text: string): { selector: string; body: string }[] {
  const clean = stripComments(text);
  const out: { selector: string; body: string }[] = [];
  let prev = 0;
  for (const m of clean.matchAll(/\{([^{}]*)\}/g)) {
    out.push({ selector: clean.slice(prev, m.index).trim(), body: m[1]! });
    prev = m.index + m[0].length;
  }
  return out;
}

const blocksFor = (rel: string, sel: string) =>
  blocks(read(rel)).filter((b) =>
    b.selector.split(",").some((part) => {
      const p = part.split("\n").pop()!.trim();
      return p === sel || (p.startsWith(sel) && /[\s.:[]/.test(p.charAt(sel.length)));
    }),
  );

/* Remove @media / @supports blocks (balanced braces) so a check can
   ask what holds UNCONDITIONALLY — a floor that only applies inside a
   phone or coarse-pointer media block is not a floor for everyone. */
function stripAtBlocks(text: string): string {
  const clean = stripComments(text);
  let out = "";
  let i = 0;
  while (i < clean.length) {
    const at = clean.slice(i).search(/@(media|supports)\b/);
    if (at === -1) {
      out += clean.slice(i);
      break;
    }
    out += clean.slice(i, i + at);
    const open = clean.indexOf("{", i + at);
    if (open === -1) break;
    let depth = 0;
    let j = open;
    for (; j < clean.length; j++) {
      if (clean[j] === "{") depth++;
      else if (clean[j] === "}") {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }
    i = j;
  }
  return out;
}

const blocksForUnconditional = (rel: string, sel: string) =>
  blocks(stripAtBlocks(read(rel))).filter((b) =>
    b.selector.split(",").some((part) => {
      const p = part.split("\n").pop()!.trim();
      return p === sel || (p.startsWith(sel) && /[\s.:[]/.test(p.charAt(sel.length)));
    }),
  );

/* Every px size a block declares on one axis (height + min-height, or
   width + min-width). The two size tokens resolve to their values. */
function axisSizes(body: string, axis: "height" | "width"): number[] {
  const out: number[] = [];
  const re = new RegExp(`(?:^|;)\\s*(?:min-)?${axis}\\s*:\\s*([^;]+)`, "g");
  for (const m of body.matchAll(re)) {
    const v = m[1]!.trim();
    if (v === "var(--bloom-touch-min)") out.push(44);
    else if (v === "var(--icon-btn-sm)") out.push(36);
    else {
      const px = /^(\d+(?:\.\d+)?)px$/.exec(v);
      if (px) out.push(parseFloat(px[1]!));
    }
  }
  return out;
}

/** The floor wins: some UNCONDITIONAL block (media blocks stripped —
 *  a phone-only floor is not a floor) sizes the axis at >= 44px, and
 *  no unconditional block after it sizes the axis below 44px. */
function floorWins(rel: string, sel: string, axis: "height" | "width"): boolean {
  const bs = blocksForUnconditional(rel, sel);
  let lastFloor = -1;
  let lastSub = -1;
  bs.forEach((b, i) => {
    const sizes = axisSizes(b.body, axis);
    if (sizes.some((s) => s >= 44)) lastFloor = i;
    if (sizes.some((s) => s > 0 && s < 44)) lastSub = i;
  });
  return lastFloor >= 0 && lastFloor > lastSub;
}

const GROWN: [string, string, ("height" | "width")[]][] = [
  ["styles/coach.css", ".coach-log-chip", ["height"]],
  ["styles/profile.css", ".pf-btn", ["height"]],
  ["styles/profile.css", ".pf-icon-btn", ["height", "width"]],
  ["styles/profile.css", ".pf-confirm-btn", ["height"]],
  ["styles/profile.css", ".pf-note-btn", ["height"]],
  ["styles/profile.css", ".pf-out-btn", ["height"]],
  ["styles/stories.css", ".se-tab", ["height"]],
  ["styles/stories.css", ".se-mini-btn", ["height"]],
  ["styles/stories.css", ".se-palette-chip", ["height"]],
  ["styles/trackers.css", ".at-territory-actions button", ["height", "width"]],
  ["styles/trackers.css", ".at-body-link", ["height"]],
  ["styles/trackers.css", ".tk2-active-toggle", ["height"]],
  ["styles/nutrition.css", ".nut-chip", ["height"]],
  ["styles/billing.css", ".bill-toggle button", ["height"]],
  ["styles/bloom-sheet.css", ".bsheet-icon", ["height", "width"]],
  ["styles/bloom-sheet.css", ".bsheet-ghost", ["height"]],
  ["styles/household.css", ".hh-btn-quiet", ["height"]],
  ["styles/shell.css", ".conn-notice-chip", ["height", "width"]],
  ["styles/shell.css", ".ncenter-clear", ["height"]],
];

/* [stylesheet, ::after selector, pinned inset] — drawn size + the
   inset's reach on the short axis reaches the 44px floor. */
const TAP_AREAS: [string, string, string][] = [
  ["styles/coach.css", ".coach-sidebar-toggle::after", "inset: -7px"],
  ["styles/coach.css", ".coach-mode-chip::after", "inset: -7px 0"],
  ["styles/coach.css", ".coach-palette-btn::after", "inset: -5px 0"],
  ["styles/coach.css", ".coach-context-chip::after", "inset: -6px 0"],
  ["styles/coach.css", ".coach-panel-tab::after", "inset: -6px 0"],
  ["styles/stories.css", ".se-mask-chip::after", "inset: -7px -9px"],
  ["styles/stories.css", ".se-frame-chip::after", "inset: -7px -9px"],
  ["styles/stories.css", ".se-op-btn::after", "inset: -5px"],
  ["styles/stories.css", ".se-slide-chip::after", "inset: -10px -8px"],
  ["styles/stories.css", ".se-slide-btn::after", "inset: -9px"],
  ["styles/orb.css", ".coach-orb-icon-btn::after", "inset: -5px"],
  ["styles/add-habit-modal.css", ".bloom-add-habit .modal-close::after", "inset: -5px"],
  ["styles/add-habit-modal.css", ".bloom-add-habit .step-btn::after", "inset: -7px"],
  ["styles/add-habit-modal.css", ".bloom-add-habit .swatch::after", "inset: -7px"],
];

describe("touch guard: the 44px floor wins the cascade (M-202, F-11)", () => {
  it("the floor token itself is 44px", () => {
    expect(read("styles/responsive.css")).toContain("--bloom-touch-min: 44px");
  });

  for (const [rel, sel, axes] of GROWN) {
    it(`${sel} grows to the floor (${rel})`, () => {
      for (const axis of axes) {
        expect(
          floorWins(rel, sel, axis),
          `${sel} in ${rel}: the last ${axis} sizing must be >= 44px`,
        ).toBe(true);
      }
    });
  }

  for (const [rel, sel, inset] of TAP_AREAS) {
    it(`${sel} carries its tap area (${rel})`, () => {
      const bodies = blocksFor(rel, sel).map((b) => b.body);
      expect(
        bodies.some((body) => body.includes(inset) && body.includes('content: ""')),
        `${sel} in ${rel}: expected a ::after tap area with ${inset}`,
      ).toBe(true);
    });
  }

  it("the already-compliant tap areas keep theirs", () => {
    const iconBtn = blocksFor("styles/stories.css", ".sv-icon-btn::after").map((b) => b.body);
    expect(iconBtn.some((body) => body.includes("inset: -3px"))).toBe(true);
    const rz = blocksFor("styles/stories.css", ".se-rz::after").map((b) => b.body);
    expect(rz.some((body) => body.includes("inset: -9px"))).toBe(true);
  });

  it("no utility class shrinks a sheet ghost button under the floor", () => {
    expect(read("components/profile/ProfileEditor.tsx")).not.toContain("bsheet-ghost h-8");
  });
});
