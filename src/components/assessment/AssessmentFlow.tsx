/**
 * The assessment flow — one domain per step inside the shared BloomSheet
 * chrome. Answers are held in a local draft and written to the assessment
 * state at every step, so closing the sheet mid-flow loses nothing and the
 * flow resumes where it stopped. Nothing in the flow locks anything: every
 * step can be continued past, and unanswered stays honestly unanswered in
 * the summary.
 */

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

import { BloomSheet, SheetBody, SheetItem } from "@/components/ui/bloom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAssessment } from "@/hooks/useAssessment";
import {
  ASSESSMENT_STEPS,
  QUESTION_STEPS,
  STEP_INTRO,
  STEP_TITLE,
  ACTIVITY_OPTIONS,
  CONDITION_OPTIONS,
  DIETARY_OPTIONS,
  GOAL_OPTIONS,
  MEALS_OPTIONS,
  RATE_OPTIONS,
  RESTEDNESS_OPTIONS,
  SLEEP_HOURS_OPTIONS,
  SLEEP_QUALITY_OPTIONS,
  SYMPTOM_OPTIONS,
  type AssessmentStep,
} from "@/lib/assessment/questions";
import { EMPTY_ANSWERS, type AssessmentAnswers } from "@/lib/assessment/state";
import { summaryOf } from "@/lib/assessment/summary";
import { AssessmentSummaryView } from "./AssessmentSummaryView";
import {
  CONSENT_COPY,
  consentDecision,
  consentState,
  type ConsentPurpose,
} from "@/lib/vitalis/domain/consent";
import { SAFETY_CLASS_COPY } from "@/lib/vitalis/domain/safety";

/* ------------------------------ small controls ----------------------------- */

