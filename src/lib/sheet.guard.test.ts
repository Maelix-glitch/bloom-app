import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Mobile sheet guards (production item 53, the owner's standing rule from
 * 2026-11-14 — the Assessment sheet screenshot).
 *
 * A sheet or popup on a phone must never swallow the screen:
 *   1. content-height with a CAPPED max-height (~88dvh for bottom sheets),
 *      the dimmed page still visible above it — never a 100dvh / inset:0
 *      full-screen takeover;
 *   2. a solid opaque surface over a real backdrop — no translucent panel
 *      floating without one, nothing bleeding through.
 *
 * Same mechanism as `ui.guard.test.ts`: structural scans with
 * selector-precise pins for each sheet family, plus a census tripwire —
 * any component that hand-renders role="dialog" / aria-modal must be
 * classified below (as a sheet family held to the pins, or as a recorded
 * immersive surface) before this guard passes again.
 */

const SRC = join(process.cwd(), "src");

function walk(dir: string, keep: (name: string) => boolean, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name.startsWith("_backup") || name === "node_modules") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, keep, out);
    else if (keep(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

const toRel = (p: string) => p.slice(SRC.length + 1).split(sep).join("/");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");
const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, " ");

/* Innermost rule blocks of a stylesheet, comments stripped (as ui.guard). */
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

const blockWith = (rel: string, needle: string) =>
  blocks(read(rel)).find((b) => b.selector.includes(needle));

/* All blocks whose selector list names `sel` as a whole class —
   ".ssheet" must not match ".ssheet-backdrop" (the character after the
   class has to be a selector boundary, never a hyphen continuing the
   name). A selector chunk can carry residue from the previous rule or
   an enclosing @media, so the part that counts is its last line. A
   family often has several blocks for one selector (base rule, media
   overrides, reduced-motion), so callers assert over all of them. */
const blocksFor = (rel: string, sel: string) =>
  blocks(read(rel)).filter((b) =>
    b.selector.split(",").some((part) => {
      const p = part.split("\n").pop()!.trim();
      return p === sel || (p.startsWith(sel) && /[\s.:[]/.test(p.charAt(sel.length)));
    }),
  );
const someBlock = (rel: string, sel: string, needle: string) =>
  blocksFor(rel, sel).some((b) => b.body.includes(needle));

/** The stylesheets that carry sheet families (immersive-surface CSS is
 *  deliberately outside the height scan: a camera or story editor is a
 *  page replacement, not a sheet — see the census below). */
const SHEET_CSS = [
  "styles/bloom-sheet.css",
  "styles/nutrition.css",
  "styles/stories.css",
  "styles/orb.css",
  "styles/coach.css",
  "styles/add-habit-modal.css",
  "styles/admin-panel.css",
  "styles/trackers.css",
  "styles/responsive.css",
];

describe("sheet guard: every sheet family is height-capped", () => {
  it("BloomSheet caps the phone sheet at 88dvh and the pop at 84dvh", () => {
    const phone = blocks(read("styles/bloom-sheet.css")).filter((b) =>
      b.selector.includes(".bsheet.bsheet--phone"),
    );
    expect(
      phone.some((b) => b.body.includes("max-height: 88dvh")),
      ".bsheet--phone must cap at 88dvh",
    ).toBe(true);
    const pop = blocks(read("styles/bloom-sheet.css")).filter((b) =>
      b.selector.includes(".bsheet.bsheet--pop"),
    );
    expect(
      pop.some((b) => b.body.includes("max-height: 84dvh")),
      ".bsheet--pop must cap at 84dvh",
    ).toBe(true);
  });

  it("the Radix dialog and sheet primitives cap their panels", () => {
    expect(read("components/ui/dialog.tsx")).toContain("max-h-[92dvh]");
    const sheet = read("components/ui/sheet.tsx");
    /* bottom/top sheets grow from an edge, so the primitive itself must
       carry the cap — a call site that forgets cannot take the screen. */
    expect(sheet).toMatch(/top:\s*"[^"]*max-h-\[88dvh\]/);
    expect(sheet).toMatch(/bottom:\s*"[^"]*max-h-\[88dvh\]/);
  });

  it("responsive.css keeps the 88dvh phone net under dialogs and side sheets", () => {
    const css = read("styles/responsive.css");
    const dialog = blocks(css).filter((b) => b.selector.includes('[data-bloom-dialog="true"]'));
    expect(
      dialog.some((b) => b.body.includes("max-height: 88dvh")),
      "phone dialogs must convert to 88dvh bottom cards",
    ).toBe(true);
    const side = blocks(css).filter((b) => b.selector.includes('[data-bloom-side="right"]'));
    expect(
      side.some((b) => b.body.includes("max-height: 88dvh")),
      "phone side sheets must convert to 88dvh bottom sheets",
    ).toBe(true);
  });

  it("the custom sheet families keep their caps", () => {
    expect(someBlock("styles/nutrition.css", ".nut-dialog-panel", "max-height: 88dvh")).toBe(true);
    expect(someBlock("styles/nutrition.css", ".nut-lightbox-panel", "max-height: 88dvh")).toBe(
      true,
    );
    expect(someBlock("styles/stories.css", ".ssheet", "max-height: 82dvh")).toBe(true);
    expect(someBlock("styles/orb.css", ".coach-orb-panel", "max-height: 88dvh")).toBe(true);
    expect(someBlock("styles/coach.css", ".coach-palette", "max-height:")).toBe(true);
    expect(someBlock("styles/admin-panel.css", ".adm-panel", "88dvh")).toBe(true);
    const habit = blocks(read("styles/add-habit-modal.css")).filter((b) =>
      b.selector.includes(".bloom-add-habit .modal"),
    );
    expect(
      habit.some((b) => /max-height:\s*\d+dvh/.test(b.body)),
      "the add-habit modal must keep a dvh cap",
    ).toBe(true);
  });
});

