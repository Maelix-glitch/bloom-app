/**
 * Trust & security — the claims registry (SYSTEM 10).
 *
 * Every line Bloom shows in Profile → Privacy → "Trust & security" comes
 * from this list, and every line here is pinned by a verification test in
 * `trust.guard.test.ts` against the code that makes it true. A claim with
 * no test behind it does not ship: if a protection is ever removed, its
 * test fails and the claim must go with it.
 *
 * Copy rules: plain words, no marketing, nothing the code can't prove.
 * `surface` names the place in the app where the person can see the
 * backing for the claim with their own eyes.
 */

export interface TrustClaim {
  id: string;
  /** The one-line promise, in plain words. */
  line: string;
  /** Where in the app the backing for this line lives. */
  surface: string;
}

export const TRUST_CLAIMS: readonly TrustClaim[] = [
  {
    id: "server-paywall",
    line: "Premium is enforced on Bloom's server, not just hidden in the app, only the server can grant a plan or credits.",
    surface: "Membership, in this Profile",
  },
  {
    id: "ai-gate-first",
    line: "Before Coach or Vitalis calls an AI provider, the server checks your plan and credits. A refusal costs nothing.",
    surface: "Coach and Vitalis, which run server-side",
  },
  {
    id: "credits-ledger",
    line: "Every AI credit in or out is written to a ledger with the balance it produced, and the app cannot edit or delete ledger rows.",
    surface: "The AI credits meter in Membership",
  },
  {
    id: "no-keys-in-app",
    line: "No AI or payment keys are stored in the app. They live only on the server; the app ships with just its public keys.",
    surface: "Checked continuously by Bloom's own guard tests",
  },
  {
    id: "consent-record",
    line: "The permissions you gave in your Assessment are recorded, and you can read them back whenever you like.",
    surface: "Your consent, in this Privacy group",
  },
  {
    id: "export-and-erase",
    line: "You can download everything Bloom holds for you, or erase it, from this device and from your account.",
    surface: "Sharing & data, below",
  },
  {
    id: "photo-licences",
    line: "Every food photograph is a real photograph under a free licence, and its photographer is credited.",
    surface: "Photo credits, in the Nutrition tab",
  },
  {
    id: "provenance-labels",
    line: "Every nutrition number says where it came from, a verified database, a recipe's ingredients, or a labelled estimate. Estimates are never dressed up as measurements.",
    surface: "Nutrition, every entry is labelled",
  },
] as const;

/** The ids the verification suite knows how to prove. Kept beside the
 *  registry so a claim added without a test fails the sync check. */
export const TRUST_CLAIM_IDS: readonly string[] = TRUST_CLAIMS.map((c) => c.id);
