/**
 * The coach's remote brain — a Supabase Edge Function.
 *
 * The coach is strictly online and there is deliberately no on-device answer:
 * if the function cannot respond, `ask()` throws `CoachUnavailable` and the UI
 * shows an honest connection error with a retry. A quieter coach is acceptable;
 * a fabricated one is not.
 *
 * So this module is a thin, well-behaved client:
 *
 *   · **Never throws.** Every failure — no config, no session, a timeout, a
 *     500, a malformed body — comes back as `{ ok: false }` and the caller
 *     surfaces an honest error with a retry (the coach is strictly online).
 *   · **Times out.** An edge function on a cold start can take seconds; past
 *     `TIMEOUT_MS` the request is abandoned so the UI never spins forever.
 *   · **Cancellable.** The caller can abort when the person sends another
 *     message or leaves the page.
 *   · **Pluggable.** `provider` is passed through to the function, so adding a
 *     second or third model later is a parameter, not a rewrite (see
 *     `providers.ts`).
 *
 * The function name is configurable via `VITE_COACH_FUNCTION` and defaults to
 * `coach`, matching the usual Supabase convention of one directory per
 * function under `supabase/functions/`.
 */

import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import type { CoachRecord } from "@/lib/coach/responder";

export const COACH_FUNCTION =
  (import.meta.env["VITE_COACH_FUNCTION"] as string | undefined)?.trim() || "coach";

/** Past this, the request is abandoned and the failure state shows. The
 *  budget sits ABOVE the function's own failover deadline: the chain now
 *  gives a stalled provider ~6s before rerouting, so a healthy reroute
 *  lands well inside this — cutting the request at 20s used to kill
 *  replies that were one hop away from arriving. */
export const TIMEOUT_MS = 30_000;

/** Photo requests get a much longer leash: a vision answer measured
 *  ~18s inside the provider on 2026-11-14, and the function's own media
 *  budget runs to ~45s end to end. The old flat 30s cut killed photo
 *  replies that were seconds from landing — the "couldn't connect"
 *  error on every food photo — so a request carrying an image waits
 *  this long instead, and skips the quiet retry (a second full vision
 *  call would double an already long wait; the in-thread Try again,
 *  which now re-sends the photo, is the retry for photos). */
export const MEDIA_TIMEOUT_MS = 75_000;

/** One quiet retry before the failure surfaces (see askEdge). */
const RETRY_DELAY_MS = 600;

/**
 * A photo or document attached to a message. Bytes go to the edge function,
 * which routes them to a vision-capable model (Gemini). The image is
 * downscaled client-side first so the payload stays small; PDFs pass through
 * as-is when they fit.
 */
export interface CoachMedia {
  mediaType: string;
  /** Raw base64 — no `data:` prefix. */
  dataBase64: string;
}

export interface CoachTurn {
  role: "user" | "assistant";
  content: string;
}

export interface EdgeRequest {
  /** What was just asked. */
  message: string;
  /** Recent turns, oldest first — enough for pronouns to resolve. */
  history: CoachTurn[];
  /**
   * A compact, *derived* view of the person's record: averages, streaks, the
   * current phase. Never raw entries — the function doesn't need someone's
   * whole diary to answer a question about their week.
   */
  facts: EdgeFacts;
  /** Which model to use. "auto" (default) = best-first chain on the function. */
  provider?: string;
  /** An attached photo or PDF for the vision model. */
  image?: CoachMedia;
  /** How long the answer should be, decided client-side from the question. */
  register: "terse" | "brief" | "normal" | "full" | "plan";
  /** What the question is about, so the function needn't re-classify. */
  topic: string;
}

export interface EdgeFacts {
  today: string;
  trackers: Array<{
    id: string;
    name: string;
    today: number | null;
    goal: number;
    avg7: number | null;
    streak: number;
    daysLogged: number;
  }>;
  cycle: {
    cycleDay: number | null;
    phase: string | null;
    daysUntilNext: number | null;
    averageLength: number | null;
    paused: boolean;
  } | null;
  habitsActive: number;
  memories: string[];
  /**
   * Who the person is, independent of any entry — name (when offered at
   * onboarding), the part of day where they are, what they said they wanted
   * from Bloom, and how long they've been here. Present from minute zero, so
   * a record with nothing logged still produces a personal conversation.
   */
  personal?: {
    name: string | null;
    daypart: string;
    focusAreas: string[];
    daysWithBloom: number | null;
  } | null;
}

