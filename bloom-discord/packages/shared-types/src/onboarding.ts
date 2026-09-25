/**
 * Member lifecycle.
 *
 *   @everyone
 *       ↓ verification
 *   ✧ Early Bloom      ← onboarding in progress
 *       ↓ onboarding completed
 *   ❋ Bloom Member     ← normal verified member
 *
 * Three distinctions the brief calls out explicitly, repeated here because they
 * are the easiest thing in this project to get wrong:
 *
 *   • "Early Bloom" is an ONBOARDING STATE. It does not mean early access.
 *   • "Bloom Member" is the normal verified community member.
 *   • "Beta Tester" is unrelated to both — it is product testing access, granted
 *     separately, and it confers no staff or onboarding meaning whatsoever.
 *
 * Guardian owns every transition below. Companion and Labs read this state and
 * must never write it.
 */
export const ONBOARDING_STATES = [
  /** Joined, not yet verified. Holds no Bloom role. */
  'unverified',
  /** Verification passed, ✧ Early Bloom granted, onboarding steps outstanding. */
  'early_bloom',
  /** All onboarding steps complete, ❋ Bloom Member granted. */
  'bloom_member',
  /** Access withdrawn by staff. Retained so a rejoin does not silently reset. */
  'revoked',
] as const;

export type OnboardingState = (typeof ONBOARDING_STATES)[number];

/**
 * Legal transitions. Anything absent from this map is rejected by the service
 * layer, which is what stops an Early Bloom member from promoting themselves to
 * Bloom Member by replaying a request.
 */
export const ONBOARDING_TRANSITIONS: Readonly<
  Record<OnboardingState, readonly OnboardingState[]>
> = {
  unverified: ['early_bloom', 'revoked'],
  early_bloom: ['bloom_member', 'revoked'],
  // Re-verification can send a member back to onboarding.
  bloom_member: ['early_bloom', 'revoked'],
  revoked: ['unverified'],
};

export function canTransition(from: OnboardingState, to: OnboardingState): boolean {
  return ONBOARDING_TRANSITIONS[from].includes(to);
}

/**
 * What caused a transition.
 *
 * A closed set, mirrored by the `onboarding_trigger` enum in migration 0004.
 * Keeping it closed is the point: an open string column is how a future caller
 * invents "auto_promote" and nobody reviews it.
 */
export const ONBOARDING_TRIGGERS = [
  /** The member ran /verify themselves. */
  'self_verify',
  /** Staff moved them through a Guardian command. */
  'staff_action',
  /** Guardian reconciling state it observed on the gateway. */
  'reconciliation',
  /** Membership row created on join. */
  'join',
] as const;

export type OnboardingTrigger = (typeof ONBOARDING_TRIGGERS)[number];

/**
 * Member-facing names for each state.
 *
 * Deliberately not the raw enum values: "early_bloom" is a database detail, and
 * "✧ Early Bloom" is what the member sees on their own profile. The wording
 * avoids implying early *access*, which is the single most common
 * misinterpretation of this role.
 */
export const ONBOARDING_STATE_LABELS: Readonly<Record<OnboardingState, string>> = {
  unverified: 'Not yet verified',
  early_bloom: '✧ Early Bloom — onboarding in progress',
  bloom_member: '❋ Bloom Member',
  revoked: 'Access withdrawn',
};

/**
 * The role a member in this state should hold, as a role key.
 *
 * `null` means "no Bloom lifecycle role". Used to reconcile the roles a member
 * actually holds against the state we recorded, which is how a role granted by
 * hand in the Discord client gets noticed.
 */
export const ONBOARDING_STATE_ROLE: Readonly<
  Record<OnboardingState, 'earlyBloom' | 'bloomMember' | null>
> = {
  unverified: null,
  early_bloom: 'earlyBloom',
  bloom_member: 'bloomMember',
  revoked: null,
};

export function isOnboardingState(value: unknown): value is OnboardingState {
  return (
    typeof value === 'string' && (ONBOARDING_STATES as readonly string[]).includes(value)
  );
}
