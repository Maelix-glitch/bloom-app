/**
 * Trackers — the one design (the former "Atlas", chosen in UI update U6).
 *
 * Trackers as a map of the day. The twenty-four hours are a compass rose;
 * each tracker is a territory drawn from its own contour line; the history
 * is one route with six paths crossing it rather than six separate charts.
 * Serif place-names, generous margins, and coordinates where a card would
 * have a title.
 *
 * The other three designs (Ledger, Strip, Console) and the switcher that
 * chose between them were deleted in U6: one screen, one design, and the
 * stored design id in localStorage is simply never read again — this page
 * renders the same whatever it says.
 *
 * Targets are always editable — even before the first log — because every
 * chart on the page measures against them. Achievements stay gated on real
 * data: zeros with nothing behind them are noise.
 */

import { useCallback, useMemo, useRef, useState } from "react";

import { Correlations } from "@/components/tk/Correlations";
import { HistoryTable } from "@/components/tk/HistoryTable";
import { StudyMap } from "@/components/tk/StudyMap";
import { TRACKERS, trackerDef, type TrackerId } from "@/lib/trackers/core";
import { formatDate } from "@/lib/cycle/predict";

import { Achievements, TargetSheet } from "./Targets";
import { MetricsEntryModal } from "@/components/tk/MetricsEntryModal";
import { TrackerModal } from "./TrackerModal";
import { contour, loggedCount, routePath } from "./atlasCharts";
import { Footer, Metric, Observations, SyncNote, useTrackers } from "./shared";

const C = 130;

/** Ring radii, outermost in. Every tracker has one, and they never overlap. */
const RING_ORDER: { id: TrackerId; r: number }[] = [
  { id: "sleep", r: 118 },
  { id: "water", r: 100 },
  { id: "screen", r: 82 },
  { id: "movement", r: 64 },
  { id: "study", r: 46 },
  { id: "energy", r: 28 },
];

const polar = (r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return {
    x: Math.round((C + r * Math.cos(rad)) * 100) / 100,
    y: Math.round((C + r * Math.sin(rad)) * 100) / 100,
  };
};

/** Where day `i` of fourteen sits on the route chart. */
const routeX = (i: number) => Math.round((i / 13) * 690 + 15);

