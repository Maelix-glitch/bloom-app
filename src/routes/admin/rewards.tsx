import { createFileRoute } from "@tanstack/react-router";

import rewardsCss from "../../styles/rewards.css?url";
import { RewardsAdminPage } from "@/components/rewards/RewardsAdminPage";

export const Route = createFileRoute("/admin/rewards")({
  head: () => ({
    meta: [
      { title: "Bloom — Reward Admin" },
      {
        name: "description",
        content: "Create and publish private rewards to selected Bloom users.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: rewardsCss,
      },
      /* The per-route Cormorant Garamond load was removed in U1: routes
         use the root three-family system (Fraunces / Inter / IBM Plex Mono). */
    ],
  }),
  component: RewardsAdminPage,
});