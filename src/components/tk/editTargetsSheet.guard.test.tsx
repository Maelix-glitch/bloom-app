// @vitest-environment jsdom
/**
 * M-197 — the Edit targets sheet, designed (owner screenshot,
 * 2026-11-21: "can't find any difference — this is pure mess").
 *
 * Three defects, three pin families:
 *
 *   1. BLEED-THROUGH. The targets panel was the one BloomSheet panel
 *      never entered in sheet.guard's opacity census — its log and
 *      snapshot siblings are pinned, this one was not, so the owner's
 *      creation-time opacity check never ran on it. Pins: the census
 *      names it now, and its own rule carries the solid slab as both
 *      the shorthand and an explicit background-color bottom layer.
 *   2. NOTHING LOOKED EDITABLE. The fields were ghost inputs —
 *      border: 0, background: transparent, one hairline under the
 *      figure. Pins: every manual target renders a real control (a
 *      filled, bordered field with − / + steppers wired to the same
 *      commit the typing path uses), and the ghost border-bottom is
 *      gone from the winning input rule.
 *   3. SCATTERED LAYOUT. Pins: value and unit stay one group inside
 *      the control (input immediately followed by its unit), the
 *      control carries the visible fill + border at 44px, and the
 *      foot gets real spacing.
 *
 * Data is frozen throughout: the water row stays a plan-set fact
 * (no input, no steppers, "Set by your plan"), and a stepper click
 * commits through the sheet's own clamped onCommit.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";

import type { TrackerStore } from "@/hooks/useTrackers";
import type { DayEntry, Goals } from "@/lib/trackers/core";
import { TargetSheet } from "./Targets";

afterEach(cleanup);

const GOALS: Goals = {
  sleepMinutes: 480,
  waterMl: 2200,
  studyMinutes: 120,
  movementMinutes: 30,
  energy: 3,
  screenMinutes: 180,
};

function makeStore(setGoal: (key: keyof Goals, value: number) => void): TrackerStore {
  return {
    sync: { state: "off", message: "", signedIn: false },
    syncNow: () => {},
    days: [] as DayEntry[],
    goals: GOALS,
    waterTargetMl: 3350,
    analysis: null,
    today: "2026-11-21",
    hydrated: true,
    saveDay: () => ({ ok: true as const }),
    removeDay: () => {},
    clearAll: () => {},
    setGoal,
    resetGoals: () => {},
    active: ["sleep", "water", "study", "movement", "energy", "screen"],
    setActive: () => {},
    toggleActive: () => {},
    customSubjects: [],
    rememberSubject: () => {},
    forgetSubject: () => {},
    undoable: null,
    undo: () => {},
    dismissUndo: () => {},
  } as unknown as TrackerStore;
}

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
const CSS_BLOCKS = blocks(read("styles/trackers.css"));
const blockWith = (needle: string) => CSS_BLOCKS.find((b) => b.selector.includes(needle));
const M197_AT = read("styles/trackers.css").indexOf("M-197");
const BLOCK197 = M197_AT >= 0 ? read("styles/trackers.css").slice(M197_AT) : "";

describe("M-197 — the edit sheet's controls are real controls", () => {
  it("every manual target renders a control: steppers, field, unit in one group", () => {
    render(<TargetSheet store={makeStore(() => {})} />);
    for (const id of ["sleep", "study", "movement", "energy", "screen"]) {
      const row = document.querySelector(`.tk2-targets-grid li[data-id="${id}"]`);
      expect(row, id).not.toBeNull();
      const control = row!.querySelector(".tk2-target-control");
      expect(control, `${id} control`).not.toBeNull();
      const steps = control!.querySelectorAll("button.tk2-target-step");
      expect(steps.length, `${id} steppers`).toBe(2);
      expect(steps[0]!.getAttribute("aria-label")).toMatch(/^Decrease /);
      expect(steps[1]!.getAttribute("aria-label")).toMatch(/^Increase /);
      /* value and unit are one group: the input is immediately
         followed by its unit inside the field. */
      const field = control!.querySelector(".tk2-target-field");
      expect(field, `${id} field`).not.toBeNull();
      expect(field!.querySelector(`input#target-${id} + .tk2-unit`)).not.toBeNull();
    }
  });

  it("a stepper click commits through the sheet's own clamped commit", () => {
    const setGoal = vi.fn();
    render(<TargetSheet store={makeStore(setGoal)} />);
    const sleepRow = document.querySelector('.tk2-targets-grid li[data-id="sleep"]')!;
    fireEvent.click(sleepRow.querySelectorAll("button.tk2-target-step")[1]!);
    expect(setGoal).toHaveBeenCalledWith("sleepMinutes", 495);
    const energyRow = document.querySelector('.tk2-targets-grid li[data-id="energy"]')!;
    fireEvent.click(energyRow.querySelectorAll("button.tk2-target-step")[0]!);
    expect(setGoal).toHaveBeenCalledWith("energy", 2);
  });

  it("water stays a plan-set fact: no input, no steppers, the guide figure", () => {
    render(<TargetSheet store={makeStore(() => {})} />);
    const row = document.querySelector('.tk2-targets-grid li[data-id="water"]')!;
    expect(row.querySelector("input")).toBeNull();
    expect(row.querySelectorAll("button.tk2-target-step").length).toBe(0);
    expect(row.textContent).toContain("3350");
    expect(row.textContent).toContain("3.4 L · Set by your plan");
  });
});

describe("M-197 — the panel is pinned opaque, the ghost field is gone", () => {
  it("the targets panel is in sheet.guard's opacity census", () => {
    expect(read("lib/sheet.guard.test.ts")).toContain('".bsheet-panel.tk2-targets-panel"');
  });

  it("the panel's own rule carries the slab twice: shorthand and colour", () => {
    const panel = blockWith(".bsheet-panel.tk2-targets-panel");
    expect(panel).toBeTruthy();
    expect(panel!.body).toContain("background: var(--surface);");
    expect(panel!.body).toContain("background-color: var(--surface);");
    expect(panel!.body).toContain("backdrop-filter: none;");
  });

  it("the winning input rule has no ghost underline left", () => {
    const input = blockWith(".tk2-targets-grid input");
    expect(input).toBeTruthy();
    expect(input!.body).toContain("width: 5ch");
    expect(input!.body).not.toContain("border-bottom");
  });

  it("the M-197 block gives the control its fill, border and 44px height", () => {
    expect(M197_AT).toBeGreaterThan(0);
    expect(BLOCK197).toContain(".tk2-targets-panel .tk2-target-control");
    expect(BLOCK197).toContain("background: var(--surface-2);");
    expect(BLOCK197).toContain("border: 1px solid var(--border-strong);");
    expect(BLOCK197).toContain("min-height: 44px;");
    expect(BLOCK197).toContain(".tk2-target-step");
    expect(BLOCK197).toContain("width: 44px;");
  });

  it("the foot breathes: spacing above the reset row", () => {
    const foot = blockWith(".tk2-targets-foot");
    expect(foot).toBeTruthy();
    expect(foot!.body).toContain("margin: var(--space-5) 0 0;");
    expect(foot!.body).toContain("padding-top: var(--space-4);");
  });
});
