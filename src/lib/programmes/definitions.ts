/**
 * Transformation Programmes — the programme definitions, as data.
 *
 * A programme is a guided arc over things Bloom already records:
 * food logged, habits ticked, weigh-ins taken, plan days followed.
 * Nothing else can be a target — a target Bloom cannot see in the
 * person's own record would be theatre, and this module refuses to
 * express one: the `ProgrammeTargetKind` union is the whole
 * vocabulary, and every count is checkable against the record.
 *
 * Copy discipline (pinned by the tests): a programme describes a
 * STRUCTURE for the coming weeks — "a structure for your next
 * 12 weeks" — never an outcome. No definition here promises a
 * body, a weight or a transformation; progress is the person's own
 * recorded days, reported by the engine in programmes.ts.
 */

import type { VitalisGoal } from "@/lib/vitalis/domain/profile";

export type ProgrammeTargetKind =
  | "food_log_days"
  | "habit_tick_days"
  | "weigh_in_count"
  | "plan_days";

export interface ProgrammeTarget {
  kind: ProgrammeTargetKind;
  /** How many of this kind the week asks for. */
  count: number;
}

export interface ProgrammeWeek {
  /** One plain line: what this week is about. */
  focus: string;
  targets: ProgrammeTarget[];
}

export interface ProgrammeDefinition {
  id: string;
  name: string;
  /** Plain description — structure only, no outcome promises. */
  blurb: string;
  /**
   * The card's one closing line: the blurb's own final clause,
   * promoted to data so the comparison card can show it without
   * reprinting the whole blurb. A purpose, never a promised result —
   * the same copy discipline as the blurb.
   */
  outcome: string;
  weeks: ProgrammeWeek[];
  /**
   * The assessment goals this programme is built for, when it is built
   * for any in particular — data, declared next to the programme it
   * describes, so the UI can mark a genuine match ("Matches your
   * goal") from the person's own stated goal instead of guessing from
   * the blurb's prose. Absent = a general structure for any goal.
   */
  goals?: readonly VitalisGoal[];
}

const t = (kind: ProgrammeTargetKind, count: number): ProgrammeTarget => ({ kind, count });

export const STRONG_START: ProgrammeDefinition = {
  id: "strong-start",
  name: "Strong Start",
  blurb:
    "Four weeks of getting the basics recorded: food in the log, habits ticked, " +
    "one weigh-in a week. A structure for your next 4 weeks — the record itself is the point.",
  outcome: "The record itself is the point.",
  weeks: [
    {
      focus: "Start small, start recording",
      targets: [t("food_log_days", 3), t("habit_tick_days", 3), t("weigh_in_count", 1)],
    },
    {
      focus: "Find your rhythm",
      targets: [t("food_log_days", 4), t("habit_tick_days", 4), t("weigh_in_count", 1)],
    },
    {
      focus: "Make it routine",
      targets: [t("food_log_days", 5), t("habit_tick_days", 5), t("weigh_in_count", 1)],
    },
    {
      focus: "Your first full week",
      targets: [t("food_log_days", 6), t("habit_tick_days", 6), t("weigh_in_count", 1)],
    },
  ],
};

export const BUILD_AND_FUEL: ProgrammeDefinition = {
  id: "build-and-fuel",
  name: "Build & Fuel",
  /* Goal affinity is DATA only: "recomp" is the goal whose label is
     "Build strength and muscle", and the section's "Matches your goal"
     badge — driven by the person's own stated goal — is the only place
     that affinity is ever stated. The blurb/outcome must not assert an
     alignment in prose: rendered for every user, "aligned to a
     build-strength goal" read as a claim about the READER's goal next
     to an Assessment that said "lose weight" (M-115). */
  goals: ["recomp"],
  blurb:
    "Twelve weeks built around your plan: follow it on more days, log what you " +
    "actually ate, keep habits loading up, and weigh in weekly so the plan can " +
    "adapt. A structure for your next 12 weeks.",
  outcome: "A structure for your next 12 weeks.",
  weeks: [
    { focus: "Set the base", targets: [t("plan_days", 3), t("food_log_days", 4), t("habit_tick_days", 4), t("weigh_in_count", 1)] },
    { focus: "Follow the plan", targets: [t("plan_days", 4), t("food_log_days", 5), t("habit_tick_days", 4), t("weigh_in_count", 1)] },
    { focus: "Fuel every training day", targets: [t("plan_days", 4), t("food_log_days", 5), t("habit_tick_days", 5), t("weigh_in_count", 1)] },
    { focus: "Consolidation week — hold the line", targets: [t("plan_days", 4), t("food_log_days", 5), t("habit_tick_days", 5), t("weigh_in_count", 1)] },
    { focus: "Add a day", targets: [t("plan_days", 5), t("food_log_days", 6), t("habit_tick_days", 5), t("weigh_in_count", 1)] },
    { focus: "Halfway — keep the streak honest", targets: [t("plan_days", 5), t("food_log_days", 6), t("habit_tick_days", 6), t("weigh_in_count", 1)] },
    { focus: "Progressive load", targets: [t("plan_days", 5), t("food_log_days", 6), t("habit_tick_days", 6), t("weigh_in_count", 1)] },
    { focus: "Consolidation week — hold the line", targets: [t("plan_days", 5), t("food_log_days", 6), t("habit_tick_days", 6), t("weigh_in_count", 1)] },
    { focus: "Nearly every day on plan", targets: [t("plan_days", 6), t("food_log_days", 7), t("habit_tick_days", 6), t("weigh_in_count", 1)] },
    { focus: "Hold the standard", targets: [t("plan_days", 6), t("food_log_days", 7), t("habit_tick_days", 6), t("weigh_in_count", 1)] },
    { focus: "The full week, on purpose", targets: [t("plan_days", 6), t("food_log_days", 7), t("habit_tick_days", 7), t("weigh_in_count", 1)] },
    { focus: "Final week — your most complete week", targets: [t("plan_days", 6), t("food_log_days", 7), t("habit_tick_days", 7), t("weigh_in_count", 1)] },
  ],
};

export const PROGRAMMES: ProgrammeDefinition[] = [STRONG_START, BUILD_AND_FUEL];

export function programmeById(id: string): ProgrammeDefinition | null {
  return PROGRAMMES.find((p) => p.id === id) ?? null;
}

/**
 * True when the programme declares the person's stated goal among the
 * goals it is built for. A null goal (no assessment answer) matches
 * nothing — the UI then recommends nothing, honestly.
 */
export function programmeMatchesGoal(
  def: ProgrammeDefinition,
  goal: VitalisGoal | null,
): boolean {
  return goal !== null && def.goals !== undefined && def.goals.includes(goal);
}

/** The plain-words label for a target kind — the record it counts. */
export function targetKindLabel(kind: ProgrammeTargetKind): string {
  switch (kind) {
    case "food_log_days":
      return "Days with food logged";
    case "habit_tick_days":
      return "Days with a habit ticked";
    case "weigh_in_count":
      return "Weigh-ins taken";
    case "plan_days":
      return "Plan days followed";
  }
}
