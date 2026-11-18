/**
 * Voice commands — resolution + the confirm gate (System 11).
 *
 * parseVoiceCommand turns a transcript into an intent; this module
 * resolves an intent against the user's REAL stored data (their habits,
 * their foods) into either an executable action with a plain-words
 * label, or a no-action with the honest reason. Resolution NEVER
 * executes: the only path that runs an action is confirm(), called
 * from the confirm chip. That gate is the point of the design and is
 * pinned by useVoiceCommands.test.ts.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { useHabits } from "@/hooks/useHabits";
import { useTrackers } from "@/hooks/useTrackers";
import { useBodyProfile } from "@/hooks/useBodyProfile";
import { useNutrition } from "@/hooks/useNutrition";
import { emptyDay } from "@/lib/trackers/core";
import { mealForTimeOfDay } from "@/lib/nutrition/coachLog";
import type { Food } from "@/lib/nutrition/types";
import {
  NAV_LABELS,
  NAV_PATHS,
  matchByName,
  parseVoiceCommand,
  waterMlOf,
  type VoiceIntent,
} from "@/lib/voice/commands";

/* ------------------------------ resolution ------------------------------- */

export type VoiceResolution =
  | {
      type: "action";
      /** The confirm chip's words, e.g. "Mark 'Gym' done?" */
      label: string;
      /** Runs the real action. Returns an error message, or null. */
      run: () => string | null;
    }
  | { type: "no-action"; message: string };

export interface VoiceActionDeps {
  habits: readonly { id: string; name: string }[];
  toggleHabit: (habitId: string) => void;
  foods: readonly Food[];
  logFood: (food: Food, count: number, meal: string) => string | null;
  addWater: (ml: number) => string | null;
  logWeight: (kg: number) => void;
  navigateTo: (path: string) => void;
  /** Meal a food log lands in when none was spoken (app's own rule). */
  defaultMeal: string;
}

const noAction = (message: string): VoiceResolution => ({ type: "no-action", message });

export function resolveVoiceIntent(intent: VoiceIntent, deps: VoiceActionDeps): VoiceResolution {
  switch (intent.kind) {
    case "unknown":
      return noAction(
        intent.transcript
          ? `I heard "${intent.transcript}" — that's not one I know yet. Try "mark gym done" or "drank 500 ml water".`
          : "I didn't catch that — try again, or type it instead.",
      );
    case "navigate": {
      const target = intent.target;
      return {
        type: "action",
        label: `Open ${NAV_LABELS[target]}?`,
        run: () => {
          deps.navigateTo(NAV_PATHS[target]);
          return null;
        },
      };
    }
    case "tick-habit": {
      const match = matchByName(deps.habits, intent.heardName);
      if (match.status === "none")
        return noAction(`No habit called "${intent.heardName}" on your list — nothing was marked.`);
      if (match.status === "ambiguous")
        return noAction(
          `A few habits match "${intent.heardName}" (${match.candidates.map((c) => c.name).join(", ")}) — say the full name.`,
        );
      const habit = match.item;
      return {
        type: "action",
        label: `Mark "${habit.name}" done?`,
        run: () => {
          deps.toggleHabit(habit.id);
          return null;
        },
      };
    }
    case "log-water": {
      const ml = waterMlOf(intent);
      if (ml === null)
        return noAction(
          "I heard water, but no amount — say how much, like \"drank 500 ml water\" or \"two glasses of water\". Nothing was logged.",
        );
      if (ml <= 0 || ml > 8000) return noAction(`"${ml} ml" is outside what the water tracker takes — nothing was logged.`);
      return {
        type: "action",
        label: `Log ${ml} ml of water?`,
        run: () => deps.addWater(ml),
      };
    }
    case "log-weight": {
      const kg = intent.kg;
      return {
        type: "action",
        label: `Log your weight as ${kg} kg?`,
        run: () => {
          deps.logWeight(kg);
          return null;
        },
      };
    }
    case "log-food": {
      const match = matchByName(deps.foods, intent.heardName);
      if (match.status === "none")
        return noAction(`No food called "${intent.heardName}" in your foods — nothing was logged.`);
      if (match.status === "ambiguous")
        return noAction(
          `A few foods match "${intent.heardName}" (${match.candidates.map((c) => c.name).join(", ")}) — say the full name.`,
        );
      const food = match.item;
      const serving = food.servings[0];
      if (!serving)
        return noAction(
          `"${food.name}" has no serving size stored, so voice can't portion it — log it from Nutrition this time.`,
        );
      const count = intent.count ?? 1;
      const meal = intent.meal ?? deps.defaultMeal;
      return {
        type: "action",
        label: `Log ${food.name} × ${count} (${serving.label}) for ${meal}?`,
        run: () => deps.logFood(food, count, meal),
      };
    }
  }
}

