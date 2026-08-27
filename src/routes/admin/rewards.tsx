import { createFileRoute } from "@tanstack/react-router";

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
  }),
  component: RewardsAdminPage,
});
