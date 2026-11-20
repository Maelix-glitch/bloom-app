<!-- INTEGRATION NOTE (Muse, 2026-11-19): this file now carries BOTH build briefs.
     Brief v6 (first, below) is the operative brief — it supersedes Brief v4 wherever
     they conflict (owner's precedence ruling: v6 > v5 engagement > v4 > rulebook).
     Brief v4 is retained in full after v6 for reference; its programme is complete
     and merged. The Repo commands tail at the end applies to both. -->

<!-- BRIEF v7 (2026-11-19) is the operative brief for Nutrition › Plan and
     supersedes v6/v4 there (owner's precedence ruling: v7 > v6 > v4 >
     rulebook). It lives in docs/BLOOM_NUTRITION_PLAN.md. -->
Read `docs/BLOOM_NUTRITION_PLAN.md` before touching Nutrition › Plan, the sub-nav, the sidebar points card, or any `<details>`.

# BLOOM: BUILD BRIEF v6, "Connections and the Feel Layer"

## PARENT NOTES (binding adaptations — read before the brief)

- This repo is TypeScript + React 19 + TanStack Start. The brief's `.js` snippets are
  `.ts` / `.tsx` here; its CSS class names and DOM are the spec, its token names map onto
  Bloom's real tokens in `src/styles.css` + `src/styles/*.css` (census first, map, never
  rename Bloom's tokens wholesale).
- There is NO Playwright in this repo and none is to be installed. The §6 layout guards are
  implemented as vitest/jsdom structural guards in the house `*.guard.test.*` tradition plus
  unit tests; checks that truly need layout geometry are recorded as proxies and verified
  live by the parent after deploy.
- "The server decides each link's state" (§1/§2.2): Bloom computes insights client-side in
  the deterministic lib layer (`src/lib/insights/insights.ts` and friends). That lib layer
  IS the contract's authority — the Orbit UI component computes nothing statistical.
- Format helpers live in `src/lib/format.ts` (fmtKcal-style helpers, fmtGrams, fmtCount,
  fmtDate, fmtShoppingQty already exist) — add `plural`, `fmtDuration`, `fmtLitres` there.
  No `lib/format.js`.
- Level config is `src/lib/progression/ranks.ts` (Seedling 0 · First Bloom 500 · Sprout
  1,200 · Budding 2,200 · In Bloom 3,500 · Flourish 5,000 · Wildflower 7,000 · Evergreen
  9,500 · Blossom Keeper 12,500 · Perennial 16,000 · Everbloom 20,000 · Bloomkeeper
  25,000). The sidebar Level card already reads it (v4 Slice 2); the Today Growth card
  (M-118) is the remaining surface.
- `docs/BLOOM_ENGAGEMENT.md` (the v5 brief) is NOT in this repo, and registry items
  M-95…M-106 were never recorded here. The E-rules this brief cites (E-16, E-32, E-40,
  E-50, E-140) apply as the principles stated in this brief's own text — do not invent
  their fuller wording.
- Sheets: BloomSheet is the house sheet primitive; native `<dialog>` conversion was
  deliberately deferred in PR #179 with stated reasons. §3.3's sheet behaviour is built
  inside BloomSheet unless a slice's census reopens the decision with evidence.
- Container: this brief sets `--container` to 1120px for every page, overriding v4
  Slice 2's 1040/1280 split. v6 Slice 2 owns the change.
- The "test" / "test habit" rows in M-120 are the owner's OWN habits on his real account —
  Bloom ships no seed data (census-proven). Never delete user data; the fix is creation
  validation only.
- Habit points: `point_value` is user-set per habit (1–500, server-clamped). §4.1 removes
  the per-row display; the award is shown in the toast.

---

You are a senior front-end engineer with a product designer's eye working on **Bloom**
(food, habits, trackers, mood, coach; dark ink, warm gold, serif display, sans UI).
Hosted at maelix-glitch-bloom-app.bloomlabs.workers.dev.

**Precedence:** this brief > `docs/BLOOM_ENGAGEMENT.md` (v5) > v4 polish brief >
`docs/BLOOM_UI_RULES.md`. Conflicts: choose the more conservative option, record it in
the PR. This brief changes ONE earlier value: `--container` becomes **1120px** (Today and
Trackers use two-column grids that are cramped at 1040). One container value for every page.

## MISSION
1. Rebuild the **Connections** card ("Orbit") so it is beautiful, legible and honest.
2. Add a **Feel layer**: motion, transitions and performance rules that make the whole app
   feel smooth ("like butter") without ever being decorative noise.
3. Fix the Today, Trackers, Mood and Nutrition problems in §5.
4. Fix the data-trust bugs in §1 FIRST. A beautiful chart of wrong numbers is worse than an ugly one.

## WORKING RULES
1. Inspect the repo first. Post a 10-line summary (framework, styling method, routing,
   data layer, where Connections/insights are computed, how "paired days" and "logged
   days" are counted). Do not assume a framework: adapt snippets to the repo's styling.
2. One slice, one branch, one PR. No visual work in a data/trust PR.
3. Fix the source of a wrong number, not its display.
4. Business logic returns data. User-facing words live in one copy module. Never slice sentences.
5. Do not change a health-target formula or a goal silently. Report and ask.
6. Do not touch billing or auth.
7. Done = screenshots (3 seeded accounts x 4 widths), tests, guard tests, checklist. Never "it compiles".

---

## §1 DATA-TRUST TASKS (Slice 1, before any visuals)

Trace each, fix at the source, add a unit test, and report findings in the PR.

1. **Paired days (M-112).** "Food logging & mood: 7 of 8" while the food log has ~2 days.
   Find the counter. A paired day must have BOTH sides logged on that local date. Write
   `pairedDays(aDates, bDates)` as a pure function (set intersection of local ISO dates)
   with tests: no overlap -> 0; partial; identical; unordered input; duplicate dates.
2. **One definition of a "logged day" (M-113).** Today says 8, Trackers says 1. Define
   "a local date with at least one entry in any area" in `lib/days.js`, and a separate
   per-tracker "tracked day". Label each surface with which one it means ("8 days with
   any log", "1 day with trackers"). Every surface reads from the same function.
3. **Goal conflict (M-115).** Assessment says "lose weight", Programmes said
   "build strength". Find the single source of the goal. All surfaces read it. If the
   stored value really is "lose weight", the Programme recommendation logic is wrong.
   Do NOT change the goal. Report it.
4. **Formatting.** "~1350 kcal" -> `fmtKcal` ("~1,350 kcal"). Tracker targets use
   human units (add the helpers below). Plural bug "1 DAYS" -> `plural`.
5. **Level progress.** The Growth card's "66% THERE" = progress inside the level. Show
   "235 points to Sprout" with a labelled meter, from level thresholds in one config.

```js
// lib/format.js (additions)
export const plural = (n, one, many = one + "s") => `${fmtNumber(n)} ${n === 1 ? one : many}`;
export function fmtDuration(min) {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`;
}
export const fmtLitres = (ml) => (ml >= 1000 ? `${+(ml / 1000).toFixed(1)} L` : `${ml} ml`);
```
Tests: `fmtDuration(480) === "8 h"`, `fmtDuration(90) === "1 h 30 min"`,
`fmtLitres(2200) === "2.2 L"`, `plural(1,"day") === "1 day"`, `plural(0,"day") === "0 days"`.

Statistics note: a correlation over 8 points is very noisy. The server (not the UI)
decides each link's `state` (below). Use a rank correlation, never mark a link
"established" under 21 paired days, and get an analyst to review thresholds before launch.
Label anything under that "Early read".

---

## §2 CONNECTIONS ("ORBIT")

### 2.1 Replace two cards with one
Retire "Patterns across your days" as a separate card. Orbit contains the list.
Section: H2 "How your days connect", subtitle "Links appear only when your own logs show them."
(<= 90 chars), badge "Last 30 days". No eyebrow.

### 2.2 Data contract (the UI computes nothing statistical)
```ts
type OrbitNode = { key: string; label: string; icon: string /* trusted SVG from our icon set */;
                   daysLogged: number; windowDays: number /* 30 */ };
type OrbitLink = {
  id: string; a: string; b: string;
  paired: number; need: number;                 // paired days vs days required (8)
  state: "gathering" | "early" | "established"; // decided server-side
  tendency?: "together" | "opposite";           // only when state != gathering
  actionKey?: string;                           // the node to log to move a gathering link
};
```
Rules:
- Show only trackers the user has enabled. **Cycle (and any sensitive tracker) renders only
  if the user turned it on.** Never a default node.
- Draw only links the server returns (max 8). Never draw every pair.
- Fewer than 3 nodes or no links -> `.empty-row`: "Log mood and one more area for 8 days
  to see how your days connect." with one action.
- Every number carries its window. Register `data-metric="orbit-days"` for the day count.

### 2.3 Geometry (pure, tested)
```js
// ui/orbit-geometry.js
const r2 = (v) => +v.toFixed(2);

export function orbitLayout(n, radius = 32, c = 50, startDeg = -90) {
  return Array.from({ length: n }, (_, i) => {
    const t = ((startDeg + (360 / n) * i) * Math.PI) / 180;
    return { x: r2(c + radius * Math.cos(t)), y: r2(c + radius * Math.sin(t)) };
  });
}
export const labelSide = (p, c = 50) => {
  const ux = p.x - c, uy = p.y - c;
  return Math.abs(ux) > 12 ? (ux > 0 ? "right" : "left") : (uy > 0 ? "bottom" : "top");
};
const ctrl = (p, q, pull, c = 50) => ({
  x: c + ((p.x + q.x) / 2 - c) * pull,
  y: c + ((p.y + q.y) / 2 - c) * pull,
});
export function arcPath(p, q, pull = 0.3) {
  const k = ctrl(p, q, pull);
  return `M${p.x} ${p.y}Q${r2(k.x)} ${r2(k.y)} ${q.x} ${q.y}`;
}
/** de Casteljau: the first fraction t of the quadratic curve (progress line). */
export function partialArc(p, q, t, pull = 0.3) {
  const k = ctrl(p, q, pull);
  const L = (a, b) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const a = L(p, k), b = L(k, q), m = L(a, b);
  return `M${p.x} ${p.y}Q${r2(a.x)} ${r2(a.y)} ${r2(m.x)} ${r2(m.y)}`;
}
const RANK = { established: 0, early: 1, gathering: 2 };
export const sortLinks = (ls) =>
  [...ls].sort((x, y) => RANK[x.state] - RANK[y.state] || y.paired / y.need - x.paired / x.need);
```
Unit tests: `orbitLayout(6)[0]` is `{x:50,y:18}`; 6 points are 60 degrees apart;
`labelSide` gives top/bottom for x=50 and left/right for the side nodes; `partialArc(p,q,1)`
ends at q; `partialArc(p,q,0.5)` ends at the curve's true midpoint; `sortLinks` puts
established first, then early, then gathering by closeness.

### 2.4 Copy module (words live here only)
```js
// lib/orbit-copy.js
const lc = (s) => s.toLowerCase();
export const orbitCopy = {
  link(l, n) {
    const A = n[l.a], B = n[l.b], title = `${A} and ${lc(B)}`;
    if (l.state === "gathering") {
      const left = l.need - l.paired;
      return {
        title,
        badge: { kind: "neutral", text: `Gathering · ${l.paired} of ${l.need} days` },
        text: `${left} more day${left === 1 ? "" : "s"} with both logged and Bloom can check this.`,
        dots: { paired: l.paired, need: l.need },
        action: l.actionKey ? { key: l.actionKey, label: `Log ${lc(n[l.actionKey])} today` } : null,
      };
    }
    const dir = l.tendency === "opposite" ? "lower" : "higher";
    return {
      title,
      badge: l.state === "early"
        ? { kind: "gathering", text: `Early read · ${l.paired} days` }
        : { kind: "ok", text: `Pattern found · ${l.paired} days` },
      text: `On days with higher ${lc(A)}, ${lc(B)} tended to be ${dir} too.`,
      dots: null, action: null,
    };
  },
  node(nd) {
    return {
      title: nd.label,
      badge: null,
      text: nd.daysLogged
        ? `Logged on ${nd.daysLogged} of the last ${nd.windowDays} days.`
        : `Not logged in the last ${nd.windowDays} days.`,
      dots: null,
      action: { key: nd.key, label: `Log ${lc(nd.label)} today` },
    };
  },
  foot: "Patterns describe your own days. They don't show cause, and they aren't medical advice.",
};
```
Lint test: no copy string contains "cause" (except the foot), "because", "proves", "leads to".

### 2.5 Component
```js
// ui/orbit.js  (vanilla; adapt to the repo's framework, keep the logic and DOM identical)
import { orbitLayout, labelSide, arcPath, partialArc, sortLinks } from "./orbit-geometry.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function mountOrbit(root, { nodes, links, copy, onAction }) {
  const pts = orbitLayout(nodes.length);
  const pos = new Map(nodes.map((n, i) => [n.key, pts[i]]));
  const names = Object.fromEntries(nodes.map((n) => [n.key, n.label]));
  const L = sortLinks(links).slice(0, 8);
  const linkById = new Map(L.map((l) => [l.id, l]));
  const nodeByKey = new Map(nodes.map((n) => [n.key, n]));
  let selected = L[0] ? { type: "link", id: L[0].id } : { type: "node", id: nodes[0].key };

  const svgLinks = L.map((l, i) => {
    const p = pos.get(l.a), q = pos.get(l.b), t = Math.min(1, l.paired / l.need);
    const near = l.state === "gathering" && t >= 0.75;
    const body = l.state === "gathering"
      ? `<path class="link__track" d="${arcPath(p, q)}"/>` +
        (t > 0 ? `<path class="link__fill" pathLength="1" d="${partialArc(p, q, t)}"/>` : "")
      : `<path class="link__main" ${l.state === "established" ? 'pathLength="1"' : ""} d="${arcPath(p, q)}"/>`;
    return `<g class="link link--${l.state}${near ? " link--near" : ""}" data-link="${esc(l.id)}" style="--i:${i}">
      ${body}<path class="link__hit" d="${arcPath(p, q)}"/></g>`;
  }).join("");

  const nodeEls = nodes.map((n, i) => {
    const p = pos.get(n.key), cov = Math.min(1, n.daysLogged / n.windowDays);
    return `<button type="button" class="node" data-node="${esc(n.key)}" data-side="${labelSide(p)}"
        style="left:${p.x}%;top:${p.y}%;--cov:${cov};--i:${i}" aria-pressed="false"
        aria-label="${esc(n.label)}, logged on ${n.daysLogged} of the last ${n.windowDays} days">
      <span class="node__body"><span class="node__ring" aria-hidden="true"></span>${n.icon}</span>
      <span class="node__label">${esc(n.label)}</span></button>`;
  }).join("");

  const rows = L.map((l) => {
    const c = copy.link(l, names), t = Math.min(1, l.paired / l.need);
    const mid = l.state === "gathering"
      ? `<span class="meter" role="progressbar" aria-label="${esc(c.title)}: ${l.paired} of ${l.need} days"
            aria-valuemin="0" aria-valuemax="${l.need}" aria-valuenow="${l.paired}" style="--v:${t.toFixed(3)}"></span>`
      : `<i class="sample sample--${l.state}" aria-hidden="true"></i>`;
    const tail = l.state === "gathering" ? `${l.paired}/${l.need}` : l.state === "early" ? "Early" : "Found";
    return `<li><button type="button" class="linkrow" data-row="${esc(l.id)}" aria-pressed="false">
      <span>${esc(c.title)}</span>${mid}<b>${tail}</b></button></li>`;
  }).join("");

  root.classList.add("orbit-grid");
  root.innerHTML = `
    <div class="orbit" data-focus="off">
      <svg class="orbit__svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <circle class="orbit__guide" cx="50" cy="50" r="32"/>${svgLinks}
      </svg>
      <span class="orbit__mark" aria-hidden="true"><!-- Bloom arch mark, 24px --></span>${nodeEls}
    </div>
    <div class="orbit__side">
      <div class="orbit__panel" aria-live="polite"></div>
      <ul class="links">${rows}</ul>
      <p class="orbit__foot">${esc(copy.foot)}</p>
    </div>`;

  const orbit = root.querySelector(".orbit"), panel = root.querySelector(".orbit__panel");
  const $$ = (s) => [...root.querySelectorAll(s)];
  const selOf = (el) => el.dataset.node ? { type: "node", id: el.dataset.node }
    : { type: "link", id: el.dataset.link || el.dataset.row };

  function highlight(sel) {
    const hotL = new Set(), hotN = new Set();
    if (sel?.type === "link") { const l = linkById.get(sel.id); hotL.add(l.id); hotN.add(l.a); hotN.add(l.b); }
    if (sel?.type === "node") {
      hotN.add(sel.id);
      L.filter((l) => l.a === sel.id || l.b === sel.id).forEach((l) => { hotL.add(l.id); hotN.add(l.a); hotN.add(l.b); });
    }
    orbit.dataset.focus = sel ? "on" : "off";
    $$("[data-link]").forEach((e) => e.classList.toggle("is-hot", hotL.has(e.dataset.link)));
    $$("[data-row]").forEach((e) => e.classList.toggle("is-hot", hotL.has(e.dataset.row)));
    $$("[data-node]").forEach((e) => e.classList.toggle("is-hot", hotN.has(e.dataset.node)));
  }

  function select(sel) {
    selected = sel;
    const c = sel.type === "link" ? copy.link(linkById.get(sel.id), names) : copy.node(nodeByKey.get(sel.id));
    const dots = c.dots
      ? `<div class="pairdots" role="img" aria-label="${c.dots.paired} of ${c.dots.need} days with both logged">${
          Array.from({ length: c.dots.need }, (_, i) => `<i class="${i < c.dots.paired ? "on" : ""}"></i>`).join("")}</div>` : "";
    panel.classList.remove("is-in"); void panel.offsetWidth;            // restart the cross-fade
    panel.innerHTML = `<h3>${esc(c.title)}</h3>
      ${c.badge ? `<span class="badge badge--${c.badge.kind}">${esc(c.badge.text)}</span>` : ""}
      <p class="panel__text">${esc(c.text)}</p>${dots}
      ${c.action ? `<button type="button" class="btn btn--secondary btn--sm" data-action="${esc(c.action.key)}">${esc(c.action.label)}</button>` : ""}`;
    panel.classList.add("is-in");
    $$("[data-node]").forEach((e) => e.setAttribute("aria-pressed", String(sel.type === "node" && e.dataset.node === sel.id)));
    $$("[data-row]").forEach((e) => e.setAttribute("aria-pressed", String(sel.type === "link" && e.dataset.row === sel.id)));
    highlight(sel);
  }

  root.addEventListener("click", (e) => {
    const act = e.target.closest("[data-action]"); if (act) return onAction?.(act.dataset.action);
    const el = e.target.closest("[data-node],[data-row],[data-link]"); if (el) select(selOf(el));
  });
  root.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse") return;
    const el = e.target.closest("[data-node],[data-row],[data-link]"); if (el) highlight(selOf(el));
  });
  root.addEventListener("pointerout", (e) => {
    if (e.pointerType === "mouse" && !root.contains(e.relatedTarget)) highlight(selected);
    else if (e.pointerType === "mouse" && !e.relatedTarget?.closest?.("[data-node],[data-row],[data-link]")) highlight(selected);
  });
  root.addEventListener("focusin", (e) => { const el = e.target.closest("[data-node],[data-row]"); if (el) highlight(selOf(el)); });
  root.addEventListener("focusout", () => highlight(selected));
  root.addEventListener("keydown", (e) => { if (e.key === "Escape") highlight(selected); });

  select(selected);
  document.documentElement.classList.add("js");
  new IntersectionObserver(([en], io) => { if (en.isIntersecting) { orbit.classList.add("is-in"); io.disconnect(); } },
    { threshold: 0.35 }).observe(orbit);
}
```
If the repo uses a framework, port to a component with the same props and the same DOM
and classes. Do not reimplement the geometry or copy.

### 2.6 CSS (v2 tokens, no raw values)
```css
.orbit-grid{display:grid;grid-template-columns:minmax(0,30rem) minmax(0,1fr);gap:var(--s-10);align-items:center}
@media (max-width:860px){.orbit-grid{grid-template-columns:1fr;gap:var(--s-6)}}

