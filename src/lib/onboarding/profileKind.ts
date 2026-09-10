/**
 * Who is using Bloom — asked once, changeable forever.
 *
 * Bloom tracks a menstrual cycle. For someone who doesn't have one, every
 * cycle surface is noise: a ring on Today that never fills, a nav entry that
 * leads nowhere useful, a coach topic that can't apply. Rather than ship a
 * women-only app or a cluttered one, Bloom asks once, at the start, and shapes
 * itself around the answer.
 *
 * Deliberate choices:
 *   · **"Prefer not to say" is a real answer**, not a dead end — it keeps
 *     everything visible, which is the safe default.
 *   · The answer sets a *capability* (`tracksCycle`), never a label used
 *     anywhere else. Nothing in the app says "male"/"female" back to the user.
 *   · It is a **preference, not a lock**: one row in settings changes it, and
 *     changing it never deletes anything already logged.
 *   · It lives in the synced prefs document, so it follows the account.
 */

export type ProfileKind = "cycle" | "no-cycle" | "unspecified";

export interface OnboardingState {
  /** Answered at least once. */
  done: boolean;
  kind: ProfileKind;
  /** What the person said they wanted from Bloom — shapes the first screen. */
  focus: FocusArea[];
  /** Their name, if they offered one. Used sparingly. */
  name: string | null;
  /** ISO timestamp of the answer, so a later change wins across devices. */
  at: string | null;
  /**
   * Entered through the admin door. This is a *mode*, not a bookkeeping flag:
   * it keeps the admin bar visible so there is always a way back out, and it
   * marks that no real answers were given — so `setKind` from settings still
   * behaves as a first answer rather than a change of mind.
   */
  admin: boolean;
}

export type FocusArea = "habits" | "mood" | "sleep" | "study" | "movement" | "cycle";

export const FOCUS_LABEL: Record<FocusArea, string> = {
  habits: "Build habits",
  mood: "Understand my mood",
  sleep: "Sleep better",
  study: "Study with focus",
  movement: "Move more",
  cycle: "Track my cycle",
};

export const ONBOARDING_PREF = "onboarding.v1";

export const DEFAULT_ONBOARDING: OnboardingState = {
  done: false,
  kind: "unspecified",
  focus: [],
  name: null,
  at: null,
  admin: false,
};

const KINDS: ProfileKind[] = ["cycle", "no-cycle", "unspecified"];
const AREAS: FocusArea[] = ["habits", "mood", "sleep", "study", "movement", "cycle"];

/** Tolerates anything on disk: a bad field falls back, never throws. */
export function parseOnboarding(raw: unknown): OnboardingState | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const kind = KINDS.includes(r["kind"] as ProfileKind)
    ? (r["kind"] as ProfileKind)
    : "unspecified";
  const focus = Array.isArray(r["focus"])
    ? (r["focus"] as unknown[]).filter((f): f is FocusArea => AREAS.includes(f as FocusArea))
    : [];
  const name =
    typeof r["name"] === "string" && r["name"].trim() ? r["name"].trim().slice(0, 48) : null;
  return {
    done: r["done"] === true,
    kind,
    focus,
    name,
    at: typeof r["at"] === "string" ? r["at"] : null,
    admin: r["admin"] === true,
  };
}

/**
 * The one question the rest of the app asks. `unspecified` keeps the cycle
 * visible — hiding a feature from someone who never said they didn't want it
 * would be the wrong way round.
 */
export const tracksCycle = (state: OnboardingState): boolean => state.kind !== "no-cycle";

/**
 * Was this session entered through the admin door?
 *
 * A **mode**, not a permission. It records how someone got in, which is what
 * lets the admin bar stay visible so there is a way back out, and marks that
 * no real setup answers were given.
 *
 * Whether someone may *use* the door at all is decided by the database — see
 * `useAdminAccess`, which asks `public.app_admins`. A stored `admin: true` on
 * an account that isn't in that table is stale, and the admin bar clears it
 * rather than honouring it.
 */
export const isAdmin = (state: OnboardingState): boolean => state.admin === true;

/** Routes that only make sense for someone tracking a cycle. */
export const CYCLE_ROUTES = ["/cycle", "/cycle-classic", "/cycle-styles"];

export const isCycleRoute = (pathname: string): boolean =>
  CYCLE_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));

/**
 * The trackers someone starting out should have switched on, given what they
 * said they came for. Empty means "leave the defaults alone".
 */
export function suggestedTrackers(focus: readonly FocusArea[]): string[] {
  const map: Partial<Record<FocusArea, string[]>> = {
    sleep: ["sleep", "energy"],
    study: ["study", "screen"],
    movement: ["movement", "energy"],
    mood: ["energy"],
  };
  const out = new Set<string>();
  for (const f of focus) for (const t of map[f] ?? []) out.add(t);
  return [...out];
}
