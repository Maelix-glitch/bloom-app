/**
 * Welcome — the first thirty seconds of Bloom.
 *
 * Four screens, one question each, all skippable:
 *
 *   1. **Hello** — what Bloom is, in one sentence. No question at all; the
 *      first screen of a setup flow should ask for nothing.
 *   2. **You** — Male or Female, with "prefer not to say" sitting apart below
 *      them. This is the only question that changes the app's structure: the
 *      answer decides whether Bloom's cycle is part of this person's Bloom at
 *      all. Asked once, never again.
 *   3. **Focus** — what they came for. Multi-select, entirely optional, used to
 *      pick sensible starting trackers instead of dumping all of them on.
 *   4. **Name** — offered, never required, then a short recap and in.
 *
 * There is a **Launch as admin** door on every screen. It only renders for
 * someone the database lists in `public.app_admins` (see `useAdminAccess`); for
 * everybody else the button isn't there at all, rather than being present and
 * refusing.
 *
 * On look: this used to put a different blurred photograph behind glass on
 * every screen, with the type on top. It borrowed its mood from a stock image
 * and the picture always fought the question. The atmosphere is now one soft
 * accent bloom and a lot of air, and the screens are differentiated by their
 * type rather than by a scene.
 */

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Shield } from "lucide-react";

import { useSound } from "@/hooks/useSound";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import {
  FOCUS_LABEL,
  type FocusArea,
  type ProfileKind,
  type SexAnswer,
} from "@/lib/onboarding/profileKind";
import { AdminPanel } from "@/components/welcome/AdminPanel";
import "@/styles/welcome.css";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Four questions, so four segments in the rail. */
const STEP_COUNT = 4;

/**
 * One accent for the whole flow.
 *
 * Each screen used to take a colour from its photograph. With the photographs
 * gone, a colour that changes for no reason reads as arbitrary — so the flow
 * holds one accent and lets the type carry the change between screens.
 */
const ACCENT = "var(--violet, #b9a4ff)";

/**
 * The first real question: Male or Female.
 *
 * Three deliberate choices about how this is presented:
 *
 *   · **Both answers get the same card and the same accent.** A pink option
 *     next to a blue one would make the choice read as picking a theme rather
 *     than answering a question.
 *   · **The consequence is stated, not implied.** Someone choosing Male is told
 *     the cycle won't be there — that is the reason the question exists, and
 *     hiding it behind "we'll personalise your experience" would be the app
 *     deciding something on their behalf without saying so.
 *   · **"Prefer not to say" sits apart**, because it isn't a third kind of
 *     person, it is declining the question. It keeps everything available.
 */
const SEXES: Array<{ sex: SexAnswer; title: string; sub?: string; kind: ProfileKind }> = [
  {
    sex: "female",
    title: "Female",
    sub: "Bloom includes cycle tracking. You can turn it off at any time.",
    kind: "cycle",
  },
  {
    sex: "male",
    title: "Male",
    sub: "Bloom leaves the cycle out entirely — no entry, no widgets, no prompts.",
    kind: "no-cycle",
  },
  {
    sex: "unspecified",
    title: "Prefer not to say",
    kind: "unspecified",
  },
];

/** The last entry is the decline, so it renders below a divider. */
const SEX_CHOICES = SEXES.slice(0, -1);
const SEX_DECLINE = SEXES.at(-1)!;

const FOCUS_SUB: Record<FocusArea, string> = {
  habits: "Small things, done often.",
  mood: "Notice the pattern behind the day.",
  sleep: "What you did, and how you woke up.",
  study: "Sessions, subjects, deep work.",
  movement: "Anything that gets you going.",
  cycle: "Phases and what they explain.",
};