.orbit{position:relative;inline-size:100%;max-inline-size:30rem;margin-inline:auto;aspect-ratio:1;isolation:isolate}
.orbit::before{content:"";position:absolute;inset:16%;border-radius:50%;z-index:-1;opacity:.5;
  background:radial-gradient(closest-side,var(--accent-soft),transparent);animation:breathe 7s ease-in-out infinite}
@keyframes breathe{50%{opacity:.85}}
.orbit__svg{position:absolute;inset:0;inline-size:100%;block-size:100%;overflow:visible;pointer-events:none}
.orbit__guide{fill:none;stroke:var(--border-subtle);stroke-width:.3;stroke-dasharray:.8 1.6}
.orbit__mark{position:absolute;inset:50% auto auto 50%;translate:-50% -50%;opacity:.35;color:var(--accent)}

/* threads: dotted = gathering, dashed = early read, solid = found (the confidence signature) */
.link{fill:none;stroke-linecap:round;transition:opacity var(--dur-2) var(--ease)}
.link__hit{stroke:transparent;stroke-width:4;pointer-events:stroke;cursor:pointer}
.link__track{stroke:var(--text-3);stroke-width:.55;stroke-dasharray:0 1.4;opacity:.7}
.link__fill{stroke:var(--text-2);stroke-width:.9;stroke-dasharray:1;stroke-dashoffset:0}
.link--near .link__fill{stroke:var(--accent)}                      /* goal gradient: nearly unlocked */
.link--early .link__main{stroke:var(--warning);stroke-width:.8;stroke-dasharray:1.6 1.2}
.link--established .link__main{stroke:var(--success);stroke-width:1;stroke-dasharray:1;stroke-dashoffset:0}
.link.is-hot :is(.link__fill,.link__main){stroke-width:1.5}
.link :is(.link__fill,.link__main){transition:stroke-width var(--dur-2) var(--ease),stroke-dashoffset 1s var(--ease) calc(var(--i) * 90ms + 250ms)}
.orbit[data-focus="on"] .link:not(.is-hot){opacity:.18}

