import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Type-floor + accent-discipline guard (M-203, Final Audit Slice 2).
 *
 * F-06 — the 11px floor. The audit found UI type below the floor the
 * app set for itself (--text-meta, 0.6875rem = 11px) across the detail
 * surfaces: literal 10px/10.5px and 0.48–0.68rem declarations in
 * cycle.css, nutrition.css and stories.css; text-[10px] / text-[10.5px]
 * in ~25 components; and chart/SVG fontSize values of 7.5–10 in the
 * Cycle and Mood charts and the Stories share card. This guard scans
 * the whole stylesheet estate and the component tree so the floor is
 * a property of the estate, not of the files someone remembered.
 *
 * What counts, precisely:
 *   - CSS `font-size` literals in px / rem / em (rem and em measured
 *     against the 16px root) must be >= 11px.
 *   - A `max(...)` floor term is a legibility guarantee, so every
 *     non-cqw term inside max() must resolve to >= 11px (this is what
 *     catches the old 9px / 8.5px connection-map floors and the Orbit
 *     label's --text-micro floor).
 *   - A lone cqw size belongs to a drawing that scales as one unit;
 *     the only one allowed is the connection map's hub figure
 *     (.cm-hub, a serif display numeral — 5.3cqw is >= 12px at the
 *     smallest stage the map ever renders at).
 *   - Plain `font-size: var(--text-*)` is the token scale working as
 *     chartered (the draft leaves the token scale itself untouched);
 *     the floor binds literals, not token steps.
 *   - TSX: text-[Npx] literals, numeric fontSize literals (props,
 *     style objects, chart options — ternaries included), and
 *     `font-size:` inside template-string HTML must be >= 11.
 *     Expressions containing `*` are scaled-canvas units (the Stories
 *     canvas scales as one drawing) and are skipped.
 *
 * F-07 / F-08 / F-09 / F-10 — the named label fixes the floor makes
 * concrete, pinned by name below.
 * F-16 — one primary: the named per-surface primaries carry the shared
 * Button's height (44px), pill radius and flat-gold treatment.
 * F-20 — one accent: gold is the action accent on Mood Intelligence;
 * violet remains a data colour there.
 */

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");
const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, " ");

/* ---------------- token table (from styles.css :root) ---------------- */

const STYLES = read("styles.css");
const TOKEN_PX = new Map<string, number>();
for (const m of STYLES.matchAll(/(--text-[a-z]+):\s*([0-9.]+)rem/g)) {
  TOKEN_PX.set(m[1]!, parseFloat(m[2]!) * 16);
}
const FLOOR = 11;

/* ---------------- CSS scanning ---------------- */

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

/** Resolve one font-size term to px, or null when it is not a size term. */
function termPx(term: string): number | null {
  const t = term.trim();
  const num = t.match(/^(-?[0-9.]+)(px|rem|em|cqw)$/);
  if (num) {
    const v = parseFloat(num[1]!);
    if (num[2] === "cqw") return null; // relative to the drawing, handled by caller
    return num[2] === "px" ? v : v * 16;
  }
  const varRef = t.match(/^var\((--text-[a-z]+)\)$/);
  if (varRef) return TOKEN_PX.get(varRef[1]!) ?? null;
  return null;
}

/** Every legibility-relevant size inside one font-size value, in px. */
function sizesIn(value: string): { px: number; term: string }[] {
  const out: { px: number; term: string }[] = [];
  for (const m of value.matchAll(/-?[0-9.]+(?:px|rem|em)\b|var\(--text-[a-z]+\)/g)) {
    const px = termPx(m[0]);
    if (px !== null) out.push({ px, term: m[0] });
  }
  return out;
}

const CSS_FILES = [
  "styles.css",
  ...readdirSync(join(SRC, "styles"))
    .filter((f) => f.endsWith(".css"))
    .map((f) => `styles/${f}`),
];

/* Lone-cqw display sizes that are not labels: selector -> why it is safe. */
const LONE_CQW_ALLOWLIST: { file: string; selector: string }[] = [
  { file: "styles.css", selector: ".cm-hub" },
];

