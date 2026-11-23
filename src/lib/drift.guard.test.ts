import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Drift-sweep guard (M-206, Final Audit Slice 5).
 *
 * The audit's code inventory found the design system drifting at the
 * literal level: 35 TSX type sizes against an 11-step token scale
 * (F-14), spacing set three ways and mostly off-token (F-15), up to
 * 19 distinct corner radii in one stylesheet (F-18), off-palette hex
 * literals — worst in Cycle's parallel palette (F-19), cards stacking
 * border + fill + shadow (F-21), and routine transitions running to
 * 560–600ms (F-22). Slice 5 aligns the literals to the tokens; this
 * guard is the census that proves it and fails if the drift returns.
 *
 * The rules, precisely:
 *   F-14 — a CSS `font-size` literal (px/rem) must resolve to a token
 *     step (10/11/12/13/14/15/16/18/22px) or sit in the display range
 *     (>= 24px: headings and hero numerals, whose token steps are the
 *     --text-page / --text-display clamps). var(), clamp(), max() and
 *     cqw forms are the fluid/token system working as chartered and
 *     are skipped, as are em sizes (relative to their parent — the
 *     one case, trackers' 0.85em unit labels, is recorded in M-206).
 *     The same rule binds TSX `text-[Npx]` and numeric `fontSize`.
 *   F-15 — in a padding / margin / gap declaration (outside calc()),
 *     no component may be a literal whose value equals a --space-*
 *     token value (4/8/12/18/24/28/40/48/60/72px): if the value is a
 *     token's, the token is what gets written.
 *   F-18 — in a border-radius declaration (outside var()/calc()), no
 *     component may be a literal equal to a radius token's value
 *     (999/9999/99px = pill, 24px = card, 10px = control, 12px =
 *     --radius-md, 16px = --radius-lg, 20px = --radius-xl); a sheet
 *     top (Xpx Xpx 0 0 with X >= 20) must be written with
 *     var(--radius-dialog); and each stylesheet's distinct radius
 *     values stay at or under the post-sweep census ceiling below —
 *     raising one needs a registry note, not a quiet literal.
 *   F-19 — a hex literal may live only on a custom-property
 *     definition line (the estate's standing law), with #000 / #fff
 *     the only off-definition exceptions (utility black/white in
 *     gradients and scrims). Rewards' scoped alias layer declares its
 *     literals deliberately (a var() pointing at the same property
 *     would be circular — see rewards.css), so the guard instead
 *     value-locks those aliases to the shared tokens they mirror.
 *   F-21 — the named in-flow cards (.nut-card, .nut-day-card,
 *     .ci-card, .pg-hero) carry border + fill with at most an inset
 *     specular line: no outer drop-shadow layer. (Overlays keep their
 *     elevation — .bsheet-panel is a dialog, not a card — and
 *     inset-only finishes like .tk2-insight / .pg-goal never stacked.)
 *   F-22 — every transition duration in the estate resolves to
 *     <= 320ms (--motion-page), except the three chartered one-shot
 *     reveals in the allowlist below. The global reduced-motion
 *     kill-switch in styles.css (universal selector, !important
 *     duration overrides) is pinned: it is what covers the five
 *     stylesheets with no per-file reduced-motion block (billing,
 *     debox, household, trainer, fonts).
 */

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");
const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, " ");

const CSS_FILES = [
  "styles.css",
  ...readdirSync(join(SRC, "styles"))
    .filter((f) => f.endsWith(".css"))
    .map((f) => `styles/${f}`),
];

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
    b.selector.split(",").some((part) => part.split("\n").pop()!.trim() === sel),
  );

/* ---------------- F-14: type snap ---------------- */

const TEXT_STEPS = new Set([10, 11, 12, 13, 14, 15, 16, 18, 22]);
const onScale = (px: number) => TEXT_STEPS.has(px) || px >= 24;

