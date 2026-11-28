import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Bloom - Contact" },
      {
        name: "description",
        content:
          "How to reach Bloom Vitalis: one email address for support, billing, privacy and grievances.",
      },
    ],
  }),
  component: ContactRoute,
});

function ContactRoute() {
  return (
    <LegalPage
      title="Talk to Bloom."
      updated="28 November 2026"
      intro="Bloom Vitalis is a personal health companion, nutrition, habits, sleep and cycle tracking with an AI coach, made in India, for adults everywhere. It is a small, independent product, and support is handled by the same people who build it."
      sections={[
        {
          heading: "Email us",
          paras: [
            "maelix67@gmail.com, for support, billing questions, privacy requests and everything else. Support replies come from this same address; if a reply seems to come from anywhere else, it isn't us.",
          ],
        },
        {
          heading: "What to include",
          paras: [
            "For account or payment questions, write from your account email and say which plan and which date are involved, that is usually all we need to find the record. Never send card or UPI details by email; Bloom never asks for them.",
          ],
        },
        {
          heading: "Grievances",
          paras: [
            "Our Grievance Officer is Said Ali. For a privacy or data grievance under the DPDP Act, or a complaint under the Information Technology Act, write to maelix67@gmail.com with “Grievance” in the subject. We acknowledge a grievance within 24 hours and resolve it within 15 days. The Privacy page sets out your rights, and how export and erasure work.",
          ],
        },
      ]}
    />
  );
}
