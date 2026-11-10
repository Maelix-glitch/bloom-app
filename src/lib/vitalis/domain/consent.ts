/**
 * Consent architecture for Bloom Vitalis.
 *
 * Consent is a first-class domain object rather than a boolean in settings.
 * Each purpose is granted or withdrawn separately, and a grant only counts for
 * the policy version that was actually shown. When the policy text changes,
 * `consentState` reports `not_asked` again so the user must re-consent — it
 * never carries a stale grant forward silently.
 *
 * These purposes are product-level purposes. They are not a legal opinion, and
 * the wording shown to users is deliberately plain rather than aspirational.
 */

export const CONSENT_POLICY_VERSION = "vitalis-consent-1.0.0";

export const CONSENT_PURPOSES = [
  "health_data_processing",
  "sensitive_health_processing",
  "ai_assistance",
  "caregiver_sharing",
] as const;

export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

export type ConsentState = "granted" | "withdrawn" | "not_asked";

export interface ConsentRecord {
  readonly purpose: ConsentPurpose;
  readonly state: ConsentState;
  /** Policy version the user actually saw. */
  readonly policyVersion: string;
  /** When the decision was made. Null only when state is `not_asked`. */
  readonly decidedAt: string | null;
}

export interface ConsentCopy {
  readonly label: string;
  readonly description: string;
  /** Whether the purpose is needed before any health data is stored. */
  readonly required: boolean;
}

export const CONSENT_COPY: Record<ConsentPurpose, ConsentCopy> = {
  health_data_processing: {
    label: "Store my health information",
    description: "Save the profile, measurements and check-ins you enter so Bloom can show your history.",
    required: true,
  },
  sensitive_health_processing: {
    label: "Use sensitive health details",
    description:
      "Use details such as pregnancy, medical conditions or eating-disorder history to decide whether a plan is safe to show you.",
    required: false,
  },
  ai_assistance: {
    label: "AI explanations",
    description: "Send a summary of your numbers to the coaching service so it can write an explanation in words.",
    required: false,
  },
  caregiver_sharing: {
    label: "Share with someone I choose",
    description: "Let a person you name see a read-only summary of your progress.",
    required: false,
  },
};

export function isConsentPurpose(value: unknown): value is ConsentPurpose {
  return typeof value === "string" && (CONSENT_PURPOSES as readonly string[]).includes(value);
}

/**
 * The effective state for a purpose. A grant from a different policy version
 * is treated as `not_asked`: the user agreed to different words.
 */
export function consentState(
  records: readonly ConsentRecord[],
  purpose: ConsentPurpose,
  policyVersion: string = CONSENT_POLICY_VERSION,
): ConsentState {
  const latest = records.filter((record) => record.purpose === purpose).at(-1);
  if (!latest) return "not_asked";
  if (latest.state !== "granted") return latest.state;
  return latest.policyVersion === policyVersion ? "granted" : "not_asked";
}

export function hasConsent(
  records: readonly ConsentRecord[],
  purpose: ConsentPurpose,
  policyVersion: string = CONSENT_POLICY_VERSION,
): boolean {
  return consentState(records, purpose, policyVersion) === "granted";
}

export const FEATURE_REQUIREMENTS = {
  basic_tracking: ["health_data_processing"],
  assessment: ["health_data_processing"],
  plan_generation: ["health_data_processing", "sensitive_health_processing"],
  ai_narration: ["health_data_processing", "ai_assistance"],
  caregiver_sharing: ["caregiver_sharing"],
} as const satisfies Record<string, readonly ConsentPurpose[]>;

export type VitalisFeature = keyof typeof FEATURE_REQUIREMENTS;

export function missingConsents(
  records: readonly ConsentRecord[],
  feature: VitalisFeature,
  policyVersion: string = CONSENT_POLICY_VERSION,
): ConsentPurpose[] {
  return FEATURE_REQUIREMENTS[feature].filter((purpose) => !hasConsent(records, purpose, policyVersion));
}

export function canUseFeature(
  records: readonly ConsentRecord[],
  feature: VitalisFeature,
  policyVersion: string = CONSENT_POLICY_VERSION,
): boolean {
  return missingConsents(records, feature, policyVersion).length === 0;
}

/** A record for a new decision. Timestamp is passed in so results are testable. */
export function consentDecision(
  purpose: ConsentPurpose,
  granted: boolean,
  decidedAt: string = new Date().toISOString(),
  policyVersion: string = CONSENT_POLICY_VERSION,
): ConsentRecord {
  return {
    purpose,
    state: granted ? "granted" : "withdrawn",
    policyVersion,
    decidedAt,
  };
}