describe("type snap (M-206, F-14): literal sizes sit on the token scale", () => {
  for (const rel of CSS_FILES) {
    it(`${rel} holds the scale`, () => {
      const bad: string[] = [];
      for (const b of blocks(read(rel))) {
        for (const d of b.body.matchAll(/font-size:\s*([^;]+);/g)) {
          const value = d[1]!.trim();
          if (/var\(|clamp\(|max\(|cqw/.test(value)) continue;
          const m = value.match(/^(-?[0-9.]+)(px|rem|em)$/);
          if (!m || m[2] === "em") continue; // em is parent-relative; see header
          const px = parseFloat(m[1]!) * (m[2] === "rem" ? 16 : 1);
          if (!onScale(Math.round(px * 100) / 100)) {
            bad.push(`${b.selector.split("\n").pop()!.trim()} :: font-size: ${value} (${px.toFixed(2)}px)`);
          }
        }
      }
      expect(bad, `${rel} off-scale type`).toEqual([]);
    });
  }

  it("components hold the scale (text-[Npx] and numeric fontSize)", () => {
    const bad: string[] = [];
    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) out.push(...walk(p));
        else if (/\.tsx$/.test(name) && !/\.test\.tsx$/.test(name)) out.push(p);
      }
      return out;
    };
    for (const file of [...walk(join(SRC, "components")), ...walk(join(SRC, "routes"))]) {
      const rel = file.slice(SRC.length + 1);
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/text-\[([0-9.]+)px\]/g)) {
        if (!onScale(parseFloat(m[1]!))) bad.push(`${rel}: text-[${m[1]}px]`);
      }
      for (const m of text.matchAll(/fontSize\s*[:=]\s*\{?\s*([^,}\n]+)/g)) {
        const expr = m[1]!;
        if (expr.includes("*")) continue; // scaled-canvas unit, as in typeFloor
        for (const n of expr.matchAll(/[0-9.]+/g)) {
          if (!/[0-9]/.test(n[0])) continue; // a bare "." from a member expr (r.fontSize, Math.min)
          if (!onScale(parseFloat(n[0]))) bad.push(`${rel}: fontSize ${expr.trim()} (${n[0]})`);
        }
      }
    }
    expect(bad, "off-scale TSX type").toEqual([]);
  });
});

/* ---------------- F-15: spacing tokens ---------------- */

const SPACE_PX = new Set([4, 8, 12, 18, 24, 28, 40, 48, 60, 72]);
const SPACING_PROPS = new Set([
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "padding-inline", "padding-inline-start", "padding-inline-end",
  "padding-block", "padding-block-start", "padding-block-end",
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "margin-inline", "margin-inline-start", "margin-inline-end",
  "margin-block", "margin-block-start", "margin-block-end",
  "gap", "row-gap", "column-gap",
]);

describe("spacing tokens (M-206, F-15): a token's value is written as the token", () => {
  for (const rel of CSS_FILES) {
    it(`${rel} writes spacing on the --space-* scale`, () => {
      const bad: string[] = [];
      for (const b of blocks(read(rel))) {
        for (const d of b.body.matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)) {
          const prop = d[1]!;
          if (!SPACING_PROPS.has(prop)) continue;
          const value = d[2]!.trim();
          if (value.includes("calc(")) continue;
          for (const part of value.replace(/!important$/, "").split(/\s+/)) {
            const m = part.match(/^(-?[0-9.]+)(px|rem)$/);
            if (!m) continue;
            const px = parseFloat(m[1]!) * (m[2] === "rem" ? 16 : 1);
            if (SPACE_PX.has(px)) {
              bad.push(`${b.selector.split("\n").pop()!.trim()} :: ${prop}: ${value} (${part} = a --space-* value)`);
            }
          }
        }
      }
      expect(bad, `${rel} literal spacing on token values`).toEqual([]);
    });
  }
});

/* ---------------- F-18: radius discipline ---------------- */

