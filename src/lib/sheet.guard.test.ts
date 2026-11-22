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

  /* Owner rule (2026-11-20, the bleed-through class raised again from
   * his own screenshots of the Trackers sheets): a backdrop is a FLAT
   * DIM, never a blur scrim — blur lets page text ghost through and
   * stay readable around the panel. Every family's backdrop, and every
   * scoped BloomSheet backdrop override, must carry no backdrop-filter. */
  it("no sheet backdrop blurs the page behind it", () => {
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
      for (const b of blocksFor(rel, sel)) {
        expect(
          b.body.includes("backdrop-filter"),
          `${sel} in ${rel} must dim flat, never blur`,
        ).toBe(false);
      }
    }
    for (const scope of [
      "body:has(.assess-sheet)",
      "body:has(.tk2-log-sheet)",
      "body:has(.tk2-snap-sheet)",
      "body:has(.tk2-targets-sheet)",
    ]) {
      const rel = scope.includes("assess") ? "styles/bloom-sheet.css" : "styles/trackers.css";
      const b = blockWith(rel, scope);
      expect(b, `${rel} must define the ${scope} backdrop override`).toBeTruthy();
      expect(
        b!.body.includes("backdrop-filter"),
        `${scope} backdrop must dim flat, never blur`,
      ).toBe(false);
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

describe("sheet guard: the Vitalis orb stays under every sheet", () => {
  it("the orb button's z-index is below the sheet backdrop's", () => {
    /* The orb is a fixed gold button at the screen corner; if it ever
       rose above a sheet's backdrop it would sit bright and tappable
       over the dimmed page while a modal owns the screen (external
       audit, 2026-11-18). Today it cannot: orb 60, backdrop 2000 —
       an open sheet covers it whole. Pin the relationship so a future
       z-index reshuffle cannot silently flip it. */
    const zOf = (rel: string, sel: string): number => {
      const hit = blocksFor(rel, sel)
        .map((b) => /z-index:\s*(\d+)/.exec(b.body)?.[1])
        .find((v) => v !== undefined);
      expect(hit, `${sel} in ${rel} carries a z-index`).toBeTruthy();
      return Number(hit);
    };
    const orb = zOf("styles/orb.css", ".coach-orb");
    const backdrop = zOf("styles/bloom-sheet.css", ".bsheet-backdrop");
    expect(orb).toBeLessThan(backdrop);
  });
});

/* ------------------------------------------------------------------ */
/* Panel opacity — the bleed-through pins (owner, 2026-11-18, the third
 * raising of this class). The #171 audit pinned height caps and
 * backdrops but never the PANEL's own fill, so .bsheet-panel could sit
 * at 88% glass over a 24px backdrop blur and the page ghosted through
 * the paywall — text legible through the modal body, the gold orb
 * glowing through the panel as if it sat on top. The slab precedent
 * (assess-panel, tk2 panels, PR #87) is now the rule for EVERY overlay
 * family: the winning background's bottom layer must resolve fully
 * opaque, and no panel may use backdrop-filter as its surface. A
 * translucent sheen (var(--glass-bg)) may sit OVER a solid colour —
 * the .bill-card pattern — never instead of one. Backdrops are the
 * opposite contract: they are the dimming layer, pinned at the
 * owner's .72 darkness so the page behind a modal is truly dimmed. */

const declValues = (body: string, prop: string): string[] =>
  body
    .split(";")
    .map((d) => d.trim())
    .filter((d) => d.startsWith(`${prop}:`))
    .map((d) => d.slice(prop.length + 1).trim());

/* Blocks whose selector list names `sel` EXACTLY (a comma part equal to
 * the selector) — ".bsheet-panel" must not inherit ".bsheet-panel.x"
 * overrides or ".x .bsheet-panel" placements. */
const exactBlocks = (rel: string, sel: string) =>
  blocks(read(rel)).filter((b) =>
    b.selector.split(",").some((part) => part.split("\n").pop()!.trim() === sel),
  );

/** The background a panel actually ends up with: the last `background`
 *  shorthand across its exact blocks, else background-color under
 *  background-image (the .bill-card composition). */
function winningBackground(rel: string, sel: string): string {
  const bs = exactBlocks(rel, sel);
  expect(bs.length, `${rel} must define ${sel}`).toBeGreaterThan(0);
  let win = "";
  for (const b of bs) {
    const shorts = declValues(b.body, "background");
    if (shorts.length) win = shorts[shorts.length - 1]!;
  }
  if (win) return win;
  let color = "";
  let image = "";
  for (const b of bs) {
    const c = declValues(b.body, "background-color");
    if (c.length) color = c[c.length - 1]!;
    const i = declValues(b.body, "background-image");
    if (i.length) image = i[i.length - 1]!;
  }
  return image ? `${image}, ${color}` : color;
}

/** Split a background value into layers on top-level commas. */
function layersOf(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of value) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Alpha carried by one colour expression; 1 when fully opaque. */
function alphaOf(expr: string): number {
  const e = expr.replace(/\s+/g, " ").trim();
  const fn = /(?:rgba|hsla)\(([^)]*)\)/.exec(e);
  if (fn) {
    const parts = fn[1]!.split(",").map((s) => s.trim());
    if (parts.length === 4) return parseFloat(parts[3]!);
  }
  if (/\b(?:rgb|hsl|oklch|oklab)\(/.test(e)) {
    const slash = /\/\s*([\d.]+)(%?)\s*\)/.exec(e);
    if (slash) {
      const v = parseFloat(slash[1]!);
      return slash[2] === "%" ? v / 100 : v;
    }
  }
  if (e.includes("color-mix(") && e.includes("transparent")) {
    const m = /([\d.]+)%\s*,\s*transparent/.exec(e);
    if (m) return parseFloat(m[1]!) / 100;
    const m2 = /transparent\s+([\d.]+)%/.exec(e);
    if (m2) return 1 - parseFloat(m2[1]!) / 100;
    return 0;
  }
  return 1;
}

/** A background layer is opaque when it is a solid colour/token, a
 *  colour-mix of opaque stops, or a gradient whose every stop is
 *  opaque. The glass sheen alone is NOT a surface. */
function layerOpaque(layer: string): boolean {
  const l = layer.trim();
  if (l === "var(--glass-bg)") return false;
  if (l.startsWith("linear-gradient")) {
    if (l.includes("transparent")) return false;
    for (const m of l.matchAll(/(?:rgba|hsla)\(([^)]*)\)/g)) {
      const p = m[1]!.split(",");
      if (p.length === 4 && parseFloat(p[3]!.trim()) < 1) return false;
    }
    return true;
  }
  return alphaOf(l) >= 1;
}