export type EdgeResult =
  | { ok: true; paragraphs: string[]; provider: string }
  | { ok: false; reason: "unconfigured" | "timeout" | "aborted" | "error"; detail?: string };

/** Strip a `CoachRecord` down to what the function actually needs. */
export function toFacts(record: CoachRecord): EdgeFacts {
  return {
    today: record.today,
    trackers: record.trackers.map((t) => ({
      id: t.id,
      name: t.name,
      today: t.today,
      goal: t.goal,
      avg7: t.avg7,
      streak: t.streak,
      daysLogged: t.daysLogged,
    })),
    cycle: record.cycle
      ? {
          cycleDay: record.cycle.cycleDay,
          phase: record.cycle.phaseLabel,
          daysUntilNext: record.cycle.daysUntilNext,
          averageLength: record.cycle.averageLength,
          paused: record.cycle.paused === true,
        }
      : null,
    habitsActive: record.habitsActive,
    /* Memories are user-written; cap them so one long note can't dominate. */
    memories: record.memories.slice(0, 8).map((m) => m.slice(0, 240)),
    personal: record.personal
      ? {
          name: record.personal.name,
          daypart: record.personal.daypart,
          focusAreas: record.personal.focusAreas.slice(0, 6),
          daysWithBloom: record.personal.daysWithBloom,
        }
      : null,
  };
}

/** Coerce whatever the function returned into paragraphs, or fail cleanly. */
function readBody(data: unknown): string[] | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;

  if (Array.isArray(d["paragraphs"])) {
    const ps = d["paragraphs"].filter((p): p is string => typeof p === "string" && p.trim() !== "");
    return ps.length > 0 ? ps : null;
  }
  /* Tolerate the two other shapes an edge function is likely to return. */
  for (const key of ["reply", "text", "message", "content"]) {
    const v = d[key];
    if (typeof v === "string" && v.trim() !== "") {
      return v
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);
    }
  }
  return null;
}

/**
 * Ask the edge function. Resolves to `{ ok: false }` rather than rejecting —
 * the caller's job is to answer the person, not to handle transport errors.
 */
export async function askEdge(request: EdgeRequest, signal?: AbortSignal): Promise<EdgeResult> {
  if (!hasSupabaseConfig) return { ok: false, reason: "unconfigured" };
  if (signal?.aborted) return { ok: false, reason: "aborted" };

  /* One quiet retry: a single transient failure (a provider chain landing
     on cooldowns, a cold start) shouldn't reach the person as an error
     card when a second ask a breath later would simply work. The manual
     "Try again" remains for anything that fails twice. */
  let result = await askEdgeOnce(request, signal);
  if (!result.ok && result.reason !== "aborted" && !signal?.aborted && !request.image) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    if (!signal?.aborted) result = await askEdgeOnce(request, signal);
  }
  return result;
}

async function askEdgeOnce(request: EdgeRequest, signal?: AbortSignal): Promise<EdgeResult> {
  const timer = new AbortController();
  const timeout = setTimeout(() => timer.abort(), request.image ? MEDIA_TIMEOUT_MS : TIMEOUT_MS);
  /* Chain the caller's signal onto ours so either can cancel the request. */
  const onAbort = () => timer.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const { data, error } = await supabase.functions.invoke(COACH_FUNCTION, {
      body: request,
      /* supabase-js forwards this to fetch. */
      ...({ signal: timer.signal } as Record<string, unknown>),
    });

    if (error) {
      return { ok: false, reason: "error", detail: error.message };
    }
    const paragraphs = readBody(data);
    if (!paragraphs) return { ok: false, reason: "error", detail: "empty response" };

    const provider =
      (data as Record<string, unknown> | null)?.["provider"] ?? request.provider ?? "edge";
    return { ok: true, paragraphs, provider: String(provider) };
  } catch (err) {
    if (signal?.aborted) return { ok: false, reason: "aborted" };
    if (timer.signal.aborted) return { ok: false, reason: "timeout" };
    return {
      ok: false,
      reason: "error",
      detail: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
  }
}
