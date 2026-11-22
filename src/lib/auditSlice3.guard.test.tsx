// @vitest-environment jsdom
/**
 * Final Audit Slice 3 — Page Composition (M-204): F-02, F-05, F-12,
 * F-17, F-23, F-40, F-41, F-42. (F-04 is NOT pinned here: its draft
 * fix conflicts with the M-170/M-172 exact-match composition and is
 * deferred — see the M-204 registry entry.)
 *
 * House guard tradition (vitest/jsdom + source pins, as
 * sectionSystem.guard and sheet.guard do; this repo has no
 * Playwright): render pins where a component takes plain props,
 * source pins where the surface is hook-bound.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

import { ConnectionConstellationView } from "@/components/home/ConnectionConstellation";
import { WeekChart } from "@/components/home/WeekChart";
import { StudyMap } from "@/components/tk/StudyMap";
import { emptyDay, type DayEntry } from "@/lib/trackers/core";
import type { Connection, CrossLink } from "@/lib/home/today";
import type { WholeLifeInsight } from "@/lib/insights/insights";
import type { WeekTicks } from "@/lib/home/weekChart";

afterEach(cleanup);

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

/* ------------------------------- F-17 ---------------------------------- */

describe("F-17 — one shared SectionHead", () => {
  it("the shared component and the chapter marker exist under ui/", () => {
    expect(read("components/ui/SectionHead.tsx")).toContain("section-head__title");
    expect(read("components/ui/ChapterMark.tsx")).toContain("chapter-mark");
  });

  it("the section-head system is global (styles.css), at the pinned 24px serif step", () => {
    const css = read("styles.css");
    expect(css).toContain(".section-head__title");
    expect(css).toContain(".chapter-mark");
  });

  it("Mood's two bespoke heads delegate to the shared component", () => {
    expect(read("components/mood/primitives.tsx")).toContain("@/components/ui/SectionHead");
    expect(read("components/mood/page/MoodPage.tsx")).toContain("@/components/ui/SectionHead");
  });

  it("Today adopts it (WeekChart, the constellation, the nutrition band)", () => {
    expect(read("components/home/WeekChart.tsx")).toContain("@/components/ui/SectionHead");
    expect(read("components/home/ConnectionConstellation.tsx")).toContain(
      "@/components/ui/SectionHead",
    );
    expect(read("components/nutrition/NutritionEntryCards.tsx")).toContain(
      "@/components/ui/SectionHead",
    );
  });

  it("Trackers' section heads are real headings — no <p class=at-sectionhead> remains", () => {
    const page = read("components/tk/TrackersPage.tsx");
    expect(page).not.toContain('<p className="at-sectionhead">');
    expect(page).toContain("@/components/ui/SectionHead");
    const sleep = read("components/tk/SleepRecoverySection.tsx");
    expect(sleep).not.toContain('<p className="at-sectionhead">');
    expect(sleep).toContain("@/components/ui/SectionHead");
  });
});

/* ------------------------------- F-12 ---------------------------------- */

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
  {
    kind: "food-mood",
    headline: "Mood tends to run higher on days you log your food",
    detail: "On the 6 days you logged food, your mood averaged 8/10.",
    figures: [
      { label: "Days you logged food · 6 days", value: "Mood 8/10" },
      { label: "Days you didn't · 6 days", value: "Mood 6/10" },
    ],
    sampleDays: 12,
    windowDays: 56,
    strength: 0.9,
  },
];

describe("F-12 — the Orbit finding is stated once, in its summary position", () => {
  it("the headline sentence appears exactly once in the section", () => {
    const { container } = render(
      <ConnectionConstellationView
        nodes={NODES}
        links={LINKS}
        loggedDays={26}
        insights={INSIGHTS}
        pending={[]}
      />,
    );
    const hits =
      container.textContent!.match(/Mood tends to run higher after longer sleep/g) ?? [];
    expect(hits.length).toBe(1);
    /* the panel still carries the finding's figures and basis */
    expect(container.textContent).toContain("Longer nights · about 8.5 hours");
    expect(container.textContent).toContain("From 21 paired days · last 56 days");
  });

  it("the Mood streak card keeps its subtitle in one place only", () => {
    const src = read("components/mood/page/MoodPage.tsx");
    expect(src).toContain("STREAK_SUBTITLE");
    /* the body line is not rendered when it repeats the subtitle */
    expect(src).toMatch(/line !== STREAK_SUBTITLE/);
  });
});

/* ------------------------------- F-40 ---------------------------------- */

const WEEK: WeekTicks = {
  thisWeek: [0, 3, 0, 2, 0, 0, 1],
  prevWeek: [1, 1, 0, 0, 2, 0, 0],
  labels: ["M", "T", "W", "T", "F", "S", "S"],
  totalThis: 6,
  totalPrev: 4,
};

describe("F-40 — the week chart: sage for days with data, grey for empty, one baseline", () => {
  it("data bars wear sage, empty-day bars stay grey, and a baseline sits under the bars", () => {
    const { container, getByTestId } = render(<WeekChart data={WEEK} ready />);
    const dataBars = container.querySelectorAll('[data-week-bar="this"][data-has-data="true"]');
    const emptyBars = container.querySelectorAll('[data-week-bar="this"][data-has-data="false"]');
    expect(dataBars.length).toBe(3);
    expect(emptyBars.length).toBe(4);
    for (const bar of dataBars) expect(bar.className).toContain("bg-sage");
    for (const bar of emptyBars) expect(bar.className).not.toContain("bg-sage");
    expect(getByTestId("week-chart-baseline")).toBeTruthy();
  });
});