const PANELS: [string, string][] = [
  ["styles/bloom-sheet.css", ".bsheet-panel"],
  ["styles/bloom-sheet.css", ".bsheet-panel.assess-panel"],
  ["styles/trackers.css", ".bsheet-panel.tk2-log-panel"],
  ["styles/trackers.css", ".bsheet-panel.tk2-snap-panel"],
  ["styles/trackers.css", ".bsheet-panel.tk2-targets-panel"],
  ["styles/stories.css", ".ssheet"],
  ["styles/admin-panel.css", ".adm-panel"],
  ["styles/nutrition.css", ".nut-dialog-panel"],
  ["styles/nutrition.css", ".nut-lightbox-panel"],
  ["styles/orb.css", ".coach-orb-panel"],
  ["styles/coach.css", ".coach-palette"],
  ["styles/coach.css", ".coach-row-menu"],
  ["styles/coach.css", ".coach-attach-menu"],
  ["styles/rewards.css", ".reward-delivery-modal"],
  ["styles/rewards.css", ".reward-toast"],
  ["styles/add-habit-modal.css", ".bloom-add-habit .modal"],
  ["styles/shell.css", ".conn-notice"],
  ["styles/shell.css", ".conn-notice-chip"],
  ["styles/progression.css", ".pg-toast"],
  ["styles/billing.css", ".bill-g-head"],
  ["styles/billing.css", ".bill-g-head--plus"],
];

