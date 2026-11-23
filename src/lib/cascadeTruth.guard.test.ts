import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Cascade-truth guards (M-194).
 *
 * The defect class, three times bitten (M-176/M-184, M-193, M-210/M-212):
 * a fix edits a CSS block, a guard pins THAT BLOCK's text, the suite goes
 * green — and the live page never changes, because a stronger or later
 * rule elsewhere in the cascade actually paints the element. (M-193's
 * territory fix never even reached main: PR #233's merge kept the M-190
 * text at the winning (0,2,0) block while its guard merged fine.)
 *
 * These guards therefore assert the cascade OUTCOME, not a block's text:
 * they parse EVERY stylesheet under src/ (styles.css + styles/*.css),
 * match every rule against the element's real ancestor chain, and
 * compute the winning declaration per property by (specificity, order)
 * — the same arithmetic the browser runs. If any rule anywhere starts
 * painting one of these surfaces again, the computed winner changes and
 * the guard fails, wherever the rule lives.
 */

const SRC = join(process.cwd(), "src");

interface El {
  tag: string;
  classes: string[];
  attrs?: Record<string, string>;
}

interface Rule {
  order: number;
  media: string | null;
  sel: string;
  decls: Record<string, string>;
}

function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, "");
}

function parseRules(text: string, order0: number): { rules: Rule[]; next: number } {
  const rules: Rule[] = [];
  let order = order0;
  const walk = (chunk: string, media: string | null) => {
    let idx = 0;
    let prelude = "";
    while (idx < chunk.length) {
      const c = chunk[idx];
      if (c === "{") {
        let depth = 1;
        let j = idx + 1;
        while (j < chunk.length && depth > 0) {
          if (chunk[j] === "{") depth++;
          else if (chunk[j] === "}") depth--;
          j++;
        }
        const inner = chunk.slice(idx + 1, j - 1);
        const sel = prelude.trim();
        if (sel.startsWith("@media")) {
          walk(inner, sel);
        } else if (!sel.startsWith("@")) {
          const decls: Record<string, string> = {};
          for (const d of inner.split(";")) {
            const k = d.indexOf(":");
            if (k > 0) decls[d.slice(0, k).trim()] = d.slice(k + 1).trim();
          }
          for (const one of sel.split(",")) {
            rules.push({ order, media, sel: one.trim(), decls });
          }
          order++;
        }
        prelude = "";
        idx = j;
      } else {
        prelude += c;
        idx++;
      }
    }
  };
  walk(stripComments(text), null);
  return { rules, next: order };
}

function loadAllRules(): Rule[] {
  const files = [join(SRC, "styles.css")];
  const dir = join(SRC, "styles");
  for (const f of readdirSync(dir).sort()) {
    if (f.endsWith(".css")) files.push(join(dir, f));
  }
  let order = 0;
  const all: Rule[] = [];
  for (const f of files) {
    const { rules, next } = parseRules(readFileSync(f, "utf8"), order);
    order = next;
    all.push(...rules);
  }
  return all;
}

const ALL_RULES = loadAllRules();

function specificity(sel: string): [number, number, number] {
  const ids = (sel.match(/#[\w-]+/g) ?? []).length;
  const cls =
    (sel.match(/\.[\w-]+/g) ?? []).length +
    (sel.match(/\[[^\]]+\]/g) ?? []).length +
    (sel.match(/:(?!:)[\w-]+/g) ?? []).length;
  const els =
    (sel.match(/(?:^|[\s>+~])[a-zA-Z][\w-]*/g) ?? []).length +
    (sel.match(/::[\w-]+/g) ?? []).length;
  return [ids, cls, els];
}

interface Compound {
  tag: string | null;
  classes: string[];
  attrs: string[];
  pseudos: string[];
}

function parseCompound(comp: string): Compound {
  const out: Compound = { tag: null, classes: [], attrs: [], pseudos: [] };
  const re = /(\.[\w-]+)|(\[[^\]]+\])|(::?[a-zA-Z-]+(?:\([^)]*\))?)|(^[a-zA-Z][\w-]*)|(\*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(comp)) !== null) {
    const tok = m[0];
    if (tok.startsWith(".")) out.classes.push(tok.slice(1));
    else if (tok.startsWith("[")) out.attrs.push(tok);
    else if (tok.startsWith(":")) out.pseudos.push(tok);
    else if (tok !== "*") out.tag = tok;
  }
  return out;
}

