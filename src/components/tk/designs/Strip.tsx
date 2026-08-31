/**
 * Strip — trackers as a filmstrip.
 *
 * One full-width band per tracker, fourteen day-cells across it, and a single
 * playhead that runs vertically through every band at today. Big display
 * numerals on the left, the target as a notch, the quick-adds riding the right
 * edge. Nothing is stacked in cards; the page reads left to right.
 */

import { useRef, useState } from "react";

import { Correlations } from "@/components/tk/Correlations";
import { HistoryTable } from "@/components/tk/HistoryTable";
import { LogPanel } from "@/components/tk/LogPanel";
import { TRACKERS, type TrackerId } from "@/lib/trackers/core";
import { formatDateShort } from "@/lib/cycle/predict";

import { Achievements, TargetSheet } from "./Targets";
import { applyQuickAdd, Footer, Observations, SyncNote, useTrackers } from "./shared";

const STEPS: Partial<Record<TrackerId, { amount: number; label: string }[]>> = {
  water: [{ amount: 250, label: "+250" }, { amount: 500, label: "+500" }],
  movement: [{ amount: 10, label: "+10m" }, { amount: 20, label: "+20m" }],
  screen: [{ amount: 30, label: "+30m" }, { amount: 60, label: "+60m" }],
  study: [{ amount: 25, label: "+25m" }, { amount: 50, label: "+50m" }],
};

