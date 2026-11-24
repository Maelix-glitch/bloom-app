import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { NutritionReportPage } from "@/components/nutrition/NutritionReportPage";
import { todayLocal } from "@/lib/localDay";

/** `?d=YYYY-MM-DD` — the day the report's 7-day window ends on. Any
 *  other shape falls back to today inside the page. */
const reportSearchSchema = z.object({
  d: z.string().optional(),
});

export const Route = createFileRoute("/nutrition/report")({
  validateSearch: (search: Record<string, unknown>) => reportSearchSchema.parse(search),
  head: () => ({
    meta: [{ title: "Bloom - Nutrition report" }],
  }),
  component: NutritionReportRoute,
});

function NutritionReportRoute() {
  const { d } = Route.useSearch();
  return <NutritionReportPage endDay={d ?? todayLocal()} />;
}
