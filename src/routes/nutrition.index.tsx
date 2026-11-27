import { createFileRoute } from "@tanstack/react-router";

import { NutritionLocked } from "@/components/nutrition/NutritionLocked";
import { NutritionPage } from "@/components/nutrition/NutritionPage";
import { useAssessment } from "@/hooks/useAssessment";

export const Route = createFileRoute("/nutrition/")({
  component: NutritionIndexRoute,
});

/**
 * The Nutrition tab opens only after the Assessment is completed
 * (M-251, owner directive). The gate lives HERE, at the route — not
 * inside NutritionPage, which other surfaces and tests render
 * directly — and it asks the one question the Assessment owns:
 * is the stored state complete? Any completed assessment opens the
 * page, including assessments stored before the country question
 * existed; an assessment merely started (or never begun) gets the
 * locked invitation.
 */
function NutritionIndexRoute() {
  const assessment = useAssessment();
  if (assessment.state.status !== "complete") return <NutritionLocked />;
  return <NutritionPage />;
}
