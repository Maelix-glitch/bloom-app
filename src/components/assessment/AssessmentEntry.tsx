/**
 * The assessment's two doors.
 *
 * Today: a quiet card, shown only while the assessment is unfinished, and
 * dismissible — dismissal is remembered, and the card returns at most once,
 * if the person later works on the assessment and leaves it unfinished
 * again. Nothing anywhere is locked behind completion.
 *
 * Profile: the permanent home — take it, continue it, read the summary,
 * retake it. The summary opens in the same sheet chrome as the flow.
 */

import { useState } from "react";
import { ClipboardList, X } from "lucide-react";

import { BloomSheet } from "@/components/ui/bloom-sheet";
import { Button } from "@/components/ui/button";
import { setPref } from "@/lib/prefs";
import { usePrefValue } from "@/lib/prefsStore";
import { useAssessment } from "@/hooks/useAssessment";
import {
  ASSESSMENT_PROMPT_KEY,
  EMPTY_PROMPT_STATE,
  parseAssessmentPrompt,
  shouldShowAssessmentPrompt,
  type AssessmentPromptState,
} from "@/lib/assessment/state";
import { summaryOf } from "@/lib/assessment/summary";
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

/* ---------------------------------- Today ---------------------------------- */

export function AssessmentPromptCard() {
  const { state, retake } = useAssessment();
  const [prompt, dismiss] = usePromptState();
  const [flowOpen, setFlowOpen] = useState(false);

  if (!shouldShowAssessmentPrompt(state, prompt)) return null;

  const inProgress = state.status === "in_progress";
  return (
    <section className="home-band" aria-labelledby="home-assessment-title">
      <div className="flex items-start gap-3 px-1 pb-2 pt-1">
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
          <p className="mt-1 max-w-[52ch] text-[13px] leading-[var(--leading-body)] text-muted-foreground">
            {inProgress
              ? "Pick up where you left off. Your earlier answers are saved."
              : "Seven short sections on how you eat, move, sleep and recover. The summary is yours, and it is what any future plan will start from."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (state.status === "complete") retake();
                setFlowOpen(true);
              }}
            >
              {inProgress ? "Continue" : "Begin"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={dismiss}
          aria-label="Dismiss the assessment reminder"
          className="shrink-0"
        >
          <X className="size-4" aria-hidden />
        </Button>
      </div>
      <AssessmentFlow open={flowOpen} onClose={() => setFlowOpen(false)} />
    </section>
  );
}

/* --------------------------------- Profile --------------------------------- */

export function AssessmentProfileCard() {
  const { state, retake } = useAssessment();
  const [flowOpen, setFlowOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const summary = summaryOf(state);

  const statusLine =
    state.status === "complete" && state.completedAt
      ? `Completed ${formatDate(state.completedAt)}.`
      : state.status === "in_progress"
        ? "Part-finished. Your answers so far are saved."
        : "Not taken yet.";

  return (
    <div className="pf-card pf-card--pad">
      <div className="pf-section-head">
        <div>
          <p className="pf-eyebrow">Assessment</p>
          <h2 className="pf-title">Your starting point</h2>
        </div>
      </div>
      <p className="max-w-[56ch] text-[13px] leading-[var(--leading-body)] text-muted-foreground">
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
                retake();
                setFlowOpen(true);
              }}
            >
              Retake
            </Button>
          </>
        ) : (
          <Button type="button" size="sm" onClick={() => setFlowOpen(true)}>
            {state.status === "in_progress" ? "Continue assessment" : "Take the assessment"}
          </Button>
        )}
      </div>

      <AssessmentFlow open={flowOpen} onClose={() => setFlowOpen(false)} />

      <BloomSheet
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        title="Your assessment summary"
        size="lg"
      >
        <div className="flex max-h-[82vh] flex-col px-6 pb-6 pt-6 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[length:var(--text-meta)] font-medium uppercase tracking-[var(--tracking-meta)] text-muted-foreground">
                Assessment
              </p>
              <h2 className="mt-2 font-display text-[24px] leading-tight text-foreground">
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
          <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
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
