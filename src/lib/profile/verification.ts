/**
 * Account verification — the blue tick, and the checkable process behind it.
 *
 * Verification is DERIVED, never stored: the status is computed from the two
 * sources that already own the facts, so it can never drift from them and
 * there is no flag to set, toggle or fake.
 *
 *   1. **Email confirmed** — the Supabase auth user's `email_confirmed_at`
 *      is set. Bloom signs people in with a magic link, so following the
 *      link sent to the account's email is what confirms it; an account
 *      that has only ever requested a link it never opened is unconfirmed.
 *   2. **Basic profile complete** — the profile record carries a real
 *      display name (not the "Bloom User" placeholder a missing row reads
 *      back as) AND a username/handle.
 *
 * Both are required. `verificationStatus` is the one place the criteria
 * live: the hero badge, the settings row and these tests all read it.
 */

/**
 * The universal verification blue (the #1d9bf0 family). Deliberately NOT a
 * Bloom palette token: blue is what makes the tick read as "verified"
 * everywhere, and it lives here in lib — the design-token guard's home
 * rules keep hex out of components, and this is data, not chrome.
 */
export const VERIFIED_BLUE = "#1d9bf0";

export type VerificationStepId = "email" | "profile";

export interface VerificationStep {
  id: VerificationStepId;
  label: string;
  done: boolean;
  /** What to do about this step, written for the settings row. */
  guidance: string;
}

export interface VerificationStatus {
  verified: boolean;
  /** How many of the criteria are still unmet (0 when verified). */
  remaining: number;
  steps: VerificationStep[];
}

export interface VerificationInput {
  /** From the auth user: `email_confirmed_at` is set. */
  emailConfirmed: boolean;
  /** `profiles.display_name` — the placeholder name does not count. */
  displayName: string | null | undefined;
  /** `profiles.username`. */
  username: string | null | undefined;
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
  return { verified: remaining === 0, remaining, steps };
}
