/**
 * Account verification — the blue tick, and the checkable process behind it.
 *
 * Verification v2 (owner directive, 2026-11-15): the tick is a RECORD, not
 * a derivation. A row in `public.account_verifications` is the tick — no
 * row, no tick, whatever the profile looks like — and records are granted
 * ONLY BY INVITES, through the security-definer
 * `claim_account_verification()` (see the 20261115 migration). The client
 * can read its own row and ask for the grant; it can never write one.
 *
 * The gates the grant checks server-side, and the steps this module
 * reports, are the same three:
 *
 *   1. **Invited member** — the account email is on `app_invites`. Bloom
 *      is invite-only, and the tick is too: this is the owner's core rule.
 *   2. **Email confirmed** — the Supabase auth user's `email_confirmed_at`
 *      is set. Bloom signs people in with a magic link, so following the
 *      link sent to the account's email is what confirms it.
 *   3. **Basic profile complete** — a real display name (not the
 *      "Bloom User" placeholder a missing row reads back as) AND a
 *      username/handle.
 *
 * `verified` here requires all three steps AND the record. Facts that have
 * not loaded yet are passed in as unproven (false), never assumed: an
 * unknown invite or record state reads as "not verified", so the tick can
 * appear once the facts land but can never show without them.
 * `verificationStatus` is the one place the criteria live: the hero badge,
 * the sidebar badge, the settings row and these tests all read it.
 */

/**
 * The universal verification blue (the #1d9bf0 family). Deliberately NOT a
 * Bloom palette token: blue is what makes the tick read as "verified"
 * everywhere, and it lives here in lib — the design-token guard's home
 * rules keep hex out of components, and this is data, not chrome.
 */
export const VERIFIED_BLUE = "#1d9bf0";

export type VerificationStepId = "invite" | "email" | "profile";

export interface VerificationStep {
  id: VerificationStepId;
  label: string;
  done: boolean;
  /** What to do about this step, written for the settings row. */
  guidance: string;
}

export interface VerificationStatus {
  verified: boolean;
  /** How many of the criteria are still unmet (0 when every step passes). */
  remaining: number;
  /**
   * Every step passes but the record has not landed yet — the grant is
   * recorded by `claim_account_verification()` on the next facts read, so
   * this state is a moment, not a destination. The settings row says
   * "recording" rather than pretending a step is missing.
   */
  pendingRecord: boolean;
  steps: VerificationStep[];
}

export interface VerificationInput {
  /**
   * The account email is on `app_invites`. False until proven — an
   * unloaded or failed invite check must never read as invited.
   */
  invited: boolean;
  /** From the auth user: `email_confirmed_at` is set. */
  emailConfirmed: boolean;
  /** `profiles.display_name` — the placeholder name does not count. */
  displayName: string | null | undefined;
  /** `profiles.username`. */
  username: string | null | undefined;
  /**
   * A row exists in `account_verifications` for this account. False until
   * proven — the record is the tick, so an unloaded read is no tick.
   */
  hasRecord: boolean;
}

/** The name a profile with no saved row reads back as — not a real name. */
const PLACEHOLDER_NAME = "Bloom User";

const hasRealName = (name: string | null | undefined): boolean => {
  const trimmed = name?.trim() ?? "";
  return trimmed.length > 0 && trimmed !== PLACEHOLDER_NAME;
};

const hasHandle = (username: string | null | undefined): boolean =>
  (username?.trim() ?? "").length > 0;

export function verificationStatus(input: VerificationInput): VerificationStatus {
  const steps: VerificationStep[] = [
    {
      id: "invite",
      label: "Join Bloom by invitation",
      done: input.invited,
      guidance:
        "The blue tick is granted to invited members only — Bloom checks your account email against its invite list.",
    },
    {
      id: "email",
      label: "Confirm your email",
      done: input.emailConfirmed,
      guidance: "Use the sign-in link sent to your email to confirm it.",
    },
    {
      id: "profile",
      label: "Add your name and @username",
      done: hasRealName(input.displayName) && hasHandle(input.username),
      guidance: "Add your name and choose a @username in Edit profile.",
    },
  ];
  const remaining = steps.filter((s) => !s.done).length;
  return {
    verified: input.hasRecord && remaining === 0,
    remaining,
    pendingRecord: !input.hasRecord && remaining === 0,
    steps,
  };
}