function compoundMatches(pc: Compound, el: El, state: "rest" | "hover"): boolean {
  if (pc.tag && pc.tag !== el.tag) return false;
  if (!pc.classes.every((c) => el.classes.includes(c))) return false;
  for (const a of pc.attrs) {
    const name = a.slice(1, -1).split("=")[0].trim();
    if (!el.attrs || !(name in el.attrs)) return false;
  }
  for (const p of pc.pseudos) {
    if (p.startsWith("::")) return false;
    const base = p.split("(")[0];
    if (base === ":hover") {
      if (state !== "hover") return false;
    } else if (
      [":active", ":focus", ":focus-visible", ":visited", ":disabled", ":checked"].includes(base)
    ) {
      return false;
    } else if (base === ":root") {
      if (el.tag !== "html") return false;
    }
    // structural pseudos (:nth-child, :first-of-type, …) are accepted:
    // the audited elements satisfy the ones their rules use.
  }
  return true;
}

function selectorMatches(sel: string, chain: El[], state: "rest" | "hover"): boolean {
  const toks = sel.match(/>|[^\s>]+/g) ?? [];
  const compounds: string[] = [];
  const combs: string[] = [];
  let pending: string | null = null;
  for (const t of toks) {
    if (t === ">") pending = ">";
    else {
      if (compounds.length > 0) combs.push(pending ?? " ");
      compounds.push(t);
      pending = null;
    }
  }
  const pcs = compounds.map(parseCompound);
  const rec = (ci: number, ei: number): boolean => {
    if (!compoundMatches(pcs[ci], chain[ei], state)) return false;
    if (ci === 0) return true;
    if (combs[ci - 1] === ">") return ei > 0 && rec(ci - 1, ei - 1);
    for (let j = ei - 1; j >= 0; j--) if (rec(ci - 1, j)) return true;
    return false;
  };
  return rec(pcs.length - 1, chain.length - 1);
}

/** The winning declaration for `prop` on the element, by (specificity, order). */
function computed(
  chain: El[],
  prop: string,
  state: "rest" | "hover" = "rest",
): string | null {
  let best: { key: [number, number, number, number]; value: string } | null = null;
  for (const r of ALL_RULES) {
    if (r.media) continue; // resting desktop outcome: unwrapped rules
    if (!(prop in r.decls)) continue;
    if (!selectorMatches(r.sel, chain, state)) continue;
    const [a, b, c] = specificity(r.sel);
    const key: [number, number, number, number] = [a, b, c, r.order];
    if (!best || key.join() > best.key.join()) best = { key, value: r.decls[prop] };
  }
  return best?.value ?? null;
}

const HTML: El = { tag: "html", classes: [] };
const BODY: El = { tag: "body", classes: [] };
const TK2_ROOT: El = {
  tag: "div",
  classes: ["ci", "ci-root", "tk2-root"],
  attrs: { "data-theme": "dark" },
};

const TERRITORY: El[] = [
  HTML,
  BODY,
  TK2_ROOT,
  { tag: "div", classes: ["at"] },
  { tag: "section", classes: ["at-board"] },
  { tag: "div", classes: ["at-board-main"] },
  { tag: "ul", classes: ["at-territories"] },
  { tag: "li", classes: ["at-territory"], attrs: { "data-id": "sleep" } },
];

const GLYPH: El[] = [
  HTML,
  BODY,
  TK2_ROOT,
  { tag: "ul", classes: ["tk2-targets-display"] },
  { tag: "li", classes: [], attrs: { "data-id": "water" } },
  { tag: "span", classes: ["tk2-target-glyph"] },
];

const EDIT_PILL: El[] = [
  HTML,
  BODY,
  TK2_ROOT,
  { tag: "div", classes: ["tk2-targets-wrap"] },
  { tag: "button", classes: ["ci-btn", "tk2-targets-edit"] },
];

const HERO: El[] = [
  HTML,
  BODY,
  { tag: "main", classes: ["pg-main"] },
  { tag: "section", classes: ["pg-hero"] },
];

const NEXT: El[] = [
  HTML,
  BODY,
  { tag: "main", classes: ["pg-main"] },
  { tag: "section", classes: ["pg-hero"] },
  { tag: "div", classes: ["pg-next"] },
];

const firstPercent = (v: string | null): number => {
  const m = v?.match(/(\d+(?:\.\d+)?)%/);
  return m ? Number(m[1]) : 0;
};

