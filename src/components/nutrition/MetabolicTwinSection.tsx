/**
 * MetabolicTwinSection — the person's living model, on the Nutrition
 * page. Presentation only: every number comes from
 * `buildTwinSnapshot` (lib/twin), which computes on read from the
 * same record the rest of the page shows — the food log, the
 * weigh-ins, the habits — and reuses Bloom's gated estimators rather
 * than restating them.
 *
 * Anti-document form (brief v3): the five signals are TILES, not
 * paragraphs. A ready tile leads with its value as the figure, a
 * meter where the value is a share, and its source as a chip (solid
 * = measured from the record, dashed = estimated). A gathering tile
 * is dashed, shows "—", and meters its requirements from the counts
 * on the field itself — never from the prose unlock. The full
 * provenance sentences live in the "How the twin works" disclosure
 * under the grid; no number on a tile differs from the number the
 * rows before them showed.
 */

import { Fragment, useMemo } from "react";

import { useBodyProfile } from "@/hooks/useBodyProfile";
import { useHabits } from "@/hooks/useHabits";
import { useNutrition } from "@/hooks/useNutrition";
import { buildTwinSnapshot, type TwinField, type TwinProgress } from "@/lib/twin/twin";
import { pctOfTarget } from "@/lib/nutrition/targets";
import { fmtCount, fmtGrams } from "@/lib/format";

const signed1 = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}`;

function shortDay(dayKey: string): string {
  return new Date(`${dayKey}T12:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

/* ------------------------------- atoms ---------------------------------- */

function Meter({
  have,
  need,
  label,
  gold = false,
}: {
  have: number;
  need: number;
  label: string;
  gold?: boolean;
}) {
  const pct = need > 0 ? Math.min(100, Math.max(0, (have / need) * 100)) : 0;
  return (
    <div
      className={`nut-track tile-meter${gold ? " tile-meter--gold" : ""}`}
      role="progressbar"
      aria-label={label}
      aria-valuenow={have}
      aria-valuemin={0}
      aria-valuemax={need}
    >
      <span className="nut-track-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function ReqMeters({
  progress,
  metric,
}: {
  progress: readonly TwinProgress[];
  metric?: string | undefined;
}) {
  return (
    <ul className="req" data-metric={metric}>
      {progress.slice(0, 3).map((req) => (
        <li key={req.label}>
          <span>{req.label}</span>
          <Meter have={req.have} need={req.need} label={req.label} />
          <b>
            {req.have}/{req.need}
          </b>
        </li>
      ))}
    </ul>
  );
}

function SrcChip({ label, estimate = false }: { label: string; estimate?: boolean }) {
  return (
    <span className="nut-badge src-chip" data-estimate={estimate ? true : undefined}>
      {label}
    </span>
  );
}

function ReadyBadge() {
  return <span className="tile-badge tile-badge--ready">Ready</span>;
}

function GatheringBadge({ noData = false }: { noData?: boolean }) {
  return (
    <span className={`tile-badge ${noData ? "tile-badge--nodata" : "tile-badge--gathering"}`}>
      {noData ? "No data yet" : "Gathering data"}
    </span>
  );
}

function TileHead({ title, badge }: { title: string; badge: React.ReactNode }) {
  return (
    <header className="tile__head">
      <h3>{title}</h3>
      {badge}
    </header>
  );
}

function GatheringTile({
  title,
  badge,
  hint,
  progress,
  progressMetric,
  chip,
}: {
  title: string;
  badge: React.ReactNode;
  hint?: string | undefined;
  progress?: readonly TwinProgress[] | undefined;
  progressMetric?: string | undefined;
  chip: React.ReactNode;
}) {
  return (
    <article className="tile" data-state="gathering">
      <TileHead title={title} badge={badge} />
      <div className="tile__figure">
        <strong>—</strong>
      </div>
      {progress && progress.length > 0 ? (
        <ReqMeters progress={progress} metric={progressMetric} />
      ) : null}
      {hint ? <p className="tile__hint">{hint}</p> : null}
      <footer className="tile__foot">
        <span />
        {chip}
      </footer>
    </article>
  );
}

