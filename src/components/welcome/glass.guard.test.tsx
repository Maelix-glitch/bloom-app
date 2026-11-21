// @vitest-environment jsdom
/**
 * Liquid Glass guards (M-169, 2026-11-21 — the owner's Night Glass
 * programme).
 *
 * The material is powerful and the owner's rules around it are hard:
 * glass lives on onboarding and floating chrome ONLY, sheets stay fully
 * opaque, and glass never stacks on glass. These pins hold the three
 * lines structurally:
 *
 *   (a) the Welcome renders the material as the approved preview
 *       designs it (M-170) — words on the scene with NO glass panel,
 *       answers as glass pills, the decline apart as a text button,
 *       the recap as the preview's one solid card;
 *   (b) no sheet/modal panel wears the material — the same panel census
 *       sheet.guard holds opaque, re-checked here against the glass
 *       tokens and classes specifically;
 *   (c) the dock is still the single floating cluster, and its chrome
 *       (plus the phone brand bar) consumes the one material.
 *
 * Same mechanism as the house guards: render pins where the DOM is the
 * contract, source scans where the stylesheet is.
 */

import { createElement, forwardRef } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

afterEach(cleanup);

/* motion/react is mocked out, exactly as in Welcome.test.tsx: jsdom
   never runs the exit frames AnimatePresence waits on. */
vi.mock("motion/react", () => {
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) =>
        forwardRef(function MotionStub(props: Record<string, unknown>, ref) {
          const {
            initial: _initial,
            animate: _animate,
            exit: _exit,
            transition: _transition,
            variants: _variants,
            whileHover: _whileHover,
            whileTap: _whileTap,
            ...rest
          } = props;
          return createElement(tag, { ...rest, ref });
        }),
    },
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children: unknown }) => children,
    useReducedMotion: () => true,
  };
});

import { Welcome } from "./Welcome";

