/**
 * Ledger — trackers as a bookkeeper's sheet.
 *
 * No cards, no rings, no dials. Rules instead of boxes, tabular figures instead
 * of charts, and the fourteen-day history reduced to a row of ticks inside each
 * line. Everything is set in a monospace face where it's a number and a sans
 * face where it's a word.
 */

import { useRef, useState } from "react";

import { Correlations } from "@/components/tk/Correlations";
import { HistoryTable } from "@/components/tk/HistoryTable";
import { LogPanel } from "@/components/tk/LogPanel";
import { TrackerIcon } from "@/components/tk/icons";
import { TRACKERS, type TrackerDef } from "@/lib/trackers/core";
import { formatDate } from "@/lib/cycle/predict";

import { applyQuickAdd, Footer, Observations, SyncNote, useTrackers, valuesOf } from "./shared";

const QUICK: Partial<Record<string, { amount: number; label: string }[]>> = {
  water: [{ amount: 250, label: "+250" }, { amount: 500, label: "+500" }],
  movement: [{ amount: 10, label: "+10m" }, { amount: 20, label: "+20m" }],
  screen: [{ amount: 30, label: "+30m" }, { amount: 60, label: "+60m" }],
  study: [{ amount: 25, label: "+25m" }, { amount: 50, label: "+50m" }],
};

