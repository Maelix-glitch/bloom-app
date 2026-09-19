import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Bloom — Privacy" },
      {
        name: "description",
        content:
          "What Bloom stores, where it lives, and the controls you keep. Written from what the code actually does.",
      },
    ],
  }),
  component: PrivacyRoute,
});

function PrivacyRoute() {
  return (
    <LegalPage
      title="Privacy, in plain words."
      updated="19 September 2026"
      intro="This page says what Bloom does with what you write into it. It is deliberately boring: your record is yours, the device holds it first, and nothing is sent anywhere you didn't ask for."
      sections={[
        {
          heading: "Your device is the default home",
          paras: [
            "Everything you log — habits and their ticks, mood check-ins, tracker days, cycle entries, coach conversations, settings — is written to this browser first, under keys that all begin with “bloom.”. If you never sign in, this browser is the only place your record exists, and clearing the browser's storage removes it completely.",
            "The app tells you on screen when it is in this mode (“Saving to this device only”), so you always know where your record lives.",
          ],
        },
        {
          heading: "Optional account sync",
          paras: [
            "If the instance you are using has a database configured and you sign in, your record syncs to your account so your other devices can share it. What syncs is exactly what you see in the one-tap export: habits, logs, mood entries and their context, tracker days, cycle records, preferences and coach notes — stored under your account id.",
            "Signing out stops the sync. Signing out on every device revokes every session at once — the control for that lives in Profile, under Sessions & devices.",
          ],
        },
        {
          heading: "Notifications stay yours",
          paras: [
            "Reminders are computed on your device and shown there. If you choose to enable push notifications, the app registers with a public key only, asks your browser's permission like any other site, and never sends a notification you didn't configure. You can test, mute, or remove them at any time from the same screen.",
          ],
        },
        {
          heading: "No ads, no trackers, no selling",
          paras: [
            "Bloom contains no advertising SDKs, no analytics SDKs and no tracking pixels, and nothing about your record is sold or shared with third parties. The page does load its typefaces from Google Fonts, which means Google can see the same basic request data (such as an IP address) any font host sees; no account data travels with those requests.",
          ],
        },
        {
          heading: "Your controls, in one place",
          paras: [
            "Export: one tap in Profile downloads your whole record as JSON, readable without the app.",
            "Erase this device: removes every bloom.* key from this browser, even when you are signed out.",
            "Erase account data: runs a database routine that deletes the rows keyed to you, and signs you out.",
            "Sign out on every device: revokes all sessions at once.",
          ],
        },
        {
          heading: "Honest estimates",
          paras: [
            "Cycle predictions, insights and correlations are computed from your own record, on your device, and are estimates — never medical advice and never shared outward. They exist to help you notice patterns, not to diagnose anything.",
          ],
        },
        {
          heading: "Changes",
          paras: [
            "When this page changes, the date above changes with it, and material changes are noted here rather than hidden. The app ships with this copy of the page, so you can always compare what it says against the code.",
          ],
        },
      ]}
    />
  );
}
