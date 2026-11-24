import { createFileRoute } from "@tanstack/react-router";

import { DoctorSummaryPage } from "@/components/ci/DoctorSummaryPage";

/** The printable twelve-month cycle summary for a doctor's appointment —
 *  a real route, like the Nutrition report, so Print/PDF gets a clean page. */
export const Route = createFileRoute("/cycle-report")({
  head: () => ({
    meta: [{ title: "Bloom - Cycle summary for your doctor" }],
  }),
  component: DoctorSummaryPage,
});
