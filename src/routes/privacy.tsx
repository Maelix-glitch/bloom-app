import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Bloom - Privacy" },
      {
        name: "description",
        content:
          "What Bloom stores, where it lives, and the controls you keep, in plain words, written from what the code actually does.",
      },
    ],
  }),
  component: PrivacyRoute,
});

function PrivacyRoute() {
  return (
    <LegalPage
      title="Privacy, in plain words."
      updated="28 November 2026"
      intro="This page says what Bloom does with what you write into it. Bloom Vitalis is a personal health companion, and the arrangement is simple: your record is yours, it lives on your device first, it syncs to your account only when you sign in, and it is never sold."
      sections={[
        {
          heading: "Who is responsible",
          paras: [
            "Bloom is run by Bloom Vitalis, from Varkala, Thiruvananthapuram, Kerala, India. For anything about your data, a question, a correction, a complaint, write to maelix67@gmail.com.",
            "Our Grievance Officer under India's Digital Personal Data Protection Act, 2023 (the DPDP Act) and the Information Technology Act, 2000 is Said Ali, reachable at the same address, maelix67@gmail.com, with “Grievance” in the subject. We acknowledge a grievance within 24 hours and resolve it within 15 days.",
          ],
        },
        {
          heading: "What Bloom holds",
          paras: [
            "Your account email, it is how you sign in. And the record you build: food logs and nutrition, habits, activity, sleep, cycle logs, body measurements, mood check-ins and your assessment answers.",
            "Photos only when you choose a photo feature, for example, asking for an estimate of a meal. Preferences and settings live on your device. If you never sign in, your record stays on this device only, and the app tells you so on screen.",
          ],
        },
        {
          heading: "Where it lives",
          paras: [
            "Entries are written to your device first. When you sign in, they sync to your account in our database, hosted with Supabase, so your devices share one record; the app itself is served through Cloudflare.",
            "Signing out stops the sync. You can also sign out on every device at once from Settings, which revokes every session together.",
          ],
        },
        {
          heading: "The AI features",
          paras: [
            "Bloom has two AI companions, Coach and Vitalis. When you use them, only the content needed for that reply is sent to our AI providers, your message and the parts of your record the reply depends on. A photo you send for an estimate goes to the AI provider for that estimate, and when a reply is spoken aloud, its text goes to ElevenLabs, which provides the voice.",
            "AI answers are conversation and estimates, labelled as estimates where numbers are involved, never a diagnosis.",
          ],
        },
        {
          heading: "Cycle data is sensitive",
          paras: [
            "Cycle records are among the most personal data in Bloom, and they are treated that way: part of your private record, covered by the same controls as everything else, never sold and never used for advertising. Cycle forecasts are estimates computed from your own record. They can be wrong, and they are not medical advice.",
          ],
        },
        {
          heading: "Payments",
          paras: [
            "Paid plans are processed by Razorpay. Bloom never sees or stores your card or UPI details. Razorpay handles them. What we keep is the billing record: your plan, its status, and the current period.",
          ],
        },
        {
          heading: "No selling, no ad trackers",
          paras: [
            "Your data is never sold, and Bloom carries no advertising trackers. Two narrow exceptions, both in the open: if the app itself breaks, it may send a technical error report, the error message and the screen it happened on, with addresses and sign-in tokens stripped out, so the fault can be fixed; it never includes your health entries. And if you search for a GIF or sticker in Stories, your search words go to Giphy, which provides that library.",
            "If you turn on push reminders, your browser registers a public key so notifications can reach this device. Reminders are ones you configured, and you can mute or remove them at any time.",
          ],
        },
        {
          heading: "Your rights",
          paras: [
            "Export: one tap in the app downloads your whole record as a file you can read without Bloom.",
            "Correction: most of your record is editable in the app. For anything you cannot change there, email us and we will correct it.",
            "Erasure: “Erase everything” in the app deletes your account data, and erasing the device removes the copy held in this browser.",
            "Grievances: write to maelix67@gmail.com, the same address as above, and we will take it up.",
          ],
        },
        {
          heading: "Adults only",
          paras: [
            "Bloom is for adults, 18 and over, and we do not knowingly collect data from children. Bloom asks your age in the Assessment before it builds any plan, and it will not build a calorie plan for anyone under 18. If you believe a child's data is in Bloom, email us and we will remove it.",
          ],
        },
        {
          heading: "Security, without overclaiming",
          paras: [
            "Sign-in is by an emailed link, there is no Bloom password to steal. Data travels over encrypted connections, and each account's record is fenced off from every other account's. No system is perfect, which is one more reason the export exists: your record is never trapped inside Bloom.",
            "If a data breach ever affects your record, we will tell you what happened and notify the Data Protection Board of India, as the DPDP Act requires.",
          ],
        },
        {
          heading: "Changes",
          paras: [
            "When this page changes, the date above changes with it, and material changes are summarised here rather than hidden.",
          ],
        },
      ]}
    />
  );
}