describe("cascade truth (M-194) — computed outcomes, not pinned blocks", () => {
  it("territories compute as tinted glass panes, wearing the owner's hairline (M-200, M-221)", () => {
    /* RE-CONTRACTED by M-200 (disclosed): M-194 pinned the territory
       fully open — border "none", radius "0". The owner reviewed the
       de-boxed page live (2026-11-22) and directed: the zones "need
       at least a border — it looks bad without it." The hairline
       therefore computes back in at the winning rule, with the
       radius the M-190 programme comment records for the zone (20px,
       as var(--radius-xl) — R8 bars the literal).
       RE-CONTRACTED by M-221 (disclosed, owner's glass picks
       2026-11-23): the territories are the preview's tinted glass
       panes — the shared material at strong tint over its plain
       fallback, the sheen, the blur, the rim. The M-200 hairline
       and radius pins stand unchanged; the fill/shadow pins now
       hold the glass values at the same strictness. */
    expect(computed(TERRITORY, "background-color")).toBe("var(--lg-tint-strong)");
    expect(computed(TERRITORY, "background-image")).toBe("var(--lg-sheen)");
    expect(computed(TERRITORY, "backdrop-filter")).toBe("var(--lg-blur)");
    expect(computed(TERRITORY, "border-radius")).toBe("var(--radius-xl)");
    expect(computed(TERRITORY, "box-shadow")).toBe("var(--lg-rim-soft), var(--lg-shadow)");
    expect(computed(TERRITORY, "border")).toBe("1px solid var(--border)");
  });

  it("territory hover is the flat 4% step on the glass — no lift, the hairline stays", () => {
    /* M-221: the 4% step rides over the sheen as a second image
       layer; the tint, the rim and the shadow carry through. */
    expect(computed(TERRITORY, "background-image", "hover")).toBe(
      "linear-gradient(rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.04)), var(--lg-sheen)",
    );
    expect(computed(TERRITORY, "transform", "hover")).toBe("none");
    expect(computed(TERRITORY, "box-shadow", "hover")).toBe("var(--lg-rim-soft), var(--lg-shadow)");
    /* M-200: hover must not strip the resting hairline — the winning
       hover rule declares no border of its own, so the frame the
       owner asked for survives the state change. */
    expect(computed(TERRITORY, "border", "hover")).toBe("1px solid var(--border)");
  });

  it("no rule anywhere (media queries included) carries a resting fill for the territory beyond the M-221 glass", () => {
    for (const r of ALL_RULES) {
      // Only rules whose selector actually TARGETS the territory element
      // (descendant rules — the quick-increment pills inside it — are
      // their own surfaces and keep their own paint).
      if (!selectorMatches(r.sel, TERRITORY, "rest")) continue;
      const bg = r.decls["background"] ?? r.decls["background-color"];
      if (bg) {
        expect(["transparent", "none", "var(--lg-tint-strong)"]).toContain(bg);
      }
      const sh = r.decls["box-shadow"];
      if (sh) expect(["none", "var(--lg-rim-soft), var(--lg-shadow)"]).toContain(sh);
    }
  });

  it("the target glyph medallion computes as a circle on a perceptible colour step", () => {
    expect(computed(GLYPH, "border-radius")).toBe("50%");
    const bg = computed(GLYPH, "background");
    expect(bg).toContain("color-mix");
    expect(firstPercent(bg)).toBeGreaterThanOrEqual(20);
  });

  it("the Edit pill computes gold-forward (rim and fill both lead with gold)", () => {
    const bg = computed(EDIT_PILL, "background");
    const bc = computed(EDIT_PILL, "border-color");
    expect(bg).toContain("var(--gold)");
    expect(firstPercent(bg)).toBeGreaterThanOrEqual(14);
    expect(bc).toContain("var(--gold)");
    expect(firstPercent(bc)).toBeGreaterThanOrEqual(50);
  });

  it("rewards hero: one separation step — top-aligned columns, token row gap, margin-less milestone", () => {
    expect(computed(HERO, "align-items")).toBe("start");
    expect(computed(HERO, "row-gap")).toBe("var(--space-6)");
    expect(computed(NEXT, "margin-top")).toBe("0");
  });

  it("decongestion (M-195): the spacing scale itself resolves at the raised steps", () => {
    const styles = readFileSync(join(SRC, "styles.css"), "utf8");
    // The rhythm the pages actually breathe at — if the scale is ever
    // tightened back, this fails before a single page rule is touched.
    expect(styles).toContain("--space-5: 1.5rem");
    expect(styles).toContain("--space-6: 1.75rem");
    expect(styles).toContain("--space-10: 3rem");
    expect(styles).toContain("--space-14: 4.5rem");
  });

  it("profile: the Getting started section wrapper lives inside the card (an empty card leaves no band)", () => {
    const profile = readFileSync(join(SRC, "routes/profile.tsx"), "utf8");
    const card = readFileSync(
      join(SRC, "components/profile/GettingStartedCard.tsx"),
      "utf8",
    );
    expect(profile).not.toContain('aria-label="Getting started"');
    expect(card).toContain('<section className="pf-section" aria-label="Getting started">');
  });
});
