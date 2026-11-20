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
 *   (a) the Welcome renders the material as designed — words in ONE
 *       glass panel per screen, answers as glass pills OUTSIDE it;
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

  it("paints a plain fallback before every color-mix tint", () => {
    const panel = blockFor("styles/glass.css", ".glass-panel")!;
    expect(panel, ".glass-panel must exist").toBeTruthy();
    expect(panel.body.indexOf("--lg-fallback-strong")).toBeGreaterThanOrEqual(0);
    expect(panel.body.indexOf("--lg-fallback-strong")).toBeLessThan(
      panel.body.indexOf("--lg-tint-strong"),
    );
    const pill = blockFor("styles/glass.css", ".glass-pill")!;
    expect(pill.body.indexOf("--lg-fallback)")).toBeLessThan(pill.body.indexOf("--lg-tint)"));
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
  it("the first screen is a glass panel over the mesh, with a glass CTA", () => {
    setup();
    const panel = document.querySelector(".glass-panel");
    expect(panel, "the words must sit in a glass panel").toBeTruthy();
    expect(panel!.textContent).toContain("Bloom keeps the record");
    expect(document.querySelector(".wl-mesh"), "the mesh scene must be mounted").toBeTruthy();
    expect(document.querySelector(".wl-next.glass-cta")).toBeTruthy();
    expect(document.querySelector(".wl-rail.glass-cap")).toBeTruthy();
  });

  it("answers are glass pills on the scene — never inside the panel", () => {
    setup();
    tap(/get started/i);
    const panel = document.querySelector(".glass-panel")!;
    expect(panel).toBeTruthy();
    expect(panel.textContent).toContain("Which best describes you?");
    /* The no-stacking rule, as a DOM fact: the panel holds text only. */
    expect(panel.querySelector("button")).toBeNull();
    expect(panel.querySelector(".glass-pill")).toBeNull();
    const pills = [...document.querySelectorAll("button.glass-pill")];
    expect(pills.length).toBeGreaterThanOrEqual(3);
    for (const pill of pills) expect(panel.contains(pill)).toBe(false);
    /* The way back is a glass capsule too. */
    expect(document.querySelector(".wl-back.glass-cap")).toBeTruthy();
  });

  it("the name field is a glass field, and the recap stays off the glass", () => {
    setup();
    tap(/get started/i);
    tap(/Female/);
    tap(/continue/i);
    tap(/continue/i);
    const input = screen.getByLabelText(/your name, optional/i);
    expect(input.className).toContain("glass-field");
    const panel = document.querySelector(".glass-panel")!;
    expect(panel.contains(input)).toBe(false);
    /* The recap is plain text on the scene — readable, unglazed. */
    const recap = screen.getByText("Included");
    expect(panel.contains(recap)).toBe(false);
    expect(recap.closest(".glass-panel, .glass-pill, .glass-cap, .glass-field")).toBeNull();
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
