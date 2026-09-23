import { createFileRoute } from "@tanstack/react-router";
import { GhostPage } from "@/components/ghosts/GhostPage";

// @ts-ignore - file route generated at build
export const Route = createFileRoute("/duel/$code" as any)({
  component: GhostPage,
});
