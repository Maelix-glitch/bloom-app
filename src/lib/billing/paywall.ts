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
  | "vitalis_plus"
  | "premium_plus"
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
    body: "The Coach pauses here on Free, everything else in Bloom keeps working. Premium refills the allowance every month.",
  },
  coach_photo: {
    title: "Photo analysis is a Premium feature",
    body: "Send the Coach a photo of a meal and it reads the plate for you. That's part of Premium, along with the full Coach allowance.",
  },
  vitalis_credits: {
    title: "Vitalis has used this month's AI credits",
    body: "Vitalis pauses here, your record, plans and trackers keep working. Premium Plus refills the allowance every month.",
  },
  /* M-214: Vitalis itself is a Premium Plus feature now — this is
     the refusal a Free or Premium member meets, distinct from the
     credits running out. */
  vitalis_plus: {
    title: "Vitalis is part of Premium Plus",
    body: "The orb AI that knows your Assessment and your plan, and answers out loud, lives in Premium Plus, with the adaptive intelligence and the Metabolic Twin.",
  },
  /* M-214: the intelligence layer's shared refusal — the Twin,
     adaptive proposals, the reports, photo-led logging and the
     premium Stories templates all open the sheet with these words. */
  premium_plus: {
    title: "This is part of Premium Plus",
    body: "Premium Plus carries Bloom's intelligence layer: Vitalis with voice, adaptive plans, the Metabolic Twin, advanced analytics and reports, photo-led logging and the premium Stories templates.",
  },
  habits_limit: {
    title: "Free includes up to 5 habits",
    body: "You've reached the Free limit. Premium removes it, unlimited habits, plus the full Coach and Nutrition intelligence.",
  },
  nutrition_plan: {
    title: "Your nutrition plan is part of Premium",
    body: "A plan built from your Assessment, your dishes, your pattern, your budget, with the grocery list that goes with it. Premium Plus goes further: its plans adapt as your days change.",
  },
  assessment: {
    title: "The Assessment is part of Premium",
    body: "Your starting point, goals, pattern, safety, budget, drives everything Bloom's intelligence does. It's a Premium feature.",
  },
  profile: {
    title: "Bloom Premium",
    body: "Premium covers the essentials, unlimited, habits, the full Coach, your plan and Nutrition. Premium Plus adds the intelligence layer: Vitalis, adaptive plans and the Metabolic Twin.",
  },
  generic: {
    title: "Bloom Premium",
    body: "Premium covers the essentials, unlimited, habits, the full Coach, your plan and Nutrition. Premium Plus adds the intelligence layer: Vitalis, adaptive plans and the Metabolic Twin.",
  },
};