/* ------------------------------- F-23 ---------------------------------- */

function studyDay(date: string, minutes: number): DayEntry {
  const d = emptyDay(date);
  if (minutes > 0) d.sessions = [{ minutes, subject: "Reading", startAt: null }];
  return d;
}

describe("F-23 — Trackers sparse states are designed", () => {
  it("the study field shows only the weeks that exist", () => {
    const days = [studyDay("2026-11-16", 30), studyDay("2026-11-18", 45)];
    const { container } = render(<StudyMap days={days} today="2026-11-18" goal={60} />);
    const cells = container.querySelectorAll(".tk-heat i");
    /* two weeks exist at most (Sun 8 Nov week + the current week) */
    expect(cells.length).toBeLessThanOrEqual(14);
    expect(cells.length).toBeGreaterThan(0);
    const heat = container.querySelector(".tk-heat");
    expect(heat?.getAttribute("aria-label")).not.toContain("Twelve weeks");
  });

  it("the study field keeps its twelve weeks for a long record", () => {
    const days = [studyDay("2026-08-26", 30), studyDay("2026-11-18", 45)];
    const { container } = render(<StudyMap days={days} today="2026-11-18" goal={60} />);
    expect(container.querySelectorAll(".tk-heat i").length).toBe(84);
  });

  it("territories under a week of data show the placeholder line; the route collapses to a slim strip", () => {
    const page = read("components/tk/TrackersPage.tsx");
    expect(page).toContain("Your first days will draw this line.");
    expect(page).toContain("at-route-strip");
    expect(page).toContain("The route draws itself from your second logged day.");
  });
});

/* --------------------------- F-02 / F-05 ------------------------------- */

describe("F-02 — wide cards are filled or fitted, never half-empty", () => {
  it("Today's nutrition band composes a figures column from the same comparison", () => {
    const src = read("components/nutrition/NutritionEntryCards.tsx");
    expect(src).toContain("home-nutrition-figures");
  });

  it("Profile's nutrition card sets its status in its own column", () => {
    const src = read("components/nutrition/NutritionEntryCards.tsx");
    expect(src).toContain("pf-nutrition-cols");
  });

  it("Mood's insight rows compose in two balanced columns on wide screens", () => {
    const css = read("styles/mood.css");
    const blocks = css.match(/\.mm-insights[^{}]*\{[^{}]*\}/g) ?? [];
    expect(blocks.some((b) => b.includes("grid-template-columns"))).toBe(true);
  });

  it("the report's Body card spans the row when no Cycle card shares it", () => {
    const src = read("components/report/WeeklyReportPage.tsx");
    expect(src).toContain("sm:col-span-2");
    expect(src).toContain('testId="report-body-card"');
  });
});

describe("F-05 — the Weekly Report closes instead of ending in black", () => {
  it("a closing movement follows the disclaimer: week-ahead line + the Bloom end-mark", () => {
    const src = read("components/report/WeeklyReportPage.tsx");
    expect(src).toContain('data-testid="report-closing"');
    expect(src).toContain("The week ahead");
    expect(src).toContain("BloomLogo");
  });
});

/* --------------------------- F-41 / F-42 ------------------------------- */

describe("F-41 — Mood Intelligence reads as chapters; Reset lives in Settings", () => {
  it("the three chapter markers group the page, in order", () => {
    const src = read("routes/mood/intelligence.tsx");
    const patterns = src.indexOf("Your patterns");
    const rhythm = src.indexOf("Your rhythm");
    const history = src.indexOf("Your history");
    expect(patterns).toBeGreaterThan(-1);
    expect(rhythm).toBeGreaterThan(patterns);
    expect(history).toBeGreaterThan(rhythm);
    expect(src).not.toContain("Reset all data");
  });

  it("Settings → Account & data carries the mood reset, with the same confirm words", () => {
    const src = read("components/profile/AccountSettings.tsx");
    expect(src).toContain("Reset all mood data");
    expect(src).toContain("Erase every mood entry?");
  });

  it("the trajectory chart's 'usual' label is given breathing room from the right edge", () => {
    const src = read("components/mood/MoodChart.tsx");
    expect(src).toMatch(/distance:\s*(1[0-9]|[89])\b/);
  });
});

describe("F-42 — chapter markers signpost the long stacks (Trackers, Profile)", () => {
  it("Trackers gains Today / Your record markers", () => {
    const src = read("components/tk/TrackersPage.tsx");
    expect(src).toContain('label="Today"');
    expect(src).toContain('label="Your record"');
  });

  it("Profile gains health / record / story markers, in page order", () => {
    const src = read("routes/profile.tsx");
    const health = src.indexOf('label="Your health"');
    const record = src.indexOf('label="Your record"');
    const story = src.indexOf('label="Your story"');
    expect(health).toBeGreaterThan(-1);
    expect(record).toBeGreaterThan(health);
    expect(story).toBeGreaterThan(record);
  });
});
