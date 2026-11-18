/**
 * The paywall bus — one upgrade prompt for the whole app.
 *
 * Any surface that meets a premium boundary (Coach out of credits,
 * the free habit limit, the plan composer, the Assessment) calls
 * requestPaywall(context); the single PaywallHost mounted at the app
 * root listens and opens the sheet. A window event, not React state,
 * because the callers live in hooks, engines and components that
 * share nothing else — and because the prompt must be identical
 * everywhere it appears: tasteful, specific about what was reached,
 * and never in the way of a free feature.
 */

export type PaywallContext =
  | "coach_credits"
  | "coach_photo"
  | "vitalis_credits"
  | "habits_limit"
  | "nutrition_plan"
  | "assessment"
  | "profile"
  | "generic";

const EVENT = "bloom:paywall";

export function requestPaywall(context: PaywallContext): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<PaywallContext>(EVENT, { detail: context }));
}

export function onPaywallRequest(handler: (context: PaywallContext) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<PaywallContext>).detail;
    handler(typeof detail === "string" ? detail : "generic");
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

/** The headline each context opens with — what was reached, stated
 *  plainly, before any price appears. */
export const PAYWALL_HEADLINES: Record<PaywallContext, { title: string; body: string }> = {
  coach_credits: {
    title: "You've used this month's AI credits",
    body: "The Coach and Vitalis pause here on Free — everything else in Bloom keeps working. Premium refills the allowance every month.",
  },
  coach_photo: {
    title: "Photo analysis is a Premium feature",
    body: "Send the Coach a photo of a meal and it reads the plate for you. That's part of Premium, along with the full Coach allowance.",
  },
  vitalis_credits: {
    title: "Vitalis has used this month's AI credits",
    body: "Vitalis pauses here on Free — your record, plans and trackers keep working. Premium refills the allowance every month.",
  },
  habits_limit: {
    title: "Free includes up to 5 habits",
    body: "You've reached the Free limit. Premium removes it — unlimited habits, plus the full Coach and Nutrition intelligence.",
  },
  nutrition_plan: {
    title: "Adaptive plans are part of Premium",
    body: "Plans that learn from what you actually ate — your dishes, your gaps, your real expenditure — are Premium's core.",
  },
  assessment: {
    title: "The Assessment is part of Premium",
    body: "Your starting point — goals, pattern, safety, budget — drives everything Bloom's intelligence does. It's a Premium feature.",
  },
  profile: {
    title: "Bloom Premium",
    body: "The full intelligence: unlimited habits, the full Coach and Vitalis, adaptive plans, Nutrition and advanced analytics.",
  },
  generic: {
    title: "Bloom Premium",
    body: "The full intelligence: unlimited habits, the full Coach and Vitalis, adaptive plans, Nutrition and advanced analytics.",
  },
};
