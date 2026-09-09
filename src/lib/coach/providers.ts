/**
 * Coach provider selection — server-side only.
 *
 * Bloom's coach is one AI: routing happens inside the Supabase edge function
 * (`supabase/functions/coach/index.ts`), which walks its provider order
 * (Gemini → Grok → Qwen via Hugging Face) with health-aware failover. The
 * client never picks a model, never sees a provider name, and never falls
 * back to an on-device answer.
 *
 * This module exists only to satisfy the one client-side contract that
 * remains: the send handler forwards a single advisory id (`"auto"`) that the
 * edge function ignores for routing. There is deliberately no local
 * provider — the coach is strictly online and surfaces an honest error with a
 * retry when it cannot answer.
 */

export interface CoachProvider {
  id: string;
  name: string;
  /** One line, shown under the name in the picker. */
  blurb: string;
  /** Needs the edge function and a connection. */
  remote: boolean;
}

/**
 * The only client-side option: let the edge function route best-first.
 * Stored prefs from older builds (named providers, "local") are ignored.
 */
export const PROVIDERS: CoachProvider[] = [
  {
    id: "auto",
    name: "Bloom",
    blurb: "Bloom's coach, choosing the best connected model automatically.",
    remote: true,
  },
];

export const PROVIDER_PREF = "coach.provider";
export const DEFAULT_PROVIDER = "auto";

/* The id handed to the edge function with every request. */
export const COACH_PROVIDER = "auto";

const BY_ID = new Map(PROVIDERS.map((p) => [p.id, p]));

export const providerFor = (_id: string): CoachProvider => BY_ID.get(DEFAULT_PROVIDER)!;

/** Always the auto provider — routing is the edge function's job, not the client's. */
export function activeProvider(): CoachProvider {
  return providerFor(DEFAULT_PROVIDER);
}

/** Kept for API compatibility; the client no longer offers a picker. */
export function setActiveProvider(_id: string): void {
  /* no-op — provider selection is server-side by design */
}