describe("sheet guard: every overlay panel is fully opaque", () => {
  it("each panel's winning background bottoms out on an opaque layer", () => {
    for (const [rel, sel] of PANELS) {
      const win = winningBackground(rel, sel);
      const layers = layersOf(win);
      const bottom = layers[layers.length - 1]!;
      expect(
        layerOpaque(bottom),
        `${sel} in ${rel} must bottom out opaque — winning background: ${win}`,
      ).toBe(true);
    }
  });

  it("no panel uses backdrop-filter as its surface", () => {
    for (const [rel, sel] of PANELS) {
      for (const b of exactBlocks(rel, sel)) {
        for (const prop of ["backdrop-filter", "-webkit-backdrop-filter"]) {
          for (const v of declValues(b.body, prop)) {
            expect(
              v.startsWith("none"),
              `${sel} in ${rel} must not blur the page through itself (${prop}: ${v})`,
            ).toBe(true);
          }
        }
      }
    }
  });

  it("the Tailwind panels and the toast shell stay solid", () => {
    const sheet = read("components/ui/sheet.tsx");
    expect(sheet).toContain("bg-surface");
    expect(sheet).not.toContain("bg-surface/");
    const dialog = read("components/ui/dialog.tsx");
    expect(dialog).toContain("bg-surface");
    expect(dialog).not.toContain("bg-surface/");
    expect(read("components/ui/dropdown-menu.tsx")).toContain("bg-popover");
    const toastShell = read("components/system/toastShell.ts");
    expect(toastShell).toContain('background: "var(--surface-2)"');
    expect(toastShell).not.toMatch(/background:\s*"color-mix/);
    expect(toastShell).not.toContain("backdropFilter");
  });
});

describe("sheet guard: every dialog backdrop dims to the owner's .72", () => {
  it("each family's backdrop bottoms out at alpha >= 0.72", () => {
    const cases: [string, string][] = [
      ["styles/bloom-sheet.css", ".bsheet-backdrop"],
      ["styles/nutrition.css", ".nut-dialog-backdrop"],
      ["styles/stories.css", ".ssheet-backdrop"],
      ["styles/orb.css", ".coach-orb-backdrop"],
      ["styles/coach.css", ".coach-palette-backdrop"],
      ["styles/admin-panel.css", ".adm-scrim"],
      ["styles/add-habit-modal.css", ".bloom-add-habit .backdrop"],
      ["styles/rewards.css", ".reward-delivery-modal-backdrop"],
    ];
    for (const [rel, sel] of cases) {
      const win = winningBackground(rel, sel);
      const layers = layersOf(win);
      const bottom = layers[layers.length - 1]!;
      expect(
        alphaOf(bottom),
        `${sel} in ${rel} must dim to >= 0.72 — winning background: ${win}`,
      ).toBeGreaterThanOrEqual(0.72);
    }
  });
});

describe("sheet guard: sheet content is clipped, the scroll is inside", () => {
  it("each sheet panel clips at its radius and owns an inner scroll region", () => {
    const families: [string, string, string, string][] = [
      ["styles/bloom-sheet.css", ".bsheet-panel", "styles/bloom-sheet.css", ".bsheet-scroll"],
      ["styles/nutrition.css", ".nut-dialog-panel", "styles/nutrition.css", ".nut-dialog-scroll"],
      ["styles/stories.css", ".ssheet", "styles/stories.css", ".ssheet-scroll"],
      ["styles/orb.css", ".coach-orb-panel", "styles/orb.css", ".coach-orb-thread"],
      ["styles/admin-panel.css", ".adm-panel", "styles/admin-panel.css", ".adm-list"],
    ];
    for (const [prel, psel, srel, ssel] of families) {
      expect(
        exactBlocks(prel, psel).some((b) => b.body.includes("overflow: hidden")),
        `${psel} in ${prel} must clip its content at the panel radius`,
      ).toBe(true);
      const scroll = exactBlocks(srel, ssel);
      expect(scroll.length, `${ssel} in ${srel} must exist`).toBeGreaterThan(0);
      expect(
        scroll.some((b) => b.body.includes("overflow-y: auto")),
        `${ssel} in ${srel} must be the inner scroll region`,
      ).toBe(true);
      expect(
        scroll.some((b) => b.body.includes("overscroll-behavior: contain")),
        `${ssel} in ${srel} must contain its overscroll`,
      ).toBe(true);
    }
  });

  it("the sheet stack stays above the floating orb", () => {
    const zOf = (rel: string, sel: string): number => {
      const hit = exactBlocks(rel, sel)
        .map((b) => /z-index:\s*(\d+)/.exec(b.body)?.[1])
        .find((v) => v !== undefined);
      expect(hit, `${sel} in ${rel} carries a z-index`).toBeTruthy();
      return Number(hit);
    };
    expect(zOf("styles/orb.css", ".coach-orb")).toBeLessThan(
      zOf("styles/bloom-sheet.css", ".bsheet"),
    );
  });
});

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

/* A target's unit is one phrase — "of 5" must sit whole beside its
 * figure, never wrap mid-phrase (owner screenshot, 2026-11-20: the
 * Energy target in the Trackers targets sheet wrapped as "of / 5"). */
describe("sheet guard: tracker target units never wrap mid-phrase", () => {
  it(".tk2-unit is nowrap", () => {
    expect(someBlock("styles/trackers.css", ".tk2-unit", "white-space: nowrap")).toBe(true);
  });
});

/*
 * M-202 (Final Audit Slice 1) — F-03, the dialog-clipping BLOCKER.
 *
 * Three sightings, one mechanism: the Membership dialog and the
 * paywall (one component, PaywallSheet) ended inside the scroll region,
 * so at the panel cap the last line sat sliced at the fold with the
 * scrollbar hidden and no cue; the Assessment summary hand-rolled its
 * own max-h-[82vh] body instead of the panel's cap. The family fix:
 *   1. .bsheet-scroll carries a fold cue — surface-tone covers that
 *      travel with the content (background-attachment: local) over
 *      fixed edge shadows, so an edge shows a shadow exactly while
 *      more content lies beyond it;
 *   2. .bsheet-foot is the shell's always-visible footer zone
 *      (flex-none, on the same opaque var(--surface) slab) for words
 *      that must never go under the fold — the paywall's closing line
 *      lives there now;
 *   3. sheet bodies ride the family contract (panel cap + .bsheet-scroll),
 *      never a hand-rolled viewport cap of their own.
 */
describe("sheet guard: the fold can never slice a dialog's last line (M-202, F-03)", () => {
  it("the shared scroll region carries the fold cue", () => {
    const cue = blocksFor("styles/bloom-sheet.css", ".bsheet-scroll").find((b) =>
      b.body.includes("background-attachment"),
    );
    expect(cue, ".bsheet-scroll must paint the scroll-shadow fold cue").toBeDefined();
    expect(cue!.body).toMatch(/local/);
    expect(cue!.body).toContain("var(--surface)");
  });

  it("the footer zone exists: flex-none, on the family's opaque slab", () => {
    const foot = blocksFor("styles/bloom-sheet.css", ".bsheet-foot");
    expect(foot.length).toBeGreaterThan(0);
    expect(foot.some((b) => /flex:\s*none/.test(b.body))).toBe(true);
    expect(foot.some((b) => b.body.includes("background: var(--surface)"))).toBe(true);
  });

  it("the paywall's closing line lives in the foot zone, after the scroll region", () => {
    const src = read("components/billing/PaywallSheet.tsx");
    const scrollAt = src.indexOf("bsheet-scroll");
    const footAt = src.indexOf("bsheet-foot");
    const wordsAt = src.indexOf("bill-foot");
    expect(scrollAt).toBeGreaterThan(-1);
    expect(footAt).toBeGreaterThan(scrollAt);
    expect(wordsAt).toBeGreaterThan(footAt);
  });

  it("sheet bodies ride the family scroll contract, not hand-rolled viewport caps", () => {
    for (const rel of [
      "components/assessment/AssessmentEntry.tsx",
      "components/assessment/AssessmentFlow.tsx",
      "components/nutrition/DishDetailSheet.tsx",
      "components/nutrition/PhotoCreditsSheet.tsx",
    ]) {
      const src = read(rel);
      expect(src, `${rel} must not cap its own body to the viewport`).not.toMatch(
        /max-h-\[82(?:dvh|vh)\]/,
      );
      expect(src, `${rel} must scroll through .bsheet-scroll`).toContain("bsheet-scroll");
    }
  });
});