export interface WelcomeProps {
  onFinish: (answer: {
    kind: ProfileKind;
    /** The question behind `kind`, so Settings can show it without inferring. */
    sex: SexAnswer;
    focus: FocusArea[];
    name: string | null;
  }) => void;
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
  /* One piece of state, not two: the answer *is* the capability. Deriving
     `kind` at the point of answering is what stops the two ever disagreeing. */
  const [answer, setAnswer] = useState<(typeof SEXES)[number] | null>(null);
  const [focus, setFocus] = useState<FocusArea[]>([]);
  const [name, setName] = useState("");

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
    onFinish({
      kind: answer?.kind ?? "unspecified",
      sex: answer?.sex ?? null,
      focus,
      name: name.trim() || null,
    });
  }, [answer, focus, name, onFinish, sound]);

  const toggleFocus = useCallback(
    (area: FocusArea) => {
      sound("tap");
      setFocus((prev) => (prev.includes(area) ? prev.filter((f) => f !== area) : [...prev, area]));
    },
    [sound],
  );

  /* The cycle option only makes sense to offer if they kept the cycle. */
  const areas = useMemo<FocusArea[]>(() => {
    const base: FocusArea[] = ["habits", "mood", "sleep", "study", "movement"];
    return answer?.kind === "no-cycle" ? base : [...base, "cycle"];
  }, [answer]);

  const canAdvance = step !== 1 || answer !== null;

  const slide = reduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2 },
      }
    : {
        initial: { opacity: 0, x: dir * 24 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: dir * -24 },
        transition: { duration: 0.42, ease: EASE },
      };

  return (
    <div
      className="wl"
      style={{ ["--wl-accent" as string]: ACCENT }}
      role="dialog"
      aria-modal="true"
      aria-label="Set up Bloom"
    >
      <div className="wl-glow" aria-hidden />

      <div className="wl-shell">
        <div className="wl-top">
          <div className="wl-rail" aria-hidden>
            {Array.from({ length: STEP_COUNT }, (_, i) => (
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
              <Shield size={11} style={{ display: "inline", marginRight: 6, marginTop: -2 }} />
              Admin
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
                    Log a little each day and Bloom finds what actually moves your energy, focus and
                    mood. Three quick questions and it's yours.
                  </p>
                </>
              )}

              {step === 1 && (
                <>
                  <p className="wl-eyebrow">Step one</p>
                  <h1 className="wl-title">Which best describes you?</h1>
                  <p className="wl-sub">
                    Bloom tracks a menstrual cycle for the people who have one. This answer decides
                    whether that part of the app is there at all — asked once, and changeable later
                    from Settings.
                  </p>
                  <div className="wl-choices">
                    {SEX_CHOICES.map((opt) => (
                      <button
                        key={opt.title}
                        type="button"
                        className="wl-card"
                        data-on={answer?.sex === opt.sex}
                        aria-pressed={answer?.sex === opt.sex}
                        onClick={() => {
                          sound("tap");
                          setAnswer(opt);
                        }}
                      >
                        <span className="wl-radio" aria-hidden />
                        <span className="wl-card-text">
                          <span className="wl-card-title">{opt.title}</span>
                          {opt.sub ? <span className="wl-card-sub">{opt.sub}</span> : null}
                        </span>
                      </button>
                    ))}

                    <div className="wl-choices-divider" aria-hidden />

                    <button
                      type="button"
                      className="wl-card wl-card--decline"
                      data-on={answer?.sex === SEX_DECLINE.sex}
                      aria-pressed={answer?.sex === SEX_DECLINE.sex}
                      onClick={() => {
                        sound("tap");
                        setAnswer(SEX_DECLINE);
                      }}
                    >
                      <span className="wl-radio" aria-hidden />
                      <span className="wl-card-text">
                        <span className="wl-card-title">{SEX_DECLINE.title}</span>
                      </span>
                    </button>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <p className="wl-eyebrow">Step two</p>
                  <h1 className="wl-title">What brought you here?</h1>
                  <p className="wl-sub">
                    Pick any that fit — Bloom switches on the right trackers to start. You can add
                    or drop them at any time.
                  </p>
                  <div className="wl-choices">
                    {areas.map((area) => {
                      const on = focus.includes(area);
                      return (
                        <button
                          key={area}
                          type="button"
                          className="wl-card"
                          data-on={on}
                          aria-pressed={on}
                          onClick={() => toggleFocus(area)}
                        >
                          <span className="wl-check" aria-hidden>
                            <Check size={11} strokeWidth={3.4} />
                          </span>
                          <span className="wl-card-text">
                            <span className="wl-card-title">{FOCUS_LABEL[area]}</span>
                            <span className="wl-card-sub">{FOCUS_SUB[area]}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <p className="wl-eyebrow">Last one</p>
                  <h1 className="wl-title">What should Bloom call you?</h1>
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
                      <span>Cycle</span>
                      <span>{answer?.kind === "no-cycle" ? "Left out" : "Included"}</span>
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
            onClick={() => (step === STEP_COUNT - 1 ? finish() : go(step + 1))}
          >
            {step === 0 ? "Get started" : step === STEP_COUNT - 1 ? "Enter Bloom" : "Continue"}
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
