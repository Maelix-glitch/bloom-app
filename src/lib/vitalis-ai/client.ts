/**
 * askVitalis — the Vitalis window's one door to the coach edge
 * function, in `mode: "vitalis"`.
 *
 * Deliberately separate from the Coach pipeline (useCoachChat /
 * useCoachSystem): no Coach thread is read or written, nothing is
 * saved, no memories or sidecars exist here. The caller holds the
 * session in its own state, sends the session's own turns as history,
 * and attaches the scoped record from buildVitalisContext — both the
 * rendered text and its structured twin (schema v1), which the
 * function validates and checks against.
 *
 * Two transports, one contract:
 *   · ordinary questions ride `askEdge`, exactly as phases 1+2;
 *   · a request the caller flags as plan/recommendation-shaped
 *     (`deliberate`) rides the NDJSON stream instead, so the window
 *     can show the deliberation stages as they really happen.
 * Either way a failure throws VitalisUnavailable and the window shows
 * an honest error with a retry — Vitalis is strictly online, like the
 * Coach, and never substitutes an on-device answer.
 */

import { askEdge, type CoachTurn } from "@/lib/coach/edge";
import type {
  DeliberationStageId,
  VitalisActionProposal,
  VitalisRecordData,
} from "../../../supabase/functions/coach/vitalis-core";
import { looksLikePlanRequest, sanitizeProposals } from "../../../supabase/functions/coach/vitalis-core";
import { streamVitalis } from "./stream";

export class VitalisUnavailable extends Error {
  /** "unconfigured" | "timeout" | "aborted" | "error" — from the edge
   *  client, never shown to the person verbatim. */
  readonly reason: string;
  constructor(reason: string, detail?: string) {
    super(detail ? `${reason}: ${detail}` : reason);
    this.name = "VitalisUnavailable";
    this.reason = reason;
  }
}

export interface VitalisReply {
  paragraphs: string[];
  /** Action proposals the server validated AND this client
   *  re-validated against its own record — the only ones the window
   *  may render as confirm cards. */
  actions: VitalisActionProposal[];
  /** Deliberation stage summaries (server-measured), when the reply
   *  was deliberated. */
  stages: { stage: string; ms: number }[];
  /** True when Vitalis is locked for this caller (phase 5). */
  locked: boolean;
  deliberated: boolean;
}

export interface VitalisStageEvent {
  stage: DeliberationStageId;
  label: string;
}

/** Should this message run the deliberation pipeline? Plan and
 *  recommendation intent — the shared core's one implementation,
 *  used identically by the server's escalation check. */
export function isDeliberationIntent(text: string): boolean {
  return looksLikePlanRequest(text);
}

export async function askVitalis(params: {
  text: string;
  /** This Vitalis session's own turns, oldest first. Never the Coach
   *  thread — the caller builds it from its own session state. */
  history: CoachTurn[];
  /** The buildVitalisContext record for this person, right now. */
  contextText: string;
  /** The structured twin of the context (schema v1). When present it
   *  is sent for server-side validation and checks; proposals in the
   *  reply are re-validated against it here before rendering. */
  record?: VitalisRecordData;
  /** Run the deliberation pipeline (plan/recommendation requests). */
  deliberate?: boolean;
  /** Stage events as the server reports them, in order. */
  onStage?: (stage: VitalisStageEvent) => void;
  signal?: AbortSignal;
}): Promise<VitalisReply> {
  const request = {
    message: params.text,
    history: params.history.slice(-8),
    mode: "vitalis" as const,
    vitalisContext: params.contextText,
    ...(params.record ? { vitalisRecord: params.record } : {}),
    ...(params.deliberate ? { deliberate: true } : {}),
    register: "normal" as const,
    topic: "vitalis",
  };

  /* Re-validate whatever proposals arrive against OUR record before
     anything renders — neither side trusts the other's parse. */
  const finish = (raw: {
    paragraphs: string[];
    actions: unknown[];
    stages: { stage: string; ms: number }[];
    locked: boolean;
    deliberated: boolean;
  }): VitalisReply => ({
    paragraphs: raw.paragraphs,
    actions: params.record ? sanitizeProposals(raw.actions, params.record).proposals : [],
    stages: raw.stages,
    locked: raw.locked,
    deliberated: raw.deliberated,
  });

  if (params.deliberate) {
    const result = await streamVitalis(
      request,
      (stage) => params.onStage?.({ stage: stage.stage as DeliberationStageId, label: stage.label }),
      params.signal,
    );
    if (result.ok) return finish(result);
    throw new VitalisUnavailable(result.reason, result.detail);
  }

  const result = await askEdge(request, params.signal);
  if (result.ok) {
    return finish({
      paragraphs: result.paragraphs,
      actions: result.vitalis?.actions ?? [],
      stages: result.vitalis?.stages ?? [],
      locked: result.vitalis?.locked ?? false,
      deliberated: result.vitalis?.deliberated ?? false,
    });
  }
  throw new VitalisUnavailable(result.reason, result.detail);
}
