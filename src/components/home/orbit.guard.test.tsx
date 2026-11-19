// @vitest-environment jsdom
/**
 * Orbit guards (Brief v6 Slice 4 — M-107…M-111, M-114), written first:
 *
 *  · NO percentages anywhere in the section — a node's evidence is its
 *    logged days, a link's strength is words; "%" was the unexplained
 *    score the audit killed (M-107, M-108);
 *  · node labels are sentence-case words from the one allowed set;
 *  · the drawing is honest: one arc per real connection, no more;
 *  · strength words come from the lib's thresholds (`strengthWord` in
 *    lib/home/orbit) — the component carries no literals of its own;
 *  · the Cycle node is opt-in (M-114): absent by default even though
 *    the default cycle mode says "tracking", present once the person
 *    has logged cycle days or explicitly chosen a mode, gone when off;
 *  · the retired "Patterns across your days" card stays retired
 *    (M-111): Today no longer mounts WholeLifeInsights.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { analyzeCycle } from "@/lib/cycle/predict";
import type { WholeLifeInsight, WholeLifePending } from "@/lib/insights/insights";
import { ORBIT_LABELS, orbitLayout, strengthWord } from "@/lib/home/orbit";
import { connections, type Connection, type CrossLink } from "@/lib/home/today";
import { analyzeTrackers, DEFAULT_GOALS } from "@/lib/trackers/core";
import { ConnectionConstellationView } from "./ConnectionConstellation";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

const NODES: Connection[] = [
  { id: "mood", strength: 0.8, days: 24, note: "24 mood days this month." },
  { id: "sleep", strength: 0.6, days: 18, note: "Averaging 7h 20m this week." },
  { id: "habits", strength: 0.3, days: 9, note: "2 of 5 done today." },
];
const LINKS: CrossLink[] = [
  {
    from: "mood",
    to: "sleep",
    weight: 0.8,
    sentence: "On better-slept nights, your mood runs higher.",
    days: 21,
  },
  {
    from: "habits",
    to: "mood",
    weight: 0.5,
    sentence: "Habit-complete days lift your mood.",
    days: 14,
  },
];
const INSIGHTS: WholeLifeInsight[] = [
  {
    kind: "sleep-mood",
    headline: "Mood tends to run higher after longer sleep",
    detail: "After longer nights, your mood averaged 9/10.",
    figures: [
      { label: "Longer nights · about 8.5 hours", value: "Mood 9/10" },
      { label: "Shorter nights · about 5.5 hours", value: "Mood 5/10" },
    ],
    sampleDays: 21,
    windowDays: 56,
    strength: 1.4,
  },
];
const PENDING: WholeLifePending[] = [
  { kind: "movement-mood", label: "Movement & mood", sampleDays: 5, neededDays: 8 },
];

const renderView = () =>
  render(
    <ConnectionConstellationView
      nodes={NODES}
      links={LINKS}
      loggedDays={26}
      insights={INSIGHTS}
      pending={PENDING}
    />,
  );

describe("orbit guard: no percentages, labels from the allowed set", () => {
  it("renders no % anywhere in the section", () => {
    const { container } = renderView();
    expect(container.textContent).not.toContain("%");
  });

  it("labels every node with a sentence-case word from the allowed set", () => {
    const { container } = renderView();
    const labels = [...container.querySelectorAll(".orbit-node-label")].map(
      (el) => el.textContent ?? "",
    );
    expect(labels).toHaveLength(NODES.length);
    for (const label of labels) {
      expect(ORBIT_LABELS).toContain(label);
      expect(label).toMatch(/^[A-Z][a-z]+$/);
    }
  });
});

describe("orbit guard: the drawing is the data", () => {
  it("draws exactly one arc per connection", () => {
    const { container } = renderView();
    expect(container.querySelectorAll("path[data-orbit-link]")).toHaveLength(LINKS.length);
  });

  it("lays out deterministically", () => {
    const input = [
      { key: "mood", daysLogged: 24, windowDays: 30 },
      { key: "sleep", daysLogged: 18, windowDays: 30 },
    ];
    expect(orbitLayout(input)).toEqual(orbitLayout(input));
  });
});

describe("orbit guard: strength is words, from the lib", () => {
  it("shows the lib's word for the strongest link", () => {
    const { container } = renderView();
    expect(strengthWord(0.8)).toBe("Strong link");
    expect(container.textContent).toContain("Strong link");
    expect(container.textContent).toContain("Some link");
  });

  it("the component imports strengthWord and carries no strength literals", () => {
    const section = read("components/home/ConnectionConstellation.tsx");
    expect(section).toContain('from "@/lib/home/orbit"');
    expect(section).toContain("strengthWord(");
    expect(section).not.toContain("Strong link");
    expect(section).not.toContain("Some link");
    expect(section).not.toContain("Faint link");
  });
});

describe("orbit guard: the Patterns card stays retired (M-111)", () => {
  it("Today mounts no WholeLifeInsights section any more", () => {
    const index = read("routes/index.tsx");
    expect(index).not.toContain("WholeLifeInsights");
    const section = read("components/home/ConnectionConstellation.tsx");
    expect(section).not.toContain("Patterns across your days");
  });
});

/* ------------------------- cycle opt-in (M-114) ------------------------ */

const TODAY = "2026-11-15";
const baseInput = {
  trackers: analyzeTrackers([], DEFAULT_GOALS, TODAY),
  habits: { habits: [], logs: [], completedToday: 0, dueToday: 0 },
  moodEntries: [],
  moodDays: [],
  moodCorrelations: [],
  today: TODAY,
};

describe("orbit guard: Cycle is opt-in, never a default node (M-114)", () => {
  it("absent by default: mode says tracking, nothing logged, no choice made", () => {
    const m = connections({
      ...baseInput,
      cycle: analyzeCycle([], TODAY),
      cycleMode: "tracking",
    });
    expect(m.nodes.map((n) => n.id)).not.toContain("cycle");
  });

  it("present once the person has logged cycle days", () => {
    const m = connections({
      ...baseInput,
      cycle: analyzeCycle([{ id: "p1", start: "2026-11-05", flow: "medium" }], TODAY),
      cycleMode: "tracking",
    });
    expect(m.nodes.map((n) => n.id)).toContain("cycle");
  });

  it("present when the person explicitly chose a mode (modeChangedAt set)", () => {
    const m = connections({
      ...baseInput,
      cycle: analyzeCycle([], TODAY),
      cycleMode: "tracking",
      cycleOptedIn: true,
    });
    expect(m.nodes.map((n) => n.id)).toContain("cycle");
  });

  it("absent when off, even if opted in before", () => {
    const m = connections({
      ...baseInput,
      cycle: analyzeCycle([{ id: "p1", start: "2026-11-05", flow: "medium" }], TODAY),
      cycleMode: "off",
      cycleOptedIn: true,
    });
    expect(m.nodes.map((n) => n.id)).not.toContain("cycle");
  });
});