describe("type floor (M-203, F-06): no literal type under 11px in the CSS estate", () => {
  for (const rel of CSS_FILES) {
    it(`${rel} holds the floor`, () => {
      const bad: string[] = [];
      for (const b of blocks(read(rel))) {
        for (const d of b.body.matchAll(/font-size:\s*([^;]+);/g)) {
          const value = d[1]!.trim();
          if (/^var\(--text-[a-z]+\)$/.test(value)) continue; // token scale, chartered
          const isMax = value.includes("max(");
          const sizes = sizesIn(value);
          if (sizes.length === 0) {
            // A lone cqw term (or another relative form): only the
            // allowlisted display figures may ship without a floor.
            if (/cqw/.test(value)) {
              const allowed = LONE_CQW_ALLOWLIST.some(
                (a) => a.file === rel && b.selector.split("\n").pop()!.trim() === a.selector,
              );
              if (!allowed) bad.push(`${b.selector} :: font-size: ${value} (cqw with no floor)`);
            }
            continue;
          }
          for (const s of sizes) {
            if (s.px < FLOOR) {
              bad.push(
                `${b.selector} :: font-size: ${value} (${s.term} = ${s.px.toFixed(1)}px${isMax ? ", max() floor term" : ""})`,
              );
            }
          }
        }
      }
      expect(bad, `${rel} sub-floor declarations`).toEqual([]);
    });
  }
});

/* ---------------- TSX scanning ---------------- */

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...tsxFiles(p));
    else if (/\.tsx$/.test(name) && !/\.test\.tsx$/.test(name)) out.push(p);
  }
  return out;
}

const TSX_FILES = [...tsxFiles(join(SRC, "components")), ...tsxFiles(join(SRC, "routes"))];

describe("type floor (M-203, F-06): no literal type under 11px in components", () => {
  it("text-[Npx], fontSize numerics and template font-size all hold the floor", () => {
    const bad: string[] = [];
    for (const file of TSX_FILES) {
      const rel = file.slice(SRC.length + 1);
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/text-\[([0-9.]+)px\]/g)) {
        if (parseFloat(m[1]!) < FLOOR) bad.push(`${rel}: text-[${m[1]}px]`);
      }
      for (const m of text.matchAll(/font-size:\s*([0-9.]+)px/g)) {
        if (parseFloat(m[1]!) < FLOOR) bad.push(`${rel}: font-size: ${m[1]}px (template)`);
      }
      for (const m of text.matchAll(/fontSize\s*[:=]\s*\{?\s*([^,}\n]+)/g)) {
        const expr = m[1]!;
        if (expr.includes("*")) continue; // scaled-canvas unit
        for (const n of expr.matchAll(/[0-9.]+/g)) {
          if (parseFloat(n[0]) < FLOOR) bad.push(`${rel}: fontSize ${expr.trim()} (${n[0]})`);
        }
      }
    }
    expect(bad, "sub-floor TSX type").toEqual([]);
  });
});

/* ---------------- named label fixes ---------------- */

describe("named label fixes (M-203)", () => {
  it("F-07: mood-web emotion labels are upright and cream at full strength", () => {
    const emotion = blocksFor("styles.css", ".mood-page .mg-node-emotion .mg-label");
    expect(emotion.length).toBeGreaterThan(0);
    const body = emotion.map((b) => b.body).join("\n");
    expect(body).toContain("font-style: normal");
    expect(body).not.toContain("italic");
    expect(body).toContain("fill: var(--foreground)");
  });

  it("F-08: Orbit labels sit at the meta floor in cream; unselected nodes dim by a smaller step", () => {
    const label = blocksFor("styles.css", ".orbit-node-label");
    expect(label.length).toBeGreaterThan(0);
    const body = label.map((b) => b.body).join("\n");
    expect(body).toContain("var(--text-meta)");
    expect(body).toContain("color: var(--foreground)");
    const dim = blocksFor("styles.css", ".orbit-node[data-dim]");
    expect(dim.length).toBeGreaterThan(0);
    const opacity = dim
      .map((b) => b.body.match(/opacity:\s*([0-9.]+)/)?.[1])
      .find(Boolean);
    expect(parseFloat(opacity!)).toBeGreaterThanOrEqual(0.6);
  });

  it("F-08: every Orbit arc wears sage — no gold-gradient arc remains", () => {
    const constellation = read("components/home/ConnectionConstellation.tsx");
    expect(constellation).not.toContain("orbit-link-gold");
    expect(constellation).toContain('stroke="var(--success)"');
  });

  it("F-09: the Mood Intelligence meta strip is caption-style at the floor, not letterspaced mono", () => {
    const hero = read("components/mood/Hero.tsx");
    const strip = hero.match(/className="([^"]*gap-x-6[^"]*)"/);
    expect(strip, "meta strip class list").toBeTruthy();
    expect(strip![1]).toContain("text-[length:var(--text-meta)]");
    expect(strip![1]).not.toContain("mono");
    expect(strip![1]).not.toContain("uppercase");
    expect(strip![1]).not.toContain("tracking-");
  });

  it("F-10: Assessment vstat labels, Trackers petal labels and Cycle hints take the cream step", () => {
    const vstat = blocksFor("styles.css", ".vstat span");
    expect(vstat.map((b) => b.body).join("\n")).toContain("color: var(--foreground)");
    const petal = blocksFor("styles/trackers.css", ".at-petal-label");
    expect(petal.map((b) => b.body).join("\n")).toContain("fill: var(--ci-text)");
    const hint = blocksFor("styles/cycle.css", ".ci-hint");
    expect(hint.map((b) => b.body).join("\n")).toContain("color: var(--ci-text-soft)");
  });
});

