/**
 * Atlas — trackers as a map of the day.
 *
 * The twenty-four hours are a compass rose; each tracker is a territory drawn
 * from its own contour line; the history is one route with six paths crossing
 * it rather than six separate charts. Serif place-names, generous margins, and
 * coordinates where a card would have a title.
 */

import { useMemo, useRef, useState } from "react";

import { Correlations } from "@/components/tk/Correlations";
import { HistoryTable } from "@/components/tk/HistoryTable";
import { LogPanel } from "@/components/tk/LogPanel";
import { StudyMap } from "@/components/tk/StudyMap";
import { TRACKERS, type TrackerId } from "@/lib/trackers/core";
import { formatDate } from "@/lib/cycle/predict";

import { applyQuickAdd, Footer, Observations, SyncNote, useTrackers } from "./shared";

const C = 130;

const polar = (r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return {
    x: Math.round((C + r * Math.cos(rad)) * 100) / 100,
    y: Math.round((C + r * Math.sin(rad)) * 100) / 100,
  };
};

/** A smooth path through the points, gaps and all. */
function contourPath(values: (number | null)[], width: number, height: number, peak: number) {
  const points = values
    .map((v, i) => ({ v, i }))
    .filter((p): p is { v: number; i: number } => p.v !== null);
  if (points.length < 2) return { line: "", area: "" };
  const x = (i: number) => Math.round((i / Math.max(values.length - 1, 1)) * width * 100) / 100;
  const y = (v: number) => Math.round((height - (v / peak) * (height - 6) - 3) * 100) / 100;

  let line = `M ${x(points[0]!.i)} ${y(points[0]!.v)}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]!;
    const cur = points[i]!;
    const cx = Math.round(((x(prev.i) + x(cur.i)) / 2) * 100) / 100;
    line += ` C ${cx} ${y(prev.v)} ${cx} ${y(cur.v)} ${x(cur.i)} ${y(cur.v)}`;
  }
  const area = `${line} L ${x(points[points.length - 1]!.i)} ${height} L ${x(points[0]!.i)} ${height} Z`;
  return { line, area };
}

/** Where day `i` of fourteen sits on the route chart. */
const routeX = (i: number) => Math.round((i / 13) * 690 + 15);

/** "+30m", "+1h", "+250ml" — whatever reads shortest and truest. */
function stepLabel(def: (typeof TRACKERS)[number], amount: number): string {
  if (def.kind === "volume") return amount >= 1000 ? `${amount / 1000}L` : `${amount}ml`;
  if (amount < 60) return `${amount}m`;
  const hours = amount / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${Math.floor(hours)}h ${amount % 60}m`;
}