const RADIUS_TOKEN_LITERALS = new Set(["999px", "9999px", "99px", "24px", "10px", "12px", "16px", "20px"]);

/* Post-sweep census ceilings: distinct border-radius values per file.
   A new distinct value must raise its ceiling here WITH a registry
   note in docs/MISTAKES.md — that is the drift discipline working. */
const RADIUS_CEILINGS: Record<string, number> = {
  "styles.css": 12,
  "styles/access.css": 5,
  "styles/add-habit-modal.css": 7,
  "styles/admin-panel.css": 5,
  "styles/billing.css": 4, /* M-220: design A adds the preview's 18px row radius + 50% circles; the retired G section's --radius-card left — see docs/MISTAKES.md M-220 */
  "styles/bloom-sheet.css": 10,
  "styles/coach.css": 17, // M-224: back from M-221's 18 — the glass reply bubble (and its radius) is removed
  "styles/cycle.css": 11,
  "styles/debox.css": 2,
  "styles/glass.css": 2,
  "styles/health-tools.css": 6,
  "styles/household.css": 3,
  "styles/invite.css": 4,
  "styles/mood.css": 7,
  "styles/motion.css": 1,
  "styles/nutrition.css": 14,
  "styles/orb.css": 8, // M-221: +1 — the orb pedestal's 50% ellipse
  "styles/profile.css": 15,
  "styles/progression.css": 14,
  "styles/responsive.css": 4,
  "styles/rewards.css": 16,
  "styles/shell.css": 9,
  "styles/stories.css": 19,
  "styles/trackers.css": 15,
  "styles/trainer.css": 1,
  "styles/welcome.css": 5,
};

describe("radius discipline (M-206, F-18)", () => {
  for (const rel of CSS_FILES) {
    it(`${rel}: no token-equal radius literal, no literal sheet top`, () => {
      const bad: string[] = [];
      const distinct = new Set<string>();
      for (const b of blocks(read(rel))) {
        for (const d of b.body.matchAll(/border(?:-[a-z]+)?-radius\s*:\s*([^;]+);/g)) {
          const value = d[1]!.trim().replace(/\s*!important$/, "");
          distinct.add(value);
          if (value.includes("var(") || value.includes("calc(")) continue;
          for (const part of value.split(/\s+/)) {
            if (RADIUS_TOKEN_LITERALS.has(part)) {
              bad.push(`${b.selector.split("\n").pop()!.trim()} :: border-radius: ${value} (${part} is a token's value)`);
            }
          }
          const top = value.match(/^(\d+)px \1px 0 0$/);
          if (top && parseInt(top[1]!) >= 20) {
            bad.push(`${b.selector.split("\n").pop()!.trim()} :: sheet top ${value} must use var(--radius-dialog)`);
          }
        }
      }
      const ceiling = RADIUS_CEILINGS[rel];
      if (ceiling !== undefined && distinct.size > ceiling) {
        bad.push(`distinct radius values ${distinct.size} exceed the M-206 ceiling ${ceiling}`);
      }
      expect(bad, `${rel} radius drift`).toEqual([]);
    });
  }

  it("the named folds hold: profile radius, sheet radius token, Cycle's control step", () => {
    expect(read("styles/profile.css")).toContain("--pf-radius: var(--radius-card)");
    expect(read("styles/responsive.css")).toContain("--bloom-radius-sheet: var(--radius-dialog)");
    const cycle = read("styles/cycle.css");
    expect(cycle).not.toMatch(/--ci-radius-[a-z]+: 10px/);
    /* M-225: this pin used to read the first nocturne block — provably fully
       shadowed dead code, deleted in M-225. The winning block's value is pinned now. */
    expect(cycle).toContain("--ci-radius-md: var(--radius-card, 12px)");
  });
});

/* ---------------- F-19: palette discipline ---------------- */

