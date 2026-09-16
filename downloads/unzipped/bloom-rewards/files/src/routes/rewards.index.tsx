import { createFileRoute } from "@tanstack/react-router";

import { JourneyPage } from "@/components/progression/page";

export const Route = createFileRoute("/rewards/")({
  head: () => ({
    meta: [
      { title: "Bloom — Your Journey" },
      {
        name: "description",
        content:
          "Goals, Bloom Points, ranks and achievements — your progress at Bloom, earned from the habits and records you actually keep.",
      },
    ],
  }),
  component: JourneyPage,
});
