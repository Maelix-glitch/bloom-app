/**
 * streamVitalis — the deliberation transport.
 *
 * A deliberated Vitalis request is answered as NDJSON: one
 * `{"type":"stage",…}` line as each real stage of the server-side
 * pipeline begins, then a final `{"type":"result",…}` (or
 * `{"type":"error",…}`). supabase-js `functions.invoke` cannot read a
 * stream, so this goes through fetch directly, with the person's
 * session token as the Authorization header — the same credential
 * invoke would have sent.
 *
 * Honesty rules:
 *   · stages are rendered ONLY as the server reports them — this
 *     module invents none, reorders none, and synthesises none when
 *     the stream is silent;
 *   · if the function answers plain JSON instead (an older deploy),
 *     the body is read as a classic result and NO stages are reported;
 *   · a stream that dies mid-way is an error, never a partial answer
 *     dressed as complete.
 */

import { COACH_FUNCTION, readVitalisExtras, type EdgeRequest } from "@/lib/coach/edge";
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabaseConfig, supabase } from "@/lib/supabase";

export interface VitalisStreamStage {
  stage: string;
  label: string;
}

export type VitalisStreamResult =
  | {
      ok: true;
      paragraphs: string[];
      actions: unknown[];
      stages: { stage: string; ms: number }[];
      locked: boolean;
      deliberated: boolean;
    }
  | { ok: false; reason: "unconfigured" | "timeout" | "aborted" | "error"; detail?: string };

/** Deliberation legitimately takes longer than a chat reply — the
 *  server budget is ~110 s; the client gives up a little after it. */
export const DELIBERATION_TIMEOUT_MS = 125_000;

export async function streamVitalis(
  request: EdgeRequest,
  onStage: (stage: VitalisStreamStage) => void,
  signal?: AbortSignal,
): Promise<VitalisStreamResult> {
  if (!hasSupabaseConfig) return { ok: false, reason: "unconfigured" };
  if (signal?.aborted) return { ok: false, reason: "aborted" };

  const timer = new AbortController();
  const timeout = setTimeout(() => timer.abort(), DELIBERATION_TIMEOUT_MS);
  const onAbort = () => timer.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? SUPABASE_ANON_KEY;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${COACH_FUNCTION}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
      signal: timer.signal,
    });
    if (!res.ok) {
      return { ok: false, reason: "error", detail: `http ${res.status}` };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("ndjson") || !res.body) {
      /* An older function answers plain JSON — read it as a classic
         result. No stage events exist on this path and none are made
         up: the stage list stays whatever the payload itself carries. */
      const data = (await res.json()) as Record<string, unknown>;
      return resultFromJson(data);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result: VitalisStreamResult | null = null;

    const handleLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(trimmed) as Record<string, unknown>;
      } catch {
        return; /* a torn line is skipped, never guessed at */
      }
      if (event["type"] === "stage" && typeof event["stage"] === "string") {
        onStage({
          stage: event["stage"],
          label: typeof event["label"] === "string" ? event["label"] : event["stage"],
        });
      } else if (event["type"] === "result") {
        result = resultFromJson(event);
      } else if (event["type"] === "error") {
        result = { ok: false, reason: "error", detail: String(event["error"] ?? "unavailable") };
      }
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) handleLine(line);
    }
    if (buffer.trim()) handleLine(buffer);

    if (!result) return { ok: false, reason: "error", detail: "stream ended without a result" };
    return result;
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

function resultFromJson(data: Record<string, unknown>): VitalisStreamResult {
  const paragraphs = Array.isArray(data["paragraphs"])
    ? (data["paragraphs"] as unknown[]).filter(
        (p): p is string => typeof p === "string" && p.trim() !== "",
      )
    : [];
  if (paragraphs.length === 0) return { ok: false, reason: "error", detail: "empty response" };
  const extras = readVitalisExtras(data);
  return {
    ok: true,
    paragraphs,
    actions: extras?.actions ?? [],
    stages: extras?.stages ?? [],
    locked: extras?.locked ?? false,
    deliberated: extras?.deliberated ?? data["deliberated"] === true,
  };
}
