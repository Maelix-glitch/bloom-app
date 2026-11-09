import { createFileRoute } from "@tanstack/react-router";

import { AtelierPage } from "@/components/progression/Atelier";

/** The secondary layer: looks opened by rank, never a shop. */
export const Route = createFileRoute("/rewards/atelier")({
  head: () => ({
    meta: [
      { title: "Bloom — Atelier" },
      {
        name: "description",
        content: "The looks your rank has opened, and the ones still ahead.",
      },
    ],
  }),
  component: AtelierPage,
});
