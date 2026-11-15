import { createFileRoute } from "@tanstack/react-router";

import nutritionCss from "../styles/nutrition.css?url";
import { NutritionPage } from "@/components/nutrition/NutritionPage";

export const Route = createFileRoute("/nutrition")({
  head: () => ({
    meta: [
      { title: "Bloom — Nutrition" },
      {
        name: "description",
        content:
          "What you eat, logged against your day — USDA reference values, your own packet labels and clearly marked estimates, every number carrying its source.",
      },
    ],
    links: [{ rel: "stylesheet", href: nutritionCss }],
  }),
  component: NutritionRoute,
});

function NutritionRoute() {
  return (
    <div className="app-shell min-h-screen bg-background text-foreground">
      <main className="min-w-0">
        <NutritionPage />
      </main>
    </div>
  );
}
