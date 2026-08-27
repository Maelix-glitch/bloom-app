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
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: RewardsAdminPage,
});