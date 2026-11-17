/**
 * The assessment's two doors.
 *
 * Today: a quiet card, shown only while the assessment is unfinished, and
 * dismissible — dismissal is remembered, and the card returns at most once,
 * if the person later works on the assessment and leaves it unfinished
 * again. Nothing anywhere is locked behind completion.
 *
 * When the assessment is finished from Today's own flow, the prompt card
 * does not simply vanish: it breaks into orbs and the completed
 * starting-point card — the assessment's output: goal, daily targets,
 * plan status — flies into the freed slot and settles there. The host
 * below owns that moment. It keeps the flow mounted across the completion
 * flip (the sheet must survive to show its summary), remembers the last
 * unfinished card as the ghost that breaks, and plays the celebration
 * once, when the sheet closes. A page that loads with the assessment
 * already complete shows the settled card directly — no orbs, no flight.
 * Reduced motion skips the show entirely: the settled card is simply
 * there.
 *
 * Profile: the permanent home — take it, continue it, read the summary,
 * retake it. (The Retake door was removed by PR #134 and restored the
 * same day on the owner's correction: he had asked for it to be added,
 * not removed. Retake passes the flow's retake intent — the sheet opens
 * on the intro step, and nothing is stored until Begin is pressed, so
 * opening and closing it untouched can never demote a completed
 * assessment. The summary opens in the same sheet chrome as the flow.)
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { ClipboardCheck, ClipboardList, X } from "lucide-react";

import { BloomSheet } from "@/components/ui/bloom-sheet";
import { Button } from "@/components/ui/button";
import { setPref } from "@/lib/prefs";
import { usePrefValue } from "@/lib/prefsStore";
import { useAssessment } from "@/hooks/useAssessment";
import { useNutrition } from "@/hooks/useNutrition";
import { usePlan } from "@/hooks/usePlan";
import {
  ASSESSMENT_PROMPT_KEY,
  EMPTY_PROMPT_STATE,
  parseAssessmentPrompt,
  shouldShowAssessmentPrompt,
  type AssessmentPromptState,
  type AssessmentState,
  type AssessmentStatus,
} from "@/lib/assessment/state";
import {
  ASSESSMENT_HISTORY_KEY,
  EMPTY_HISTORY_ENTRIES,
  parseAssessmentHistoryEntries,
} from "@/lib/assessment/history";
import { summaryOf } from "@/lib/assessment/summary";
import { GOAL_LABEL, QUESTION_STEPS } from "@/lib/assessment/questions";
import { AssessmentFlow } from "./AssessmentFlow";
import { AssessmentSummaryView } from "./AssessmentSummaryView";

function usePromptState(): [AssessmentPromptState, () => void] {
  const prompt = usePrefValue(ASSESSMENT_PROMPT_KEY, parseAssessmentPrompt, EMPTY_PROMPT_STATE);
  const dismiss = () => {
    setPref(ASSESSMENT_PROMPT_KEY, { dismissedAt: new Date().toISOString() });
  };
  return [prompt, dismiss];
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------------------------- Today ---------------------------------- */

/**
 * The unfinished card, exactly as it has always read. Rendered live by the
 * host below, and once more as the ghost — from the last unfinished state
 * the host saw — while it breaks apart.
 */
