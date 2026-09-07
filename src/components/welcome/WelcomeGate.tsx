/**
 * WelcomeGate — decides whether the welcome flow is in the way.
 *
 * Mounted once at the root, above every route. Three things it is careful
 * about:
 *
 *   · **No flash.** The answer lives in localStorage, which the server render
 *     can't see, so the gate renders nothing until `hydrated`. A returning
 *     user never glimpses the welcome screen.
 *   · **No trap.** It only covers the app; it doesn't redirect. Whatever route
 *     someone landed on is still there when they finish.
 *   · **It leaves.** On finish it also applies the starting trackers implied by
 *     their answers, so screen one already looks set up for them.
 */

import { AnimatePresence, motion } from "motion/react";

import { Welcome } from "@/components/welcome/Welcome";
import { useOnboarding } from "@/hooks/useOnboarding";
import { suggestedTrackers } from "@/lib/onboarding/profileKind";
import { setPref } from "@/lib/prefs";

export function WelcomeGate() {
  const { needsWelcome, finish, skipAsAdmin } = useOnboarding();

  return (
    <AnimatePresence>
      {needsWelcome && (
        <motion.div
          key="welcome"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: "fixed", inset: 0, zIndex: 3000 }}
        >
          <Welcome
            onFinish={(answer) => {
              const suggested = suggestedTrackers(answer.focus);
              if (suggested.length > 0) setPref("onboarding.suggestedTrackers", suggested);
              finish(answer);
            }}
            onAdmin={skipAsAdmin}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
