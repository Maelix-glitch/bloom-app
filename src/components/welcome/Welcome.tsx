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
 *      Under the recap sits one optional extra (M-171): "Have a trainer
 *      code?" — a code an admin-granted trainer gave them. Entering one
 *      links the account to that trainer server-side; leaving it empty
 *      changes nothing, and a wrong code is one gentle line, never a
 *      locked door.
 *
 * The flow is versioned (M-182): when `WELCOME_VERSION` moves past the
 * version stamped on a finished record, the gate runs this same flow
 * once more — pre-filled with the stored answers (`initial`), with a
 * "Not now" exit (`onExit`) a first run never has. Profile can also
 * open it on demand, in the same dress. Nothing here knows which run
 * it is beyond those two props, and a run can only ever write what the
 * flow itself writes: the onboarding record, nothing else.
 *
 * There is a **Launch as admin** door on every screen. It only renders for
 * someone the database lists in `public.app_admins` (see `useAdminAccess`); for
 * everybody else the button isn't there at all, rather than being present and
 * refusing.
 *
 * On look: this used to put a different blurred photograph behind glass on
 * every screen, with the type on top. It borrowed its mood from a stock image
 * and the picture always fought the question. A typography-only pass followed
 * — one soft accent bloom and a lot of air.
 *
 * The look now is the owner's approved Liquid Glass preview, carried exactly
 * (M-170, superseding M-169's composition): the preview's animated mesh —
 * gold, sage, rose and deep-gold pools — drifts on the ink, the words sit
 * directly on that scene (the preview wraps them in nothing), and only the
 * controls wear the shared glass material (src/styles/glass.css): the
 * answer pills, the back and admin capsules, the name field, the CTA. The
 * step rail is the preview's bare bars; the recap is its one solid card.
 * Every question, answer, order and write below is exactly what it was
 * before: this is a presentation change only.
 */

import { useCallback, useMemo, useRef, useState } from "react";
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
import { linkTrainerCode } from "@/lib/trainer/referralServer";
import "@/styles/welcome.css";

/* The preview's screen entrance: .55s on its spring-in curve. */
const EASE: [number, number, number, number] = [0.22, 1.2, 0.36, 1];

/** Four questions, so four segments in the rail. */
const STEP_COUNT = 4;

/**
 * The first real question: Male or Female.
 *
 * Three deliberate choices about how this is presented:
 *
 *   · **Both answers get the same pill and the same dress.** A pink option
 *     next to a blue one would make the choice read as picking a theme rather
 *     than answering a question.
 *   · **The pills carry the label only** (M-170): the preview's capsules
 *     have no helper line, so the consequence sentences the cards used to
 *     carry are gone — the answer still decides exactly what it decided,
 *     and Settings still shows the answer that was given. Recorded in
 *     M-170 as the one content-display change the exact match cost.
 *   · **"Prefer not to say" sits apart**, because it isn't a third kind of
 *     person, it is declining the question. It keeps everything available.
 */
const SEXES: Array<{ sex: SexAnswer; title: string; kind: ProfileKind }> = [
  { sex: "female", title: "Female", kind: "cycle" },
  { sex: "male", title: "Male", kind: "no-cycle" },
  { sex: "unspecified", title: "Prefer not to say", kind: "unspecified" },
];

/** The last entry is the decline, so it renders apart, below the pills. */
const SEX_CHOICES = SEXES.slice(0, -1);
const SEX_DECLINE = SEXES.at(-1)!;

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
  /**
   * The stored answers, for a re-run or a replay (M-182). Absent on a
   * first run — and a first run is byte-identical to before: every
   * question unanswered, exactly as it has always opened.
   *
   * Present, the flow opens with these answers already in it, so a
   * straight click-through hands back what was already stored. `kind`
   * rides along separately from `sex` on purpose: Settings can change
   * the capability without changing the answer (the cycle switch), so
   * the two can legitimately disagree — and a re-run that derived the
   * capability from the answer alone would silently undo that change.
   * Finishing with the sex answer untouched therefore returns the
   * stored `kind`; only a changed answer re-derives it, exactly as a
   * first run does.
   */
  initial?:
    | {
        sex: SexAnswer;
        kind: ProfileKind;
        focus: FocusArea[];
        name: string | null;
      }
    | undefined;
  /**
   * The way out of a re-run or replay (M-182): "Not now". Only ever
   * passed by the gate for those runs — a first run has no exit, as
   * before. The gate owns what it records (the version, seen); this
   * component just offers the door.
   */
  onExit?: (() => void) | undefined;
}

