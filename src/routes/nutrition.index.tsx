import { createFileRoute } from "@tanstack/react-router";

import { NutritionPage } from "@/components/nutrition/NutritionPage";

export const Route = createFileRoute("/nutrition/")({
  component: NutritionIndexRoute,
});

function NutritionIndexRoute() {
  return <NutritionPage />;
}