beforeAll(() => {
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = (() => ({
      matches: false,
      media: "",
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
  if (typeof window.ResizeObserver !== "function") {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");
const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, " ");

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

/* Blocks whose selector list names `sel` EXACTLY (as sheet.guard). */
const exactBlocks = (rel: string, sel: string) =>
  blocks(read(rel)).filter((b) =>
    b.selector.split(",").some((part) => part.split("\n").pop()!.trim() === sel),
  );
const blockFor = (rel: string, sel: string) =>
  blocks(read(rel)).find((b) =>
    b.selector.split(",").some((part) => part.split("\n").pop()!.trim().startsWith(sel)),
  );
/* A family can carry several blocks for one selector (geometry in one,
   surface in another — .app-mobile-bar does); the pin is that SOME
   exact block carries the needle. */
const someExactBlock = (rel: string, sel: string, needle: string) =>
  exactBlocks(rel, sel).some((b) => b.body.includes(needle));

function tap(text: RegExp) {
  const el = screen
    .getAllByRole("button")
    .find((b) => text.test((b.textContent ?? "").replace(/\s+/g, " ")));
  if (!el) throw new Error(`no button matching ${text}`);
  fireEvent.click(el);
  return el;
}

function setup() {
  render(<Welcome onFinish={() => {}} onAdmin={() => {}} />);
}

describe("glass guard: the material is defined once, to spec", () => {
  const glass = read("styles/glass.css");

  it("carries the owner's optical recipe and the specular rim", () => {
    expect(glass).toContain("blur(20px) saturate(180%)");
    /* Crisp bright top-left, softer bottom-right (owner spec §1). */
    expect(glass).toContain("rgba(255, 255, 255, 0.55)");
    expect(glass).toContain("rgba(255, 255, 255, 0.15)");
    /* Gold is the chosen state's tint. */
    expect(glass).toContain('.glass-pill[data-on="true"]');
  });

  it("paints a plain first coat before every tint and frost", () => {
    const panel = blockFor("styles/glass.css", ".glass-panel")!;
    expect(panel, ".glass-panel must exist").toBeTruthy();
    expect(panel.body.indexOf("--lg-fallback-strong")).toBeGreaterThanOrEqual(0);
    expect(panel.body.indexOf("--lg-fallback-strong")).toBeLessThan(
      panel.body.indexOf("--lg-tint-strong"),
    );
    /* M-170: the pill's surface is the preview's white frost — a plain
       rgba coat declared first, the gradient painted over it. The
       no-blur strengthening (next test's @supports block) is what
       keeps a blur-less engine legible, as it was under M-169. */
    const pill = blockFor("styles/glass.css", ".glass-pill")!;
    expect(pill.body).toContain(
      "linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.06))",
    );
    expect(pill.body.indexOf("background-color: rgba(255, 255, 255, 0.05)")).toBeLessThan(
      pill.body.indexOf("background-image: linear-gradient"),
    );
  });

  it("the chosen pill is the preview's black moment; the CTA has its gold-solid state", () => {
    const chosen = blockFor("styles/glass.css", '.glass-pill[data-on="true"]')!;
    expect(chosen, "the chosen-pill block must exist").toBeTruthy();
    /* Solid ink, gold-soft words, a gold-soft border (preview values). */
    expect(chosen.body).toContain("background-color: var(--background)");
    expect(chosen.body).toContain("color: var(--gold-soft)");
    expect(chosen.body).toContain("rgba(246, 233, 205, 0.5)");
    const solid = blockFor("styles/glass.css", '.glass-cta[data-solid="true"]')!;
    expect(solid, "the solid CTA block must exist").toBeTruthy();
    /* The preview's gradient stops are the token home's gold stops. */
    expect(solid.body).toContain("var(--gold-grad-hi)");
    expect(solid.body).toContain("var(--gold) 55%");
    expect(solid.body).toContain("var(--gold-grad-lo)");
    expect(solid.body).toContain("color: var(--lg-gold-ink)");
    expect(glass).toContain("--lg-gold-ink: #171106");
  });

  it("gates refraction behind support and reduced-motion, over the plain blur", () => {
    expect(glass).toContain('@supports (backdrop-filter: url("#lg-refract"))');
    const gate = glass.slice(glass.indexOf("@supports (backdrop-filter: url("));
    expect(gate).toContain("prefers-reduced-motion: no-preference");
    expect(gate).toContain('url("#lg-refract") blur(20px) saturate(180%)');
    /* No-blur engines strengthen the tint instead of floating pale. */
    expect(glass).toContain("@supports not ((backdrop-filter: blur(1px))");
  });

  it("never nests glass inside glass in any selector", () => {
    for (const rel of ["styles/glass.css", "styles/welcome.css"]) {
      const text = stripComments(read(rel));
      expect(
        /\.glass-[a-z-]+\s+[>~+]?\s*\.glass-/.test(text),
        `${rel} must not select glass inside glass`,
      ).toBe(false);
    }
  });
});

describe("glass guard: the Welcome wears it, structured so glass cannot stack", () => {
  it("the first screen is words on the scene over the mesh — no glass panel — with a solid gold CTA", () => {
    setup();
    /* The preview wraps the words in nothing: no glass panel anywhere,
       and the title sits in no glass element at all. */
    expect(document.querySelector(".glass-panel")).toBeNull();
    const title = screen.getByText(/Bloom keeps the record/);
    expect(
      title.closest(".glass-panel, .glass-pill, .glass-cap, .glass-field, .glass-cta"),
    ).toBeNull();
    /* The mesh is the preview's four pools. */
    const mesh = document.querySelector(".wl-mesh");
    expect(mesh, "the mesh scene must be mounted").toBeTruthy();
    expect(mesh!.querySelectorAll("i").length).toBe(4);
    /* The hero flower rides above the words, as previewed. */
    expect(document.querySelector(".wl-flower")).toBeTruthy();
    /* Begin wears the preview's solid gold CTA state. */
    const cta = document.querySelector(".wl-next.glass-cta");
    expect(cta).toBeTruthy();
    expect(cta!.getAttribute("data-solid")).toBe("true");
    /* The rail is the preview's bare bars — no capsule around them. */
    const rail = document.querySelector(".wl-rail");
    expect(rail).toBeTruthy();
    expect(rail!.classList.contains("glass-cap")).toBe(false);
    expect(rail!.querySelectorAll(".wl-seg").length).toBe(4);
    expect(rail!.querySelector('.wl-seg[data-state="on"]')).toBeTruthy();
  });

  it("answers are glass pills on the scene; the decline sits apart as text", () => {
    setup();
    tap(/get started/i);
    expect(document.querySelector(".glass-panel")).toBeNull();
    const q = screen.getByText(/Which best/);
    expect(q.closest(".glass-panel, .glass-pill, .glass-cap, .glass-field")).toBeNull();
    /* Two answers, both pills, dressed alike. */
    const pills = [...document.querySelectorAll("button.glass-pill")];
    expect(pills.length).toBe(2);
    /* The decline is not a third pill: it is the preview's apart
       text button, in its own centred row. */
    const decline = screen.getByRole("button", { name: /prefer not to say/i });
    expect(decline.classList.contains("glass-pill")).toBe(false);
    expect(decline.closest(".wl-apart")).toBeTruthy();
    /* The way back is the preview's glass capsule, in the top row. */
    const back = document.querySelector(".wl-back.glass-cap");
    expect(back).toBeTruthy();
    expect(back!.closest(".wl-top")).toBeTruthy();
    /* The rail's states follow the step: one done, the current lit. */
    const segs = [...document.querySelectorAll(".wl-seg")];
    expect(segs[0]!.getAttribute("data-state")).toBe("done");
    expect(segs[1]!.getAttribute("data-state")).toBe("on");
  });

  it("the name field is a glass field, and the recap is the preview's solid card", () => {
    setup();
    tap(/get started/i);
    tap(/Female/);
    tap(/continue/i);
    tap(/continue/i);
    const input = screen.getByLabelText(/your name, optional/i);
    expect(input.className).toContain("glass-field");
    expect(document.querySelector(".glass-panel")).toBeNull();
    /* The recap is the preview's solid card — a card, never glass. */
    const recap = screen.getByText("Included");
    expect(recap.closest(".wl-summary")).toBeTruthy();
    expect(
      recap.closest(".glass-panel, .glass-pill, .glass-cap, .glass-field, .glass-cta"),
    ).toBeNull();
    /* The last screen's CTA is solid gold too, as previewed. */
    expect(document.querySelector(".wl-next.glass-cta")!.getAttribute("data-solid")).toBe("true");
  });
});

describe("glass guard: the Welcome's geometry is the preview's (M-170)", () => {
  it("pins the preview's column, type and rhythm values in welcome.css", () => {
    /* The values are the preview's; their expression is the house
       token form ui.guard pins (shared tokens where the scale holds
       the value, scoped --wl-* tokens where it does not). */
    const welcome = read("styles/welcome.css");
    const shell = blockFor("styles/welcome.css", ".wl-shell")!;
    expect(shell.body).toContain("max-width: 410px");
    const title = blockFor("styles/welcome.css", ".wl-title")!;
    expect(title.body).toContain("clamp(30px, 8.72vw, 34px)");
    expect(title.body).toContain("font-weight: 600");
    expect(title.body).toContain("letter-spacing: var(--wl-tracking-title)");
    expect(welcome).toContain("--wl-tracking-title: -0.015em");
    const seg = blockFor("styles/welcome.css", ".wl-seg")!;
    expect(seg.body).toContain("width: 22px");
    expect(seg.body).toContain("height: 4px");
    const card = blockFor("styles/welcome.css", ".wl-card")!;
    expect(card.body).toContain("min-height: 52px");
    expect(card.body).toContain("padding: 14px var(--space-4)");
    const input = blockFor("styles/welcome.css", ".wl-input")!;
    expect(input.body).toContain("border-radius: var(--wl-radius-field)");
    expect(input.body).toContain("font-size: var(--wl-text-field)");
    expect(welcome).toContain("--wl-radius-field: 20px");
    expect(welcome).toContain("--wl-text-field: 17px");
    const summary = blockFor("styles/welcome.css", ".wl-summary")!;
    expect(summary.body).toContain("background: var(--wl-recap-bg)");
    expect(summary.body).toContain("border-radius: var(--wl-radius-recap)");
    expect(welcome).toContain("--wl-recap-bg: #0d0f13");
    expect(welcome).toContain("--wl-radius-recap: 22px");
    /* The mesh pools blur at the preview's 46px. */
    expect(welcome).toContain("blur(46px)");
  });
});

/* The sheet census from sheet.guard — every overlay panel family that
   must stay a fully opaque slab. The glass material may never reach
   them: no token, no class, no blur. */
const PANELS: [string, string][] = [
  ["styles/bloom-sheet.css", ".bsheet-panel"],
  ["styles/bloom-sheet.css", ".bsheet-panel.assess-panel"],
  ["styles/trackers.css", ".bsheet-panel.tk2-log-panel"],
  ["styles/trackers.css", ".bsheet-panel.tk2-snap-panel"],
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
  ["styles/billing.css", ".bill-card"],
];

describe("glass guard: sheets and modals never wear the material", () => {
  it("no panel block references a glass token, class or blur", () => {
    for (const [rel, sel] of PANELS) {
      for (const b of exactBlocks(rel, sel)) {
        expect(b.body.includes("--lg-"), `${sel} in ${rel} must not use glass tokens`).toBe(false);
        /* The M-169 classes specifically — the older --glass-bg sheen
           tokens are a different, recorded system (the .bill-card
           pattern: a sheen OVER a solid colour) and are not this pin's
           business. */
        expect(
          /\.glass-(panel|pill|cap|field|cta|refract)\b/.test(b.body),
          `${sel} in ${rel} must not use the Liquid Glass classes`,
        ).toBe(false);
        for (const d of b.body.split(";")) {
          const t = d.trim();
          if (t.startsWith("backdrop-filter:") || t.startsWith("-webkit-backdrop-filter:")) {
            expect(t.includes("none"), `${sel} in ${rel} must not blur (${t})`).toBe(true);
          }
        }
      }
    }
  });

  it("the sheet-kit stylesheets carry no glass tokens at all", () => {
    for (const rel of [
      "styles/bloom-sheet.css",
      "styles/trackers.css",
      "styles/billing.css",
      "styles/admin-panel.css",
    ]) {
      expect(read(rel).includes("--lg-"), `${rel} must stay glass-free`).toBe(false);
    }
  });
});

describe("glass guard: one dock, wearing the one material", () => {
  it("CoachOrb renders exactly one dock cluster", () => {
    const orb = read("components/coach/CoachOrb.tsx");
    expect(orb.match(/className="dock"/g)?.length).toBe(1);
  });

  it("the dock chrome and the phone brand bar consume the material tokens", () => {
    expect(someExactBlock("styles.css", ".dock__top", "var(--lg-blur)")).toBe(true);
    expect(someExactBlock("styles.css", ".dock__log", "var(--lg-blur)")).toBe(true);
    expect(someExactBlock("styles/orb.css", ".coach-orb", "var(--lg-blur)")).toBe(true);
    expect(someExactBlock("styles.css", ".app-mobile-bar", "var(--lg-blur)")).toBe(true);
    /* And the material is loaded once, from the root sheet. */
    expect(read("styles.css")).toContain('@import "./styles/glass.css"');
  });
});

describe("glass guard: selection lands in one step (M-173)", () => {
  it("the pill's transition animates no surface property", () => {
    const pill = blockFor("styles/glass.css", ".glass-pill")!;
    expect(pill, ".glass-pill must exist").toBeTruthy();
    const t = pill.body.match(/transition:([\s\S]*?);/)?.[1] ?? "";
    expect(t, ".glass-pill must declare its transition").not.toBe("");
    /* The press spring and the hover glow may animate… */
    expect(t).toContain("transform");
    expect(t).toContain("filter");
    /* …but the chosen state's surface must never cross-fade: no
       background, border, shadow or backdrop property in the list.
       A background-color fade over the animated mesh, while the
       gradient and border snap, IS the flicker the owner reported. */
    expect(t).not.toMatch(/background|box-shadow|border|backdrop/);
  });

  it("a chosen pill stands down hover and press — no second change", () => {
    for (const sel of [
      '.glass-pill[data-on="true"]:hover',
      '.glass-pill[data-on="true"]:active',
    ]) {
      const b = exactBlocks("styles/glass.css", sel)[0];
      expect(b, `${sel} must exist`).toBeTruthy();
      expect(b!.body).toContain("transform: none");
      expect(b!.body).toContain("filter: none");
    }
  });

  it("the tick carries no transition of its own; only the check's opacity fades", () => {
    const ticks = exactBlocks("styles/welcome.css", ".wl-tick");
    expect(ticks.length, ".wl-tick must exist").toBeGreaterThan(0);
    for (const tick of ticks) {
      /* No `transition: all` (the gold gradient flipped mid-fade) —
         and no shorthand transition at all: the fill lands with the
         pill's surface, in the same frame. */
      expect(tick.body).not.toMatch(/transition\s*:/);
    }
    const svg = exactBlocks("styles/welcome.css", ".wl-tick svg")[0];
    expect(svg, ".wl-tick svg must exist").toBeTruthy();
    expect(svg!.body).toMatch(/transition:\s*opacity/);
  });

  it("selection is an attribute flip: no key in the flow depends on it", () => {
    /* The entrance can only re-run if something remounts, and a
       remount needs a changed key or a changed component. The step
       wrapper's key is the step alone, the pills' keys are their
       stable identities — selection state appears in NO key, so
       choosing an answer flips data-on on the mounted pill and
       nothing else. (Node identity itself is not asserted: the
       motion mock above mints a fresh component per render, which
       remounts in jsdom what the real app's stable motion.div
       never does.) */
    const tsx = read("components/welcome/Welcome.tsx");
    expect(tsx).toContain("key={step}");
    expect(tsx).not.toMatch(/key=\{(answer|focus|trainerCode)/);
    setup();
    tap(/get started/i);
    const pill = screen.getByRole("button", { name: /^Female$/ });
    expect(pill.getAttribute("data-on")).toBe("false");
    fireEvent.click(pill);
    expect(screen.getByRole("button", { name: /^Female$/ }).getAttribute("data-on")).toBe("true");
    expect(document.querySelectorAll(".wl-mesh i").length).toBe(4);
  });
});