function PromptCardView({
  state,
  onOpen,
  onDismiss,
}: {
  state: AssessmentState;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const inProgress = state.status === "in_progress";
  /* Sections already saved, read off the flow's resume point: the step the
     flow reopens on is the first unfinished one, so its place among the
     question steps is the count of finished sections. */
  const sectionsDone =
    state.step === "summary"
      ? QUESTION_STEPS.length
      : Math.max(0, QUESTION_STEPS.indexOf(state.step as (typeof QUESTION_STEPS)[number]));
  return (
    <section className="home-band assess-prompt h-full" aria-labelledby="home-assessment-title">
      <div className="flex items-start gap-3 px-2 pb-3 pt-2">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-gold/10 text-gold"
        >
          <ClipboardList className="size-4.5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="home-eyebrow">Assessment</p>
          <h2 id="home-assessment-title" className="home-band-title mt-1">
            {inProgress
              ? "Your assessment is part-finished"
              : "A short assessment, when you are ready"}
          </h2>
          <p className="mt-1 max-w-[52ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
            {inProgress
              ? "Pick up where you left off. Your earlier answers are saved."
              : "Seven short sections on how you eat, move, sleep and recover. The summary is yours, and it is what any future plan will start from."}
          </p>
          {inProgress ? (
            <div className="mt-3 max-w-[52ch]">
              <div
                className="flex gap-1.5"
                role="progressbar"
                aria-label="Assessment sections completed"
                aria-valuemin={0}
                aria-valuemax={QUESTION_STEPS.length}
                aria-valuenow={sectionsDone}
              >
                {QUESTION_STEPS.map((step, i) => (
                  <span
                    key={step}
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]"
                  >
                    <span
                      className="block h-full rounded-full transition-all duration-[var(--motion-signature)]"
                      style={{
                        width: i < sectionsDone ? "100%" : "0%",
                        backgroundImage: "var(--gold-gradient)",
                        transitionDelay: `${i * 80}ms`,
                      }}
                    />
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[length:var(--text-meta)] tabular-nums text-muted-foreground">
                {sectionsDone} of {QUESTION_STEPS.length} sections
              </p>
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={onOpen}>
              {inProgress ? "Continue" : "Begin"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
              Not now
            </Button>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onDismiss}
          aria-label="Dismiss the assessment reminder"
          className="shrink-0"
        >
          <X className="size-4" aria-hidden />
        </Button>
      </div>
    </section>
  );
}

/* ------------------------- the completed starting point ------------------------- */

/** "a, b and c" — the plan section's joining, kept word-for-word in shape. */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const formatPlanDay = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

/**
 * What takes the prompt card's place: the assessment's output, read from
 * the same doors everything else reads — the answers themselves for the
 * goal, the Nutrition hook's safety-gated target state for the numbers
 * (a substantive safety block means no numbers here either, in the
 * Nutrition tab's own words), and the plan hook for plan status. Nothing
 * is computed in this component.
 */
function AssessmentSettledCard({
  state,
  flying = false,
}: {
  state: AssessmentState;
  flying?: boolean;
}) {
  const { targetState } = useNutrition();
  const plan = usePlan();
  const goal = state.answers.goal;

  const planLine = ((): string | null => {
    const s = plan.state;
    switch (s.kind) {
      case "ready":
        return s.staleness.stale
          ? `Since your plan was composed, ${joinNames(s.staleness.changed)} changed — recompose it in Nutrition.`
          : `Today's plan is composed in Nutrition, aimed at ${GOAL_LABEL[s.plan.goal].toLowerCase()}.`;
      case "outdated":
        return `Your last plan was made for ${formatPlanDay(s.plan.day)} — plans are built for a single day; create today's in Nutrition.`;
      case "can_generate":
        return "No plan yet — Bloom can compose one from these numbers in Nutrition.";
      case "refused":
        /* A safety refusal is already carried by the targets line below;
           the card never pushes a plan the gate refused. */
        return s.refusal.kind === "safety_blocked"
          ? null
          : "No plan yet — a few body numbers are still missing.";
    }
  })();

  return (
    <section
      className={`home-band assess-prompt h-full${flying ? " assess-fly" : ""}`}
      aria-labelledby="home-starting-point-title"
    >
      <div className="flex items-start gap-3 px-2 pb-3 pt-2">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-gold/10 text-gold"
        >
          <ClipboardCheck className="size-4.5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="home-eyebrow">Assessment</p>
          <h2 id="home-starting-point-title" className="home-band-title mt-1">
            Your starting point
          </h2>
          <p className="mt-1 max-w-[52ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
            {state.completedAt ? <>Completed {formatDate(state.completedAt)}. </> : null}
            {goal ? <>Your goal: {GOAL_LABEL[goal].toLowerCase()}.</> : null}
          </p>
          {targetState.kind === "ready" ? (
            <p className="mt-2 max-w-[52ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
              <span className="whitespace-nowrap text-foreground">
                ~{Math.round(targetState.targets.kcal)} kcal
              </span>{" "}
              ·{" "}
              <span className="whitespace-nowrap text-foreground">
                {Math.round(targetState.targets.proteinG)} g protein
              </span>{" "}
              a day — estimates from your body numbers (Mifflin–St Jeor), a guide, not a
              prescription.
            </p>
          ) : targetState.kind === "blocked" ? (
            <p className="mt-2 max-w-[52ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
              Your safety answers mean Bloom doesn't set calorie targets for you.
            </p>
          ) : (
            <p className="mt-2 max-w-[52ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
              No daily target yet — targets come from your body numbers on Trackers.
            </p>
          )}
          {planLine ? (
            <p className="mt-2 max-w-[52ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
              {planLine}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" asChild>
              <Link to="/nutrition">Open Nutrition</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- the orbs --------------------------------- */

/**
 * The constellation the prompt card breaks into: a fixed table (position
 * across the card, size, scatter, delay, colour) so the break is identical
 * every time — and identical on the server, the client and in tests.
 * Colours are the palette tokens only: gold, sage, gold-soft.
 */
const ORBS: readonly {
  left: string;
  top: string;
  size: number;
  x: number;
  y: number;
  delay: number;
  color: string;
}[] = [
  { left: "6%", top: "22%", size: 10, x: -120, y: -80, delay: 0, color: "var(--gold)" },
  { left: "18%", top: "64%", size: 7, x: -60, y: 50, delay: 40, color: "var(--sage)" },
  { left: "32%", top: "30%", size: 13, x: 40, y: -95, delay: 20, color: "var(--gold-soft)" },
  { left: "47%", top: "78%", size: 8, x: 110, y: 30, delay: 70, color: "var(--gold)" },
  { left: "63%", top: "18%", size: 11, x: -90, y: -45, delay: 10, color: "var(--sage)" },
  { left: "78%", top: "55%", size: 6, x: 70, y: 85, delay: 55, color: "var(--gold-soft)" },
  { left: "90%", top: "38%", size: 9, x: -40, y: -70, delay: 30, color: "var(--gold)" },
  { left: "12%", top: "88%", size: 12, x: 130, y: -25, delay: 85, color: "var(--gold-soft)" },
  { left: "55%", top: "85%", size: 7, x: -110, y: 60, delay: 15, color: "var(--gold)" },
  { left: "84%", top: "15%", size: 10, x: 55, y: -90, delay: 60, color: "var(--sage)" },
  { left: "38%", top: "50%", size: 8, x: -75, y: 40, delay: 45, color: "var(--gold-soft)" },
  { left: "70%", top: "70%", size: 6, x: 95, y: -55, delay: 25, color: "var(--gold)" },
];

/**
 * Today's assessment slot. While the assessment is unfinished it is the
 * prompt card; the moment it is finished — from this card's own flow — it
 * becomes the celebration: the prompt card breaks into orbs as the
 * starting-point card flies in and settles. The flow lives at this level,
 * never inside the prompt's conditional render, so completing the last
 * step cannot unmount the sheet before its summary is read.
 */
export function AssessmentPromptCard() {
  const { state } = useAssessment();
  const [prompt, dismiss] = usePromptState();
  const [flowOpen, setFlowOpen] = useState(false);
  const complete = state.status === "complete";

  /* The celebration's bookkeeping. `flowOpenedRef` is what separates a
     completion that happened here, in this sitting, from every other way
     the stored state can already read "complete" when this card mounts
     (a fresh load, a finish on Profile, another tab): those all show the
     settled card directly, with no show. */
  const flowOpenedRef = useRef(false);
  const seenStatusRef = useRef<AssessmentStatus | null>(null);
  const ghostRef = useRef<AssessmentState | null>(null);
  const [celebration, setCelebration] = useState<"none" | "waiting" | "playing">("none");

  useEffect(() => {
    if (state.status !== "complete") ghostRef.current = state;
    const prev = seenStatusRef.current;
    seenStatusRef.current = state.status;
    if (
      prev !== null &&
      prev !== "complete" &&
      state.status === "complete" &&
      flowOpenedRef.current &&
      ghostRef.current !== null &&
      !prefersReducedMotion()
    ) {
      /* The sheet is still open on its summary — the show waits for the
         close, so the person reads first and celebrates after. */
      setCelebration("waiting");
    }
    if (state.status !== "complete") setCelebration("none");
  }, [state]);

  useEffect(() => {
    if (celebration === "waiting" && !flowOpen) setCelebration("playing");
  }, [celebration, flowOpen]);

  useEffect(() => {
    if (celebration !== "playing") return;
    const t = window.setTimeout(() => setCelebration("none"), 840);
    return () => window.clearTimeout(t);
  }, [celebration]);

  const openFlow = () => {
    flowOpenedRef.current = true;
    setFlowOpen(true);
  };

  const ghost = celebration === "playing" ? ghostRef.current : null;

  return (
    <div className="assess-slot h-full">
      {!complete && shouldShowAssessmentPrompt(state, prompt) ? (
        <PromptCardView state={state} onOpen={openFlow} onDismiss={dismiss} />
      ) : null}

      {complete && celebration === "playing" ? (
        <>
          {ghost ? (
            <div className="assess-ghost" aria-hidden>
              <PromptCardView state={ghost} onOpen={() => {}} onDismiss={() => {}} />
            </div>
          ) : null}
          <div className="assess-orbs" aria-hidden>
            {ORBS.map((orb, i) => (
              <span
                key={i}
                className="assess-orb"
                style={
                  {
                    left: orb.left,
                    top: orb.top,
                    width: orb.size,
                    height: orb.size,
                    background: orb.color,
                    animationDelay: `${orb.delay}ms`,
                    "--orb-x": `${orb.x}px`,
                    "--orb-y": `${orb.y}px`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
          <AssessmentSettledCard state={state} flying />
        </>
      ) : complete ? (
        <AssessmentSettledCard state={state} />
      ) : null}

      <AssessmentFlow open={flowOpen} onClose={() => setFlowOpen(false)} />
    </div>
  );
}

/* --------------------------------- Profile --------------------------------- */

export function AssessmentProfileCard() {
  const { state } = useAssessment();
  const history = usePrefValue(
    ASSESSMENT_HISTORY_KEY,
    parseAssessmentHistoryEntries,
    EMPTY_HISTORY_ENTRIES,
  );
  const [flowOpen, setFlowOpen] = useState(false);
  /* Which door opened the flow: a retake of a completed assessment opens
     on the intro step (the flow's retake intent); take/continue opens at
     the stored position. Set in the same click as the open, so the flow's
     open effect always reads the intent that belongs to this opening. */
  const [flowRetake, setFlowRetake] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const summary = summaryOf(state);

  const statusLine =
    state.status === "complete" && state.completedAt
      ? `Completed ${formatDate(state.completedAt)}.`
      : state.status === "in_progress"
        ? "Part-finished. Your answers so far are saved."
        : "Not taken yet.";

  return (
    <div className="pf-card pf-card--pad assess-card">
      <div className="pf-section-head">
        <div>
          <p className="pf-eyebrow">Assessment</p>
          <h2 className="pf-title">Your starting point</h2>
        </div>
      </div>
      <p className="max-w-[56ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
        How you eat, move, sleep and recover, what you want to change, and the safety answers that
        decide what Bloom will suggest. {statusLine}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {state.status === "complete" ? (
          <>
            <Button type="button" size="sm" onClick={() => setSummaryOpen(true)}>
              View summary
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setFlowRetake(true);
                setFlowOpen(true);
              }}
            >
              Retake
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setFlowRetake(false);
              setFlowOpen(true);
            }}
          >
            {state.status === "in_progress" ? "Continue assessment" : "Take the assessment"}
          </Button>
        )}
      </div>

      {history.length > 0 ? (
        <div className="mt-5 border-t border-border/60 pt-4">
          <p className="pf-eyebrow">Previous assessments</p>
          <ul className="mt-2 space-y-1.5">
            {history.map((entry) => (
              <li
                key={entry.completedAt}
                className="flex flex-wrap items-baseline justify-between gap-x-3 text-[length:var(--text-support)] leading-[var(--leading-body)]"
              >
                <span className="text-foreground">{formatDate(entry.completedAt)}</span>
                <span className="text-muted-foreground">
                  {entry.answers.goal ? GOAL_LABEL[entry.answers.goal] : "No goal stated"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <AssessmentFlow open={flowOpen} retake={flowRetake} onClose={() => setFlowOpen(false)} />

      <BloomSheet
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        title="Your assessment summary"
        size="lg"
        className="assess-sheet"
        panelClassName="assess-panel"
      >
        <div className="flex max-h-[82vh] flex-col px-6 pb-6 pt-6 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[length:var(--text-meta)] font-medium uppercase tracking-[var(--tracking-meta)] text-muted-foreground">
                Assessment
              </p>
              <h2 className="mt-2 font-display text-[length:var(--text-title)] leading-tight text-foreground">
                Your summary
              </h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setSummaryOpen(false)}
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>
          <div className="no-scrollbar mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
            {summary ? (
              <AssessmentSummaryView summary={summary} />
            ) : (
              <p className="text-[length:var(--text-support)] text-muted-foreground">
                No completed assessment yet.
              </p>
            )}
          </div>
        </div>
      </BloomSheet>
    </div>
  );
}
