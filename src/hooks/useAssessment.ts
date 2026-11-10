/**
 * The assessment, device-first and account-synced through the shared
 * preferences document — the same pattern as `useBodyProfile`, so the flow
 * never flickers on remount and answers follow the person, not the device.
 */

import { useCallback, useMemo } from "react";

import { getPref, setPref } from "@/lib/prefs";
import { usePrefValue } from "@/lib/prefsStore";
import { useBodyProfile } from "@/hooks/useBodyProfile";
import {
  ASSESSMENT_KEY,
  EMPTY_ASSESSMENT_STATE,
  beginAssessment,
  completeAssessment,
  parseAssessmentState,
  recordConsents,
  restartAssessment,
  retakeAssessment,
  saveStep,
  type AssessmentAnswers,
  type AssessmentState,
} from "@/lib/assessment/state";
import type { AssessmentStep } from "@/lib/assessment/questions";
import type { ConsentRecord } from "@/lib/vitalis/domain/consent";

export interface AssessmentStore {
  state: AssessmentState;
  begin: () => void;
  saveStep: (patch: Partial<AssessmentAnswers>, resumeStep: AssessmentStep) => void;
  recordConsents: (records: ConsentRecord[]) => void;
  complete: () => void;
  retake: () => void;
  restart: () => void;
}

const nowIso = () => new Date().toISOString();

function current(): AssessmentState {
  return getPref(ASSESSMENT_KEY, parseAssessmentState, EMPTY_ASSESSMENT_STATE);
}

export function useAssessment(): AssessmentStore {
  const state = usePrefValue(ASSESSMENT_KEY, parseAssessmentState, EMPTY_ASSESSMENT_STATE);
  const body = useBodyProfile();

  /*
   * First begin only: seed the identity and goal answers from the body
   * profile the person may already keep on the Trackers page, so Bloom never
   * asks twice for the same number. Seeds fill blanks; they never overwrite
   * an assessment answer.
   */
  const seed = useMemo<Partial<AssessmentAnswers>>(() => {
    const p = body.profile;
    return {
      ageYears: p.age,
      heightCm: p.heightCm,
      weightKg: p.weightKg,
      sex: p.sex,
      goal: p.goal,
      targetWeightKg: p.targetWeightKg,
      activity: p.activity === "very-active" ? "very_active" : p.activity,
    };
  }, [body.profile]);

  const begin = useCallback(() => {
    const s = current();
    setPref(ASSESSMENT_KEY, beginAssessment(s, nowIso(), s.startedAt === null ? seed : undefined));
  }, [seed]);

  const saveStepFn = useCallback(
    (patch: Partial<AssessmentAnswers>, resumeStep: AssessmentStep) => {
      setPref(ASSESSMENT_KEY, saveStep(current(), patch, resumeStep, nowIso()));
    },
    [],
  );

  const recordConsentsFn = useCallback((records: ConsentRecord[]) => {
    if (records.length === 0) return;
    setPref(ASSESSMENT_KEY, recordConsents(current(), records, nowIso()));
  }, []);

  const complete = useCallback(() => {
    setPref(ASSESSMENT_KEY, completeAssessment(current(), nowIso()));
  }, []);

  const retake = useCallback(() => {
    setPref(ASSESSMENT_KEY, retakeAssessment(current(), nowIso()));
  }, []);

  const restart = useCallback(() => {
    setPref(ASSESSMENT_KEY, restartAssessment(current(), nowIso()));
  }, []);

  return {
    state,
    begin,
    saveStep: saveStepFn,
    recordConsents: recordConsentsFn,
    complete,
    retake,
    restart,
  };
}
