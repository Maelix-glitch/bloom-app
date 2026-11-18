/**
 * MetabolicTwinSection — the person's living model, on the Nutrition
 * page. Presentation only: every number comes from
 * `buildTwinSnapshot` (lib/twin), which computes on read from the
 * same record the rest of the page shows — the food log, the
 * weigh-ins, the habits — and reuses Bloom's gated estimators rather
 * than restating them.
 *
 * The Twin is a standing model, not a plan artefact, so it renders
 * whether or not a plan exists for today (the "What your plan
 * learned" block inside the plan section cannot). Each field shows
 * its value with the provenance of the computation, or — when the
 * record cannot honestly support a value — what exists and what
 * would unlock it. No field ever shows a dressed-up guess.
 */

import { useMemo } from "react";

import { useBodyProfile } from "@/hooks/useBodyProfile";
import { useHabits } from "@/hooks/useHabits";
import { useNutrition } from "@/hooks/useNutrition";
import { buildTwinSnapshot, type TwinField } from "@/lib/twin/twin";
import { formatGrams } from "./input";

const whole = (n: number) => Math.round(n).toLocaleString("en-US");
const signed1 = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}`;

function shortDay(dayKey: string): string {
  return new Date(`${dayKey}T12:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function FieldRow({
  label,
  children,
  provenance,
}: {
  label: string;
  children: React.ReactNode;
  provenance: string;
}) {
  return (
    <div className="py-3.5 first:pt-0 last:pb-0">
      <p className="nut-group-label">{label}</p>
      <div className="mt-1.5 text-[length:var(--text-callout)] leading-[var(--leading-body)] text-foreground">
        {children}
      </div>
      <p className="mt-1 text-[length:var(--text-caption)] leading-[var(--leading-body)] text-muted-foreground">
        {provenance}
      </p>
    </div>
  );
}

function Insufficient({ field }: { field: TwinField<never> }) {
  if (field.state !== "insufficient") return null;
  return (
    <>
      <span className="text-muted-foreground">{field.reason}</span>{" "}
      <span className="text-muted-foreground">{field.unlock}</span>
    </>
  );
}