/* ---------------- F-16: one primary ---------------- */

describe("one primary (M-203, F-16): the named primaries carry the shared Button's metrics", () => {
  it("Coach's primary is flat gold at 44px in a pill — the violet gradient is retired", () => {
    const bodies = blocksFor("styles/coach.css", ".coach-btn-primary")
      .map((b) => b.body)
      .join("\n");
    expect(bodies).toContain("height: 44px");
    expect(bodies).toContain("border-radius: var(--radius-pill)");
    expect(bodies).toContain("background: var(--gold)");
    expect(bodies).toContain("color: var(--gold-ink)");
    expect(bodies).not.toContain("coach-violet");
    expect(bodies).not.toContain("linear-gradient");
  });

  it("Coach's send, when it can send, is flat gold at 44px", () => {
    const base = blocksFor("styles/coach.css", ".coach-send")
      .map((b) => b.body)
      .join("\n");
    expect(base).toContain("width: 44px");
    expect(base).toContain("height: 44px");
    const canSend = blocksFor("styles/coach.css", ".coach-send.can-send")
      .map((b) => b.body)
      .join("\n");
    expect(canSend).toContain("background: var(--gold)");
    expect(canSend).toContain("color: var(--gold-ink)");
    expect(canSend).not.toContain("coach-violet");
  });

  it("Rewards' primary is flat gold at 44px in a pill — no violet gradient", () => {
    const base = blocksFor("styles/rewards.css", ".reward-primary-button")
      .map((b) => b.body)
      .join("\n");
    expect(base).toContain("background: var(--gold)");
    expect(base).toContain("min-height: 44px");
    expect(base).toContain("border-radius: var(--radius-pill)");
    expect(base).not.toContain("violet");
    expect(base).not.toContain("linear-gradient");
    const hover = blocksFor("styles/rewards.css", ".reward-primary-button:hover")
      .map((b) => b.body)
      .join("\n");
    expect(hover).not.toContain("violet");
  });

  it("Trackers' primary (the winning .tk2 block) meets the 44px height", () => {
    const exact = blocks(read("styles/trackers.css")).filter(
      (b) => b.selector.split("\n").pop()!.trim() === ".tk2-root .ci-btn--primary",
    );
    expect(exact.length).toBeGreaterThan(0);
    const winning = exact[exact.length - 1]!.body;
    expect(winning).toContain("min-height: 44px");
    expect(winning).toContain("background: var(--gold)");
  });

  it("the already-unified primaries stay unified (Nutrition, sheets, Profile)", () => {
    const nut = blocksFor("styles/nutrition.css", ".nut-btn-gold")
      .map((b) => b.body)
      .join("\n");
    expect(nut).toContain("background: var(--gold)");
    const sheet = blocksFor("styles/bloom-sheet.css", ".bsheet-primary")
      .map((b) => b.body)
      .join("\n");
    expect(sheet).toContain("height: 44px");
    expect(sheet).toContain("background: var(--primary)");
    const pf = blocksFor("styles/profile.css", ".pf-btn--primary")
      .map((b) => b.body)
      .join("\n");
    expect(pf).toContain("background: var(--gold)");
  });
});

/* ---------------- F-20: one accent ---------------- */

describe("one accent (M-203, F-20): Mood Intelligence acts in gold; violet is a data colour there", () => {
  it("no violet gradient or glow carries an action on the Intelligence page or its hero", () => {
    for (const rel of ["routes/mood/intelligence.tsx", "components/mood/Hero.tsx"]) {
      const text = read(rel);
      expect(text, rel).not.toContain("var(--grad-violet)");
      expect(text, rel).not.toContain("var(--glow-violet)");
    }
  });

  it("the Intelligence headline gradients are in the gold family", () => {
    for (const rel of ["components/mood/Hero.tsx", "routes/mood/intelligence.tsx"]) {
      const text = read(rel);
      expect(text, rel).not.toContain("from-violet");
      expect(text, rel).toContain("from-gold-soft");
      expect(text, rel).toContain("via-gold");
    }
  });

  it("the range chips' selected state is gold, not violet", () => {
    const hero = read("components/mood/Hero.tsx");
    expect(hero).toContain("border-gold/60");
    expect(hero).not.toContain("border-violet/60");
    expect(hero).not.toContain("dim-violet");
  });
});