export function TrackersPage({ theme = "nocturne" }: { theme?: string }) {
  const store = useTrackers();
  const { analysis, today, hydrated } = store;
  const [notice, setNotice] = useState<string | null>(null);
  const hasDays = analysis.daysLogged > 0;

  /* only what this person tracks — switched-off trackers keep their history but leave the page */
  const defs = TRACKERS.filter((def) => store.active.includes(def.id));

  /* the compass: sleep as the night's arc, everything else as a share of its target */
  /**
   * One ring per tracker, each a circle revealed by its share of the target.
   *
   * stroke-dasharray is the whole circumference and stroke-dashoffset is what
   * hides the remainder, so a ring is pure geometry: value over target, no
   * path building. That also means the browser can animate it — the CSS
   * transition on stroke-dashoffset is what makes a tap sweep rather than
   * jump. Caps sit at the end of the revealed part.
   */
  const rings = useMemo(() => {
    const entry = store.days.find((d) => d.date === today);
    const studyMinutes = (entry?.sessions ?? []).reduce((sum, s) => sum + s.minutes, 0);
    const values: Record<TrackerId, number> = {
      sleep: entry?.sleepMinutes ?? 0,
      water: entry?.waterMl ?? 0,
      study: studyMinutes,
      movement: entry?.movementMinutes ?? 0,
      energy: entry?.energy ?? 0,
      screen: entry?.screenMinutes ?? 0,
    };
    const goals: Record<TrackerId, number> = {
      sleep: store.goals.sleepMinutes || 480,
      water: store.goals.waterMl || 2200,
      study: store.goals.studyMinutes || 120,
      movement: store.goals.movementMinutes || 30,
      energy: 5,
      screen: store.goals.screenMinutes || 180,
    };

    return RING_ORDER.filter(({ id }) => store.active.includes(id)).map(({ id, r }) => {
      const circumference = 2 * Math.PI * r;
      const share = Math.min(Math.max(values[id] / goals[id], 0), 1);
      return {
        id,
        r,
        circumference: Math.round(circumference * 100) / 100,
        offset: Math.round(circumference * (1 - share) * 100) / 100,
        share,
      };
    });
  }, [store.active, store.days, store.goals, today]);

  /**
   * The night itself, as a hairline outside the rings.
   *
   * Sleep is the one tracker where *when* matters as much as how much, so the
   * bed-to-wake span stays drawn on the dial even though the ring inside it
   * now fills by hours against target.
   */
  const nightSpan = useMemo(() => {
    const entry = store.days.find((d) => d.date === today);
    const bed = entry?.bedTime ? Number(entry.bedTime.split(":")[0]) : null;
    const wake = entry?.wakeTime ? Number(entry.wakeTime.split(":")[0]) : null;
    if (bed === null || wake === null) return null;
    const r = 132;
    const span = ((wake - bed + 24) % 24) * 15 || 5;
    const a = polar(r, bed * 15);
    const b = polar(r, bed * 15 + span);
    return `M ${a.x} ${a.y} A ${r} ${r} 0 ${span > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
  }, [store.days, today]);

  const [openId, setOpenId] = useState<TrackerId | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const closeModal = useCallback(() => {
    setOpenId(null);
    /* focus returns to the card that opened it, so the page isn't left nowhere */
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`.at-territory[data-id="${openId}"]`)?.focus();
    });
  }, [openId]);

  return (
    <div className="ci ci-root tk2-root" data-theme={theme}>
      <div className="at">
        <header className="at-head">
          <p className="at-kicker">
            {hasDays ? `${analysis.daysLogged} days logged` : "start tracking"} ·{" "}
            {analysis.goalsMetToday}/6 targets today
          </p>
          <h1 className="at-title">Daily metrics at a glance.</h1>
          <p className="at-lede">
            Real data only. Six trackers measured against goals you set. No estimates, no filling in
            blanks.
          </p>
          <SyncNote sync={store.sync} onRetry={store.syncNow} />
          <a className="at-body-link" href="#body-tools">
            BMI, calorie &amp; water targets <span aria-hidden>↓</span>
          </a>
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
                <svg
                  viewBox="-26 -26 312 312"
                  role="img"
                  aria-label="Today on a twenty-four hour compass"
                >
                  <circle cx={C} cy={C} r={118} className="at-track" />
                  <circle cx={C} cy={C} r={100} className="at-track" />
                  <circle cx={C} cy={C} r={82} className="at-track" />
                  <circle cx={C} cy={C} r={64} className="at-track" />
                  <circle cx={C} cy={C} r={46} className="at-track" />
                  <circle cx={C} cy={C} r={28} className="at-track" />
                  {nightSpan ? <path d={nightSpan} className="at-nightspan" /> : null}
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
                    <circle
                      key={ring.id}
                      className="at-arc"
                      data-id={ring.id}
                      cx={C}
                      cy={C}
                      r={ring.r}
                      strokeDasharray={ring.circumference}
                      strokeDashoffset={ring.offset}
                      transform={`rotate(-90 ${C} ${C})`}
                      pathLength={ring.circumference}
                    />
                  ))}
                  {rings
                    .filter((ring) => ring.share > 0)
                    .map((ring) => {
                      const end = polar(ring.r, ring.share * 360);
                      return (
                        <circle
                          key={`cap-${ring.id}`}
                          className="at-cap"
                          data-id={ring.id}
                          cx={end.x}
                          cy={end.y}
                          r={5.2}
                        />
                      );
                    })}
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
                    const shape = contour(values, 240, 54, peak);
                    return (
                      <li
                        key={def.id}
                        className="at-territory"
                        data-id={def.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Log ${def.name}`}
                        onClick={() => setOpenId(def.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setOpenId(def.id);
                          }
                        }}
                      >
                        <div className="at-territory-head">
                          <span className="at-place">{def.name}</span>
                          <span className="at-coord">
                            {stat.today === null ? (
                              "unlogged"
                            ) : (
                              <Metric value={def.format(Math.round(stat.today))} />
                            )}
                          </span>
                        </div>
                        <svg
                          viewBox="0 0 240 54"
                          className="at-contour"
                          role="img"
                          aria-label={`${def.name}: ${shape.logged} of ${values.length} days logged`}
                        >
                          {shape.logged === 0 ? (
                            <line x1="0" y1="51" x2="240" y2="51" className="at-contour-empty" />
                          ) : (
                            <>
                              {shape.areas.map((d) => (
                                <path key={d} d={d} className="at-contour-area" />
                              ))}
                              {shape.lines.map((d) => (
                                <path key={d} d={d} className="at-contour-line" />
                              ))}
                              {shape.dots.map((dot) => (
                                <circle
                                  key={`${dot.x}-${dot.y}`}
                                  cx={dot.x}
                                  cy={dot.y}
                                  r={2.4}
                                  className="at-contour-dot"
                                />
                              ))}
                            </>
                          )}
                        </svg>
                        <div className="at-territory-foot">
                          <span>
                            target <Metric value={def.format(stat.goal)} /> · avg{" "}
                            {stat.avg7 === null ? (
                              "—"
                            ) : (
                              <Metric value={def.format(Math.round(stat.avg7))} />
                            )}
                            {shape.logged === 1 ? (
                              <> · one day logged — a line needs two</>
                            ) : shape.logged > 1 ? (
                              <> · {shape.logged} days logged</>
                            ) : null}
                          </span>
                          <span className="at-territory-more" aria-hidden>
                            log
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

            {/* ---------------------- targets, always editable -------------------- */}
            <section className="at-section">
              <p className="at-sectionhead">Targets</p>
              <TargetSheet store={store} />
            </section>

            {hasDays ? (
              <section className="at-section">
                <p className="at-sectionhead">Achievements</p>
                <Achievements analysis={analysis} />
              </section>
            ) : null}

            {hasDays ? (
              <>
                {/* ------------------------------ the route --------------------------- */}
                <section className="at-section">
                  <p className="at-sectionhead">The route · fourteen days, six paths</p>
                  <div className="at-route-scroll">
                    <svg
                      viewBox="0 0 720 230"
                      className="at-route"
                      role="img"
                      aria-label="Fourteen days of all six trackers"
                    >
                      {defs.map((def) => {
                        const values = analysis.trackers[def.id].series.map((p) => p.value);
                        const peak = Math.max(...values.map((v) => v ?? 0), 1);
                        const y = (v: number) => Math.round(200 - (v / peak) * 170);
                        const path = routePath(values, routeX, y);
                        if (path.logged === 0) return null;
                        return (
                          <g key={def.id}>
                            {path.lines.map((d) => (
                              <path key={d} d={d} className="at-route-line" data-id={def.id} />
                            ))}
                            {path.singles.map((dot) => (
                              <circle
                                key={`${dot.x}-${dot.y}`}
                                cx={dot.x}
                                cy={dot.y}
                                r={3}
                                className="at-route-dot"
                                data-id={def.id}
                              />
                            ))}
                          </g>
                        );
                      })}
                      <line
                        x1={routeX(13)}
                        y1={0}
                        x2={routeX(13)}
                        y2={206}
                        className="at-route-today"
                      />
                      {analysis.trackers.sleep.series.map((p, i) =>
                        i % 3 === 0 || i === 13 ? (
                          <text key={p.date} x={routeX(i)} y={224} className="at-route-date">
                            {p.date.slice(5)}
                          </text>
                        ) : null,
                      )}
                    </svg>
                  </div>
                  <ul className="at-legend">
                    {defs.map((def) => {
                      const logged = loggedCount(
                        analysis.trackers[def.id].series.map((p) => p.value),
                      );
                      return (
                        <li key={def.id} data-id={def.id}>
                          <i aria-hidden />
                          {def.name}
                          {logged === 1 ? <span className="at-legend-note">one day</span> : null}
                          {logged === 0 ? <span className="at-legend-note">no days yet</span> : null}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="at-fine">
                    Each path is scaled to its own range — they cross, they don't compete. A break
                    in a line is a day you didn't log, left empty on purpose; a dot on its own is a
                    single logged day, with nothing on either side of it yet.
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
                            {trackerDef("study").format(s.minutes)} · {s.sessions} session
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
                            <i
                              style={{ width: `${Math.round((c.low / top) * 100)}%` }}
                              data-kind="low"
                            />
                            <i
                              style={{ width: `${Math.round((c.bright / top) * 100)}%` }}
                              data-kind="bright"
                            />
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
                  <Observations
                    items={analysis.observations}
                    className="at-observations"
                    caption="AI cognitive analysis · active biometric patterns"
                  />
                </section>

                {analysis.correlations.length > 0 ? (
                  <section className="at-section">
                    <p className="at-sectionhead">What moves together</p>
                    <Correlations items={analysis.correlations} />
                  </section>
                ) : null}

                <section className="at-section">
                  <p className="at-sectionhead">Field notes · every entry</p>
                  <HistoryTable days={store.days} analysis={analysis} onDelete={store.removeDay} />
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

            <TrackerModal
              store={store}
              tracker={openId}
              onClose={closeModal}
              onSaved={(id) => setNotice(`${trackerDef(id).name} noted on the map.`)}
            />

            <MetricsEntryModal store={store} open={sheetOpen} onClose={() => setSheetOpen(false)} />

            <Footer />
          </>
        )}

        {openId === null && !sheetOpen ? (
          /* The dock and the CTA are styled entirely by trackers.css
             (.premium-action-dock / .premium-log-cta — positioning, phone
             tab-bar clearance, states). They used to be duplicated inline
             "in case the stylesheet is late"; the sheet is a route-level
             link, and every other control on the page trusts it. */
          <div className="premium-action-dock">
            <button
              type="button"
              className="premium-log-cta"
              onClick={() => setSheetOpen(true)}
              aria-haspopup="dialog"
            >
              Reflect &amp; log today
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default TrackersPage;
