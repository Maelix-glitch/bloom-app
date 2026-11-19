import { useMemo } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { usePeriodLog } from "@/hooks/usePeriodLog";
import { buildDoctorSummary } from "@/lib/cycle/doctorSummary";
import { cyclePatterns } from "@/lib/cycle/patternGuidance";
import { CYCLE_DEFAULTS, formatDate } from "@/lib/cycle/predict";

/**
 * The doctor summary page (/cycle-report) — the printable twelve months.
 * A flat route of its own (not a child of /cycle, whose page renders no
 * Outlet), following the Nutrition report's pattern: a real route, a Print
 * button, print CSS that turns the page into ink on paper. It carries no
 * app chrome, which suits a page meant to be printed. Free, always —
 * taking your own history to a doctor is never a paid feature.
 */
export function DoctorSummaryPage() {
  const store = usePeriodLog();
  const { analysis, logs, today, hydrated } = store;

  const summary = useMemo(
    () => buildDoctorSummary({ logs, days: store.days, analysis, today }),
    [logs, store.days, analysis, today],
  );
  const patterns = useMemo(
    () =>
      cyclePatterns({
        logs,
        days: store.days,
        analysis,
        expecting: store.mode === "tracking" && !store.predictionsOff,
        personalMaxPlausible:
          store.settings.personalMaxPlausible ?? CYCLE_DEFAULTS.maxPlausible,
      }),
    [logs, store.days, analysis, store.mode, store.predictionsOff, store.settings],
  );

  return (
    <div className="ci-report mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <div className="ci-report-print-hide mb-5 flex items-center justify-between gap-3">
        <a href="/cycle" className="ci-btn ci-btn--ghost ci-btn--sm">
          <ArrowLeft size={13} aria-hidden />
          Back to your cycle
        </a>
        <button
          type="button"
          className="ci-btn ci-btn--primary ci-btn--sm"
          onClick={() => window.print()}
        >
          <Printer size={13} aria-hidden />
          Print / save as PDF
        </button>
      </div>

      <header>
        <p className="ci-eyebrow">Bloom · Cycle summary</p>
        <h1 className="ci-display mt-1 text-[26px]">For your doctor</h1>
        <p className="mt-1.5 text-[13px] ci-soft">
          {summary.fromLabel} – {summary.toLabel} · Prepared {formatDate(today)} from the record
          kept in Bloom. Everything below is logged history — no predictions are printed as facts.
        </p>
      </header>

      {!hydrated ? (
        <p className="mt-8 text-[13px] ci-muted">Reading your record…</p>
      ) : logs.length === 0 ? (
        <p className="mt-8 text-[13px] ci-soft">
          Nothing to summarise yet — once periods are logged, this page prints the last twelve
          months to take to an appointment.
        </p>
      ) : (
        <>
          <section className="mt-6">
            <h2 className="text-[15px] font-medium" style={{ color: "var(--ci-text)" }}>
              At a glance
            </h2>
            <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {summary.stats.map((s) => (
                <div
                  key={s.label}
                  className="flex items-baseline justify-between gap-3 border-b pb-1.5 ci-hair"
                >
                  <dt className="text-[12.5px] ci-muted">{s.label}</dt>
                  <dd className="text-[13px] font-medium" style={{ color: "var(--ci-text)" }}>
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-7">
            <h2 className="text-[15px] font-medium" style={{ color: "var(--ci-text)" }}>
              Periods
            </h2>
            <table className="ci-table mt-2 w-full">
              <thead>
                <tr>
                  <th>Started</th>
                  <th>Last day</th>
                  <th>Bleed</th>
                  <th>Cycle</th>
                  <th>Flow</th>
                </tr>
              </thead>
              <tbody>
                {summary.rows.map((r) => (
                  <tr key={r.start}>
                    <td>{r.startLabel}</td>
                    <td>{r.endLabel ?? "not recorded"}</td>
                    <td>{r.bleedDays !== null ? `${r.bleedDays}d` : "—"}</td>
                    <td>{r.cycleDays !== null ? `${r.cycleDays}d` : "—"}</td>
                    <td>
                      {r.flow ?? "—"}
                      {r.excluded ? " · excluded from averages" : ""}
                      {r.notes ? ` · ${r.notes}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {summary.topSymptoms.length > 0 ? (
            <section className="mt-7">
              <h2 className="text-[15px] font-medium" style={{ color: "var(--ci-text)" }}>
                Most logged symptoms
              </h2>
              <p className="mt-1.5 text-[13px] ci-soft">
                {summary.topSymptoms
                  .map((s) => `${s.symptom} (${s.days} ${s.days === 1 ? "day" : "days"})`)
                  .join(" · ")}
              </p>
            </section>
          ) : null}

          {summary.deviations.length > 0 ? (
            <section className="mt-7">
              <h2 className="text-[15px] font-medium" style={{ color: "var(--ci-text)" }}>
                Stretches left out of the averages
              </h2>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] ci-soft">
                {summary.deviations.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {patterns.length > 0 ? (
            <section className="mt-7">
              <h2 className="text-[15px] font-medium" style={{ color: "var(--ci-text)" }}>
                Patterns Bloom noticed
              </h2>
              <ul className="mt-1.5 space-y-2">
                {patterns.map((p) => (
                  <li key={p.id} className="text-[13px] ci-soft">
                    <span className="font-medium" style={{ color: "var(--ci-text)" }}>
                      {p.title}.
                    </span>{" "}
                    {p.body}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <footer className="mt-8 border-t pt-3 ci-hair">
            <p className="text-[11.5px] leading-relaxed ci-muted">
              Bloom is a tracking companion, not a medical device, and nothing here is a diagnosis.
              Dates and lengths are as logged; where Bloom estimates anything in the app, it labels
              it an estimate.
            </p>
          </footer>
        </>
      )}
    </div>
  );
}
