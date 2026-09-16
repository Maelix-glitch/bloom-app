import { createFileRoute, Outlet } from "@tanstack/react-router";

import progressionCss from "../styles/progression.css?url";

/**
 * /rewards is the journey, and /rewards/atelier is its secondary layer
 * (looks opened by rank). Both share the progression stylesheet.
 */
export const Route = createFileRoute("/rewards")({
  head: () => ({
    meta: [{ title: "Bloom — Your Journey" }],
    links: [{ rel: "stylesheet", href: progressionCss }],
  }),
  component: RewardsLayout,
});

function RewardsLayout() {
  return <Outlet />;
}
