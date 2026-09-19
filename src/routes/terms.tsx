import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Bloom — Terms" },
      {
        name: "description",
        content:
          "The short, honest terms of using Bloom: a personal journal with estimates, not medical advice; your data stays yours.",
      },
    ],
  }),
  component: TermsRoute,
});

function TermsRoute() {
  return (
    <LegalPage
      title="Terms, without the thicket."
      updated="19 September 2026"
      intro="Bloom is a personal wellbeing journal with gentle pattern-finding. These terms are short because the arrangement is simple: you keep your data, we keep our promises, and the app never pretends to be something it isn't."
      sections={[
        {
          heading: "What Bloom is",
          paras: [
            "A private record of your days — habits, mood, sleep, movement, cycle — plus estimates computed from that record on your device: cycle forecasts, weekly reports, correlations and insights.",
            "Bloom is not a medical device and gives no medical, diagnostic or therapeutic advice. Cycle forecasts are statistical estimates that can be wrong; insights describe patterns in your own logs, not facts about your health. For anything that matters clinically, talk to a professional.",
          ],
        },
        {
          heading: "Your data stays yours",
          paras: [
            "You own everything you write into Bloom. You can export it as JSON at any time, erase the device copy at any time, and erase the account copy at any time — all from Profile. Using Bloom requires no surrender of rights to your own record.",
          ],
        },
        {
          heading: "Using an invited instance",
          paras: [
            "Some Bloom deployments are invite-only. An invitation is personal: don't share sign-in links, and don't try to reach data that isn't yours. Accounts that attempt to access other people's records, or to abuse the sync infrastructure, can be removed by whoever operates the instance.",
          ],
        },
        {
          heading: "No warranty, plainly",
          paras: [
            "Bloom is provided as-is. Estimates may be inaccurate, sync may fail, and a browser can lose local data — which is exactly why the export exists. To the maximum extent the law allows, the app and its operators are not liable for decisions made on the strength of an estimate.",
          ],
        },
        {
          heading: "If you're struggling",
          paras: [
            "Bloom can notice that your weeks are heavy, but it is not a crisis service. If you are in distress, please contact local emergency services or a crisis line you trust; your journal can wait, you can't.",
          ],
        },
        {
          heading: "Changes",
          paras: [
            "Terms change rarely, and when they do the date above moves and the change is summarised here. Continued use after a change is acceptance of the new terms; the previous arrangement — your data stays yours — never changes.",
          ],
        },
      ]}
    />
  );
}
