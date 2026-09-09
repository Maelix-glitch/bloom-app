import { createFileRoute } from "@tanstack/react-router";

import coachCss from "../styles/coach.css?url";
import { CoachPage } from "@/components/coach/CoachPage";

export const Route = createFileRoute("/coach")({
  head: () => ({
    meta: [
      { title: "Bloom Coach — A second mind for your day" },
      {
        name: "description",
        content:
          "Bloom's personal AI companion — ask, reflect, plan or simply talk, grounded in what you've actually logged.",
      },
    ],
    links: [{ rel: "stylesheet", href: coachCss }],
  }),
  component: CoachPage,
});
