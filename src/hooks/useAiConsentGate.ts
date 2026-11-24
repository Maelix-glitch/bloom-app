/**
 * useAiConsentGate — the just-in-time ask for the `ai_assistance`
 * consent purpose (M-232, App Store audit #9).
 *
 * Coach and Vitalis send the person's words (and the parts of their
 * record a reply depends on) to AI providers. That needs the
 * ai_assistance permission — a purpose the domain has always defined
 * and Vitalis narration already honours, but which nothing ever asked
 * for. This hook is the ask, shared by both surfaces:
 *
 *   · granted already → `ensure()` resolves true immediately; the
 *     person sees no change.
 *   · withdrawn → resolves false, silently. A decision already made is
 *     respected, never re-litigated at the composer.
 *   · never asked → the FIRST send on a surface opens the ask sheet
 *     (AiConsentSheet) and `ensure()` resolves with the answer. Allow
 *     records the grant through the same consent writer the Assessment
 *     uses; Not now resolves false and the message does not send.
 *   · asked before on this surface → resolves false without asking
 *     again. The per-surface asked flags live in prefs
 *     (`health.aiConsentPrompt.v1`); the way back is Settings →
 *     Privacy → Your consent, where the permission can be switched on
 *     directly. No nagging loop.
 *
 * The gate is always consulted BEFORE any provider call, so a declined
 * consent can never reach the credit check, let alone cost a credit.
 */

import { useCallback, useRef, useState } from "react";

import { useAssessment } from "@/hooks/useAssessment";
import { getPref, setPref } from "@/lib/prefs";
import {
  consentDecision,
  consentState,
  hasConsent,
} from "@/lib/vitalis/domain/consent";

export type AiConsentSurface = "coach" | "vitalis";

const PROMPT_KEY = "health.aiConsentPrompt.v1";

type PromptRecord = Partial<Record<AiConsentSurface, string>>;

function parsePromptRecord(raw: unknown): PromptRecord | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: PromptRecord = {};
  for (const surface of ["coach", "vitalis"] as const) {
    const value = (raw as Record<string, unknown>)[surface];
    if (typeof value === "string" && value) out[surface] = value;
  }
  return out;
}

function wasAsked(surface: AiConsentSurface): boolean {
  return Boolean(getPref<PromptRecord>(PROMPT_KEY, parsePromptRecord, {})[surface]);
}

function markAsked(surface: AiConsentSurface): void {
  const current = getPref<PromptRecord>(PROMPT_KEY, parsePromptRecord, {});
  setPref(PROMPT_KEY, { ...current, [surface]: new Date().toISOString() });
}

export function useAiConsentGate(surface: AiConsentSurface) {
  const { state, recordConsents } = useAssessment();
  const [askOpen, setAskOpen] = useState(false);
  const pendingRef = useRef<((allowed: boolean) => void) | null>(null);
  const consentsRef = useRef(state.consents);
  consentsRef.current = state.consents;

  const settle = useCallback((allowed: boolean) => {
    const resolve = pendingRef.current;
    pendingRef.current = null;
    setAskOpen(false);
    resolve?.(allowed);
  }, []);

  /** True when the send may proceed. Opens the one-time ask if needed. */
  const ensure = useCallback((): Promise<boolean> => {
    const records = consentsRef.current;
    if (hasConsent(records, "ai_assistance")) return Promise.resolve(true);
    /* A recorded "no" (withdrawn) is final until Settings changes it. */
    if (consentState(records, "ai_assistance") === "withdrawn") {
      return Promise.resolve(false);
    }
    /* Asked once on this surface already — don't ask again. */
    if (wasAsked(surface)) return Promise.resolve(false);
    markAsked(surface);
    return new Promise<boolean>((resolve) => {
      pendingRef.current = resolve;
      setAskOpen(true);
    });
  }, [surface]);

  const allow = useCallback(() => {
    recordConsents([consentDecision("ai_assistance", true)]);
    settle(true);
  }, [recordConsents, settle]);

  const notNow = useCallback(() => {
    settle(false);
  }, [settle]);

  return { ensure, askOpen, allow, notNow };
}