/* one-shot draw-in (documented exception to "transform/opacity only": <= 8 paths, runs once) */
.js .orbit:not(.is-in) :is(.link__fill,.link--established .link__main){stroke-dashoffset:1}
.js .orbit:not(.is-in) :is(.link__track,.link--early .link__main){opacity:0}
.js .orbit:not(.is-in) .node__body{opacity:0;transform:scale(.9)}

/* nodes */
.node{position:absolute;translate:-50% -50%;inline-size:56px;block-size:56px;padding:0;border:0;background:none;
  color:var(--text-2);cursor:pointer;transition:opacity var(--dur-2) var(--ease)}
.node__body{position:relative;display:grid;place-items:center;inline-size:100%;block-size:100%;border-radius:50%;
  background:var(--surface-2);border:1px solid var(--border);
  transition:transform var(--dur-3) var(--ease),border-color var(--dur-2),color var(--dur-2),opacity var(--dur-4) var(--ease) calc(var(--i) * 70ms)}
.node__body svg{inline-size:20px;block-size:20px;stroke-width:1.5}
.node__ring{position:absolute;inset:-5px;border-radius:50%;pointer-events:none;
  background:conic-gradient(var(--ring,var(--text-3)) calc(var(--cov) * 360deg),var(--surface-3) 0);
  -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 2px),#000 0);
          mask:radial-gradient(farthest-side,transparent calc(100% - 2px),#000 0)}
.node:hover .node__body,.node.is-hot .node__body{transform:translateY(-2px) scale(1.04);border-color:var(--border-strong);color:var(--text-1);--ring:var(--text-2)}
.node[aria-pressed="true"] .node__body{border-color:var(--accent);color:var(--accent)}
.node[aria-pressed="true"] .node__ring{--ring:var(--accent)}
.node:focus-visible{outline:none}.node:focus-visible .node__body{box-shadow:var(--focus)}
.orbit[data-focus="on"] .node:not(.is-hot){opacity:.45}
.node__label{position:absolute;white-space:nowrap;font:500 var(--fs-14)/1 var(--font-ui);color:var(--text-2);pointer-events:none}
.node.is-hot .node__label,.node[aria-pressed="true"] .node__label{color:var(--text-1)}
.node[data-side="right"]  .node__label{inset:50% auto auto calc(100% + 12px);translate:0 -50%}
.node[data-side="left"]   .node__label{inset:50% calc(100% + 12px) auto auto;translate:0 -50%}
.node[data-side="top"]    .node__label{inset:auto auto calc(100% + 12px) 50%;translate:-50% 0}
.node[data-side="bottom"] .node__label{inset:calc(100% + 12px) auto auto 50%;translate:-50% 0}

/* side: panel + list */
.orbit__panel{display:grid;gap:var(--s-3);justify-items:start;min-block-size:9rem}
.orbit__panel h3{font:400 var(--fs-24)/1.25 var(--font-display);letter-spacing:-.01em}
.panel__text{color:var(--text-2);font-size:var(--fs-15);line-height:1.5;max-inline-size:var(--measure)}
.orbit__panel.is-in>*{animation:rise var(--dur-3) var(--ease) both}
.orbit__panel.is-in>*:nth-child(2){animation-delay:40ms}.orbit__panel.is-in>*:nth-child(3){animation-delay:80ms}
@keyframes rise{from{opacity:0;translate:0 6px}}
.pairdots{display:flex;gap:6px}
.pairdots i{inline-size:10px;block-size:10px;border-radius:50%;border:1px solid var(--border-strong)}
.pairdots i.on{background:var(--accent);border-color:var(--accent)}

.links{list-style:none;margin:var(--s-5) 0 0;padding:0;display:grid;gap:var(--s-1)}
.linkrow{display:grid;grid-template-columns:minmax(0,1fr) 5rem 3.25rem;gap:var(--s-3);align-items:center;inline-size:100%;
  min-block-size:44px;padding:var(--s-2) var(--s-3);border:0;border-radius:var(--r-sm);background:none;text-align:start;
  color:var(--text-2);font:500 var(--fs-14)/1.3 var(--font-ui);cursor:pointer;transition:background var(--dur-1)}
.linkrow:hover,.linkrow.is-hot{background:var(--surface-2);color:var(--text-1)}
.linkrow[aria-pressed="true"]{background:var(--surface-2);color:var(--text-1);box-shadow:inset 2px 0 0 var(--accent)}
.linkrow:focus-visible{outline:none;box-shadow:var(--focus)}
.linkrow b{font-weight:500;text-align:end;font-variant-numeric:tabular-nums;color:var(--text-1)}
.sample{display:block;block-size:0;border-top:2px solid}
.sample--early{border-top-style:dashed;border-color:var(--warning)}
.sample--established{border-color:var(--success)}
.orbit__foot{margin-block-start:var(--s-4);font-size:var(--fs-12);color:var(--text-3);max-inline-size:var(--measure)}
```
Accessibility checklist for Orbit: SVG is `aria-hidden`; every node and row is a real
`<button>` with `aria-pressed`; the panel is `aria-live="polite"`; focus ring on both;
the text list is the full alternative; reduced motion disables every animation (global
rule); colour is never the only signal (dotted/dashed/solid + label).

### 2.7 Orbit tests (write first)
- Geometry tests from §2.3.
- Copy lint from §2.4.
- Playwright: no two text boxes overlap (see §6), the panel is non-empty on load, clicking
  a row sets `aria-pressed="true"` on exactly one row and highlights its two nodes,
  Escape restores the selected highlight, `/today` has exactly one Orbit, and the old
  "Patterns across your days" card is gone.
- Visual check on the 3 seeded accounts: **new** (the empty row), **mid-use** (the real
  screenshot data: 1 early link, 4 gathering), **power user** (6 nodes, 8 links including
  established ones, long labels such as "Movement and exercise").

---

## §3 THE FEEL LAYER ("like butter")

Smooth is a set of measurable rules. Anything that breaks one is a bug.

### 3.1 Motion tokens (replace the earlier set)
```css
:root{
  --ease:cubic-bezier(.2,.8,.2,1);           /* default: quick start, soft landing */
  --ease-pop:cubic-bezier(.34,1.4,.64,1);    /* tiny overshoot: check marks, petals, selected faces ONLY */
  --ease-in-out:cubic-bezier(.65,0,.35,1);
  --dur-1:120ms; --dur-2:200ms; --dur-3:320ms; --dur-4:560ms;
}
```
- Press feedback <= 120ms. State changes 200ms. Enter/exit of larger things 320ms. 560ms is
  reserved for one-shot reveals. Nothing loops except the Orbit glow and skeletons.
- Animate `transform`, `opacity` and `translate` only. Documented exceptions: one-shot
  `stroke-dashoffset` (Orbit, check marks) and `grid-template-rows` for disclosure.
- Never animate `width`, `height`, `top`, `left`, `box-shadow` or `filter`.
- Motion must carry meaning (cause -> effect, hierarchy, continuity). Decoration is deleted.
- Everything respects `prefers-reduced-motion` (the global rule in tokens.css).

### 3.2 Page transitions (continuity between screens)
```css
@view-transition{navigation:auto}                         /* MPA, Chromium; ignored elsewhere */
::view-transition-old(root),::view-transition-new(root){animation-duration:180ms;animation-timing-function:var(--ease)}
.sidebar{view-transition-name:sidebar}
::view-transition-group(sidebar){animation:none}          /* the shell never animates */
```
```js
// SPA navigation helper: progressive enhancement, never required
export function go(update){
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduce) return update();
  document.startViewTransition(update);
}
```
Optional later: shared-element transition from a tracker tile to its detail using
`view-transition-name` set per tile at click time (and cleared after).

### 3.3 Bottom sheet (all quick-log surfaces use this, via native `<dialog>`)
```css
dialog.sheet{border:0;padding:0;background:var(--surface);color:var(--text-1);
  border-radius:var(--r-lg) var(--r-lg) 0 0;inline-size:min(100vw,32rem);margin:auto auto 0;
  max-block-size:min(86dvh,760px);overscroll-behavior:contain;
  translate:0 24px;opacity:0;
  transition:translate var(--dur-3) var(--ease),opacity var(--dur-2),overlay var(--dur-3) allow-discrete,display var(--dur-3) allow-discrete}