describe("palette discipline (M-206, F-19)", () => {
  for (const rel of CSS_FILES) {
    it(`${rel}: hex lives on a token definition line or nowhere`, () => {
      const bad: string[] = [];
      for (const line of stripComments(read(rel)).split("\n")) {
        for (const m of line.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
          if (/^\s*--[a-z0-9-]+\s*:[^;]*$/.test(line.slice(0, m.index))) continue;
          const v = m[0].toLowerCase();
          if (v === "#000" || v === "#fff") continue; // utility black/white
          bad.push(`${m[0]} in: ${line.trim().slice(0, 80)}`);
        }
      }
      expect(bad, `${rel} off-definition hex`).toEqual([]);
    });
  }

  it("the shared-value aliases point at, or value-lock to, the shared tokens", () => {
    const styles = read("styles.css");
    const shared = new Map<string, string>();
    for (const m of styles.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
      if (!shared.has(m[1]!)) shared.set(m[1]!, m[2]!.toLowerCase());
    }
    // Converted to references (the house pattern: == the house token exactly).
    expect(read("styles/nutrition.css")).toContain("--arc-stop-dawn: var(--gold)");
    expect(read("styles/nutrition.css")).toContain("--arc-stop-night: var(--success)");
    expect(read("styles/bloom-sheet.css")).toContain("--sheet-accent-deep: var(--gold-deep)");
    expect(read("styles/bloom-sheet.css")).toContain("--sheet-on-accent-ink: var(--gold-ink)");
    expect(read("styles/stories.css")).toContain("--story-ink-deep: var(--gold-deep)"); /* M-225: violet-deep retired */
    expect(styles).toContain("--chart-3: var(--gold)");
    // Rewards' alias layer stays literal BY DESIGN (circularity — see
    // rewards.css); the lock is that its values equal the shared tokens.
    const rewards = read("styles/rewards.css");
    const locks: [string, string][] = [
      ["--background", "--ink"],
      ["--surface", "--panel"],
      ["--muted-foreground", "--text-secondary"],
      ["--sky", "--info"],
      ["--sage", "--success"],
      ["--rose", "--danger"],
      /* M-225: the ["--royal", "--violet"] lock pair is retired with both tokens. */
    ];
    for (const [alias, token] of locks) {
      const m = rewards.match(new RegExp(`${alias}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`));
      expect(m, `rewards ${alias}`).toBeTruthy();
      expect(m![1]!.toLowerCase(), `rewards ${alias} value-locks to ${token}`).toBe(shared.get(token));
    }
  });
});

/* ---------------- F-21: the card rule on the named cards ---------------- */

function shadowLayers(body: string): string[] {
  const m = body.match(/box-shadow:\s*([^;]+);/);
  if (!m) return [];
  const layers: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of m[1]!) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      layers.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) layers.push(cur.trim());
  return layers;
}

describe("card rule (M-206, F-21): the named in-flow cards carry no drop shadow", () => {
  /* M-224 (owner's Liquid Glass correction, 2026-11-23): the M-221
     exception that let a named card wear var(--lg-rim-soft) is
     RETIRED with the glass it excused — no named in-flow card wears
     the material now, so the rule below is the original strict
     form. (That rim-soft stays inset-only at its definition is now
     pinned by glassPicks.guard, M-224 census §1.) */
  const cases: [string, string][] = [
    ["styles/nutrition.css", ".nut-card"],
    ["styles/nutrition.css", ".nut-day-card"],
    ["styles/progression.css", ".pg-hero"],
  ];
  for (const [rel, sel] of cases) {
    it(`${rel} ${sel}: border + fill, inset finish only`, () => {
      const bodies = blocksFor(rel, sel);
      expect(bodies.length).toBeGreaterThan(0);
      for (const b of bodies) {
        for (const layer of shadowLayers(b.body)) {
          expect(
            layer === "none" || layer.startsWith("inset"),
            `${sel} shadow layer "${layer}" is a drop shadow`,
          ).toBe(true);
        }
      }
    });
  }
  for (const rel of ["styles/cycle.css", "styles/trackers.css"]) {
    it(`${rel} .ci-card: no shadow but "none" (the --ci-shadow drop is retired here)`, () => {
      const bodies = blocksFor(rel, ".ci-card");
      expect(bodies.length).toBeGreaterThan(0);
      for (const b of bodies) {
        for (const layer of shadowLayers(b.body)) expect(layer).toBe("none");
      }
    });
  }
});

