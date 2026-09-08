/**
 * More than one AI, later.
 *
 * The requirement is "so I can add more AIs" — which in practice means the
 * choice of model must be *data*, not a branch buried in the send handler.
 * Every provider here is the same shape: an id, a name to show, and whether
 * it needs the network. The coach asks the registry which provider is active,
 * hands its id to the edge function, and the function decides what to call.
 *
 * Adding one is a single entry in this array plus a case on the server. No
 * component changes, because the picker renders whatever is registered.
 *
 * `local` is always present and always last-resort: it's the offline
 * responder, so the coach can never be completely mute.
 */

import { getPref, setPref } from "@/lib/prefs";

export interface CoachProvider {
  id: string;
  name: string;
  /** One line, shown under the name in the picker. */
  blurb: string;
  /** Needs the edge function and a connection. */
  remote: boolean;
}

export const PROVIDERS: CoachProvider[] = [
  {
    id: "gemini",
    name: "Gemini 3.8 Flash",
    blurb: "Fast and inexpensive. The default when your function is deployed.",
    remote: true,
  },
  {
    id: "gemini-free",
    name: "Gemini 3.8 Flash (free)",
    blurb: "Same model on the free tier — slower, and rate limited.",
    remote: true,
  },
  {
    id: "bloom",
    name: "OpenAI",
    blurb: "GPT, if you've set OPENAI_API_KEY on the function.",
    remote: true,
  },
  {
    id: "local",
    name: "On this device",
    blurb: "No network. Answers from what you've logged, plus Bloom's own knowledge.",
    remote: false,
  },
];

export const PROVIDER_PREF = "coach.provider";
/*
 * Gemini by default: it is the cheapest capable option and the one the
 * function is configured for. If its key is missing the request fails and the
 * engine answers on-device instead, so a wrong default degrades rather than
 * breaks.
 */
export const DEFAULT_PROVIDER = "gemini";

const BY_ID = new Map(PROVIDERS.map((p) => [p.id, p]));

export const providerFor = (id: string): CoachProvider =>
  BY_ID.get(id) ?? BY_ID.get(DEFAULT_PROVIDER)!;

/** The chosen provider, falling back cleanly if a stored id was removed. */
export function activeProvider(): CoachProvider {
  const id = getPref<string>(
    PROVIDER_PREF,
    (raw) => (typeof raw === "string" && BY_ID.has(raw) ? raw : null),
    DEFAULT_PROVIDER,
  );
  return providerFor(id);
}

export function setActiveProvider(id: string): void {
  if (!BY_ID.has(id)) return;
  setPref(PROVIDER_PREF, id);
}
