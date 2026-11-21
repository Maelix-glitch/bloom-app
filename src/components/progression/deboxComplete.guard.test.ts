import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Rewards de-box COMPLETE guards (owner directive 2026-11-21).
 * Pinned against the "De-box Complete — Rewards" block at the cascade
 * end of progression.css and the markup that actually renders it:
 *
 *   1. Hero (.pg-hero): no border, no fill, no shadow, no glint ring;
 *      the four corner-bracket elements are gone from JourneyHero.tsx.
 *   2. The ambient glow role moved to .pg-halo: a larger, gold-tinted,
 *      borderless radial gradient, still rendered inside the emblem.
 *   3. Next milestone (.pg-next): borderless container; its meter is a
 *      borderless pill track in a tonal surface step with a gold fill.
 *   4. Goals: .pg-goals-grid is a column of editorial rows, hairline
 *      dividers (white 6%) between the card wrappers only; .pg-goal
 *      itself wears no border, background, radius or shadow.
 *   5. Filter chips (.pg-chip): borderless and fill-less by default;
 *      the active chip alone carries a subtle fill.
 *   6. Group containers (.pg-group) are open on the canvas.
 *   7. Kept with reason: the collectible objects (rank ladder track,
 *      achievement medallions, crest plates) and the status banner
 *      keep their treatments — this block does not touch them either,
 *      extending the M-178 sanction to the new block.
 */

const SRC = join(process.cwd(), "src");
const CSS = readFileSync(join(SRC, "styles/progression.css"), "utf8");
const HERO = readFileSync(join(SRC, "components/progression/JourneyHero.tsx"), "utf8");
const GOALS = readFileSync(join(SRC, "components/progression/Goals.tsx"), "utf8");

const m178 = CSS.indexOf("De-box (M-178");
const marker = CSS.indexOf("De-box Complete — Rewards");
const BLOCK = marker >= 0 ? CSS.slice(marker) : "";

const rule = (re: RegExp) => BLOCK.match(re)?.[1] ?? null;

describe("rewards de-box complete", () => {
  it("the block exists at the cascade end, after M-178", () => {
    expect(m178).toBeGreaterThan(0);
    expect(marker).toBeGreaterThan(m178);
  });

  it("hero wears no border, fill, shadow or glint ring", () => {
    const hero = rule(/\.pg-hero \{([^}]*)\}/);
    expect(hero).not.toBeNull();
    expect(hero).toContain("border: none;");
    expect(hero).toContain("background: transparent;");
    expect(hero).toContain("box-shadow: none;");
    const glint = rule(/\.pg-hero::before \{([^}]*)\}/);
    expect(glint).not.toBeNull();
    expect(glint).toContain("display: none;");
  });

  it("corner brackets are removed from the hero markup", () => {
    expect(HERO).not.toContain("pg-hero-corner");
    expect(HERO).toContain("pg-hero");
    expect(HERO).toContain("pg-halo");
  });

  it("the halo is the ambient glow: larger, gold-tinted, radial", () => {
    const halo = rule(/\.pg-halo \{([^}]*)\}/);
    expect(halo).not.toBeNull();
    expect(halo).toContain("inset: -46%;");
    expect(halo).toContain("radial-gradient(");
    expect(halo).toContain("var(--gold)");
    expect(halo).not.toContain("border");
  });

  it("next milestone container is borderless", () => {
    const next = rule(/\.pg-next \{([^}]*)\}/);
    expect(next).not.toBeNull();
    expect(next).toContain("border: none;");
    expect(next).toContain("background: transparent;");
    expect(next).toContain("box-shadow: none;");
  });

  it("next meter is a borderless pill track in a tonal step, gold fill", () => {
    expect(HERO).toContain("pg-next-meter");
    const rail = rule(/\.pg-next-meter \.pg-rail \{([^}]*)\}/);
    expect(rail).not.toBeNull();
    expect(rail).toContain("border: none;");
    expect(rail).toContain("border-radius: var(--radius-pill);");
    expect(rail).toContain("background: var(--surface-2);");
    const fill = rule(/\.pg-next-meter \.pg-rail-fill \{([^}]*)\}/);
    expect(fill).not.toBeNull();
    expect(fill).toContain("background: var(--gold);");
  });

  it("goals render as hairline rows, not a boxed grid", () => {
    expect(GOALS).toContain("pg-goals-grid");
    expect(GOALS).toContain("pg-goal");
    const grid = rule(/\.pg-goals-grid \{([^}]*)\}/);
    expect(grid).not.toBeNull();
    expect(grid).toContain("display: flex;");
    expect(grid).toContain("flex-direction: column;");
    const divider = rule(/\.pg-goals-grid > div \+ div \{([^}]*)\}/);
    expect(divider).not.toBeNull();
    expect(divider).toContain("border-top: 1px solid rgb(255 255 255 / 0.06);");
    const goal = rule(/\.pg-goal \{([^}]*)\}/);
    expect(goal).not.toBeNull();
    expect(goal).toContain("border: none;");
    expect(goal).toContain("background: transparent;");
    expect(goal).toContain("border-radius: 0;");
    expect(goal).toContain("box-shadow: none;");
  });

  it("chips are borderless with fill on the active chip only", () => {
    expect(GOALS).toContain("pg-chip");
    const chip = rule(/\.pg-chip \{([^}]*)\}/);
    expect(chip).not.toBeNull();
    expect(chip).toContain("border: none;");
    expect(chip).toContain("background: transparent;");
    const on = rule(/\.pg-chip\.is-on \{([^}]*)\}/);
    expect(on).not.toBeNull();
    expect(on).toContain("border: none;");
    expect(on).toContain("background: color-mix(in oklab, var(--gold) 12%, transparent);");
    // no chip rule in the block reintroduces an outline
    expect(BLOCK).not.toContain("border: 1px solid var(--pg-line-soft)");
  });

  it("group containers are open on the canvas", () => {
    const group = rule(/\.pg-group \{([^}]*)\}/);
    expect(group).not.toBeNull();
    expect(group).toContain("border: none;");
    expect(group).toContain("background: transparent;");
  });

  it("collectible objects are untouched by this block too", () => {
    expect(BLOCK).not.toContain(".pg-path");
    expect(BLOCK).not.toContain(".pg-ach");
    expect(BLOCK).not.toContain(".pg-hall-item");
    expect(BLOCK).not.toContain(".pg-banner");
  });
});
