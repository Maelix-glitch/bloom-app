/**
 * Welcome — the first thirty seconds of Bloom.
 *
 * Four screens, one question each, all skippable:
 *
 *   1. **Hello** — what Bloom is, in one sentence. No question at all; the
 *      first screen of a setup flow should ask for nothing.
 *   2. **Shape** — does your Bloom include a cycle? This is the only question
 *      that changes the app's structure, so it gets its own screen and plain
 *      language: nobody is asked their gender, they're asked what they want to
 *      track. "Prefer not to say" is a real, safe answer.
 *   3. **Focus** — what they came for. Multi-select, entirely optional, used to
 *      pick sensible starting trackers instead of dumping all of them on.
 *   4. **Name** — offered, never required, then a short summary and in.
 *
 * There is a **Launch as admin** door on every screen: it accepts every default,
 * turns everything on and gets out of the way — for the person building this,
 * not for the person using it. It only renders for someone the database lists
 * in `public.app_admins` (see `useAdminAccess`); for everybody else the button
 * simply isn't there, rather than being present and refusing.
 *
 * The look follows a phone's own setup: a photograph drifting behind glass,
 * one enormous headline, a progress rail proving how short this is, and
 * forward/backward motion that carries the eye in the direction of travel.
 */

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Shield, Sparkles } from "lucide-react";

import { useSound } from "@/hooks/useSound";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { FOCUS_LABEL, type FocusArea, type ProfileKind } from "@/lib/onboarding/profileKind";
import { AdminPanel } from "@/components/welcome/AdminPanel";
import heroWindow from "@/assets/mood/hero-window.jpg";
import flowerBranch from "@/assets/mood/flower-branch.jpg";
import candle from "@/assets/mood/candle.jpg";
import mountainLake from "@/assets/mood/mountain-lake.jpg";
import "@/styles/welcome.css";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Each step gets its own photograph and accent, so progress is *felt*. */
const SCENES = [
  { art: heroWindow, accent: "var(--violet, #b9a4ff)" },
  { art: flowerBranch, accent: "#e0a9c8" },
  { art: candle, accent: "#e6b088" },
  { art: mountainLake, accent: "#8fb6d9" },
] as const;

const KINDS: Array<{ kind: ProfileKind; title: string; sub: string }> = [
  {
    kind: "cycle",
    title: "Yes — include my cycle",
    sub: "Phases, predictions and how they line up with everything else you track.",
  },
  {
    kind: "no-cycle",
    title: "No — leave that out",
    sub: "Habits, mood, sleep and focus. Cycle features stay hidden.",
  },
  {
    kind: "unspecified",
    title: "Prefer not to say",
    sub: "Everything stays available. You can change this whenever you like.",
  },
];

const FOCUS_SUB: Record<FocusArea, string> = {
  habits: "Small things, done often.",
  mood: "Notice the pattern behind the day.",
  sleep: "What you did, and how you woke up.",
  study: "Sessions, subjects, deep work.",
  movement: "Anything that gets you going.",
  cycle: "Phases and what they explain.",
};

export interface WelcomeProps {
  onFinish: (answer: { kind: ProfileKind; focus: FocusArea[]; name: string | null }) => void;
  /** Enter admin mode and navigate to `to`. */
  onAdmin: (to: string) => void;
}

