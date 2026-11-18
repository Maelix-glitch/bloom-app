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
  weeks: ProgrammeWeek[];
}

const t = (kind: ProgrammeTargetKind, count: number): ProgrammeTarget => ({ kind, count });

export const STRONG_START: ProgrammeDefinition = {
  id: "strong-start",
  name: "Strong Start",
  blurb:
    "Four weeks of getting the basics recorded: food in the log, habits ticked, " +
    "one weigh-in a week. A structure for your next 4 weeks — the record itself is the point.",
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
  blurb:
    "Twelve weeks built around your plan: follow it on more days, log what you " +
    "actually ate, keep habits loading up, and weigh in weekly so the plan can " +
    "adapt. A structure for your next 12 weeks, aligned to a build-strength goal.",
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