describe("sheet guard: every sheet family has a real backdrop", () => {
  it("each family's backdrop/scrim paints a dimmed background", () => {
    const cases: [string, string][] = [
      ["styles/bloom-sheet.css", ".bsheet-backdrop"],
      ["styles/nutrition.css", ".nut-dialog-backdrop"],
      ["styles/stories.css", ".ssheet-backdrop"],
      ["styles/orb.css", ".coach-orb-backdrop"],
      ["styles/coach.css", ".coach-palette-backdrop"],
      ["styles/admin-panel.css", ".adm-scrim"],
      ["styles/add-habit-modal.css", ".bloom-add-habit .backdrop"],
    ];
    for (const [rel, sel] of cases) {
      expect(blocksFor(rel, sel).length, `${rel} must define ${sel}`).toBeGreaterThan(0);
      expect(
        someBlock(rel, sel, "background:"),
        `${sel} must paint a background`,
      ).toBe(true);
    }
  });

  it("the Radix primitives render their overlay with the panel", () => {
    expect(read("components/ui/dialog.tsx")).toContain("bg-background/70");
    const sheet = read("components/ui/sheet.tsx");
    expect(sheet).toContain("bg-background/70");
    expect(sheet).toContain("<SheetOverlay />");
  });
});

describe("sheet guard: no sheet surface is sized to the full viewport", () => {
  it("no sheet stylesheet declares a 100vh/100dvh height", () => {
    const offenders: string[] = [];
    for (const rel of SHEET_CSS) {
      const clean = stripComments(read(rel));
      /* `@supports (height: 100dvh)` is a feature query, not a size —
         the paren before `height` keeps it out of this match. Page
         roots may floor themselves with min-height: 100dvh (a layout
         floor, e.g. .tk2-root); the takeover is a panel SIZED to the
         viewport, so only height / max-height are banned. */
      for (const m of clean.matchAll(/(?:^|[;\s])((?:max-)?height:\s*100(?:dvh|vh))\b/gm)) {
        offenders.push(`${rel}: ${m[1]}`);
      }
    }
    expect(
      offenders,
      `a sheet sized to the full viewport is a takeover: ${offenders.join(", ")}`,
    ).toEqual([]);
  });
});