/* ---------------- F-22: motion caps + reduced-motion coverage ---------------- */

const STYLES = read("styles.css");
const DURATION_MS = new Map<string, number>();
for (const m of STYLES.matchAll(/(--(?:motion|dur)-[a-z]+):\s*([0-9.]+)(ms|s)\s*;/g)) {
  DURATION_MS.set(m[1]!, parseFloat(m[2]!) * (m[3] === "s" ? 1000 : 1));
}
for (const m of STYLES.matchAll(/(--(?:motion|dur)-[a-z]+):\s*var\((--[a-z-]+)\)\s*;/g)) {
  const target = DURATION_MS.get(m[2]!);
  if (target !== undefined) DURATION_MS.set(m[1]!, target);
}

/* Chartered one-shot reveals: the Orbit's draw-in (Brief v6 §2.6's
   documented stroke-dashoffset exception, inside a no-preference
   block) and the two entrance-reveal utilities, which are what
   --dur-slow's own charter reserves 600ms for ("one-shot reveals"). */
const LONG_TRANSITION_ALLOWLIST: { file: string; selector: string }[] = [
  { file: "styles.css", selector: ".orbit-arc" },
  { file: "styles/motion.css", selector: ".feel-in" },
  { file: "styles/progression.css", selector: ".pg-reveal" },
];

describe("motion caps (M-206, F-22): routine transitions resolve to <= 320ms", () => {
  for (const rel of CSS_FILES) {
    it(`${rel} holds the cap`, () => {
      const bad: string[] = [];
      for (const b of blocks(read(rel))) {
        const sel = b.selector.split("\n").pop()!.trim();
        for (const d of b.body.matchAll(/transition(?:-duration)?\s*:\s*([^;]+);/g)) {
          const value = d[1]!;
          const segments = value.split(/,(?![^(]*\))/);
          for (const seg of segments) {
            const times: { label: string; ms: number }[] = [];
            for (const t of seg.matchAll(/([0-9.]+)(ms|s)\b|var\((--(?:motion|dur)-[a-z]+)(?:,[^)]*)?\)/g)) {
              if (t[3]) {
                const ms = DURATION_MS.get(t[3]);
                if (ms !== undefined) times.push({ label: t[3], ms });
              } else {
                times.push({ label: `${t[1]}${t[2]}`, ms: parseFloat(t[1]!) * (t[2] === "s" ? 1000 : 1) });
              }
            }
            if (times.length === 0) continue;
            const duration = times[0]!; // first time in a segment is the duration; a second is the delay
            if (duration.ms > 320) {
              const allowed = LONG_TRANSITION_ALLOWLIST.some(
                (a) => a.file === rel && (sel === a.selector || sel.startsWith(`${a.selector} `) || sel.startsWith(`${a.selector}:`)),
              );
              if (!allowed) bad.push(`${sel} :: transition ${seg.trim().slice(0, 70)} (${duration.label} = ${duration.ms}ms)`);
            }
          }
        }
      }
      expect(bad, `${rel} over-cap transitions`).toEqual([]);
    });
  }

  it("the global reduced-motion kill-switch stands (it covers every file)", () => {
    const block = STYLES.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g) ?? [];
    const universal = block.find((b) => b.includes("*::before") && b.includes("!important"));
    expect(universal, "universal reduced-motion block").toBeTruthy();
    expect(universal!).toContain("animation-duration: 0.001ms !important");
    expect(universal!).toContain("transition-duration: 0.001ms !important");
  });
});