export function Welcome({ onFinish, onAdmin }: WelcomeProps) {
  /* The admin door opens a launcher rather than skipping straight in — see
     AdminPanel for why picking a destination is the whole interaction. */
  const [adminOpen, setAdminOpen] = useState(false);
    /* Server-verified. `"checking"` and `"denied"` both mean "no door". */
  const adminAccess = useAdminAccess();
  const reduced = useReducedMotion();
  const { sound } = useSound();

  const [step, setStep] = useState(0);
  /** +1 forward, -1 back — so the slide leaves in the direction you came from. */
  const [dir, setDir] = useState(1);
  const [kind, setKind] = useState<ProfileKind | null>(null);
  const [focus, setFocus] = useState<FocusArea[]>([]);
  const [name, setName] = useState("");

  const scene = SCENES[Math.min(step, SCENES.length - 1)]!;

  const go = useCallback(
    (next: number) => {
      setDir(next > step ? 1 : -1);
      setStep(next);
      sound(next > step ? "navigate" : "close");
    },
    [step, sound],
  );

  const finish = useCallback(() => {
    sound("celebrate");
    onFinish({ kind: kind ?? "unspecified", focus, name: name.trim() || null });
  }, [focus, kind, name, onFinish, sound]);

  const toggleFocus = useCallback(
    (area: FocusArea) => {
      sound("tap");
      setFocus((prev) =>
        prev.includes(area) ? prev.filter((f) => f !== area) : [...prev, area],
      );
    },
    [sound],
  );

  /* The cycle option only makes sense to offer if they kept the cycle. */
  const areas = useMemo<FocusArea[]>(() => {
    const base: FocusArea[] = ["habits", "mood", "sleep", "study", "movement"];
    return kind === "no-cycle" ? base : [...base, "cycle"];
  }, [kind]);

  const canAdvance = step !== 1 || kind !== null;

  const slide = reduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2 },
      }
    : {
        initial: { opacity: 0, x: dir * 28 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: dir * -28 },
        transition: { duration: 0.45, ease: EASE },
      };

  return (
    <div
      className="wl"
      style={{ ["--wl-accent" as string]: scene.accent }}
      role="dialog"
      aria-modal="true"
      aria-label="Set up Bloom"
    >
      <div className="wl-art">
        <AnimatePresence mode="sync">
          <motion.img
            key={scene.art}
            src={scene.art}
            alt=""
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.2 : 1.1, ease: "easeInOut" }}
            style={{ position: "absolute", inset: 0 }}
          />
        </AnimatePresence>
      </div>
      <div className="wl-veil" />
      <div className="wl-glow" />

      <div className="wl-shell">
        <div className="wl-top">
          <div className="wl-rail" aria-hidden>
            {SCENES.map((_, i) => (
              <div
                key={i}
                className="wl-seg"
                style={{ ["--fill" as string]: i < step ? 1 : i === step ? 0.55 : 0 }}
              />
            ))}
          </div>
                    {/* The admin door exists only for someone Supabase lists as an admin.
              It is removed rather than disabled: a shield button that is always
              there and always refuses is a control that lies about itself. */}
          {adminAccess.status === "granted" && (
            <button
              type="button"
              className="wl-skip"
              onClick={() => {
                sound("open");
                setAdminOpen(true);
              }}
              aria-haspopup="dialog"
              aria-expanded={adminOpen}
            >
              <Shield size={12} style={{ display: "inline", marginRight: 6, marginTop: -2 }} />
              Launch as admin
            </button>
          )}
        </div>

        <div className="wl-body">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step} {...slide}>
              {step === 0 && (
                <>
                  <p className="wl-eyebrow">Welcome</p>
                  <h1 className="wl-title">
                    Bloom keeps the record.
                    <br />
                    You keep living.
                  </h1>
                  <p className="wl-sub">
                    Log a little each day and Bloom finds what actually moves your energy,
                    focus and mood. Three quick questions and it's yours.
                  </p>
                </>
              )}

              {step === 1 && (
                <>
                  <p className="wl-eyebrow">Step one</p>
                  <h1 className="wl-title">Should Bloom follow your cycle?</h1>
                  <p className="wl-sub">
                    Bloom can track a menstrual cycle alongside everything else. If that
                    isn't for you, those parts stay out of your way entirely.
                  </p>
                  <div className="wl-choices">
                    {KINDS.map((opt) => (
                      <button
                        key={opt.kind}
                        type="button"
                        className="wl-card"
                        data-on={kind === opt.kind}
                        onClick={() => {
                          sound("tap");
                          setKind(opt.kind);
                        }}
                      >
                        <span className="wl-card-orb">
                          <Sparkles size={18} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span className="wl-card-title">{opt.title}</span>
                          <span className="wl-card-sub" style={{ display: "block" }}>
                            {opt.sub}
                          </span>
                        </span>
                        <span className="wl-tick">
                          <Check size={13} strokeWidth={3} />
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <p className="wl-eyebrow">Step two</p>
                  <h1 className="wl-title">What brought you here?</h1>
                  <p className="wl-sub">
                    Pick any that fit — Bloom switches on the right trackers to start. You
                    can add or drop them at any time.
                  </p>
                  <div className="wl-choices">
                    {areas.map((area) => (
                      <button
                        key={area}
                        type="button"
                        className="wl-card"
                        data-on={focus.includes(area)}
                        onClick={() => toggleFocus(area)}
                      >
                        <span className="wl-card-orb">
                          <Sparkles size={18} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span className="wl-card-title">{FOCUS_LABEL[area]}</span>
                          <span className="wl-card-sub" style={{ display: "block" }}>
                            {FOCUS_SUB[area]}
                          </span>
                        </span>
                        <span className="wl-tick">
                          <Check size={13} strokeWidth={3} />
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
                    <span className="wl-seal-ring" />
                    <span className="wl-seal">
                      <Sparkles size={30} />
                    </span>
                  </div>
                  <p className="wl-eyebrow" style={{ textAlign: "center", marginTop: 18 }}>
                    Last one
                  </p>
                  <h1 className="wl-title" style={{ textAlign: "center" }}>
                    What should Bloom call you?
                  </h1>
                  <input
                    className="wl-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Optional"
                    maxLength={48}
                    autoComplete="given-name"
                    aria-label="Your name, optional"
                  />
                  <div className="wl-summary">
                    <div className="wl-summary-row">
                      <span>Cycle tracking</span>
                      <span>{kind === "no-cycle" ? "Hidden" : "Included"}</span>
                    </div>
                    <div className="wl-summary-row">
                      <span>Focus</span>
                      <span>
                        {focus.length
                          ? focus.map((f) => FOCUS_LABEL[f]).join(", ")
                          : "Everything, to start"}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="wl-foot">
          {step > 0 && (
            <button
              type="button"
              className="wl-back"
              onClick={() => go(step - 1)}
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <button
            type="button"
            className="wl-next"
            disabled={!canAdvance}
            onClick={() => (step === 3 ? finish() : go(step + 1))}
          >
            {step === 0 ? "Get started" : step === 3 ? "Enter Bloom" : "Continue"}
            <ArrowRight size={17} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {adminOpen && adminAccess.status === "granted" ? (
          <AdminPanel onLaunch={onAdmin} onClose={() => setAdminOpen(false)} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
