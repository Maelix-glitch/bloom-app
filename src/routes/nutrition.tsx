import { createFileRoute, Outlet } from "@tanstack/react-router";

import nutritionCss from "../styles/nutrition.css?url";

/**
 * /nutrition is the tab, and /nutrition/report its clinician layer.
 * Both share the nutrition stylesheet, loaded once here.
 */
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
  component: NutritionLayout,
});

function NutritionLayout() {
  return (
    <div className="app-shell min-h-screen bg-background text-foreground">
      <main className="min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
