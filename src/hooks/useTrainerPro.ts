/**
 * useTrainerPro — the React face of lib/trainer.
 *
 * Reads the trainer record through the shared prefs store (so every
 * mounted surface updates together), and composes the share summary
 * from the same live stores the clinician report reads: the
 * Assessment, the body profile, the nutrition targets and the food
 * log's week aggregates. The summary is null whenever consent is
 * off — the builder refuses, and this hook never builds one itself.
 */

import { useCallback, useMemo } from "react";

import { usePrefValue } from "@/lib/prefsStore";
import { weekAggregates } from "@/lib/nutrition/dayView";
import {
  EMPTY_TRAINER_STATE,
  TRAINER_KEY,
  confirmPendingOverride,
  dismissPendingOverride,
  parseTrainerState,
  setShareConsent,
  type TrainerState,
} from "@/lib/trainer/state";
import { buildShareSummary, type ShareSummary } from "@/lib/trainer/summary";

import { useAssessment } from "./useAssessment";
import { useBodyProfile } from "./useBodyProfile";
import { useNutrition } from "./useNutrition";

export interface TrainerProStore {
  state: TrainerState;
  /** The consent-gated share summary; null while sharing is off. */
  summary: ShareSummary | null;
  setConsent: (consent: boolean) => void;
  confirmOverride: () => void;
  dismissOverride: () => void;
}

export function useTrainerPro(): TrainerProStore {
  const state = usePrefValue(TRAINER_KEY, parseTrainerState, EMPTY_TRAINER_STATE);
  const assessment = useAssessment();
  const body = useBodyProfile();
  const nutrition = useNutrition();

  const summary = useMemo<ShareSummary | null>(() => {
    const targets =
      nutrition.targetState.kind === "ready" ? nutrition.targetState.targets : null;
    const week = weekAggregates(nutrition.entries, nutrition.today, targets?.proteinG ?? null);
    return buildShareSummary({
      consent: state.consentToShare,
      answers: assessment.state.status === "complete" ? assessment.state.answers : null,
      profile: body.profile,
      targets,
      week,
    });
  }, [
    state.consentToShare,
    assessment.state.status,
    assessment.state.answers,
    body.profile,
    nutrition.targetState,
    nutrition.entries,
    nutrition.today,
  ]);

  const setConsent = useCallback((consent: boolean) => {
    setShareConsent(consent);
  }, []);

  const confirmOverride = useCallback(() => {
    confirmPendingOverride(new Date().toISOString());
  }, []);

  const dismissOverride = useCallback(() => {
    dismissPendingOverride();
  }, []);

  return { state, summary, setConsent, confirmOverride, dismissOverride };
}
