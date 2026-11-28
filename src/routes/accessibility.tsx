import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/accessibility")({
  head: () => ({
    meta: [
      { title: "Bloom - Accessibility" },
      {
        name: "description",
        content:
          "How Bloom is built to be usable by everyone, where it still falls short, and how to tell us when something blocks you.",
      },
    ],
  }),
  component: AccessibilityRoute,
});

function AccessibilityRoute() {
  return (
    <LegalPage
      title="Accessibility, stated plainly."
      updated="28 November 2026"
      intro="Bloom is a health record, and a health record that someone cannot operate is a record they cannot keep. This page says what Bloom does today to be usable by everyone, where it still falls short, and how to reach us when something blocks you. It claims only what the app actually does."
      sections={[
        {
          heading: "What Bloom does today",
          paras: [
            "Controls are real buttons, fields and switches, not pictures of them, so a keyboard can reach them in order and a screen reader can name them. The control you are on is visibly outlined.",
            "If your device asks for reduced motion, Bloom calms its animation. Text is set at sizes that scale with your device's text settings, and the palette's contrast is checked by automated guards every time the app is built.",
            "Photographs of food carry the dish's name as their text description, and the day's important numbers are always present as text, never only as a picture or a chart.",
          ],
        },
        {
          heading: "Where we know we fall short",
          paras: [
            "Bloom is a visual app. Its charts and flower visualisations carry text summaries, but some decorative animation has no spoken equivalent, and a specialist accessibility audit has not yet been done. Both are on our list, and this page will say so until they are closed.",
          ],
        },
        {
          heading: "If something blocks you",
          paras: [
            "Tell us. Write to maelix67@gmail.com and say what you were trying to do and what got in the way; we treat an accessibility block as a bug, with the same seriousness as a wrong number. If it is a grievance, our Grievance Officer, Said Ali, answers at the same address, acknowledging within 24 hours and resolving within 15 days.",
          ],
        },
      ]}
    />
  );
}
