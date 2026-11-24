import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Bloom - Refund policy" },
      {
        name: "description",
        content:
          "Bloom's refund policy, plainly stated: failed and duplicate charges are always refunded in full; first purchases within 7 days; renewals and timing, honestly.",
      },
    ],
  }),
  component: RefundRoute,
});

function RefundRoute() {
  return (
    <LegalPage
      title="Refunds, plainly stated."
      updated="19 November 2026"
      intro="Paid plans are processed by Razorpay. This page is the whole refund policy, short, because it is meant to be used, not decoded. To ask for a refund, email maelix67@gmail.com from your account email."
      sections={[
        {
          heading: "Failed or duplicate charges",
          paras: [
            "If a payment fails after money has left your account, or you are charged twice for the same purchase, the charge is refunded in full, automatically. You do not need to ask, but if you notice it first, email us and we will chase it.",
          ],
        },
        {
          heading: "Your first purchase",
          paras: [
            "If Bloom is not for you, a first purchase can be refunded within 7 days of the payment. Email maelix67@gmail.com and ask, that is all it takes.",
          ],
        },
        {
          heading: "Renewals",
          paras: [
            "A renewal charge is not refundable once the new period has begun, except where the law requires a refund. Cancelling stops future renewals; it does not undo a period that has already started. Either way, your plan stays active until the period ends.",
          ],
        },
        {
          heading: "How refunds reach you",
          paras: [
            "Approved refunds go back to the payment method you paid with, the same card, UPI or bank account, through Razorpay, within 5-7 business days of approval. We cannot send a refund to a different method.",
          ],
        },
      ]}
    />
  );
}