function ChoiceGroup<T extends string | number>({
  options,
  value,
  onSelect,
  ariaLabel,
}: {
  options: readonly { value: T; label: string; hint?: string }[];
  value: T | null;
  onSelect: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(option.value)}
            className={cn(
              "rounded-2xl border px-4 py-3 text-left transition-colors duration-[var(--motion-micro)] ease-out-expo",
              selected
                ? "border-gold/60 bg-gold/10"
                : "border-border bg-surface-2 hover:border-border-strong",
            )}
          >
            <span className="block text-[length:var(--text-support)] font-medium text-foreground">
              {option.label}
            </span>
            {option.hint ? (
              <span className="mt-0.5 block text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
                {option.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function MultiChoice({
  options,
  values,
  onToggle,
  ariaLabel,
}: {
  options: readonly { value: string; label: string }[];
  values: readonly string[];
  onToggle: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const selected = values.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onToggle(option.value)}
            className={cn(
              "rounded-pill border px-3.5 py-2 text-[length:var(--text-support)] font-medium transition-colors duration-[var(--motion-micro)] ease-out-expo",
              selected
                ? "border-gold/60 bg-gold/10 text-foreground"
                : "border-border bg-surface-2 text-muted-foreground hover:border-border-strong hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

type TriValue = "yes" | "no" | "skip";

function TriChoice({
  value,
  onSelect,
  ariaLabel,
  allowSkip = true,
}: {
  value: boolean | null;
  onSelect: (value: boolean | null) => void;
  ariaLabel: string;
  allowSkip?: boolean;
}) {
  const current: TriValue | null = value === true ? "yes" : value === false ? "no" : null;
  const options: { value: TriValue; label: string }[] = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
    ...(allowSkip ? [{ value: "skip" as TriValue, label: "Prefer not to say" }] : []),
  ];
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => {
        /* "Prefer not to say" records null — the domain's honest "not
           answered" — so it never renders as a selected answer. */
        const selected = option.value !== "skip" && current === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() =>
              onSelect(option.value === "yes" ? true : option.value === "no" ? false : null)
            }
            className={cn(
              "rounded-pill border px-4 py-2 text-[length:var(--text-support)] font-medium transition-colors duration-[var(--motion-micro)] ease-out-expo",
              option.value !== "skip" && selected
                ? "border-gold/60 bg-gold/10 text-foreground"
                : "border-border bg-surface-2 text-muted-foreground hover:border-border-strong hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function FieldLabel({ children, htmlFor }: { children: string; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[length:var(--text-support)] font-medium text-foreground"
    >
      {children}
    </label>
  );
}

function NumberField({
  id,
  label,
  unit,
  value,
  onChange,
  min,
  max,
}: {
  id: string;
  label: string;
  unit: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min: number;
  max: number;
}) {
  const [text, setText] = useState(value === null ? "" : String(value));
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          inputMode="decimal"
          className="max-w-40"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value);
            onChange(
              e.target.value.trim() !== "" && Number.isFinite(n) && n >= min && n <= max ? n : null,
            );
          }}
        />
        <span className="text-[length:var(--text-support)] text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function TextListField({
  id,
  label,
  hint,
  values,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  values: readonly string[];
  onChange: (values: string[]) => void;
}) {
  const [text, setText] = useState(values.join(", "));
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        value={text}
        placeholder={hint}
        onChange={(e) => {
          setText(e.target.value);
          onChange(
            e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .slice(0, 30),
          );
        }}
      />
    </div>
  );
}

const splitList = (text: string): string[] =>
  text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);

/* ---------------------------------- flow ----------------------------------- */

export function AssessmentFlow({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useAssessment();
  const [step, setStep] = useState<AssessmentStep>("intro");
  const [draft, setDraft] = useState<AssessmentAnswers>(store.state.answers);
  const [healthConsent, setHealthConsent] = useState(false);
  const [sensitiveConsent, setSensitiveConsent] = useState(false);
  const [medicationText, setMedicationText] = useState("");

  /* Fresh draft from storage each time the sheet opens: the stored state is
     the truth, the draft is this sitting's edits. */
  useEffect(() => {
    if (!open) return;
    const s = store.state;
    setDraft(s.answers);
    setMedicationText(s.answers.medications.join(", "));
    setHealthConsent(consentState(s.consents, "health_data_processing") === "granted");
    setSensitiveConsent(consentState(s.consents, "sensitive_health_processing") === "granted");
    setStep(s.status === "complete" ? "summary" : s.status === "in_progress" ? s.step : "intro");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const stepIndex = ASSESSMENT_STEPS.indexOf(step);
  const questionIndex = QUESTION_STEPS.indexOf(step as (typeof QUESTION_STEPS)[number]);
  const progress =
    step === "summary"
      ? 100
      : questionIndex >= 0
        ? Math.round(((questionIndex + 1) / QUESTION_STEPS.length) * 100)
        : 4;

  const patch = (p: Partial<AssessmentAnswers>) => setDraft((d) => ({ ...d, ...p }));

  const recordConsentDecisions = () => {
    const decisions: ReturnType<typeof consentDecision>[] = [];
    const now = new Date().toISOString();
    const wanted: [ConsentPurpose, boolean][] = [
      ["health_data_processing", healthConsent],
      ["sensitive_health_processing", sensitiveConsent],
    ];
    for (const [purpose, granted] of wanted) {
      const currentState = consentState(store.state.consents, purpose);
      if (granted && currentState !== "granted") {
        decisions.push(consentDecision(purpose, true, now));
      } else if (!granted && currentState === "granted") {
        decisions.push(consentDecision(purpose, false, now));
      }
    }
    store.recordConsents(decisions);
  };

  const goNext = () => {
    const next = ASSESSMENT_STEPS[stepIndex + 1] ?? "summary";
    if (step === "intro") {
      recordConsentDecisions();
      store.begin();
      store.saveStep(draft, "identity");
      setStep("identity");
      return;
    }
    if (step === "activity") {
      store.saveStep({ ...draft, medications: splitList(medicationText) }, "summary");
      store.complete();
      setStep("summary");
      return;
    }
    store.saveStep(
      step === "safety" ? { ...draft, medications: splitList(medicationText) } : draft,
      next,
    );
    setStep(next);
  };

  const goBack = () => {
    const prev = ASSESSMENT_STEPS[Math.max(0, stepIndex - 1)] ?? "intro";
    setStep(prev);
  };

  const close = () => {
    /* A mid-flow close saves the draft at the current step for resume. */
    if (step !== "intro" && step !== "summary" && store.state.status !== "complete") {
      store.saveStep({ ...draft, medications: splitList(medicationText) }, step);
    }
    onClose();
  };

  const summary = useMemo(
    () =>
      step === "summary"
        ? summaryOf({
            ...store.state,
            answers: draft,
            completedAt: store.state.completedAt ?? new Date().toISOString(),
          })
        : null,
    [step, store.state, draft],
  );

  const toggleListValue = (key: "conditions" | "symptoms", value: string) => {
    const list = draft[key] as readonly string[];
    patch({
      [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
    } as Partial<AssessmentAnswers>);
  };

  return (
    <BloomSheet
      open={open}
      onClose={close}
      title="Your assessment"
      size="lg"
      className="assess-sheet"
      panelClassName="assess-panel"
    >
      <div className="flex max-h-[82vh] flex-col px-6 pb-6 pt-6 sm:px-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[length:var(--text-meta)] font-medium uppercase tracking-[var(--tracking-meta)] text-muted-foreground">
              Assessment
              {questionIndex >= 0 ? ` · Step ${questionIndex + 1} of ${QUESTION_STEPS.length}` : ""}
            </p>
            <h2 className="mt-2 font-display text-[24px] leading-tight text-foreground">
              {STEP_TITLE[step]}
            </h2>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={close} aria-label="Close">
            <X className="size-4" aria-hidden />
          </Button>
        </div>

        <Progress value={progress} className="mt-4" aria-label="Assessment progress" />

        <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
          <SheetBody key={step}>
            {step !== "intro" && step !== "summary" ? (
              <SheetItem>
                <p className="text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
                  {STEP_INTRO[step]}
                </p>
              </SheetItem>
            ) : null}

            {step === "intro" ? (
              <SheetItem className="mt-1 flex flex-col gap-5">
                <p className="text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
                  Seven short sections: how you eat, move, sleep and recover, what you want to
                  change, and a few safety questions. Your answers become a summary you own — the
                  starting point for any plan Bloom suggests. Nothing is locked behind it, and you
                  can retake it at any time.
                </p>
                {(
                  [
                    ["health_data_processing", healthConsent, setHealthConsent],
                    ["sensitive_health_processing", sensitiveConsent, setSensitiveConsent],
                  ] as const
                ).map(([purpose, granted, setGranted]) => (
                  <div
                    key={purpose}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-surface-2 px-4 py-3.5"
                  >
                    <div>
                      <p className="text-[length:var(--text-support)] font-medium text-foreground">
                        {CONSENT_COPY[purpose].label}
                      </p>
                      <p className="mt-1 text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
                        {CONSENT_COPY[purpose].description}
                      </p>
                    </div>
                    <Switch
                      checked={granted}
                      onCheckedChange={setGranted}
                      aria-label={CONSENT_COPY[purpose].label}
                    />
                  </div>
                ))}
                {!healthConsent ? (
                  <p className="text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
                    Bloom needs the first permission to save your answers. Without it, this
                    assessment cannot be kept.
                  </p>
                ) : null}
              </SheetItem>
            ) : null}

            {step === "identity" ? (
              <SheetItem className="mt-5 flex flex-col gap-5">
                <NumberField
                  id="assess-age"
                  label="Age"
                  unit="years"
                  min={13}
                  max={110}
                  value={draft.ageYears}
                  onChange={(v) => patch({ ageYears: v === null ? null : Math.round(v) })}
                />
                <NumberField
                  id="assess-height"
                  label="Height"
                  unit="cm"
                  min={100}
                  max={250}
                  value={draft.heightCm}
                  onChange={(v) => patch({ heightCm: v })}
                />
                <NumberField
                  id="assess-weight"
                  label="Weight"
                  unit="kg"
                  min={25}
                  max={350}
                  value={draft.weightKg}
                  onChange={(v) => patch({ weightKg: v })}
                />
              </SheetItem>
            ) : null}

            {step === "goals" ? (
              <SheetItem className="mt-5 flex flex-col gap-5">
                <ChoiceGroup
                  ariaLabel="Your goal"
                  options={GOAL_OPTIONS}
                  value={draft.goal}
                  onSelect={(goal) => patch({ goal })}
                />
                {draft.goal === "lose" || draft.goal === "gain" ? (
                  <>
                    <NumberField
                      id="assess-target"
                      label="Target weight"
                      unit="kg"
                      min={25}
                      max={350}
                      value={draft.targetWeightKg}
                      onChange={(v) => patch({ targetWeightKg: v })}
                    />
                    <div className="flex flex-col gap-2">
                      <FieldLabel>Pace</FieldLabel>
                      <ChoiceGroup
                        ariaLabel="Pace of change"
                        options={RATE_OPTIONS}
                        value={draft.rateKgPerWeek}
                        onSelect={(rateKgPerWeek) => patch({ rateKgPerWeek })}
                      />
                    </div>
                  </>
                ) : null}
              </SheetItem>
            ) : null}

            {step === "safety" ? (
              <SheetItem className="mt-5 flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <FieldLabel>Are you pregnant or breastfeeding?</FieldLabel>
                  <TriChoice
                    ariaLabel="Pregnant or breastfeeding"
                    value={draft.pregnantOrBreastfeeding}
                    onSelect={(v) => patch({ pregnantOrBreastfeeding: v })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <FieldLabel>Have you ever had an eating disorder?</FieldLabel>
                  <TriChoice
                    ariaLabel="History of disordered eating"
                    value={draft.eatingDisorderHistory}
                    onSelect={(v) => patch({ eatingDisorderHistory: v })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <FieldLabel>
                    Has your weight changed recently without an obvious reason?
                  </FieldLabel>
                  <TriChoice
                    ariaLabel="Unexplained weight change"
                    value={draft.unexplainedWeightChange}
                    onSelect={(v) => patch({ unexplainedWeightChange: v })}
                    allowSkip={false}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <FieldLabel>Do any of these apply to you?</FieldLabel>
                  <MultiChoice
                    ariaLabel="Medical conditions"
                    options={CONDITION_OPTIONS}
                    values={draft.conditions}
                    onToggle={(v) => toggleListValue("conditions", v)}
                  />
                  <p className="text-[length:var(--text-support)] text-muted-foreground">
                    Leave all unselected if none apply.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <FieldLabel>Do you take regular medication?</FieldLabel>
                  <TriChoice
                    ariaLabel="Regular medication"
                    value={draft.takesMedication}
                    onSelect={(v) => patch({ takesMedication: v })}
                    allowSkip={false}
                  />
                  {draft.takesMedication ? (
                    <Input
                      aria-label="Medication names"
                      placeholder="Names, separated by commas"
                      value={medicationText}
                      onChange={(e) => setMedicationText(e.target.value)}
                    />
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  <FieldLabel>Are you experiencing any of these right now?</FieldLabel>
                  <MultiChoice
                    ariaLabel="Current symptoms"
                    options={SYMPTOM_OPTIONS}
                    values={draft.symptoms}
                    onToggle={(v) => toggleListValue("symptoms", v)}
                  />
                  <p className="text-[length:var(--text-support)] text-muted-foreground">
                    Leave all unselected if none apply.
                  </p>
                </div>
                {draft.symptoms.length > 0 ? (
                  <div
                    className="rounded-2xl border border-rose/40 bg-rose/10 px-4 py-3.5"
                    role="alert"
                  >
                    <p className="flex items-start gap-2 text-[length:var(--text-support)] font-medium leading-[var(--leading-body)] text-foreground">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose" aria-hidden />
                      {SAFETY_CLASS_COPY.urgent_escalation}
                    </p>
                  </div>
                ) : null}
              </SheetItem>
            ) : null}

            {step === "nutrition" ? (
              <SheetItem className="mt-5 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <FieldLabel>Your eating pattern</FieldLabel>
                  <ChoiceGroup
                    ariaLabel="Eating pattern"
                    options={DIETARY_OPTIONS}
                    value={draft.dietaryPattern}
                    onSelect={(dietaryPattern) => patch({ dietaryPattern })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <FieldLabel>Meals a day, usually</FieldLabel>
                  <ChoiceGroup
                    ariaLabel="Meals per day"
                    options={MEALS_OPTIONS}
                    value={draft.mealsPerDay}
                    onSelect={(mealsPerDay) => patch({ mealsPerDay })}
                  />
                </div>
              </SheetItem>
            ) : null}

            {step === "preferences" ? (
              <SheetItem className="mt-5 flex flex-col gap-5">
                <TextListField
                  id="assess-allergies"
                  label="Allergies"
                  hint="For example: peanuts, shellfish"
                  values={draft.allergies}
                  onChange={(allergies) => patch({ allergies })}
                />
                <TextListField
                  id="assess-intolerances"
                  label="Intolerances"
                  hint="For example: lactose, gluten"
                  values={draft.intolerances}
                  onChange={(intolerances) => patch({ intolerances })}
                />
                <TextListField
                  id="assess-disliked"
                  label="Foods you do not eat by choice"
                  hint="For example: mushrooms, coriander"
                  values={draft.dislikedFoods}
                  onChange={(dislikedFoods) => patch({ dislikedFoods })}
                />
                <TextListField
                  id="assess-cuisines"
                  label="Cuisines you enjoy"
                  hint="For example: South Indian, Italian, Thai"
                  values={draft.cuisines}
                  onChange={(cuisines) => patch({ cuisines })}
                />
                <p className="text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
                  Separate items with commas. Leave a field empty if nothing applies.
                </p>
              </SheetItem>
            ) : null}

            {step === "sleep" ? (
              <SheetItem className="mt-5 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <FieldLabel>How long do you usually sleep?</FieldLabel>
                  <ChoiceGroup
                    ariaLabel="Typical sleep length"
                    options={SLEEP_HOURS_OPTIONS}
                    value={draft.sleepHoursTypical}
                    onSelect={(sleepHoursTypical) => patch({ sleepHoursTypical })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <FieldLabel>How would you rate your sleep quality?</FieldLabel>
                  <ChoiceGroup
                    ariaLabel="Sleep quality"
                    options={SLEEP_QUALITY_OPTIONS}
                    value={draft.sleepQuality}
                    onSelect={(sleepQuality) => patch({ sleepQuality })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <FieldLabel>How often do you wake feeling rested?</FieldLabel>
                  <ChoiceGroup
                    ariaLabel="Morning restedness"
                    options={RESTEDNESS_OPTIONS}
                    value={draft.morningRestedness}
                    onSelect={(morningRestedness) => patch({ morningRestedness })}
                  />
                </div>
              </SheetItem>
            ) : null}

            {step === "activity" ? (
              <SheetItem className="mt-5 flex flex-col gap-5">
                <ChoiceGroup
                  ariaLabel="Activity level"
                  options={ACTIVITY_OPTIONS}
                  value={draft.activity}
                  onSelect={(activity) => patch({ activity })}
                />
              </SheetItem>
            ) : null}

            {step === "summary" ? (
              <SheetItem className="mt-1">
                {summary ? (
                  <AssessmentSummaryView summary={summary} />
                ) : (
                  <p className="text-[length:var(--text-support)] text-muted-foreground">
                    Your summary will appear here once the assessment is complete.
                  </p>
                )}
              </SheetItem>
            ) : null}
          </SheetBody>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
          {step === "summary" ? (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  store.restart();
                  setDraft({ ...EMPTY_ANSWERS, sex: draft.sex });
                  setStep("identity");
                }}
              >
                Start again
              </Button>
              <Button type="button" onClick={close}>
                Done
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={goBack}
                disabled={step === "intro"}
                className={step === "intro" ? "invisible" : undefined}
              >
                Back
              </Button>
              <Button type="button" onClick={goNext} disabled={step === "intro" && !healthConsent}>
                {step === "intro" ? "Begin" : step === "activity" ? "Finish" : "Continue"}
              </Button>
            </>
          )}
        </div>
      </div>
    </BloomSheet>
  );
}
