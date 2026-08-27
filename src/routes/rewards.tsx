import { createFileRoute } from "@tanstack/react-router";

import { RewardsPage } from "@/components/rewards/RewardsPage";

export const Route = createFileRoute("/rewards")({
  head: () => ({
    meta: [
      { title: "Bloom — Rewards" },
      {
        name: "description",
        content: "A private reward delivery space for rewards published to your account.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: RewardsPage,
});
