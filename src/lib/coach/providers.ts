/**
 * More than one AI, later.
 *
 * The requirement is "so I can add more AIs" â€” which in practice means the
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
    id: "auto",
    name: "Best available",
    blurb: "Tries the strongest model you've connected, then the next — automatically.",
    remote: true,
  },
  {
    id: "bloom",
    name: "Bloom",
    blurb: "Bloom's own coach, running on your Supabase function.",
    remote: true,
  },
  {
    id: "apinex",
    name: "Gemini 3.8 Flash â€” free",
    blurb: "APInex free tier, via your Supabase function.",
    remote: true,
  },
  {
    id: "teamo",
    name: "DeepSeek V4 Pro â€” free",
    blurb: "TeamoRouter free tier, via your Supabase function.",
    remote: true,
  },
  {
    id: "hf",
    name: "Hugging Face",
    blurb: "Whatever model you pointed HF_MODEL at.",
    remote: true,
  },
];

export const PROVIDER_PREF = "coach.provider";
export const DEFAULT_PROVIDER = "auto";

/*
 * The model the coach asks for. "auto" means the edge function starts at the
 * top of its best-first chain (strongest connected model) and walks down it
 * when a provider fails — see supabase/functions/coach/index.ts.
 */
export const COACH_PROVIDER = "auto";

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