export function Strip({ theme = "nocturne" }: { theme?: string }) {
  const store = useTrackers();
  const { analysis, today, hydrated } = store;
  const [notice, setNotice] = useState<string | null>(null);
  const [date, setDate] = useState<string>(today);
  const logRef = useRef<HTMLDivElement>(null);
  const hasDays = analysis.daysLogged > 0;
  const defs = TRACKERS;

  const tap = (id: TrackerId, amount: number) => {
    const def = defs.find((d) => d.id === id)!;
    setNotice(applyQuickAdd(store, id, amount) ?? `${def.name} logged.`);
  };

  return (
    <div className="ci ci-root tk2-root" data-theme={theme} data-design="strip">
      <div className="sp">
        <header className="sp-head">
          <p className="sp-kicker">{formatDateShort(today)} · running strip</p>
          <h1 className="sp-title">
            Six bands.
            <br />
            Fourteen days.
          </h1>
          <p className="sp-lede">
            Each band is one tracker, each cell one day, and the line is today. Tap a cell to scroll
            the strip, or use the buttons on the right to add to today.
          </p>
          <SyncNote sync={store.sync} onRetry={store.syncNow} />
        </header>

        {!hydrated ? (
          <p className="sp-loading" aria-hidden>
            loading the strip…
          </p>
        ) : (
          <>
            {/* ------------------------------- the bands ---------------------------- */}
            <section className="sp-strip" aria-label="Fourteen days of all six trackers">
              <div className="sp-axis" aria-hidden>
                <span />
                {analysis.trackers.sleep.series.map((p, i) => (
                  <span key={p.date} data-today={i === 13 ? "true" : "false"}>
                    {p.date.slice(8)}
                  </span>
                ))}
              </div>

              {defs.map((def) => {
                const stat = analysis.trackers[def.id];
                const peak = Math.max(...stat.series.map((p) => p.value ?? 0), stat.goal, 1);
                const steps = STEPS[def.id] ?? [];
                return (
                  <div className="sp-band" key={def.id} data-id={def.id}>
                    <div className="sp-band-id">
                      <span className="sp-band-name">{def.name}</span>
                      <span className="sp-band-fig">
                        {stat.today === null ? "—" : def.format(Math.round(stat.today))}
                      </span>
                      <span className="sp-band-sub">of {def.format(stat.goal)}</span>
                    </div>

                    <div className="sp-cells">
                      {stat.series.map((point, i) => {
                        const value = point.value;
                        const share = value === null ? 0 : value / peak;
                        return (
                          <span
                            key={point.date}
                            className="sp-cell"
                            data-today={i === 13 ? "true" : "false"}
                            data-met={point.met === true ? "true" : "false"}
                            title={`${point.date}: ${value === null ? "not logged" : def.format(Math.round(value))}`}
                          >
                            <i style={{ height: `${Math.round(share * 100)}%` }} aria-hidden />
                          </span>
                        );
                      })}
                      <span
                        className="sp-target"
                        style={{ bottom: `${Math.round((stat.goal / peak) * 100)}%` }}
                        aria-hidden
                      />
                    </div>

                    <div className="sp-band-actions">
                      {def.id === "energy" ? (
                        [1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => tap(def.id, n)}
                            aria-label={`Set energy to ${n}`}
                            aria-pressed={stat.today === n}
                          >
                            {n}
                          </button>
                        ))
                      ) : steps.length > 0 ? (
                        steps.map((s) => (
                          <button
                            key={s.amount}
                            type="button"
                            onClick={() => tap(def.id, s.amount)}
                            aria-label={`Add ${s.label} to ${def.name}`}
                          >
                            {s.label}
                          </button>
                        ))
                      ) : (
                        <button
                          type="button"
                          onClick={() => logRef.current?.scrollIntoView({ block: "start" })}
                        >
                          log
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="sp-playhead" aria-hidden />
            </section>
            <p aria-live="polite" className="sp-notice">
              {notice}
            </p>

            <section className="sp-section">
              <p className="sp-sectionhead">Targets · what the bands measure against</p>
              <TargetSheet store={store} />
            </section>

            <section className="sp-section">
              <p className="sp-sectionhead">Achievements</p>
              <Achievements analysis={analysis} />
            </section>

            {/* --------------------------------- log -------------------------------- */}
            <div ref={logRef} className="sp-section">
              <p className="sp-sectionhead">Today's entry</p>
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
                {/* ---------------------------- study heat -------------------------- */}
                <section className="sp-section">
                  <p className="sp-sectionhead">Study · twelve weeks</p>
                  <div className="sp-heat">
                    {store.analysis.entries
                      .slice()
                      .reverse()
                      .slice(0, 84)
                      .map((day) => {
                        const minutes = day.sessions.reduce((sum, s) => sum + s.minutes, 0);
                        const level =
                          minutes === 0 ? 0 : Math.min(4, Math.ceil(minutes / (store.goals.studyMinutes / 3)));
                        return (
                          <i
                            key={day.date}
                            data-level={level}
                            data-today={day.date === today ? "true" : "false"}
                            title={`${day.date}: ${minutes}m`}
                          />
                        );
                      })}
                  </div>
                  <p className="sp-fine">
                    Darker cells are days with more study logged. Empty cells are days without an
                    entry — they're left blank rather than averaged over.
                  </p>
                </section>

                {/* ------------------------------ deep read ------------------------- */}
                <section className="sp-section">
                  <p className="sp-sectionhead">Advanced · bright days against low ones</p>
                  <p className="sp-statement">{analysis.advanced.headline}</p>
                  <div className="sp-contrasts">
                    {analysis.advanced.contrasts.slice(0, 4).map((c) => {
                      const def = defs.find((d) => d.id === c.id);
                      if (!def) return null;
                      const top = Math.max(c.bright, c.low, 1);
                      return (
                        <div className="sp-contrast" key={c.id} data-id={c.id}>
                          <span className="sp-contrast-name">{def.name}</span>
                          <span className="sp-contrast-bars">
                            <i data-kind="low" style={{ width: `${Math.round((c.low / top) * 100)}%` }} />
                            <i data-kind="bright" style={{ width: `${Math.round((c.bright / top) * 100)}%` }} />
                          </span>
                          <span className="sp-contrast-fig">
                            {def.format(Math.round(c.low))}
                            <em>→</em>
                            {def.format(Math.round(c.bright))}
                            <b>
                              {c.delta > 0 ? "+" : ""}
                              {c.delta}%
                            </b>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <ul className="sp-finelist">
                    {analysis.advanced.detail.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </section>

                <section className="sp-section">
                  <p className="sp-sectionhead">What the record shows</p>
                  <Observations items={analysis.observations} className="sp-observations" />
                </section>

                {analysis.correlations.length > 0 ? (
                  <section className="sp-section">
                    <p className="sp-sectionhead">What moves together</p>
                    <Correlations items={analysis.correlations} />
                  </section>
                ) : null}

                <section className="sp-section">
                  <p className="sp-sectionhead">Every entry</p>
                  <HistoryTable
                    days={store.days}
                    analysis={analysis}
                    onEdit={setDate}
                    onDelete={store.removeDay}
                  />
                </section>
              </>
            ) : (
              <section className="sp-section">
                <p className="sp-statement">
                  The strip is blank until you log something. One day above and all six bands start
                  filling in.
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

export default Strip;