/**
 * The dialog census. Every component file that hand-renders a dialog is
 * classified: SHEETS are held to the family pins above; IMMERSIVE entries
 * are full-screen surfaces by design (page replacements and
 * editor-internal surfaces, each with its reason recorded) and are not
 * sheets. A new dialog file fails this guard until a human classifies it
 * and, if it is a sheet, pins its family above.
 */
const SHEET_FILES = new Map<string, string>([
  ["components/coach/QuickPalette.tsx", "coach-palette family (coach.css)"],
  ["components/nutrition/AddFoodSheet.tsx", "nut-dialog family (nutrition.css)"],
  ["components/nutrition/FoodCaptureSheet.tsx", "nut-dialog family (nutrition.css)"],
  ["components/nutrition/DishPhoto.tsx", "nut-lightbox family (nutrition.css)"],
  ["components/nutrition/FoodPhoto.tsx", "nut-lightbox family (nutrition.css)"],
  ["components/stories/StorySheet.tsx", "ssheet family (stories.css)"],
  ["components/tk/AddHabitModal.tsx", "add-habit modal family (add-habit-modal.css)"],
  ["components/welcome/AdminPanel.tsx", "adm family (admin-panel.css)"],
]);
const IMMERSIVE_FILES = new Map<string, string>([
  ["components/coach/CoachCamera.tsx", "full-screen camera capture"],
  ["components/progression/RankCeremony.tsx", "ceremony scrim, centred capped content"],
  ["components/rewards/RewardClaimCinematic.tsx", "full-screen claim cinematic stage"],
  ["components/stories/CameraCapture.tsx", "full-screen camera capture"],
  ["components/stories/StoryArchive.tsx", "full-screen archive surface"],
  ["components/stories/StoryCreator.tsx", "full-screen story creator"],
  ["components/stories/StoryEditor.tsx", "full-screen story editor"],
  ["components/stories/StoryViewer.tsx", "full-screen story viewer"],
  ["components/stories/TemplateBrowser.tsx", "editor-internal full-screen template picker"],
  ["components/stories/TextTool.tsx", "editor-internal text tool layer"],
  ["components/welcome/Welcome.tsx", "first-run onboarding — a page replacement"],
]);

describe("sheet guard: dialog census", () => {
  it("every hand-rendered dialog is classified as a sheet family or a recorded immersive surface", () => {
    const files = [
      ...walk(join(SRC, "components"), (n) => n.endsWith(".tsx")),
      ...walk(join(SRC, "routes"), (n) => n.endsWith(".tsx")),
    ];
    const unclassified: string[] = [];
    for (const full of files) {
      const text = readFileSync(full, "utf8");
      if (!/role="dialog"|aria-modal/.test(text)) continue;
      const rel = toRel(full);
      if (!SHEET_FILES.has(rel) && !IMMERSIVE_FILES.has(rel)) unclassified.push(rel);
    }
    expect(
      unclassified,
      `unclassified dialog(s): ${unclassified.join(", ")} — classify in sheet.guard.test.ts ` +
        "and pin the family cap + backdrop if it is a sheet",
    ).toEqual([]);
  });

  it("classified sheet files do not size themselves to the viewport", () => {
    const offenders: string[] = [];
    for (const rel of SHEET_FILES.keys()) {
      const text = read(rel);
      for (const m of text.matchAll(/\b(?:max-h|h)-\[100(?:dvh|vh)\]|\bmax-h-screen\b|\bh-screen\b/g)) {
        offenders.push(`${rel}: ${m[0]}`);
      }
    }
    expect(offenders, `sheet files must cap below the viewport: ${offenders.join(", ")}`).toEqual(
      [],
    );
  });
});
