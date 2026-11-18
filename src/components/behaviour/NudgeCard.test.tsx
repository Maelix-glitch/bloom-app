// @vitest-environment jsdom
/**
 * Behaviour Change (System 8) — the Today nudge card.
 *
 * Pinned: silence on an empty (or not-yet-settled) record, the
 * evidence named in the copy, the primary action wired to the real
 * habit toggle, and Snooze/Dismiss changing what the card shows —
 * through the real prefs document, not a mock of it.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

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

import { resetPrefCache } from "@/lib/prefsStore";
import type { Habit, HabitLog } from "@/lib/home/habits";
import { NudgeCard, type NudgeCardProps } from "./NudgeCard";

const TODAY = "2026-11-18";
const NOON = new Date(2026, 10, 18, 12, 0);

const at = (day: string, hh: number, mm = 0): string => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y!, m! - 1, d!, hh, mm).toISOString();
};

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: "h1",
  name: "Read",
  icon: "📖",
  iconType: "emoji",
  iconUrl: null,
  color: "sky",
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
  ...over,
});

const SIX_DAYS = ["2026-11-17", "2026-11-16", "2026-11-15", "2026-11-14", "2026-11-13", "2026-11-12"];
const logs: HabitLog[] = SIX_DAYS.map((date) => ({
  habitId: "h1",
  date,
  completedAt: at(date, 7, 30),
}));

const props = (over: Partial<NudgeCardProps> = {}): NudgeCardProps => ({
  habits: [habit()],
  habitLogs: logs,
  moodEntries: [],
  today: TODAY,
  now: NOON,
  ready: true,
  onToggleHabit: vi.fn(),
  onOpenMood: vi.fn(),
  ...over,
});

afterEach(cleanup);

beforeEach(() => {
  window.localStorage.clear();
  resetPrefCache();
});

describe("NudgeCard", () => {
  it("renders nothing on an empty record", () => {
    const { container } = render(<NudgeCard {...props({ habits: [], habitLogs: [] })} />);
    expect(container.textContent).toBe("");
  });

  it("renders nothing until the record has settled, however strong the pattern", () => {
    const { container } = render(<NudgeCard {...props({ ready: false })} />);
    expect(container.textContent).toBe("");
  });

  it("shows the nudge with its evidence, and Tick wires to the real toggle", () => {
    const onToggleHabit = vi.fn();
    render(<NudgeCard {...props({ onToggleHabit })} />);
    expect(screen.getByText("“Read” is still open")).toBeTruthy();
    expect(screen.getByText(/6 days in a row/)).toBeTruthy();
    expect(screen.getByText(/7:30 AM/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tick it now" }));
    expect(onToggleHabit).toHaveBeenCalledWith("h1");
  });

  it("Dismiss rests the kind — the card steps aside", () => {
    render(<NudgeCard {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("“Read” is still open")).toBeNull();
  });

  it("Snooze hides the nudge for today", () => {
    render(<NudgeCard {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: "Snooze" }));
    expect(screen.queryByText("“Read” is still open")).toBeNull();
  });
});
