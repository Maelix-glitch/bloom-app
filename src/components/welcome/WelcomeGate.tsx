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
 *
 * Three runs come through this gate (M-182), in this order of precedence:
 *
 *   · **First** — never answered. The flow as it has always been: no
 *     pre-fill, no exit, and the starting trackers are applied on finish.
 *   · **Re-run** — answered an older Welcome (`welcomeRerunDue`). The flow
 *     opens pre-filled with the stored answers and gains a "Not now" exit,
 *     which stamps the current version as seen and writes nothing else.
 *     Finishing writes the answers the person actually has or chose —
 *     the onboarding record is the only thing a run can ever write, and
 *     the first run's starting-tracker application does NOT repeat: a
 *     re-run must never re-apply setup over a Bloom the person has
 *     since shaped themselves.
 *   · **Replay** — asked for from Profile ("See the welcome again"),
 *     arriving on the replay bus (lib/welcome/replayRequest). Same dress
 *     as the re-run, but nothing is owed: the exit just closes, and the
 *     version stamp neither needs nor gets a change either way.
 *
 * The name a re-run or replay opens with is `welcomeInitialName`
 * (M-185): the record's own name when it has one, else the account's
 * profile display name — the rail identity's read of the same profiles
 * row Profile shows. A record older than the name question has no name
 * to pre-fill, and opening the new Welcome to an empty field on an
 * account that plainly HAS a name ("Maelix", in the owner's case) read
 * as if Bloom had forgotten him. Because Welcome takes its name from
 * `initial` once, at mount, a re-run with no stored name waits for the
 * rail identity to settle before it mounts — the same no-flash
 * patience the gate already keeps for hydration. A first run never
 * waits and never pre-fills: there is no profile name yet to fall
 * back to, and its behaviour is byte-identical to before.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

import { Welcome } from "@/components/welcome/Welcome";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useRailIdentity } from "@/hooks/useRailIdentity";
import { suggestedTrackers, welcomeInitialName } from "@/lib/onboarding/profileKind";
import { setPref } from "@/lib/prefs";
import { onWelcomeReplayRequest } from "@/lib/welcome/replayRequest";

type WelcomeRun = "first" | "rerun" | "replay";

export function WelcomeGate() {
  const { needsWelcome, needsWelcomeRerun, state, finish, skipAsAdmin, markWelcomeSeen } =
    useOnboarding();
  const adminAccess = useAdminAccess();
  /* The account's profile display name, from the rail identity — the
     same read of the profiles row that Profile's own header shows.
     Only ever a FALLBACK for the re-run's name field (M-185): the
     record's stored name wins, and a first run never looks here. */
  const rail = useRailIdentity();
  const navigate = useNavigate();
  /* A replay asked for from Profile. Session-only state, like the bus
     that carries it: it opens the Welcome here, now, and is forgotten. */
  const [replayAsked, setReplayAsked] = useState(false);
  useEffect(() => onWelcomeReplayRequest(() => setReplayAsked(true)), []);
  /* Legal pages are public by definition: someone reading the privacy page
     must never be covered by onboarding first. */
  const onLegalPage = useRouterState({
    select: (s) =>
      s.location.pathname === "/privacy" ||
      s.location.pathname === "/terms" ||
      s.location.pathname === "/refund" ||
      s.location.pathname === "/contact",
  });

  const mode: WelcomeRun | null = needsWelcome
    ? "first"
    : needsWelcomeRerun
      ? "rerun"
      : replayAsked
        ? "replay"
        : null;

  /* The name the run opens with (M-185): the record's, or — only when
     the record has none — the profile's. Welcome reads `initial` once
     at mount, so a re-run that still needs the profile's answer waits
     for the rail identity to settle rather than mounting empty and
     staying empty. Signed-in is the only state that can offer a name;
     every other settled state simply means the field opens empty. */
  const initialName =
    mode === "first" || mode === null
      ? null
      : welcomeInitialName(state.name, rail.status === "signed-in" ? rail.displayName : null);
  const awaitingProfileName =
    (mode === "rerun" || mode === "replay") && !state.name && rail.status === "checking";

  return (
    <AnimatePresence>
      {mode !== null && !onLegalPage && !awaitingProfileName && (
        <motion.div
          key="welcome"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: "fixed", inset: 0, zIndex: 3000 }}
        >
          <Welcome
            initial={
              mode === "first"
                ? undefined
                : { sex: state.sex, kind: state.kind, focus: state.focus, name: initialName }
            }
            onExit={
              mode === "first"
                ? undefined
                : mode === "rerun"
                  ? () => {
                      markWelcomeSeen();
                      setReplayAsked(false);
                    }
                  : () => setReplayAsked(false)
            }
            onFinish={(answer) => {
              /* The starting trackers are a FIRST-run application only
                 (M-182): on a re-run or replay the person has long since
                 shaped their own Bloom, and setup must not be re-applied
                 over it. The onboarding record itself is written in
                 every run — with the answers the run actually produced,
                 and the current version stamped by `finish`. */
              if (mode === "first") {
                const suggested = suggestedTrackers(answer.focus);
                if (suggested.length > 0) setPref("onboarding.suggestedTrackers", suggested);
              }
              finish(answer);
              /* Any run ending also settles a replay request: Profile is
                 unreachable while the gate covers the app, so a request
                 can only be live in replay mode — but a queued one must
                 never reopen the Welcome behind a finished run. */
              setReplayAsked(false);
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
              setReplayAsked(false);
              if (to !== "/") void navigate({ to });
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