export function Ledger({ theme = "nocturne" }: { theme?: string }) {
  const store = useTrackers();
  const { analysis, goals, today, hydrated } = store;
  const [notice, setNotice] = useState<string | null>(null);
  const [date, setDate] = useState<string>(today);
  const logRef = useRef<HTMLDivElement>(null);

  const defs = TRACKERS;
  const hasDays = analysis.daysLogged > 0;

  const tap = (def: TrackerDef, amount: number) => {
    setNotice(applyQuickAdd(store, def.id, amount) ?? `${def.name} logged for today.`);
  };

  return (
    <div className="ci ci-root tk2-root" data-theme={theme} data-design="ledger">
      <div className="lg">
        {/* ------------------------------ masthead ----------------------------- */}
        <header className="lg-masthead">
          <div>
            <p className="lg-kicker">Bloom · Daily ledger</p>
            <h1 className="lg-title">Six entries a day.</h1>
            <p className="lg-lede">
              Sleep, water, study, movement, energy, screen. One line each, totalled honestly —
              nothing estimated, nothing filled in for you.
            </p>
            <SyncNote sync={store.sync} onRetry={store.syncNow} />
          </div>
          <dl className="lg-meta">
            <div>
              <dt>Sheet</dt>
              <dd>{formatDate(today)}</dd>
            </div>
            <div>
              <dt>On target</dt>
              <dd>
                {analysis.goalsMetToday}/{TRACKERS.length}
              </dd>
            </div>
            <div>
              <dt>Days kept</dt>
              <dd>{analysis.daysLogged}</dd>
            </div>
          </dl>
        </header>

        {!hydrated ? (
          <div className="lg-loading" aria-hidden>
            reading this device…
          </div>
        ) : (
          <>
            {/* ------------------------------- the sheet ---------------------------- */}
            <section className="lg-sheet" aria-label="Today's six entries">
              <div className="lg-row lg-row--head">
                <span>Entry</span>
                <span>Today</span>
                <span>Target</span>
                <span>Fourteen days</span>
                <span>Avg 7</span>
                <span>Run</span>
                <span>
                  <span className="lg-sr">Quick add</span>
                </span>
              </div>

              {defs.map((def) => {
                const stat = analysis.trackers[def.id];
                const points = valuesOf(store, def.id);
                const peak = Math.max(
                  ...points.map((p) => p.value ?? 0),
                  def.goalKey ? (goals[def.goalKey] as number) : 0,
                  1,
                );
                const steps = QUICK[def.id] ?? [];
                return (
                  <div className="lg-row" key={def.id}>
                    <span className="lg-entry">
                      <TrackerIcon id={def.id} size={14} />
                      {def.name}
                    </span>
                    <span className="lg-fig lg-fig--strong">
                      {stat.today === null ? "—" : def.format(Math.round(stat.today))}
                    </span>
                    <span className="lg-fig">{def.format(stat.goal)}</span>
                    <span className="lg-ticks" role="img" aria-label={`${def.name}, last fourteen days`}>
                      {points.map((p) => (
                        <i
                          key={p.date}
                          data-met={p.met ? "true" : "false"}
                          style={{
                            height: `${Math.round(((p.value ?? 0) / peak) * 100)}%`,
                          }}
                        />
                      ))}
                    </span>
                    <span className="lg-fig">
                      {stat.avg7 === null ? "—" : def.format(Math.round(stat.avg7))}
                    </span>
                    <span className="lg-fig">{stat.streak > 0 ? `${stat.streak}d` : "—"}</span>
                    <span className="lg-actions">
                      {def.id === "energy"
                        ? [1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => tap(def, n)}
                              aria-label={`Set energy to ${n}`}
                              aria-pressed={stat.today === n}
                            >
                              {n}
                            </button>
                          ))
                        : steps.map((s) => (
                            <button
                              key={s.amount}
                              type="button"
                              onClick={() => tap(def, s.amount)}
                              aria-label={`Add ${s.label} to ${def.name}`}
                            >
                              {s.label}
                            </button>
                          ))}
                    </span>
                  </div>
                );
              })}
            </section>
            <p aria-live="polite" className="lg-notice">
              {notice}
            </p>

            {/* -------------------------------- log ------------------------------ */}
            <div ref={logRef} className="lg-block">
              <p className="lg-blockhead">Post an entry</p>
              <LogPanel
                days={store.days}
                today={today}
                date={date}
                onDateChange={setDate}
                onSave={store.saveDay}
                onDelete={store.removeDay}
              />
            </div>

            {hasDays ? (
              <>
                {/* ---------------------------- the record ------------------------- */}
                <section className="lg-block">
                  <p className="lg-blockhead">The record · last fourteen days</p>
                  <div className="lg-table-scroll">
                    <table className="lg-table">
                      <thead>
                        <tr>
                          <th scope="col">Date</th>
                          {defs.map((def) => (
                            <th scope="col" key={def.id}>
                              {def.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {valuesOf(store, "sleep")
                          .slice()
                          .reverse()
                          .map(({ date: day }) => (
                            <tr key={day}>
                              <th scope="row">{day.slice(5)}</th>
                              {defs.map((def) => {
                                const point = store.analysis.trackers[def.id].series.find(
                                  (p) => p.date === day,
                                );
                                const value = point?.value ?? null;
                                return (
                                  <td key={def.id}>
                                    {value === null ? (
                                      <span className="lg-dash">—</span>
                                    ) : (
                                      <>
                                        <span>{def.format(Math.round(value))}</span>
                                        <i data-met={point?.met === true ? "true" : "false"} aria-hidden />
                                      </>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="lg-fine">
                    A filled dot means that day reached the target in the right-hand column.
                  </p>
                </section>

                {/* ---------------------------- where the time went ---------------- */}
                {analysis.subjects.length > 0 ? (
                  <section className="lg-block">
                    <p className="lg-blockhead">Study · by subject</p>
                    <ul className="lg-leaders">
                      {analysis.subjects.slice(0, 6).map((s) => (
                        <li key={s.subject}>
                          <span>{s.subject}</span>
                          <i aria-hidden />
                          <span>
                            {TRACKERS[2]!.format(s.minutes)} · {s.sessions}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {/* ------------------------------- the deep read -------------------- */}
                <section className="lg-block">
                  <p className="lg-blockhead">Advanced · bright days against low ones</p>
                  <p className="lg-statement">{analysis.advanced.headline}</p>
                  {analysis.advanced.contrasts.length > 0 ? (
                    <table className="lg-table lg-table--insight">
                      <thead>
                        <tr>
                          <th scope="col">Entry</th>
                          <th scope="col">Low days ({analysis.advanced.low})</th>
                          <th scope="col">Bright days ({analysis.advanced.bright})</th>
                          <th scope="col">Diff</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.advanced.contrasts.slice(0, 4).map((c) => {
                          const def = defs.find((d) => d.id === c.id);
                          if (!def) return null;
                          return (
                            <tr key={c.id}>
                              <th scope="row">{def.name}</th>
                              <td>{def.format(Math.round(c.low))}</td>
                              <td>{def.format(Math.round(c.bright))}</td>
                              <td>
                                {c.delta > 0 ? "+" : ""}
                                {c.delta}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : null}
                  <ul className="lg-finelist">
                    {analysis.advanced.detail.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </section>

                <section className="lg-block">
                  <p className="lg-blockhead">What the record shows</p>
                  <Observations items={analysis.observations} className="lg-observations" />
                </section>

                {analysis.correlations.length > 0 ? (
                  <section className="lg-block">
                    <p className="lg-blockhead">What moves together</p>
                    <Correlations items={analysis.correlations} />
                  </section>
                ) : null}

                <section className="lg-block">
                  <p className="lg-blockhead">Every entry</p>
                  <HistoryTable
                    days={store.days}
                    analysis={analysis}
                    onEdit={setDate}
                    onDelete={store.removeDay}
                  />
                </section>
              </>
            ) : (
              <section className="lg-block">
                <p className="lg-statement">
                  This sheet is empty. Post one entry above — even a single glass of water — and the
                  fourteen-day columns start filling in.
                </p>
              </section>
            )}

            <Footer />
          </>
        )}
      </div>
    </div>
  );
}

export default Ledger;
