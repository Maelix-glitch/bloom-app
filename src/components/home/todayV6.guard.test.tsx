// @vitest-environment jsdom
/**
 * Today guards — Brief v6 Slice 5 (M-116…M-121, M-123), written first.
 *
 *  · the product tagline renders ONCE on Today (the sidebar keeps it);
 *  · the hero's second line is a sans support line, and the hero art is
 *    decorative — no caption competing with the H1;
 *  · every hero action, voice included, wears the one `.home-chip` style;
 *  · the Growth card speaks in points and within-level figures from
 *    `rankFor` — no percent ring, no "there", no rose;
 *  · the starting-point card is a one-line summary with its full text
 *    behind a Details expansion;
 *  · Ritual rows carry no per-row point labels; the day's earned total
 *    sits in the header; habit names are validated at the lib boundary;
 *  · check-in faces render at full opacity on Today and the card is not
 *    stretched into a void;
 *  · the Today Nutrition card names the plan's next unlogged meal.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
    hash?: string;
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => ({ balance: 965, loading: false }),
}));

import type { HabitToday } from "@/hooks/useHabits";
import { validateHabitName } from "@/lib/home/habits";
import type { DailyPlan } from "@/lib/nutrition/plan";
import type { LogEntry } from "@/lib/nutrition/types";
import { HabitsSection } from "./HabitsSection";
import { LevelCard } from "./LevelCard";
import { MoodCard } from "./MoodCard";
import { nextUnloggedPlanMeal } from "@/components/nutrition/NutritionEntryCards";

afterEach(cleanup);

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");
const TAGLINE = "A calmer you, a brighter tomorrow.";

const habit = (over: Partial<HabitToday>): HabitToday => ({
  id: "h1",
  name: "Drink water",
  icon: "💧",
  iconType: "emoji",
  iconUrl: null,
  color: "amber",
  frequency: "daily",
  points: 10,
  reminderTime: null,
  priority: "medium",
  tags: [],
  goal: null,
  days: [],
  timesPerWeek: null,
  startDate: null,
  note: null,
  createdAt: null,
  archived: false,
  pausedFrom: null,
  pausedUntil: null,
  done: false,
  doneAt: null,
  due: true,
  week: null,
  missedYesterday: null,
  ...over,
});

describe("today v6 guard: hero (M-116, M-117)", () => {
  it("renders the tagline exactly once across the Today tree's hero + sidebar", () => {
    const index = read("routes/index.tsx");
    const sidebar = read("components/home/HomeSidebar.tsx");
    const occurrences = (index + sidebar).split(TAGLINE).length - 1;
    expect(occurrences).toBe(1);
    expect(sidebar).toContain(TAGLINE);
    expect(index).not.toContain(TAGLINE);
  });

  it("demotes the hero subline to sans and the art to decoration", () => {
    const index = read("routes/index.tsx");
    expect(index).not.toContain("<figcaption");
    expect(index).toContain('aria-hidden="true"');
    /* The subline paragraph no longer sets in the display face. */
    expect(index).not.toContain("font-display text-xl");
  });

  it("gives every hero action the one home-chip style, voice included", () => {
    const index = read("routes/index.tsx");
    expect(index).not.toContain("home-chip--");
    expect(index).toContain('<VoiceMic presentation="chip" />');
    const voice = read("components/home/VoiceMic.tsx");
    expect(voice).toContain("home-chip");
  });
});

describe("today v6 guard: growth card (M-118)", () => {
  it("reads 465 of 700 toward Sprout at 965 points, points-to-go in gold", () => {
    const { container } = render(<LevelCard />);
    expect(screen.getByText("465 of 700 toward Sprout")).toBeTruthy();
    const toGo = screen.getByText("235 points to go");
    expect(toGo.closest("div")?.className ?? toGo.className).toContain("gold");
    expect(container.textContent).not.toContain("%");
    expect(container.textContent?.toLowerCase()).not.toContain("there");
    const card = read("components/home/LevelCard.tsx");
    expect(card).not.toContain("text-rose");
    /* The stepper labels are not kept on one nowrap line to clip. */
    expect(card).not.toContain("whitespace-nowrap text-[length:var(--text-micro)]");
  });
});

describe("today v6 guard: assessment summary (M-119)", () => {
  it("keeps the full starting-point text behind a Details expansion", () => {
    const entry = read("components/assessment/AssessmentEntry.tsx");
    expect(entry).toContain('data-testid="home-starting-point-summary"');
    expect(entry).toContain("<details");
    expect(entry).toContain("<summary");
  });
});

describe("today v6 guard: rituals (M-120)", () => {
  it("moves points to the header total and off the rows", () => {
    render(
      <HabitsSection
        habits={[
          habit({ id: "a", points: 10, done: true }),
          habit({ id: "b", name: "Read", points: 30, done: true }),
          habit({ id: "c", name: "Walk", points: 20, done: false }),
        ]}
        logs={[]}
        today="2026-11-19"
        loading={false}
        onToggle={() => {}}
        onAdd={() => {}}
      />,
    );
    expect(screen.getByText("+40 today")).toBeTruthy();
    expect(screen.queryByText("+10")).toBeNull();
    expect(screen.queryByText("+30")).toBeNull();
    expect(screen.queryByText("+20")).toBeNull();
  });

  it("validates habit names at the lib boundary with one plain message", () => {
    const message = "Give the habit a name — two letters or more.";
    expect(validateHabitName("")).toBe(message);
    expect(validateHabitName("   ")).toBe(message);
    expect(validateHabitName(" x ")).toBe(message);
    expect(validateHabitName("Go")).toBeNull();
    expect(validateHabitName("Drink water")).toBeNull();
  });

  it("keeps the row toggle as the 44px-plus hit area", () => {
    const section = read("components/home/HabitsSection.tsx");
    expect(section).toContain("py-3.5");
    expect(section).toContain("size-10");
  });
});

describe("today v6 guard: check-in (M-121)", () => {
  it("renders faces at full opacity and does not stretch the card", () => {
    render(<MoodCard entry={null} onPick={() => {}} onOpenComposer={() => {}} />);
    const tile = screen.getByTestId("home-mood-face-calm");
    const blobPath = tile.querySelector("svg path");
    expect(blobPath?.getAttribute("opacity")).toBe("1");
    const card = read("components/home/MoodCard.tsx");
    expect(card).not.toContain("mt-auto");
    expect(card).not.toContain("h-full");
    expect(card).toContain("fullOpacity");
  });
});

describe("today v6 guard: nutrition card (M-123)", () => {
  it("names the next unlogged meal from the real plan", () => {
    const plan = {
      day: "2026-11-19",
      meals: [
        {
          meal: "breakfast",
          dishes: [{ dishId: "dish-a", name: "Idli", role: "anchor" }],
          suggestions: [],
        },
        {
          meal: "lunch",
          dishes: [{ dishId: "dish-b", name: "Kozhi Pepper Fry", role: "anchor" }],
          suggestions: [],
        },
      ],
    } as unknown as DailyPlan;
    const entries = [
      {
        id: "e1",
        day: "2026-11-19",
        meal: "breakfast",
        source: "dish",
        provenance: { kind: "recipe", sourceId: "dish-a" },
      },
    ] as unknown as LogEntry[];
    expect(nextUnloggedPlanMeal(plan, entries, {})).toEqual({
      meal: "lunch",
      label: "Lunch",
      name: "Kozhi Pepper Fry",
    });
  });
});
