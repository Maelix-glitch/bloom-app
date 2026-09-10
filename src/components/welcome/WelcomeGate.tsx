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
import { useNavigate } from "@tanstack/react-router";

import { Welcome } from "@/components/welcome/Welcome";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useOnboarding } from "@/hooks/useOnboarding";
import { suggestedTrackers } from "@/lib/onboarding/profileKind";
import { setPref } from "@/lib/prefs";

export function WelcomeGate() {
  const { needsWelcome, finish, skipAsAdmin } = useOnboarding();
  const adminAccess = useAdminAccess();
  const navigate = useNavigate();

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
            onAdmin={(to) => {
              /*
               * This is the only place that writes `admin: true`. The button
               * that reaches it is already hidden unless the database granted
               * access; checking again here means no future caller can write
               * the flag without going through the same authority.
               */
              if (adminAccess.status !== "granted") return;
              /* Mark the mode first so the gate unmounts, then move — the
                 other order navigates underneath a full-screen overlay. */
              skipAsAdmin();
              if (to !== "/") void navigate({ to });
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}