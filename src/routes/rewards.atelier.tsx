import { createFileRoute } from "@tanstack/react-router";

import { AtelierPage } from "@/components/progression/Atelier";

/** The secondary layer: looks opened by rank, never a shop. */
export const Route = createFileRoute("/rewards/atelier")({
  head: () => ({
    meta: [
      { title: "Bloom — Your Bloom Atelier" },
      {
        name: "description",
        content: "Looks opened by your ranks — the quiet second layer of the Bloom journey.",
      },
    ],
  }),
  component: AtelierPage,
});