/* --------------------------------- hook ---------------------------------- */

export type VoiceCommandState =
  | { phase: "idle" }
  | { phase: "listening" }
  | { phase: "confirm"; resolution: Extract<VoiceResolution, { type: "action" }> }
  | { phase: "notice"; message: string }
  | { phase: "done"; message: string };

export interface VoiceCommands {
  state: VoiceCommandState;
  /** Parse + resolve a transcript. NEVER executes an action. */
  hear: (transcript: string) => void;
  /** The ONLY execution path — runs the pending confirmed action. */
  confirm: () => void;
  dismiss: () => void;
}

export function useVoiceCommands(): VoiceCommands {
  const habitsStore = useHabits();
  const trackers = useTrackers();
  const body = useBodyProfile();
  const nutrition = useNutrition();
  const navigate = useNavigate();
  const [state, setState] = useState<VoiceCommandState>({ phase: "idle" });
  const pending = useRef<Extract<VoiceResolution, { type: "action" }> | null>(null);

  const deps = useMemo<VoiceActionDeps>(
    () => ({
      habits: habitsStore.habits.filter((h) => !h.archived).map((h) => ({ id: h.id, name: h.name })),
      toggleHabit: (habitId) => {
        void habitsStore.toggle(habitId);
      },
      foods: nutrition.foods,
      logFood: (food, count, meal) => {
        const serving = food.servings[0]!;
        const entry = nutrition.logFood(
          food,
          { servings: count, servingLabel: serving.label },
          meal as Parameters<typeof nutrition.logFood>[2],
          trackers.today,
          "search",
        );
        return entry ? null : "That food couldn't be logged just now.";
      },
      addWater: (ml) => {
        const draft = trackers.days.find((d) => d.date === trackers.today) ?? emptyDay(trackers.today);
        const result = trackers.saveDay({ ...draft, waterMl: (draft.waterMl ?? 0) + ml });
        return result.ok ? null : "That water couldn't be saved just now.";
      },
      logWeight: (kg) => body.logWeight(kg),
      navigateTo: (path) => {
        void navigate({ to: path as "/" });
      },
      defaultMeal: mealForTimeOfDay(),
    }),
    [habitsStore, trackers, body, nutrition, navigate],
  );

  const hear = useCallback(
    (transcript: string) => {
      const { intent } = parseVoiceCommand(transcript);
      const resolution = resolveVoiceIntent(intent, deps);
      if (resolution.type === "action") {
        pending.current = resolution;
        setState({ phase: "confirm", resolution });
      } else {
        pending.current = null;
        setState({ phase: "notice", message: resolution.message });
      }
    },
    [deps],
  );

  const confirm = useCallback(() => {
    const action = pending.current;
    if (!action) return;
    pending.current = null;
    const error = action.run();
    setState(
      error
        ? { phase: "notice", message: error }
        : { phase: "done", message: action.label.replace(/\?$/, ".") },
    );
  }, []);

  const dismiss = useCallback(() => {
    pending.current = null;
    setState({ phase: "idle" });
  }, []);

  return { state, hear, confirm, dismiss };
}