export function MetabolicTwinSection() {
  const nutrition = useNutrition();
  const body = useBodyProfile();
  const habitsStore = useHabits();

  const targets =
    nutrition.targetState.kind === "ready" ? nutrition.targetState.targets : null;

  const twin = useMemo(
    () =>
      buildTwinSnapshot({
        entries: nutrition.entries,
        weighIns: body.weighIns,
        habits: habitsStore.habits,
        habitLogs: habitsStore.logs,
        targets,
        sex: nutrition.spectrumSex,
        day: nutrition.today,
      }),
    [
      nutrition.entries,
      nutrition.spectrumSex,
      nutrition.today,
      body.weighIns,
      habitsStore.habits,
      habitsStore.logs,
      targets,
    ],
  );

  return (
    <section className="nut-card nut-rise mt-4" aria-label="Your metabolic twin">
      <p className="eyebrow">Metabolic twin</p>
      <h2 className="mt-2 font-display text-[length:var(--text-section)] text-foreground">
        Your metabolic twin
      </h2>
      <p className="mt-2 max-w-[58ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
        A living model of you, computed from your own record each time you look — nothing
        stored, nothing guessed. {twin.readyCount} of {twin.totalFields} signals have enough
        data to speak today.
      </p>

      <div className="mt-4 divide-y divide-border border-t border-border-subtle">
        <FieldRow label="Maintenance energy" provenance={twin.expenditure.provenance}>
          {twin.expenditure.state === "value" ? (
            <>
              <span className="font-display text-[length:var(--text-title)] text-foreground">
                {whole(twin.expenditure.value.maintenanceKcal)} kcal
              </span>{" "}
              a day — what your record says your body actually burns. Your logged intake
              averaged {whole(twin.expenditure.value.avgIntakeKcal)} kcal over that window,
              with your weight moving {signed1(twin.expenditure.value.weightChangeKg)} kg.
            </>
          ) : (
            <Insufficient field={twin.expenditure} />
          )}
        </FieldRow>

        <FieldRow label="Weight trend" provenance={twin.weightTrend.provenance}>
          {twin.weightTrend.state === "value" ? (
            <>
              <span className="font-display text-[length:var(--text-title)] text-foreground">
                {signed1(twin.weightTrend.value.changeKg)} kg
              </span>{" "}
              over {twin.weightTrend.value.spanDays}{" "}
              {twin.weightTrend.value.spanDays === 1 ? "day" : "days"} —{" "}
              {twin.weightTrend.value.fromKg.toFixed(1)} kg on{" "}
              {shortDay(twin.weightTrend.value.fromDate)} to{" "}
              {twin.weightTrend.value.toKg.toFixed(1)} kg on{" "}
              {shortDay(twin.weightTrend.value.toDate)}
              {twin.weightTrend.value.rateKgPerWeek !== null
                ? `, about ${signed1(twin.weightTrend.value.rateKgPerWeek)} kg a week`
                : ""}
              .
            </>
          ) : (
            <Insufficient field={twin.weightTrend} />
          )}
        </FieldRow>

        <FieldRow label="Habit rhythm" provenance={twin.habitAdherence.provenance}>
          {twin.habitAdherence.state === "value" ? (
            <>
              <span className="font-display text-[length:var(--text-title)] text-foreground">
                {Math.round(twin.habitAdherence.value.rate * 100)}%
              </span>{" "}
              of due days done — {twin.habitAdherence.value.doneDays} of{" "}
              {twin.habitAdherence.value.dueDays} across {twin.habitAdherence.value.habits}{" "}
              active {twin.habitAdherence.value.habits === 1 ? "habit" : "habits"}.
            </>
          ) : (
            <Insufficient field={twin.habitAdherence} />
          )}
        </FieldRow>

        <FieldRow label="Food-log coverage" provenance={twin.logCoverage.provenance}>
          {twin.logCoverage.state === "value" ? (
            <>
              Logged <strong>{twin.logCoverage.value.daysLogged}</strong> of the last{" "}
              {twin.logCoverage.value.windowDays} days.
              {twin.logCoverage.value.avgKcal !== null &&
              twin.logCoverage.value.avgProteinG !== null ? (
                <>
                  {" "}
                  On those days you averaged {whole(twin.logCoverage.value.avgKcal)} kcal and{" "}
                  {formatGrams(twin.logCoverage.value.avgProteinG)} g protein
                  {twin.logCoverage.value.kcalVsTarget !== null &&
                  twin.logCoverage.value.proteinVsTarget !== null
                    ? ` — ${Math.round(twin.logCoverage.value.kcalVsTarget * 100)}% of your energy target, ${Math.round(twin.logCoverage.value.proteinVsTarget * 100)}% of your protein target`
                    : ""}
                  .
                </>
              ) : null}
            </>
          ) : null}
        </FieldRow>

        <FieldRow label="Nutrient gaps" provenance={twin.nutrientGaps.provenance}>
          {twin.nutrientGaps.state === "value" ? (
            twin.nutrientGaps.value.length > 0 ? (
              <ul className="space-y-1">
                {twin.nutrientGaps.value.map((gap) => (
                  <li key={gap.key}>
                    {gap.label} averaged{" "}
                    {gap.unit === "g" ? Math.round(gap.avg * 10) / 10 : Math.round(gap.avg)}{" "}
                    {gap.unit} a day over {gap.days} logged days, against the {gap.reference}{" "}
                    {gap.unit} reference.
                  </li>
                ))}
              </ul>
            ) : (
              "No nutrient is running under 70% of its reference in the days judged."
            )
          ) : (
            <Insufficient field={twin.nutrientGaps} />
          )}
        </FieldRow>
      </div>
    </section>
  );
}
