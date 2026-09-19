import { createFileRoute } from "@tanstack/react-router";

import { WeeklyReportPage } from "@/components/report/WeeklyReportPage";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Bloom — Weekly report" },
      {
        name: "description",
        content:
          "Your week, read back to you: mood, habits, sleep and cycle in one calm page, computed on-device.",
      },
    ],
  }),
  component: WeeklyReportPage,
});