export function Atlas({ theme = "nocturne" }: { theme?: string }) {
  const store = useTrackers();
  const { analysis, today, hydrated } = store;
  const [notice, setNotice] = useState<string | null>(null);
  const [date, setDate] = useState<string>(today);
  const logRef = useRef<HTMLDivElement>(null);
  const hasDays = analysis.daysLogged > 0;

  const defs = TRACKERS;

  /* the compass: sleep as the night's arc, everything else as a share of its target */
  const rings = useMemo(() => {
    const entry = store.days.find((d) => d.date === today);
    const bed = entry?.bedTime ? Number(entry.bedTime.split(":")[0]) : null;
    const wake = entry?.wakeTime ? Number(entry.wakeTime.split(":")[0]) : null;
    const out: { id: TrackerId; r: number; d: string }[] = [];
    if (bed !== null && wake !== null) {
      const span = ((wake - bed + 24) % 24) * 15 || 5;
      const a = polar(118, bed * 15);
      const b = polar(118, bed * 15 + span);
      out.push({
        id: "sleep",
        r: 118,
        d: `M ${a.x} ${a.y} A 118 118 0 ${span > 180 ? 1 : 0} 1 ${b.x} ${b.y}`,
      });
    }
    /* study, as a block wherever the session started */
    const sessions = entry?.sessions ?? [];
    if (sessions.length > 0) {
      let cursor = 9;
      sessions.forEach((session, i) => {
        const start = session.startAt ? Number(session.startAt.split(":")[0]) : cursor;
        const length = Math.max((session.minutes / 60) * 15, 1.5);
        cursor = start + Math.max(session.minutes / 60, 0.25) + 0.25;
        const a = polar(46, start * 15);
        const b = polar(46, start * 15 + length);
        out.push({
          id: "study",
          r: 46,
          d: `M ${a.x} ${a.y} A 46 46 0 ${length > 180 ? 1 : 0} 1 ${b.x} ${b.y}`,
        });
      });
    }
    const shares: [TrackerId, number, number][] = [
      ["water", 100, (entry?.waterMl ?? 0) / (store.goals.waterMl || 2200)],
      ["movement", 64, (entry?.movementMinutes ?? 0) / (store.goals.movementMinutes || 30)],
      ["screen", 82, (entry?.screenMinutes ?? 0) / (store.goals.screenMinutes || 180)],
    ];
    for (const [id, r, share] of shares) {
      if (share <= 0) continue;
      const a = polar(r, 0);
      const b = polar(r, Math.max(share * 360, 2));
      out.push({ id, r, d: `M ${a.x} ${a.y} A ${r} ${r} 0 ${share > 0.5 ? 1 : 0} 1 ${b.x} ${b.y}` });
    }
    return out;
  }, [store.days, store.goals, today]);

  const tap = (id: TrackerId, amount: number) => {
    const def = defs.find((d) => d.id === id)!;
    setNotice(applyQuickAdd(store, id, amount) ?? `${def.name} noted on the map.`);
  };

  return (
    <div className="ci ci-root tk2-root" data-theme={theme} data-design="atlas">
      <div className="at">
        <header className="at-head">
          <p className="at-kicker">
            Bloom · Atlas of a day · {hasDays ? `${analysis.daysLogged} days plotted` : "nothing plotted yet"}
          </p>
          <h1 className="at-title">
            Where your hours
            <br />
            actually went.
          </h1>
          <p className="at-lede">
            Six territories, one day. The compass draws night as an arc and everything else as the
            share of its target you've covered — all of it from your own entries.
          </p>
          <SyncNote sync={store.sync} onRetry={store.syncNow} />
        </header>

        {!hydrated ? (
          <p className="at-loading" aria-hidden>
            unfolding the map…
          </p>
        ) : (
          <>
            {/* ------------------------------ the compass --------------------------- */}
            <section className="at-board">
              <div className="at-compass">
                <svg viewBox="0 0 260 260" role="img" aria-label="Today on a twenty-four hour compass">
                  <circle cx={C} cy={C} r={118} className="at-track" />
                  <circle cx={C} cy={C} r={100} className="at-track" />
                  <circle cx={C} cy={C} r={82} className="at-track" />
                  <circle cx={C} cy={C} r={64} className="at-track" />
                  {Array.from({ length: 24 }, (_, h) => {
                    const a = polar(126, h * 15);
                    const b = polar(h % 6 === 0 ? 120 : 123, h * 15);
                    return (
                      <line
                        key={h}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        className="at-tick"
                        data-major={h % 6 === 0 ? "true" : "false"}
                      />
                    );
                  })}
                  {rings.map((ring) => (
                    <path key={ring.id} d={ring.d} className="at-arc" data-id={ring.id} />
                  ))}
                  {[0, 6, 12, 18].map((h) => {
                    const p = polar(140, h * 15);
                    return (
                      <text key={h} x={p.x} y={p.y + 3} className="at-hour">
                        {h === 0 ? "midnight" : h === 6 ? "06" : h === 12 ? "noon" : "18"}
                      </text>
                    );
                  })}
                  <text x={C} y={C - 6} className="at-centre-fig">
                    {analysis.goalsMetToday}
                  </text>
                  <text x={C} y={C + 12} className="at-centre-label">
                    of six reached
                  </text>
                </svg>
              </div>

              <div className="at-board-main">
                <ul className="at-key" aria-label="Compass key">
                  {defs.map((def) => (
                    <li key={def.id} data-id={def.id}>
                      <i aria-hidden />
                      {def.name}
                    </li>
                  ))}
                </ul>

                <ul className="at-territories">
                  {defs.map((def) => {
                    const stat = analysis.trackers[def.id];
                    const values = stat.series.map((p) => p.value);
                    const peak = Math.max(...values.map((v) => v ?? 0), stat.goal, 1);
                    const { line, area } = contourPath(values, 240, 54, peak);
                    return (
                      <li key={def.id} className="at-territory" data-id={def.id}>
                        <div className="at-territory-head">
                          <span className="at-place">{def.name}</span>
                          <span className="at-coord">
                            {stat.today === null ? "unlogged" : def.format(Math.round(stat.today))}
                          </span>
                        </div>
                        <svg viewBox="0 0 240 54" className="at-contour" role="img" aria-label={`${def.name} contour`}>
                          {line ? (
                            <>
                              <path d={area} className="at-contour-area" />
                              <path d={line} className="at-contour-line" />
                            </>
                          ) : (
                            <line x1="0" y1="51" x2="240" y2="51" className="at-contour-empty" />
                          )}
                        </svg>
                        <div className="at-territory-foot">
                          <span>
                            target {def.format(stat.goal)} · avg {stat.avg7 === null ? "—" : def.format(Math.round(stat.avg7))}
                          </span>
                          <span className="at-territory-actions">
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
                            ) : def.id === "sleep" ? (
                              <button type="button" onClick={() => logRef.current?.scrollIntoView({ block: "start" })}>
                                log night
                              </button>
                            ) : (
                              def.quickAdds.map((amount) => (
                                <button
                                  key={amount}
                                  type="button"
                                  onClick={() => tap(def.id, amount)}
                                  aria-label={`Add ${stepLabel(def, amount)} to ${def.name}`}
                                >
                                  +{stepLabel(def, amount)}
                                </button>
                              ))
                            )}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
            <p aria-live="polite" className="at-notice">
              {notice}
            </p>

            {/* -------------------------------- log --------------------------------- */}
            <div ref={logRef} className="at-section">
              <p className="at-sectionhead">Add to the map</p>
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
                {/* ------------------------------ the route --------------------------- */}
                <section className="at-section">
                  <p className="at-sectionhead">The route · fourteen days, six paths</p>
                  <svg viewBox="0 0 720 230" className="at-route" role="img" aria-label="Fourteen days of all six trackers">
                    {defs.map((def) => {
                      const values = analysis.trackers[def.id].series.map((p) => p.value);
                      const peak = Math.max(...values.map((v) => v ?? 0), 1);
                      const points = values
                        .map((v, i) => ({ v, i }))
                        .filter((p): p is { v: number; i: number } => p.v !== null);
                      if (points.length < 2) return null;
                      const y = (v: number) => Math.round(200 - (v / peak) * 170);
                      let d = `M ${routeX(points[0]!.i)} ${y(points[0]!.v)}`;
                      for (let i = 1; i < points.length; i += 1) {
                        const prev = points[i - 1]!;
                        const cur = points[i]!;
                        const cx = (routeX(prev.i) + routeX(cur.i)) / 2;
                        d += ` C ${cx} ${y(prev.v)} ${cx} ${y(cur.v)} ${routeX(cur.i)} ${y(cur.v)}`;
                      }
                      return (
                        <path key={def.id} d={d} className="at-route-line" data-id={def.id} />
                      );
                    })}
                    <line x1={routeX(13)} y1={0} x2={routeX(13)} y2={206} className="at-route-today" />
                    {analysis.trackers.sleep.series.map((p, i) =>
                      i % 3 === 0 || i === 13 ? (
                        <text key={p.date} x={routeX(i)} y={224} className="at-route-date">
                          {p.date.slice(5)}
                        </text>
                      ) : null,
                    )}
                  </svg>
                  <ul className="at-legend">
                    {defs.map((def) => (
                      <li key={def.id} data-id={def.id}>
                        <i aria-hidden />
                        {def.name}
                      </li>
                    ))}
                  </ul>
                  <p className="at-fine">
                    Each path is scaled to its own range — they cross, they don't compete. A break in
                    a line is a day you didn't log, left empty on purpose.
                  </p>
                </section>

                {/* ------------------------------ study field -------------------------- */}
                <section className="at-section">
                  <p className="at-sectionhead">Study · the field</p>
                  <StudyMap days={store.days} today={today} goal={store.goals.studyMinutes} />
                  {analysis.subjects.length > 0 ? (
                    <ul className="at-leaders">
                      {analysis.subjects.slice(0, 6).map((s) => (
                        <li key={s.subject}>
                          <span>{s.subject}</span>
                          <i aria-hidden />
                          <span>
                            {defs[2]!.format(s.minutes)} · {s.sessions} session
                            {s.sessions === 1 ? "" : "s"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>

                {/* ------------------------------- the deep read ---------------------- */}
                <section className="at-section">
                  <p className="at-sectionhead">Advanced · bright days against low ones</p>
                  <p className="at-statement">{analysis.advanced.headline}</p>
                  <ul className="at-contrasts">
                    {analysis.advanced.contrasts.slice(0, 4).map((c) => {
                      const def = defs.find((d) => d.id === c.id);
                      if (!def) return null;
                      const top = Math.max(c.bright, c.low, 1);
                      return (
                        <li key={c.id} data-id={c.id}>
                          <span className="at-place">{def.name}</span>
                          <span className="at-pair">
                            <i style={{ width: `${Math.round((c.low / top) * 100)}%` }} data-kind="low" />
                            <i style={{ width: `${Math.round((c.bright / top) * 100)}%` }} data-kind="bright" />
                          </span>
                          <span className="at-coord">
                            {def.format(Math.round(c.low))} → {def.format(Math.round(c.bright))}
                            <em>
                              {c.delta > 0 ? "+" : ""}
                              {c.delta}%
                            </em>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <ul className="at-finelist">
                    {analysis.advanced.detail.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </section>

                <section className="at-section">
                  <p className="at-sectionhead">What the record shows</p>
                  <Observations items={analysis.observations} className="at-observations" />
                </section>

                {analysis.correlations.length > 0 ? (
                  <section className="at-section">
                    <p className="at-sectionhead">What moves together</p>
                    <Correlations items={analysis.correlations} />
                  </section>
                ) : null}

                <section className="at-section">
                  <p className="at-sectionhead">Field notes · every entry</p>
                  <HistoryTable
                    days={store.days}
                    analysis={analysis}
                    onEdit={setDate}
                    onDelete={store.removeDay}
                  />
                </section>
              </>
            ) : (
              <section className="at-section">
                <p className="at-statement">
                  Nothing plotted yet. Add one day above and the contours, the route and the deep
                  read all draw themselves from it.
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

export default Atlas;
