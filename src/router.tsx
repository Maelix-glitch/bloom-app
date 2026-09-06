import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Fetch a route's code chunk as soon as a link to it is hovered/focused,
    // so the page is already in memory by the time it is clicked (the
    // "click → wait" on /mood → /mood/intelligence was the chunk download).
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  return router;
};