/* ------------------------------- section -------------------------------- */

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

  /* Editorial order (brief v3 §1), then ready before gathering —
     a stable partition, so a tile moves up only when its data
     arrives, never sideways. */
  const ordered: { key: string; field: TwinField<never> }[] = [
    { key: "habit", field: twin.habitAdherence as TwinField<never> },
    { key: "coverage", field: twin.logCoverage as TwinField<never> },
    { key: "expenditure", field: twin.expenditure as TwinField<never> },
    { key: "trend", field: twin.weightTrend as TwinField<never> },
    { key: "gaps", field: twin.nutrientGaps as TwinField<never> },
  ];
  const readyFirst = [
    ...ordered.filter((t) => t.field.state === "value"),
    ...ordered.filter((t) => t.field.state !== "value"),
  ];
  /* One gold figure per screen: the first ready tile's. */
  const goldKey = readyFirst.find((t) => t.field.state === "value")?.key;

  const habitTile = () =>
    twin.habitAdherence.state === "value" ? (
      <article className="tile" data-state="ready">
        <TileHead title="Habit rhythm" badge={<ReadyBadge />} />
        <div className="tile__figure" data-gold={goldKey === "habit" ? true : undefined}>
          <strong>{Math.round(twin.habitAdherence.value.rate * 100)}%</strong>
          <span>of due days done</span>
        </div>
        <Meter
          have={twin.habitAdherence.value.doneDays}
          need={twin.habitAdherence.value.dueDays}
          label="Habit rhythm"
          gold={goldKey === "habit"}
        />
        <footer className="tile__foot">
          <span>
            {twin.habitAdherence.value.doneDays} of {twin.habitAdherence.value.dueDays} · last{" "}
            {twin.habitAdherence.value.windowDays} days
          </span>
          <SrcChip label="Habit log" />
        </footer>
      </article>
    ) : (
      <GatheringTile
        title="Habit rhythm"
        badge={<GatheringBadge noData={twin.habitAdherence.reason === "No active habits."} />}
        hint={twin.habitAdherence.reason}
        progress={twin.habitAdherence.progress}
        chip={<SrcChip label="Habit log" />}
      />
    );

  const coverageTile = () => {
    /* twin.ts always returns a value field for coverage (pinned in
       twin.test.ts); the check only satisfies the union type. */
    if (twin.logCoverage.state !== "value") return null;
    const cov = twin.logCoverage.value;
    return (
      <article className="tile" data-state="ready">
        <TileHead title="Food-log coverage" badge={<ReadyBadge />} />
        <div className="tile__figure" data-gold={goldKey === "coverage" ? true : undefined}>
          <strong>
            {cov.daysLogged}/{cov.windowDays}
          </strong>
          <span>days logged</span>
        </div>
        {cov.avgKcal !== null && cov.avgProteinG !== null ? (
          <div className="vstats">
            <div className="vstat">
              <b data-metric="intake-kcal-avg">{fmtCount(cov.avgKcal)} kcal</b>
              <span>
                {cov.kcalVsTarget !== null && targets ? (
                  <>
                    avg ·{" "}
                    <span data-metric="intake-kcal-pct">
                      {pctOfTarget(cov.avgKcal, targets.kcal)}%
                    </span>{" "}
                    of your energy target
                  </>
                ) : (
                  "daily average"
                )}
              </span>
            </div>
            <div className="vstat">
              <b data-metric="intake-protein-avg">{fmtGrams(cov.avgProteinG)} g</b>
              <span>
                {cov.proteinVsTarget !== null && targets ? (
                  <>
                    avg ·{" "}
                    <span data-metric="intake-protein-pct">
                      {pctOfTarget(cov.avgProteinG, targets.proteinG)}%
                    </span>{" "}
                    of your protein target
                  </>
                ) : (
                  "daily average"
                )}
              </span>
            </div>
          </div>
        ) : null}
        {cov.daysLogged / cov.windowDays < 0.5 ? (
          <p className="tile__hint">Logging looks partial.</p>
        ) : null}
        <footer className="tile__foot">
          <span>last {cov.windowDays} days</span>
          <SrcChip label="Food log" />
        </footer>
      </article>
    );
  };

  const expenditureTile = () =>
    twin.expenditure.state === "value" ? (
      <article className="tile" data-state="ready">
        <TileHead title="Maintenance energy" badge={<ReadyBadge />} />
        <div className="tile__figure" data-gold={goldKey === "expenditure" ? true : undefined}>
          <strong data-metric="maintenance-kcal">
            {fmtCount(twin.expenditure.value.maintenanceKcal)} kcal
          </strong>
          <span>a day</span>
        </div>
        <footer className="tile__foot">
          <span>
            intake averaged {fmtCount(twin.expenditure.value.avgIntakeKcal)} kcal · weight{" "}
            {signed1(twin.expenditure.value.weightChangeKg)} kg
          </span>
          <SrcChip label="Food log and weigh-ins" estimate />
        </footer>
      </article>
    ) : (
      <GatheringTile
        title="Maintenance energy"
        badge={<GatheringBadge />}
        hint="Needs two weigh-ins 10+ days apart."
        progress={twin.expenditure.progress}
        progressMetric="maintenance-requirements"
        chip={<SrcChip label="Food log and weigh-ins" estimate />}
      />
    );

  const trendTile = () =>
    twin.weightTrend.state === "value" ? (
      <article className="tile" data-state="ready">
        <TileHead title="Weight trend" badge={<ReadyBadge />} />
        <div className="tile__figure" data-gold={goldKey === "trend" ? true : undefined}>
          <strong>{signed1(twin.weightTrend.value.changeKg)} kg</strong>
          <span>
            over {twin.weightTrend.value.spanDays}{" "}
            {twin.weightTrend.value.spanDays === 1 ? "day" : "days"}
          </span>
        </div>
        <footer className="tile__foot">
          <span>
            {twin.weightTrend.value.fromKg.toFixed(1)} kg {shortDay(twin.weightTrend.value.fromDate)}{" "}
            → {twin.weightTrend.value.toKg.toFixed(1)} kg {shortDay(twin.weightTrend.value.toDate)}
            {twin.weightTrend.value.rateKgPerWeek !== null
              ? ` · ${signed1(twin.weightTrend.value.rateKgPerWeek)} kg a week`
              : ""}
          </span>
          <SrcChip label="Weigh-ins" />
        </footer>
      </article>
    ) : (
      <GatheringTile
        title="Weight trend"
        badge={<GatheringBadge noData={twin.weightTrend.reason === "No weigh-ins on record yet."} />}
        hint={`${twin.weightTrend.reason} ${twin.weightTrend.unlock}`}
        progress={twin.weightTrend.progress}
        chip={<SrcChip label="Weigh-ins" />}
      />
    );

  const gapsTile = () =>
    twin.nutrientGaps.state === "value" ? (
      <article className="tile" data-state="ready">
        <TileHead title="Nutrient gaps" badge={<ReadyBadge />} />
        <div className="tile__figure" data-gold={goldKey === "gaps" ? true : undefined}>
          <strong>{twin.nutrientGaps.value.length}</strong>
          <span>
            {twin.nutrientGaps.value.length === 1 ? "nutrient" : "nutrients"} under 70% of
            reference
          </span>
        </div>
        {twin.nutrientGaps.value.length > 0 ? (
          <ul className="space-y-1.5">
            {twin.nutrientGaps.value.map((gap) => (
              <li
                key={gap.key}
                className="flex flex-wrap items-baseline justify-between gap-2 text-[length:var(--text-support)] text-muted-foreground"
              >
                <span className="text-foreground">{gap.label}</span>
                <span>
                  {gap.unit === "g" ? Math.round(gap.avg * 10) / 10 : Math.round(gap.avg)} {gap.unit}{" "}
                  a day · reference {gap.reference} {gap.unit} · {gap.days} days
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="tile__hint">
            No nutrient is running under 70% of its reference in the days judged.
          </p>
        )}
        <footer className="tile__foot">
          <span />
          <SrcChip label="Food log" />
        </footer>
      </article>
    ) : (
      <GatheringTile
        title="Nutrient gaps"
        badge={<GatheringBadge />}
        hint={twin.nutrientGaps.unlock}
        progress={twin.nutrientGaps.progress}
        chip={<SrcChip label="Food log" />}
      />
    );

  const tileFor = (key: string) =>
    key === "habit"
      ? habitTile()
      : key === "coverage"
        ? coverageTile()
        : key === "expenditure"
          ? expenditureTile()
          : key === "trend"
            ? trendTile()
            : gapsTile();

  const provenanceLines: { label: string; field: TwinField<never> }[] = [
    { label: "Maintenance energy", field: twin.expenditure as TwinField<never> },
    { label: "Weight trend", field: twin.weightTrend as TwinField<never> },
    { label: "Habit rhythm", field: twin.habitAdherence as TwinField<never> },
    { label: "Food-log coverage", field: twin.logCoverage as TwinField<never> },
    { label: "Nutrient gaps", field: twin.nutrientGaps as TwinField<never> },
  ];

  return (
    <section className="nut-card nut-rise mt-4" aria-label="Your metabolic twin">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[length:var(--text-section)] text-foreground">
            Your metabolic twin
          </h2>
          <p className="mt-1.5 text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
            Computed fresh from your record. Nothing stored, nothing guessed.
          </p>
        </div>
        <div className="flex items-center gap-2.5 pt-1">
          <span className="twin-dots" aria-hidden="true">
            {readyFirst.map((t) => (
              <i key={t.key} data-ready={t.field.state === "value" ? true : undefined} />
            ))}
          </span>
          <span className="text-[length:var(--text-callout)] text-muted-foreground">
            {twin.readyCount} of {twin.totalFields} signals ready
          </span>
        </div>
      </div>

      <div className="tile-grid mt-5">
        {readyFirst.map((t) => (
          <Fragment key={t.key}>{tileFor(t.key)}</Fragment>
        ))}
      </div>

      <details className="mt-5">
        <summary className="cursor-pointer text-[length:var(--text-callout)] font-medium text-foreground">
          How the twin works
        </summary>
        <div className="mt-3 space-y-3">
          {provenanceLines.map(({ label, field }) => (
            <p
              key={label}
              className="text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground"
            >
              <strong className="text-foreground">{label}.</strong> {field.provenance}.
              {field.state === "insufficient" ? ` ${field.reason} ${field.unlock}` : ""}
            </p>
          ))}
        </div>
      </details>
    </section>
  );
}