export function Welcome({ onFinish, onAdmin, initial, onExit }: WelcomeProps) {
  /* The admin door opens a launcher rather than skipping straight in — see
     AdminPanel for why picking a destination is the whole interaction. */
  const [adminOpen, setAdminOpen] = useState(false);
  /* Server-verified. `"checking"` and `"denied"` both mean "no door". */
  const adminAccess = useAdminAccess();
  const reduced = useReducedMotion();
  const { sound } = useSound();

  const [step, setStep] = useState(0);
  /* One piece of state, not two: the answer *is* the capability. Deriving
     `kind` at the point of answering is what stops the two ever disagreeing.
     A re-run pre-fills from the stored record (M-182): the answer that was
     given, the focus that was picked, the name that was offered — the
     capability itself is reconciled at finish, not here (see `initial`). */
  const [answer, setAnswer] = useState<(typeof SEXES)[number] | null>(
    () => SEXES.find((s) => s.sex === initial?.sex) ?? null,
  );
  const [focus, setFocus] = useState<FocusArea[]>(() => [...(initial?.focus ?? [])]);
  const [name, setName] = useState(() => initial?.name ?? "");
  /* The optional trainer code (M-171) and the one line it may earn.
     `attemptedCodes` is what makes "call the RPC once" true: blur and
     finish can both reach the attempt, but a given typed value only
     ever makes one call. */
  const [trainerCode, setTrainerCode] = useState("");
  const [trainerFlag, setTrainerFlag] = useState<string | null>(null);
  const attemptedCodes = useRef<Set<string>>(new Set());

  const attemptLink = useCallback(async (raw: string) => {
    const value = raw.trim();
    if (!value || attemptedCodes.current.has(value)) return;
    attemptedCodes.current.add(value);
    const result = await linkTrainerCode(value);
    switch (result.kind) {
      case "linked":
        setTrainerFlag("Linked, your trainer will see you've joined.");
        break;
      case "already-linked":
        setTrainerFlag("You're already linked to a trainer, so this code wasn't added.");
        break;
      case "own-code":
        setTrainerFlag("That's your own trainer code, it's for your clients to enter.");
        break;
      case "unknown-code":
      case "malformed":
        setTrainerFlag(
          "That code doesn't match a trainer, check it with them, or carry on without it.",
        );
        break;
      case "unavailable":
        /* Signed out, offline, or the server can't be reached: the
           code simply isn't linked, and onboarding never says so —
           a setup flow does not fail over an optional extra. */
        break;
    }
  }, []);

  const go = useCallback(
    (next: number) => {
      setStep(next);
      sound(next > step ? "navigate" : "close");
    },
    [step, sound],
  );

  const finish = useCallback(() => {
    sound("celebrate");
    /* A code typed but never blurred still gets its one link attempt —
       fire-and-forget, because an optional code must never hold the
       door, and its outcome must never delay entering Bloom. */
    if (trainerCode.trim()) void attemptLink(trainerCode);
    onFinish({
      /* A re-run that leaves the sex answer as it found it returns the
         STORED capability, not the one the answer would derive (M-182):
         Settings may have changed the capability since the answer was
         given, and a click-through must not undo that. A changed answer
         re-derives, exactly as a first run does. */
      kind:
        initial && answer?.sex === initial.sex
          ? initial.kind
          : (answer?.kind ?? "unspecified"),
      sex: answer?.sex ?? null,
      focus,
      name: name.trim() || null,
    });
  }, [answer, focus, name, onFinish, sound, trainerCode, attemptLink, initial]);

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

  /* The preview's entrance, on every screen change: in from the right
     with a breath of scale, .55s on the preview's curve. The preview
     has no exit move — the old screen simply goes — so the exit is a
     short fade and nothing more. Direction no longer flips the slide:
     the preview enters the same way backwards and forwards. */
  const slide = reduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2 },
      }
    : {
        initial: { opacity: 0, x: 22, scale: 0.985 },
        animate: { opacity: 1, x: 0, scale: 1 },
        exit: { opacity: 0, transition: { duration: 0.15 } },
        transition: { duration: 0.55, ease: EASE },
      };

  return (
    <div className="wl" role="dialog" aria-modal="true" aria-label="Set up Bloom">
      {/* The preview's mesh: four pools of palette light, each with its
          own seat and drift (welcome.css owns the values). */}
      <div className="wl-mesh" aria-hidden>
        <i className="m1" />
        <i className="m2" />
        <i className="m3" />
        <i className="m4" />
      </div>

      {/* The refraction filter the glass material references (glass.css,
          .glass-refract). Defined once, never painted — and, exactly as
          in the preview, applied nowhere in this flow: the preview
          ships the filter defined and inert, its layered rims carrying
          the effect. Kept for parity and for the material's other
          surfaces. */}
      <svg className="glass-defs" aria-hidden="true" focusable="false">
        <defs>
          <filter id="lg-refract" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.012"
              numOctaves="2"
              seed="7"
              result="lg-noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="lg-noise"
              scale="7"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div className="wl-shell">
        <div className="wl-top">
          {/* The preview's back capsule, top-left: present on every
              screen, disabled and dimmed on the first — there is
              nowhere back to, and it doesn't pretend otherwise. */}
          <button
            type="button"
            className="wl-back glass-cap"
            onClick={() => go(step - 1)}
            disabled={step === 0}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          {/* The preview's rail: bare bars, centred — done in gold,
              current stretched and lit, the rest dim. */}
          <div className="wl-rail" aria-hidden>
            {Array.from({ length: STEP_COUNT }, (_, i) => (
              <div
                key={i}
                className="wl-seg"
                data-state={i < step ? "done" : i === step ? "on" : "todo"}
              />
            ))}
          </div>
          {/* The admin door exists only for someone Supabase lists as an admin.
              It is removed rather than disabled: a shield button that is always
              there and always refuses is a control that lies about itself. */}
          {adminAccess.status === "granted" && (
            <button
              type="button"
              className="wl-skip glass-cap"
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
            <motion.div key={step} className="wl-step" {...slide}>
              {step === 0 && (
                <>
                  {/* The preview's hero flower: glass petals over a
                      gold heart, above the words. Decoration only. */}
                  <div className="wl-flower" aria-hidden>
                    <i />
                    <i />
                    <i />
                    <b />
                  </div>
                  <p className="wl-eyebrow">Welcome</p>
                  <h1 className="wl-title">
                    Bloom keeps the record.
                    <br />
                    <em>You keep living.</em>
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
                  <h1 className="wl-title">
                    Which best <em>describes you?</em>
                  </h1>
                  <p className="wl-sub">
                    Bloom tracks a menstrual cycle for the people who have one. This answer decides
                    whether that part of the app is there at all, asked once, and changeable later
                    from Settings.
                  </p>
                  <div className="wl-choices">
                    {SEX_CHOICES.map((opt) => (
                      <button
                        key={opt.title}
                        type="button"
                        className="wl-card glass-pill"
                        data-on={answer?.sex === opt.sex}
                        aria-pressed={answer?.sex === opt.sex}
                        onClick={() => {
                          sound("tap");
                          setAnswer(opt);
                        }}
                      >
                        <span className="wl-tick" aria-hidden>
                          <Check size={12} strokeWidth={3.4} />
                        </span>
                        <span className="wl-card-title">{opt.title}</span>
                      </button>
                    ))}
                  </div>

                  {/* The decline sits apart, as the preview's quiet
                      underlined text button — not a third pill. */}
                  <div className="wl-apart">
                    <button
                      type="button"
                      className="wl-apart-btn"
                      data-on={answer?.sex === SEX_DECLINE.sex}
                      aria-pressed={answer?.sex === SEX_DECLINE.sex}
                      onClick={() => {
                        sound("tap");
                        setAnswer(SEX_DECLINE);
                      }}
                    >
                      {SEX_DECLINE.title}
                    </button>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <p className="wl-eyebrow">Step two</p>
                  <h1 className="wl-title">
                    What brought <em>you here?</em>
                  </h1>
                  <p className="wl-sub">
                    Pick any that fit. Bloom switches on the right trackers to start. You can add
                    or drop them at any time.
                  </p>
                  <div className="wl-choices wl-choices--grid">
                    {areas.map((area) => {
                      const on = focus.includes(area);
                      return (
                        <button
                          key={area}
                          type="button"
                          className="wl-card glass-pill"
                          data-on={on}
                          aria-pressed={on}
                          onClick={() => toggleFocus(area)}
                        >
                          <span className="wl-tick" aria-hidden>
                            <Check size={12} strokeWidth={3.4} />
                          </span>
                          <span className="wl-card-title">{FOCUS_LABEL[area]}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <p className="wl-eyebrow">Last one</p>
                  <h1 className="wl-title">
                    What should <em>Bloom call you?</em>
                  </h1>
                  <input
                    className="wl-input glass-field"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Optional"
                    maxLength={48}
                    autoComplete="given-name"
                    aria-label="Your name, optional"
                  />
                  <div className="wl-summary">
                    <p className="wl-summary-title">Your start</p>
                    <div className="wl-summary-rows">
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
                  </div>

                  {/* The trainer code (M-171): below the recap, in the
                      name field's own glass dress, so the preview's
                      composition — words, field, recap — is untouched.
                      Optional in every way: empty is skipped silently,
                      a wrong code is one gentle line, and finishing
                      never waits on it. */}
                  <div className="wl-trainer">
                    <label className="wl-trainer-label" htmlFor="wl-trainer-code">
                      Have a trainer code?
                    </label>
                    <input
                      id="wl-trainer-code"
                      className="wl-input glass-field"
                      value={trainerCode}
                      onChange={(e) => {
                        setTrainerCode(e.target.value);
                        setTrainerFlag(null);
                      }}
                      onBlur={() => void attemptLink(trainerCode)}
                      placeholder="Optional"
                      maxLength={20}
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      aria-label="Trainer code, optional"
                    />
                    <p className="wl-trainer-note">
                      Your trainer will see that you&rsquo;ve joined Bloom with their code. Nothing
                      else about you is shared.
                    </p>
                    {trainerFlag ? (
                      <p className="wl-trainer-flag" role="status">
                        {trainerFlag}
                      </p>
                    ) : null}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="wl-foot">
          {/* The preview's CTA: glass on the middle screens, the solid
              gold capsule on the first and the last (Begin / the way
              in) — [data-solid] is the glass CTA's own variant. */}
          <button
            type="button"
            className="wl-next glass-cta"
            data-solid={step === 0 || step === STEP_COUNT - 1}
            disabled={!canAdvance}
            onClick={() => (step === STEP_COUNT - 1 ? finish() : go(step + 1))}
          >
            {step === 0 ? "Get started" : step === STEP_COUNT - 1 ? "Enter Bloom" : "Continue"}
            <ArrowRight size={17} />
          </button>
          {/* The re-run's exit (M-182): the preview's quiet text-button
              voice, under the CTA, on every screen of the run — the one
              addition the re-run makes to the composition, and only
              ever rendered when the gate passes `onExit` (re-runs and
              replays; never a first run). */}
          {onExit ? (
            <div className="wl-notnow-row">
              <button
                type="button"
                className="wl-notnow"
                onClick={() => {
                  sound("close");
                  onExit();
                }}
              >
                Not now
              </button>
            </div>
          ) : null}
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