dialog.sheet[open]{translate:0 0;opacity:1}
@starting-style{dialog.sheet[open]{translate:0 24px;opacity:0}}
dialog.sheet::backdrop{background:rgba(3,5,7,.72);backdrop-filter:blur(6px);opacity:0;
  transition:opacity var(--dur-3),overlay var(--dur-3) allow-discrete,display var(--dur-3) allow-discrete}
dialog.sheet[open]::backdrop{opacity:1}
@starting-style{dialog.sheet[open]::backdrop{opacity:0}}
@media (min-width:721px){dialog.sheet{margin:auto;border-radius:var(--r-lg)}}
```
Browsers without `@starting-style` simply show it instantly. Esc closes, focus is
restored, and a visible close button exists (rules from v2 stay).

### 3.4 Micro-interactions (each with its purpose)
| Where | What | Why |
|---|---|---|
| Habit tick | Check draws in (dashoffset), box pops once (`--ease-pop`), name dims | confirms the cause of the change |
| Meal logged | Petal on the Today flower fills (opacity), meters animate once, toast with Undo | progress is visible and reversible |
| Mood face | Selected face pops, the others dim to 55%, tags and note slide open (`grid-template-rows`) | shows that the choice registered |
| Points | Number rolls once to the new value (<= 400ms, `tabular-nums`), only if the balance changed | links action to reward |
| Cards | Hover lifts the border colour only (no movement, no shadow) | calm |
| Buttons | `:active` moves down 1px | tactile |
| Lists | Optimistic insert/remove with a 200ms opacity and `translate` | no jumps |
| Mobile | `navigator.vibrate?.(8)` on tick and log (optional, off in settings) | tactile feedback without sound |

### 3.5 Performance = smoothness
- Preload the display serif (`<link rel="preload" as="font" crossorigin>`) with
  `font-display: swap` and `size-adjust` fallback metrics, so the H1 never reflows.
- Reserve space for everything: `aspect-ratio`, fixed skeleton heights, no layout shift
  (CLS < 0.05).
- `content-visibility:auto; contain-intrinsic-size:auto 480px` on below-the-fold cards.
- No scroll listeners: use `IntersectionObserver`. All other listeners are passive.
- Prefetch the next route on `pointerdown` and on hover-intent (>= 80ms).
- Optimistic UI for logging, with an offline queue (engagement brief E-16).
- Budget on a throttled mid-range Android: interaction response <= 100ms, route change
  <= 300ms, 60fps on scroll. Attach a Performance trace to the PR.

---

## §4 NEW COMPONENTS USED BELOW

### 4.1 Habit row (replaces the 24px circle)
```html
<li class="habit-wrap">
  <button class="habit" role="checkbox" aria-checked="false" aria-label="Drink water, around 08:00">
    <span class="habit__icon" aria-hidden="true"><!-- icon per habit, not one star --></span>
    <span class="habit__text"><span class="habit__name">Drink water</span><span class="habit__sub">Around 08:00</span></span>
    <span class="habit__box" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16"><path pathLength="1" d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>
  </button>
  <button class="icon-btn" aria-label="Habit options"><!-- 18px "..." --></button>
</li>
```
```css
.habit-wrap{display:grid;grid-template-columns:minmax(0,1fr) 44px;align-items:center}
.habit{display:grid;grid-template-columns:36px minmax(0,1fr) 28px;gap:var(--s-3);align-items:center;inline-size:100%;
  min-block-size:56px;padding:var(--s-2) var(--s-3);border:0;border-radius:var(--r-md);background:none;text-align:start;
  color:var(--text-1);cursor:pointer;transition:background var(--dur-1),transform var(--dur-1)}
.habit:hover{background:var(--surface-2)} .habit:active{transform:scale(.99)}
.habit:focus-visible{outline:none;box-shadow:var(--focus)}
.habit__text{display:grid;gap:2px;min-inline-size:0}
.habit__name{font:500 var(--fs-15)/1.3 var(--font-ui)} .habit__sub{font-size:var(--fs-12);color:var(--text-3)}
.habit__box{display:grid;place-items:center;inline-size:28px;block-size:28px;border-radius:50%;
  border:1.5px solid var(--border-strong);transition:background var(--dur-2) var(--ease),border-color var(--dur-2)}
.habit__box path{fill:none;stroke:var(--accent-ink);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;
  stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset var(--dur-3) var(--ease) 60ms}
.habit[aria-checked="true"] .habit__box{background:var(--accent);border-color:var(--accent);animation:pop var(--dur-3) var(--ease-pop)}
.habit[aria-checked="true"] path{stroke-dashoffset:0}
.habit[aria-checked="true"] .habit__name{color:var(--text-3)}
@keyframes pop{40%{transform:scale(1.14)}}
```
Points are NOT shown on each row. They appear in the toast ("Done · +10") after the tick.
Unequal per-habit points (+10, +30, +20) must be explained or normalised (v5 §11).

### 4.2 Mood selector (one component for Today's check-in and the Mood page)
```html
<div class="moods" role="radiogroup" aria-label="How does today feel?">
  <button class="mood" role="radio" aria-checked="false" data-mood="happy" style="--face:var(--mood-happy)">
    <svg aria-hidden="true"><!-- 40px face, full-opacity stroke --></svg><span>Happy</span></button>
  <!-- calm, neutral, sad, anxious, angry -->
