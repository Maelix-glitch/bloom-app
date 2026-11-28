import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Bloom - Terms" },
      {
        name: "description",
        content:
          "The honest terms of using Bloom: plans, prices, renewal, AI credits, and a health companion that is not a doctor.",
      },
    ],
  }),
  component: TermsRoute,
});

function TermsRoute() {
  return (
    <LegalPage
      title="Terms, without the thicket."
      updated="28 November 2026"
      intro="Bloom is a personal health companion, nutrition, habits, activity, sleep and cycle tracking, with two AI companions, Coach and Vitalis. These terms are the whole arrangement: you keep your data, we keep our promises, and the app never pretends to be something it isn't."
      sections={[
        {
          heading: "What Bloom is, and is not",
          paras: [
            "Bloom keeps a private record of your days and works out patterns and plans from it: meal plans from your assessment, cycle forecasts, weekly reports, insights.",
            "Bloom is not a doctor and is not a medical device. It does not diagnose anything, and its estimates, a photo's nutrition, a forecast date, a calorie target, are labelled estimates that can be wrong. For anything that matters medically, talk to a professional.",
          ],
        },
        {
          heading: "Who can use Bloom",
          paras: [
            "Bloom is for adults: you must be 18 or over to use it. You are responsible for your account and for keeping your sign-in link private, anyone holding the link can open your account, so treat it like a key.",
            "Bloom is currently invite-only, and an invitation is personal: please don't share sign-in links, and don't try to reach a record that isn't yours.",
          ],
        },
        {
          heading: "Your data stays yours",
          paras: [
            "You own everything you write into Bloom. You can export it at any time and erase it at any time, the Privacy page describes the controls. Using Bloom gives us no rights over your record beyond running the service for you.",
          ],
        },
        {
          heading: "Plans and prices",
          paras: [
            "Bloom is free to use, with a monthly taste of the AI features. Premium is ₹599 a month or ₹4,999 a year. Premium Plus is ₹999 a month or ₹9,999 a year. Outside India, Premium is $9.99 a month or $59.99 a year, and Premium Plus is $14.99 a month or $89.99 a year. The amount shown at checkout is the amount you pay.",
          ],
        },
        {
          heading: "Renewal and cancellation",
          paras: [
            "Paid plans renew automatically at the end of each period, month or year, until you cancel. You can cancel at any time: cancellation stops the next renewal, and your plan stays active until the current period ends. After that, your account returns to Free.",
            "Payments are processed by Razorpay; Bloom never sees or stores your card or UPI details. Refunds follow the Refund policy page.",
          ],
        },
        {
          heading: "AI credits",
          paras: [
            "Each plan carries a monthly allowance of AI credits: 20 on Free, 300 on Premium, 800 on Premium Plus. Credits are spent when you use AI features. At the start of each period your balance is topped up to your plan's allowance; credits bought in a pack stay in your balance until they are used.",
            "Credits are a feature allowance, not money: they have no cash value, and they cannot be transferred, exchanged or redeemed.",
          ],
        },
        {
          heading: "Acceptable use",
          paras: [
            "Use Bloom for your own record. Don't try to access another person's data, interfere with the service, or use Bloom for anything unlawful. Accounts that do can be removed.",
          ],
        },
        {
          heading: "No warranty, plainly",
          paras: [
            "Bloom is provided as-is. Estimates may be inaccurate and sync may fail, which is exactly why the export exists. To the maximum extent the law allows, Bloom is not liable for decisions made on the strength of an estimate. Nothing in these terms takes away rights the law gives you.",
          ],
        },
        {
          heading: "If you're struggling",
          paras: [
            "Bloom can notice that your weeks are heavy, but it is not a crisis service. If you are in distress, please contact local emergency services or a crisis line you trust; your journal can wait, you can't.",
          ],
        },
        {
          heading: "Content you upload, and copyright",
          paras: [
            "Photos and other content you add to Bloom stay yours, and you must have the right to add them. Bloom only holds them to run the service for you.",
            "If you believe content in Bloom infringes your copyright, write to our Grievance Officer (below) saying what the work is, where it appears in Bloom, and how to reach you. We review every such notice and remove content that infringes, as the Copyright Act, 1957 and the Information Technology Act, 2000 provide.",
          ],
        },
        {
          heading: "Ownership",
          paras: [
            "The Bloom name, design and software belong to Bloom Vitalis. Your record belongs to you, see above.",
          ],
        },
        {
          heading: "Grievance officer and who runs Bloom",
          paras: [
            "Bloom Vitalis is run by Said Ali, trading as Bloom Vitalis, from Varkala, Thiruvananthapuram, Kerala, India.",
            "Our Grievance Officer under the Information Technology Act, 2000 and the rules made under it is Said Ali. Write to maelix67@gmail.com with “Grievance” in the subject. We acknowledge a grievance within 24 hours and resolve it within 15 days, the timelines the rules set. The same address reaches us for support, billing and copyright notices.",
          ],
        },
        {
          heading: "Law and changes",
          paras: [
            "These terms are governed by the laws of India. When they change, the date above moves and the change is summarised here. Continued use after a change is acceptance of the new terms; the first arrangement, your data stays yours, never changes.",
          ],
        },
      ]}
    />
  );
}
