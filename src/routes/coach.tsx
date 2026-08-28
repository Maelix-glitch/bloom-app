import { createFileRoute } from "@tanstack/react-router";

import coachCss from "../styles/coach.css?url";
import { CoachPage } from "@/components/coach/CoachPage";

export const Route = createFileRoute("/coach")({
  head: () => ({
    meta: [
      { title: "Bloom — Coach" },
      {
        name: "description",
        content: "A private, structured conversation space for your day.",
      },
    ],
    links: [
      { rel: "stylesheet", href: coachCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  component: CoachPage,
});