</div>
<div class="reveal" data-open="false"><div><!-- optional tags + note: "Add words" --></div></div>
```
```css
:root{--mood-happy:#d9bf86;--mood-calm:#8fbf9f;--mood-neutral:#a9adb4;--mood-sad:#86abd8;--mood-anxious:#c4a2c0;--mood-angry:#d98a7c}
/* verify each >= 3:1 on --surface-2 by script */
.moods{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:var(--s-2)}
@media (max-width:720px){.moods{grid-template-columns:repeat(3,minmax(0,1fr))}}
.mood{display:grid;justify-items:center;gap:var(--s-2);padding:var(--s-4) var(--s-1);border-radius:var(--r-md);
  background:var(--surface-2);border:1px solid var(--border-subtle);color:var(--text-2);cursor:pointer;
  font:500 var(--fs-14)/1 var(--font-ui);
  transition:transform var(--dur-2) var(--ease),border-color var(--dur-2),background var(--dur-2),opacity var(--dur-2)}
.mood svg{inline-size:40px;block-size:40px;color:var(--face);stroke-width:1.6}
.mood:hover{transform:translateY(-2px);border-color:var(--border-strong)}
.mood:focus-visible{outline:none;box-shadow:var(--focus)}
.mood[aria-checked="true"]{border-color:var(--face);color:var(--text-1);
  background:color-mix(in oklab,var(--face) 12%,var(--surface-2));animation:pop var(--dur-3) var(--ease-pop)}
.moods:has([aria-checked="true"]) .mood[aria-checked="false"]{opacity:.55}
.reveal{display:grid;grid-template-rows:0fr;transition:grid-template-rows var(--dur-3) var(--ease)}
.reveal[data-open="true"]{grid-template-rows:1fr} .reveal>div{overflow:hidden}
```
Behaviour: one tap saves immediately (optimistic), shows the toast "Mood noted" with Undo,
and opens the reveal for optional tags and a note. Roving tabindex plus arrow keys for the
radiogroup. The faces are the ONLY entry point: remove the gold "+ Log an entry" button.
Low moods get the kind acknowledgement from v5 (E-50), never a task list.
Define the mood scale ONCE (for example 1-5 mapped from the 6 faces) and label it wherever
an average is shown ("Mood averaged 3.4 of 5").

### 4.3 Tracker tile (quick log on the tile)
```html
<article class="trk" data-state="empty">
  <header class="trk__head"><h3>Water</h3><span class="badge">Not logged today</span></header>
  <p class="trk__fig"><strong>0</strong><span>of 2.2 L</span></p>
  <div class="meter meter--goal" role="progressbar" aria-label="Water: 0 of 2.2 litres"
       aria-valuemin="0" aria-valuemax="2200" aria-valuenow="0" style="--v:0"></div>
  <footer class="trk__foot"><span>7-day average · —</span>
    <button class="btn btn--secondary btn--sm">+ 250 ml</button></footer>
</article>
```
| Tracker | Quick log |
|---|---|
| Water | +250 ml (long-press for amount) |
| Sleep | Stepper pre-filled with last value, in hours |
| Study | +30 min |
| Movement | +10 min |
| Energy | Five tappable dots, 1 to 5 |
| Screen | Stepper pre-filled with last value |
Targets are displayed in human units (`fmtDuration`, `fmtLitres`). Tile styling reuses
`.tile` from the v3 brief (figure first, meter, footer). Six empty tiles must collapse into
a single `.empty-row` when the user has NO data at all, with one primary "Log today".

---

## §5 SCREEN FIXES

### 5.1 Today
- **Hero:** H1 (serif, gold italic name, keep exactly as it is) + ONE subtitle in **sans**
  ("Five things left today." <= 90 chars). Remove the second serif line. Actions: ONE
  "Next up" card with the page's only `btn--primary`. "Log today's mood" and "Log today's
  metrics" become entries in Today's timeline. "Weekly report" and "BMI & daily targets"
  become links inside their sections. "Speak a command" becomes a mic button inside a
  single "Ask or log" field (a command bar) in the header.
- **Tagline** appears once (sidebar). The hero photo becomes an optional ambient
  background (opacity <= 35%, time-of-day tint) behind the greeting, never a competing
  card. Decorative, `aria-hidden`.
- **Growth card** becomes the same Level component as the sidebar (v4): "Sprout is
  next · 235 points to go", a labelled meter, and the level track with all four names
  (Seedling, First Bloom, Sprout, Budding) laid out in a **grid** so none can clip.
  Replace the pink text with `--text-2` (gold only for the current level dot).
- **Assessment** ("Your starting point") shows on Today only for the first 7 days or when
  stale (> 90 days). After that it lives in Profile -> Health. As a compact row: goal chip,
  `fmtKcal`, `fmtGrams` targets, an "Open Nutrition" secondary button.
- **Rituals:** use §4.1. Remove "test"/"test habit" from seed data and add validation
  (minimum 3 characters, no duplicate names). The five-dash progress becomes labelled
  ("0 of 5") with a meter. Icons come from a per-habit icon choice.
- **Check-in:** use §4.2. The card does NOT stretch to match its neighbour
  (`align-items:start` on the grid), or the two cards are stacked by priority.
- **Nutrition card:** a compact strip: ring (calories de-emphasised, per wellbeing
  rule), the next unlogged meal, and "Log meal" secondary. No paragraph.
- **Insights:** Orbit replaces both Connections and Patterns.
- The Today Flower (v5 §3.1) is the page anchor above Next up.

### 5.2 Trackers
- Use the shared `.page` container and the **serif H1** ("Daily metrics, at a glance."
  is fine copy). Eyebrow in sans, not mono.
- Replace the 24h dial with the **Bloom flower with six petals, one per tracker**, filled
  when logged today ("0 of 6 today"). Same signature viz as Today (daily actions) and
  Nutrition (food groups). Only if the dial shows real time-of-day data should it
  stay, and then at >= 3:1 contrast with sans labels.
- Tiles per §4.3. Header primary: "Log today" opens a `dialog.sheet` with all enabled
  trackers in a 2-column grid of steppers. **Delete the floating "Reflect & log today" pill**
  (M-130) and use the dock.
- **Targets:** collapse into a "Targets" disclosure or Settings sheet (it's a form).
  Show targets as human units. Inputs get unit suffixes, e.g. `8 h`, and "of 5" never wraps.
  The "What you track" chips become real toggles (`role="switch"` or `aria-pressed`)
  with a visible on/off style.
- **Achievements:** render as 4 tiles with an icon, a title, a meter ("1 of 7") and
  a plural-correct count. Earned = gold icon. Not earned = full-contrast neutral,
  never near-invisible. Never a bare 0 (v5 E-32).
- **Sleep recovery:** one sentence only. Methodology note in sans sentence case, >= 4.5:1,
  never all-caps mono. Remove the duplicate sentence. Empty sections ("What the record
  shows", "The route") render nothing or an `.empty-row`. A blank titled section is a bug.
- **Table ("Every day you've logged"):** sticky header with a solid background, units in
  the header, horizontal scroll container on mobile, and no overlay from any floating control.

### 5.3 Mood
- Faces per §4.2 at full contrast. One entry point.
- Hero: keep the photo, but H1 in the serif, **sans** eyebrow, and the pull quote moved
  under the H1 (left-aligned) or removed. The text sits on a gradient scrim that
  guarantees >= 4.5:1.
- The "However today lands, it goes on the record exactly as it felt." line is
  good copy: keep it as the card's single subtitle.
- Mood scale defined once and labelled (see §4.2).

### 5.4 Nutrition (additions to v4)
- Hero footer: ONE row of `.src` chips ("Estimate · Mifflin-St Jeor") and a plain
  "Eating window · appears with your first log" stat. No three-column jumble, no wrapped
  sentence. "Provenance ledger" gets a plain subtitle ("Where each number comes from").
- Replace the full-size "Nothing logged yet" card with `.empty-row`.
- **Wellbeing (needs a human reviewer):** the hero numeral "1,350 kcal left" is a
  countdown. Make protein and food-group balance the hero. Show calories as a plain
  figure ("0 of ~1,350 kcal"), never as "left", and respect "Hide calories". Do not change
  the target itself.

### 5.5 Global shell (still open)
Apply M-31, M-46, M-47, M-48, M-90, M-91 exactly as specified in the v4 brief: the `.dock`,
the in-pill nav marker, a labelled Level card, no presence dot, no blue tick unless it
means something real. Every screenshot should be free of them before this PR series ends.

---

## §6 GUARD TESTS (write first, watch them fail)
```js
// tests/feel-and-layout.spec.js
import { test, expect } from "@playwright/test";
const ROUTES = ["/", "/trackers", "/nutrition", "/mood", "/rewards", "/coach", "/profile"];

for (const route of ROUTES) {
  test(`layout guards: ${route}`, async ({ page }) => {
    await page.goto(route);
    const r = await page.evaluate(() => {
      // 1. no two text boxes overlap (catches the Connections label/percent collision)
      const els = [...document.querySelectorAll("main *")].filter(el =>
        el.offsetParent !== null && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
      const rs = els.map(el => ({ el, r: el.getBoundingClientRect() })).filter(({ r }) => r.width > 0 && r.height > 0);
      const overlaps = [];
      for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
        const a = rs[i], b = rs[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
        const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
        if (w > 2 && h > 4) overlaps.push([a.el.textContent.trim().slice(0, 24), b.el.textContent.trim().slice(0, 24)]);
      }
      // 2. nothing floats over content except the dock, dialogs, toasts and the sidebar
      const floating = [...document.querySelectorAll("body *")].filter(e =>
        getComputedStyle(e).position === "fixed" && !e.closest(".dock, dialog, .toast, .sidebar")).map(e => e.className);
      // 3. one shared container width
      const w = document.querySelector("main .page")?.getBoundingClientRect().width ?? 0;
      // 4. forbidden type: mono + uppercase on text longer than 24 chars
      const monoCaps = [...document.querySelectorAll("main *")].filter(e => {
        const s = getComputedStyle(e);
        return /mono/i.test(s.fontFamily) && s.textTransform === "uppercase" && e.textContent.trim().length > 24;
      }).map(e => e.textContent.trim().slice(0, 30));
      // 5. tap targets
      const small = [...document.querySelectorAll("main button, main [role=checkbox], main [role=radio], main [role=switch]")]
        .filter(b => b.offsetParent !== null).filter(b => { const q = b.getBoundingClientRect(); return q.height < 32 || q.width < 32; })
        .map(b => b.getAttribute("aria-label") || b.textContent.trim().slice(0, 20));
      return { overlaps: overlaps.slice(0, 10), floating, w: Math.round(w), monoCaps, small };
    });
    expect(r.overlaps, "overlapping text").toEqual([]);
    expect(r.floating, "fixed elements covering content").toEqual([]);
    expect(r.monoCaps, "mono caps over 24 chars").toEqual([]);
    expect(r.small, "tap targets under 32px").toEqual([]);
    expect(r.w, "container width").toBeLessThanOrEqual(1120);
  });
}
```
Also unit tests: `pairedDays`, `fmtDuration`, `fmtLitres`, `plural`, `orbitLayout`, `partialArc`,
`sortLinks`, orbit copy lint, and `habit-math` (v5). Add a Playwright test that opens each
`dialog.sheet`, presses Esc and checks focus returns to the opener.
Tune selectors to the repo. Exemptions need `data-allow="..."` plus a justification in the PR.

---

## §7 SLICES (in order; each ends with the checks in §8)
1. **GUARDS + DATA:** failing guard tests, §1 tasks (paired days, logged-day definition, goal
   conflict report, formatters, level thresholds).
2. **SHELL + CONTAINER:** `--container: 1120px`, one `.page`, the dock, sidebar items, delete
   the floating "Reflect & log today" pill.
3. **FEEL TOKENS:** motion tokens, view transitions, `dialog.sheet`, reduced-motion check.
4. **ORBIT:** geometry, copy, component, CSS, tests, retire "Patterns across your days".
5. **TODAY:** hero, Next up, rituals (§4.1), check-in (§4.2), Growth/Level, compact
   Nutrition strip.
6. **TRACKERS:** flower, tiles (§4.3), "Log today" sheet, targets, achievements, sleep recovery, table.
7. **MOOD + NUTRITION additions:** §5.3 and §5.4.
8. **SWEEP:** run all guard tests on every route. Fix every failure.
9. **RUBRIC:** score every changed screen on the v4 ten-dimension rubric, aim >= 4/5, attach before/after.

## §8 VERIFY (every PR)
3 seeded accounts (new, mid-use, power user with 365 days and long names) x widths 360, 768,
1280, 1920, full-page screenshots · all guard tests green · axe clean · contrast script
(including mood faces and thread colours at 3:1) · stylelint (no raw values) · keyboard pass
(Orbit nodes and rows reachable, focus visible, mouse clicks leave no ring) · reduced-motion
and forced-colors pass · squint test · cover-the-text test · performance trace (60fps scroll,
CLS < 0.05, interaction <= 100ms) · wellbeing review box from v5 answered · PR lists
assumptions, leftovers and registry updates (M-107 to M-137 added, never deleted).

## NEVER
Draw an Orbit link the server didn't return · compute a correlation or "paired day" in the
UI · show a sensitive tracker by default · put a label and a number in the same spot ·
animate layout properties · loop an animation (except the Orbit glow and skeletons) ·
use overshoot easing on layout · float a control over content · show per-row points on
habits · dim a primary interaction to look disabled · show two entry points for one
action · use mono caps for a sentence · use pink or any off-palette text colour · slice a
sentence · change a goal or health target silently · state a pattern from thin data as
fact.

## FIRST ACTIONS
1. Repo summary (10 lines), including where "paired days", "logged days" and the goal are
   computed.
2. Add the §6 guard tests (failing) and post the failure report.
3. Add M-107 to M-137 to `docs/MISTAKES.md`.
4. Start Slice 1. No visual work until the numbers are right.

---

---

# BLOOM: BUILD BRIEF v4, "Polish and Clarity" (for the coding agent)

<!-- PARENT NOTES (Muse, 2026-11-19 — binding adaptations of this brief to this repo):
1. This repo is TypeScript + React (TanStack Start). The brief's `.js` paths are
   illustrative: the copy module is `src/lib/reasons.ts`, targets `src/lib/targets.ts`
   (or the existing nutrition targets module if one owns this — trace first), the
   flower is a React component. Class names and token names adapt to Bloom's house
   CSS and tokens, as in briefs v2/v3.
2. There is NO Playwright setup in this repo. Implement Part 6's checks as vitest/
   jsdom structural guards in the existing anti-document guard files, as was done
   for v3. Do not install Playwright.
3. M-82 context from the M-57 trace (PR #199): the Twin's "% of your energy target"
   and the Nutrition hero divide by the SAME targets object — the percentages are
   proven consistent. The ~2,950 kcal figure is the Maintenance energy estimate
   (estimated burn), a different number with its own label. M-82's open question is
   TARGET PLAUSIBILITY (1,350 kcal with 171 g protein = ~51% protein share), not a
   second target source. Trace the formula, report, and do NOT change it silently —
   it is flagged for human nutrition review (brief Part 3.5).
4. Brief v4 replaces brief v3 as the operative brief. Slices 1–5 of v3 are built
   (PRs #199/#200 merged; v3 Slice 5 in flight separately). Where v4 reorders the
   Nutrition page (Part 1) or absorbs sections (3.4), v4 wins.
-->

You are a senior front-end engineer with a product designer's eye. Bloom is a food,
nutrition and health app (dark ink, warm gold, serif display, sans UI).

**Precedence:** this brief > the v3 anti-document brief > `docs/BLOOM_UI_RULES.md`
(v2 + addendum §16–§22). Record any conflict in your PR.

## MISSION
Stop showing the planner's reasoning log. Show outcomes first, as charts, meters,
badges and short rows. Explanations go behind disclosures. Then bring every screen to
**at least 4/5 on all ten rubric dimensions**.

## RUBRIC (score every changed screen before and after, honestly, with screenshots)
Hierarchy · Scannability (one visual anchor per card) · Rhythm and spacing · Alignment
and grid · Colour discipline · Typography · Data visualisation · Consistency ·
Interaction polish · Brand identity. A PR that leaves any dimension under 4 says why.

## WORKING RULES
1. Inspect the repo first and post a 10-line summary. Do not assume a framework.
2. One slice, one branch, one PR. Never mix trust fixes with visual work.
3. Fix the source of a wrong value, not its display.
4. **The planner returns data, and the UI owns the words.** No prose strings are built
   in planner or business logic. Return `{kind, ...numbers}` and render copy in ONE
   file (`/lib/reasons.js`). This is the root fix for M-81.
5. Ask before destructive changes only (data migrations, route deletion, billing).
6. Never touch billing or auth, except the date computation bug.
7. "Done" means screenshots, tests and the verify list. Never "it compiles".

## PART 1: NUTRITION PAGE ARCHITECTURE

Final order (each is a `<section class="section">` with a real H2 and a one-line subtitle):
1. Hero (ring + day strip) · 2. Today's meals · 3. **Today's balance** · 4. **How today's
plan was adjusted** · 5. **Your metabolic twin** (absorbs "What your plan learned") ·
6. Shopping and pantry · 7. Condition modes · 8. Programmes · 9. Dishes (own route).
Add the sticky sub-nav: Today · Plan · Insights · Shopping and pantry · Programmes · Dishes.

**Say it once.** Each fact lives in exactly one place:
| Fact | Lives in | Elsewhere |
|---|---|---|
| Intake vs targets (458/1,350 kcal, 23/171 g) | Twin → Food-log coverage tile | link only, never restate |
| Maintenance requirements (2/10, 0/2) | Twin → Maintenance tile | never restate |
| Guideline coverage (veg, fruit, groups) | Today's balance | never restate |
| Plan adjustments | "How today's plan was adjusted" | never restate |
| Methodology (ICMR-NIN, USDA, Mifflin–St Jeor) | one "How this plan is built" dialog | link only |
Every rendered metric carries `data-metric="<key>"`. A guard test fails on duplicates.

## PART 2: SECTION ANATOMY AND SPACING (fixes M-84, M-86, M-87)
- Every section = `.section-head` (H2 serif 24 + subtitle ≤ 90 chars + optional actions)
  then content. **An eyebrow can never replace an H2.** Eyebrows are allowed only in
  the page hero.
- 56px between sections, 16px between cards in a section, 24px inside cards.
- Body text is 15px `--text-2` and secondary text is 14px. Nothing readable is below
  12px. One body style for the whole page.
- Sections get `scroll-margin-top: 80px` for the sub-nav.

```css
.section{margin-block-start:var(--s-14);scroll-margin-block-start:80px}
.section:first-of-type{margin-block-start:0}
```

## PART 3: REBUILDS

### 3.1 Today's meals (fixes M-88)
- The **next unlogged meal** gets the only `btn--primary`. Other meals get `btn--secondary`.
  A logged meal shows a "Logged ✓" badge and no button.
- Buttons are 10px-radius rectangles (see rulebook). Pills are for badges and chips only,
  which keeps interactive and non-interactive elements distinguishable.
- Label: "Log meal" (verb first, shorter).
- Macros use 8px category dots with a neutral number, never coloured text. If kcal is not
  already the first figure on the card, add it.
```html
<footer class="meal__foot">
  <ul class="macros">
    <li><i class="dot dot--protein"></i><b>47 g</b> protein</li>
    <li><i class="dot dot--fibre"></i><b>4 g</b> fibre</li>
  </ul>
  <button class="btn btn--primary btn--sm">Log meal</button>
</footer>
```
```css
:root{ /* macro dots only; never text, never badges. Verify ≥3:1 on --surface by script */
  --macro-protein:#8fbf9f; --macro-carb:#c9b8a0; --macro-fat:#8aa4c4; --macro-fibre:#a99bc9}
.macros{display:flex;gap:var(--s-4);list-style:none;margin:0;padding:0;color:var(--text-2);font-size:var(--fs-14)}
.macros b{color:var(--text-1);font-weight:600;font-variant-numeric:tabular-nums}
.dot{display:inline-block;inline-size:8px;block-size:8px;border-radius:50%;margin-inline-end:6px;background:var(--text-3)}
.dot--protein{background:var(--macro-protein)} .dot--carb{background:var(--macro-carb)}
.dot--fat{background:var(--macro-fat)}         .dot--fibre{background:var(--macro-fibre)}
```

### 3.2 Today's balance (replaces the three guideline paragraphs, fixes M-85)
Anchor = **the Bloom flower**, Bloom's own visualisation: one petal per food group, a
filled petal for each group covered today. Next to it, two goal meters (vegetables, fruit).
Under it, chips for the missing groups, which is the actionable part. Use the app's own
food-group list and classifier (the app says 8 groups). Do not hardcode names.

```js
// ui/bloom-flower.js
export function bloomFlower(groups, size = 112) {
  const n = groups.length, c = size / 2;
  const r = size * 0.285, rx = size * 0.105, ry = size * 0.19;
  const done = groups.filter(g => g.covered).length;
  const petals = groups.map((g, i) =>
    `<ellipse class="petal${g.covered ? " is-on" : ""}" style="--i:${i}"
       cx="${c}" cy="${c - r}" rx="${rx}" ry="${ry}"
       transform="rotate(${(360 / n) * i} ${c} ${c})"/>`).join("");
  return `<svg class="flower" viewBox="0 0 ${size} ${size}" role="img"
    aria-label="${done} of ${n} food groups covered">${petals}
    <circle class="flower__core" cx="${c}" cy="${c}" r="${size * 0.05}"/></svg>`;
}
export const coverage = (actual, goal) => ({
  pct: Math.min(100, Math.round((actual / goal) * 100)),
  gap: Math.max(0, goal - actual),
  met: actual >= goal,
});
```
```css
.flower{inline-size:112px;block-size:112px;flex:none}
.petal{fill:var(--surface-3);stroke:var(--border);stroke-width:1}
.petal.is-on{fill:var(--accent-soft);stroke:var(--accent);stroke-width:1.25;
  animation:petal-in .5s var(--ease) both;animation-delay:calc(var(--i) * 60ms)}
.flower__core{fill:var(--accent)}
@keyframes petal-in{from{opacity:0}to{opacity:1}}   /* opacity only: the transform attr is in use */

.balance{display:grid;grid-template-columns:auto minmax(0,1fr);gap:var(--s-8);align-items:center}
.balance__flower{display:grid;justify-items:center;gap:var(--s-3)}
.balance__flower b{font:400 var(--fs-30)/1 var(--font-display);font-variant-numeric:tabular-nums}
.balance__flower span{font-size:var(--fs-12);color:var(--text-3)}
.balance__bars{display:grid;gap:var(--s-5);max-inline-size:28rem}
@media (max-width:720px){.balance{grid-template-columns:1fr}}

.cover{display:grid;gap:var(--s-2)}
.cover__row{display:flex;justify-content:space-between;align-items:baseline}
.cover__row span{font:500 var(--fs-14)/1.3 var(--font-ui);color:var(--text-2)}
.cover__row b{font:600 var(--fs-18)/1 var(--font-ui);font-variant-numeric:tabular-nums}
.cover__row small{font-size:var(--fs-12);color:var(--text-3);font-weight:400}
.cover__hint{font-size:var(--fs-12);color:var(--text-3)}
.cover .meter{--fill:var(--text-2)} .cover .meter.is-met{--fill:var(--success)}
```
```html
<div class="cover">
  <div class="cover__row"><span>Vegetables</span><b>360 <small>/ 400 g</small></b></div>
  <div class="meter meter--goal" role="progressbar" aria-label="Vegetables: 360 of 400 grams"
       aria-valuenow="360" aria-valuemin="0" aria-valuemax="400" style="--v:.9"></div>
  <p class="cover__hint">40 g to go · ICMR-NIN guideline</p>
</div>
```
- The unfilled petals use the neutral `--surface-3`, not a dashed outline. Dashed stays
  reserved for **estimated** (the signature rule), so "missing" never borrows it.
- A guideline is a target and not a verdict. Fill is neutral. It turns `--success` when met.
  Amber is only for under 50%. Tone: "40 g to go", never "short" or "failed".
- The ICMR-NIN chip carries an info popover with the methodology, not a sentence.

### 3.3 How today's plan was adjusted (replaces the other three paragraphs, fixes M-81)
Max 3 rows, using the `.insight` component (v3). Each row has a title (≤ 4 words), one
detail line (≤ 140 chars), a source chip and an optional action. Text comes ONLY from
`/lib/reasons.js`.
```js
// lib/reasons.js
import { fmtGrams } from "./format.js";
const COPY = {
  "protein-bias": r => ({ title: "Higher-protein picks",
    detail: `Your last ${r.days} logged days averaged ${fmtGrams(r.logged)} protein against a ${fmtGrams(r.target)} target. Target unchanged.`,
    source: { label: "Food log", kind: "measured" } }),
  "kitchen-relaxed": () => ({ title: "Kitchen limits relaxed",
    detail: "Your kitchen answers left almost no dishes, so no-cook dishes come first and cooking is allowed.",
    source: { label: "Assessment", kind: "measured" },
    action: { label: "Review kitchen answers", href: "/profile#assessment" } }),
  "snack-added": r => ({ title: "Snack added",
    detail: `You listed ${r.meals} meals a day; a snack spreads today across ${r.meals + 1} sittings.`,
    source: { label: "Assessment", kind: "measured" } }),
};
export function reasonCopy(r) {
  const c = COPY[r.kind]?.(r);
  if (c && c.detail.length > 140) console.warn("reason copy over 140 chars:", r.kind);
  return c ?? null;
}
```
Never `slice()` or clamp a sentence. If text can overflow, use CSS `line-clamp` with an
ellipsis, a `title`, and a "More" disclosure. Unknown reason kinds render nothing (log them).

### 3.4 Metabolic twin absorbs "What your plan learned" (fixes M-83, M-92, M-93)
- Retire "What your plan learned" as a separate section.
- Inside the twin: an optional **insight strip** (max 2 rows) of conclusions only, with
  numbers linking to the tile (never restated), then the tile grid from v3.
- A conclusion from fewer than 7 logged days carries a dashed badge **"Early read ·
  N days"**. The headline is neutral: "Intake is below target so far", never "running
  under".
- Each insight has a verb action when one exists ("Log today's meals", "Log weight").
- Requirement meters: grid `7rem minmax(0,320px) 3rem`, count adjacent to its bar.
```css
.req li{grid-template-columns:7rem minmax(0,20rem) 3rem}
```

### 3.5 Targets (M-82), a data task
```js
// lib/targets.js
export const pctOfTarget = (actual, target) => Math.round((actual / target) * 100);
export function assertPlausibleTargets({ kcal, proteinG }) {
  const share = (proteinG * 4) / kcal;
  const ok = kcal >= 1200 && share <= 0.35;
  if (!ok) console.warn("Implausible targets", { kcal, proteinG, proteinShare: +share.toFixed(2) });
  return ok;
}
```
Tests: `pctOfTarget(458,1350) === 34`, `pctOfTarget(23,171) === 13`, and
`assertPlausibleTargets({kcal:1350,proteinG:171}) === false`. Then trace how the kcal target
is computed (BMR vs maintenance, activity factor, goal adjustment). Find why the hero showed
about 2,950 kcal. **One target source for the whole app.** Report findings in the PR and do
not silently change the formula. Flag it for human nutrition review.

## PART 4: SHELL (fixes M-89, M-90, M-91)

### Nav: active vs focus
```css
.nav a{position:relative;outline:none}
.nav a:focus-visible{box-shadow:var(--focus)}               /* keyboard only */
.nav a[aria-current="page"]{background:var(--surface-2);color:var(--text-1)}
.nav a[aria-current="page"]::before{content:"";position:absolute;inset-block:10px;inset-inline-start:0;
  inline-size:3px;border-radius:0 3px 3px 0;background:var(--accent)}   /* inside the pill */
```
Mouse clicks must never leave a ring. Audit every `:focus` selector and replace with
`:focus-visible`.

### One dock for floating controls
```html
<div class="dock">
  <button class="fab dock__top" aria-label="Back to top" data-show="false"><!-- 18px up-arrow --></button>
  <button class="fab dock__assistant" aria-label="Ask Bloom"><!-- gold glyph --></button>
</div>
<div id="top-sentinel" aria-hidden="true"></div>
```
```css
.dock{position:fixed;inset:auto var(--s-6) var(--s-6) auto;display:flex;flex-direction:column;
  align-items:center;gap:var(--s-3);z-index:40}
.fab{inline-size:48px;block-size:48px;border-radius:50%;display:grid;place-items:center;
  background:var(--surface-2);border:1px solid var(--border);color:var(--accent);
  box-shadow:0 8px 24px rgba(0,0,0,.4)}
.fab:hover{border-color:var(--border-strong)}
.fab:focus-visible{outline:none;box-shadow:var(--focus)}
.dock__top{color:var(--text-2);visibility:hidden;opacity:0;transform:translateY(8px);
  transition:opacity var(--dur-2),transform var(--dur-2),visibility 0s var(--dur-2)}
.dock__top[data-show="true"]{visibility:visible;opacity:1;transform:none;transition-delay:0s}
#top-sentinel{position:absolute;inset:0 auto auto 0;inline-size:1px;block-size:150vh;pointer-events:none}
@media (max-width:720px){.dock{inset-block-end:calc(64px + var(--s-4) + env(safe-area-inset-bottom))}}
```
```js
const top = document.querySelector(".dock__top");
new IntersectionObserver(([e]) => { top.dataset.show = String(!e.isIntersecting); })
  .observe(document.getElementById("top-sentinel"));
top.addEventListener("click", () => scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
```
Same size, same style, same x. No white fill, no rainbow ring, no logo on back-to-top.

### Sidebar footer
- Level card: "{current level} → {next level}", a labelled meter and "{n} points to {next}",
  with `n` computed from level thresholds. No bare percentage.
- Account row: avatar, name, plan or level (shown once, not duplicated in the Level card),
  gear. **Remove the presence dot.** Remove the blue tick, or make it gold if it means
  something real.
- Tagline artwork: contained in a fixed-height footer with a gradient mask and text at ≥4.5:1,
  or removed. No dead zone between Profile and the footer.

## PART 5: MOTION AND INTERACTION POLISH
- **Meters** animate from 0 once, when first visible: `transform: scaleX()` (no width
  animation), 600ms ease-out. `.js` class is set in `<head>` to avoid a flash.
```css
.meter{position:relative;block-size:6px;border-radius:var(--r-pill);background:var(--surface-3);overflow:hidden}
.meter::after{content:"";position:absolute;inset:0;background:var(--fill,var(--accent));
  transform-origin:left;transform:scaleX(var(--v,0));transition:transform .6s var(--ease)}
.js .meter:not(.is-in)::after{transform:scaleX(0)}
.meter--goal::before{content:"";position:absolute;inset-block:0;inset-inline-end:0;inline-size:2px;background:var(--text-3);z-index:1}
```
```js
document.documentElement.classList.add("js");
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { threshold: .4 });
document.querySelectorAll(".meter").forEach(m => io.observe(m));
```
- Here `--v` is a decimal 0–1 (`.9`), not a percentage. Update the meter in v2 to match.
- Cards: hover lifts the border to `--border`, never moves the layout.
- Buttons: `:active` moves down 1px. Every interactive element has a visible
  `:focus-visible`. Toasts confirm copy and save.
- Loading uses skeletons that match the final layout, never spinners for page content.
- All motion respects `prefers-reduced-motion`.

## PART 6: GUARD TESTS (extend `tests/anti-document.spec.js`; write them first and watch them fail)
```js
import { test, expect } from "@playwright/test";
test("nutrition: polish guards", async ({ page }) => {
  await page.goto("/nutrition");
  const r = await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto";
    const vis = el => !el.closest("details:not([open]), dialog:not([open]), [hidden]");
    // 1. no truncated sentences
    const truncated = [...document.querySelectorAll("main p")].filter(vis)
      .map(p => p.textContent.trim()).filter(t => t.length > 40 && !/[.!?…)”":]$/.test(t));
    // 2. every section has an H2
    const noH2 = [...document.querySelectorAll("main .section")]
      .filter(s => !s.querySelector(":scope > .section-head h2, :scope > h2"))
      .map(s => s.id || s.className);
    // 3. section spacing >= 48px
    const secs = [...document.querySelectorAll("main .section")];
    const tight = secs.slice(1).filter((s, i) =>
      s.getBoundingClientRect().top - secs[i].getBoundingClientRect().bottom < 48).length;
    // 4. at most one primary button in any viewport
    let maxPrimary = 0;
    for (let y = 0; y < document.body.scrollHeight; y += innerHeight / 2) {
      scrollTo(0, y);
      const n = [...document.querySelectorAll(".btn--primary")].filter(b => {
        const q = b.getBoundingClientRect(); return q.width > 0 && q.bottom > 0 && q.top < innerHeight; }).length;
      maxPrimary = Math.max(maxPrimary, n);
    }
    scrollTo(0, 0);
    // 5. every fact once
    const seen = {};
    document.querySelectorAll("[data-metric]").forEach(e => seen[e.dataset.metric] = (seen[e.dataset.metric] || 0) + 1);
    const dup = Object.entries(seen).filter(([, n]) => n > 1).map(([k]) => k);
    // 6. back-to-top hidden at scroll 0
    const top = document.querySelector(".dock__top");
    const topHidden = !top || getComputedStyle(top).visibility === "hidden";
    return { truncated, noH2, tight, maxPrimary, dup, topHidden };
  });
  expect(r.truncated, "truncated sentences").toEqual([]);
  expect(r.noH2, "sections without an H2").toEqual([]);
  expect(r.tight, "sections closer than 48px").toBe(0);
  expect(r.maxPrimary, "primary buttons in one viewport").toBeLessThanOrEqual(1);
  expect(r.dup, "metrics shown twice").toEqual([]);
  expect(r.topHidden, "back-to-top visible at scroll 0").toBe(true);
});
```
Add unit tests for `coverage`, `pctOfTarget`, `assertPlausibleTargets` and
`reasonCopy` (every `detail` ≤ 140 chars and ends with a full stop). Tune the selectors to
the repo's real class names. Exemptions need `data-allow="…"` plus a PR justification.

## SLICES (in order)
1. **GUARDS + DATA**: failing tests, `reasons.js`, `targets.js`, truncation fix, target trace,
   one target source, `data-metric` attributes.
2. **SHELL**: nav focus and active, dock, level card, account row, tagline, container.
3. **SECTION SYSTEM**: `.section` and `.section-head` on every Nutrition section, spacing,
   body text sizes, sub-nav.
4. **TODAY**: meal cards (button hierarchy, macro dots), Today's balance (flower and
   meters), plan adjustments.
5. **TWIN**: absorb "What your plan learned", early-read badges, meter widths.
6. **Roll-out** to Profile, Trackers, Mood, Rewards and Coach using the same components.
7. **Rubric review**: score every screen, then fix anything under 4.

## VERIFY (every PR)
Three seeded accounts × widths 360, 768, 1280, 1920, full-page screenshots · axe clean ·
contrast script (including the macro dots at 3:1) · stylelint (no raw values) · keyboard pass
(mouse clicks leave no ring) · squint test · cover-the-text test · guard tests green ·
before/after rubric scores · `docs/MISTAKES.md` updated (M-81 to M-94).

## PR FORMAT
What · Why (registry IDs closed) · Before/after screenshots · Rubric scores · Checks ticked
honestly · Assumptions · Leftovers. Commits: `type(scope): summary`.

## NEVER
Build prose in planner or business logic · slice a sentence · restate a fact that has a home ·
use an eyebrow as the only heading · colour text to mean a category · show two filled gold
buttons in one viewport · leave a focus ring after a mouse click · animate width, height,
top or left · mix two floating-button styles · show a presence dot or a blue verified tick
without a real meaning · state a 2-day conclusion as fact · change a health target formula
without flagging it for human review.

## FIRST ACTIONS
1. Repo summary. 2. Add the failing guard tests and post their report. 3. Add M-81 to M-94 to
`docs/MISTAKES.md`. 4. Start Slice 1.

---


---

## Repo commands (preserved from the previous AGENTS.md)

# Bloom

Personal tracker web app — habits, mood, sleep, study and cycle — built with
TanStack Start, React and Tailwind CSS.

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run test` — unit tests (vitest)
- `npm run lint` — eslint
