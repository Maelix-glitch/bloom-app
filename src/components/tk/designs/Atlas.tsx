/**
 * Atlas — trackers as a map of the day.
 *
 * The twenty-four hours are a compass rose; each tracker is a territory drawn
 * from its own contour line; the history is one route with six paths crossing
 * it rather than six separate charts. Serif place-names, generous margins, and
 * coordinates where a card would have a title.
 */

import { useCallback, useMemo, useRef, useState, type CSSProperties } from "react";

import { Correlations } from "@/components/tk/Correlations";
import { HistoryTable } from "@/components/tk/HistoryTable";
import { StudyMap } from "@/components/tk/StudyMap";
import { TRACKERS, trackerDef, type TrackerId } from "@/lib/trackers/core";
import { formatDate } from "@/lib/cycle/predict";

import { Achievements, TargetSheet } from "./Targets";
import { ReflectSheet } from "./ReflectSheet";
import { TrackerModal } from "./TrackerModal";
import { applyQuickAdd, Footer, Metric, Observations, SyncNote, useTrackers } from "./shared";

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

/**
 * The one control on the page, drawn inline as well as in the stylesheet.
 *
 * Everything else can wait for a stylesheet to arrive; this cannot. Should
 * the file be slow, cached stale or blocked, the button still has to be a
 * button and the panel still has to be a panel — not bare words at the foot
 * of the page. The stylesheet keeps the states inline styles cannot carry:
 * hover, press, focus and the reduced-motion preference.
 */
const DOCK_STYLE: CSSProperties = {
  position: "fixed",
  bottom: 32,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 9999,
  pointerEvents: "none",
};

const CTA_STYLE: CSSProperties = {
  pointerEvents: "auto",
  background: "linear-gradient(135deg, #FF0055 0%, #8A2BE2 100%)",
  color: "#ffffff",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: "0.78rem",
  padding: "16px 38px",
  borderRadius: 40,
  border: "1px solid rgba(255, 0, 85, 0.6)",
  boxShadow: "0 0 24px rgba(255, 0, 85, 0.5), 0 12px 32px rgba(255, 0, 85, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
  cursor: "pointer",
  transition: "all 0.3s ease",
};

export function Atlas({ theme = "nocturne" }: { theme?: string }) {
  const store = useTrackers();
  const { analysis, today, hydrated } = store;
  const [notice, setNotice] = useState<string | null>(null);
  const hasDays = analysis.daysLogged > 0;

  const defs = TRACKERS;

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

    return RING_ORDER.map(({ id, r }) => {
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
  }, [store.days, store.goals, today]);

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
    <div className="ci ci-root tk2-root" data-theme={theme} data-design="atlas">
      <div className="at">
        <header className="at-head">
          <p className="at-kicker">
            {hasDays ? `${analysis.daysLogged} days logged` : "start tracking"} ·{" "}
            {analysis.goalsMetToday}/6 targets today
          </p>
          <h1 className="at-title">Daily metrics at a glance.</h1>
          <p className="at-lede">
            Real data only. Six trackers measured against goals you set. No estimates, no filling in blanks.
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
                  {nightSpan ? (
                    <path d={nightSpan} className="at-nightspan" />
                  ) : null}
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
                    const { line, area } = contourPath(values, 240, 54, peak);
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
                            target <Metric value={def.format(stat.goal)} /> · avg{" "}
                            {stat.avg7 === null ? "—" : <Metric value={def.format(Math.round(stat.avg7))} />}
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

            {/* ---------------------- targets + achievements -------------------- */}
            {hasDays ? (
              <>
                <section className="at-section">
                  <p className="at-sectionhead">Targets</p>
                  <TargetSheet store={store} />
                </section>

                <section className="at-section">
                  <p className="at-sectionhead">Achievements</p>
                  <Achievements analysis={analysis} />
                </section>
              </>
            ) : null}

            {hasDays ? (
              <>
                {/* ------------------------------ the route --------------------------- */}
                <section className="at-section">
                  <p className="at-sectionhead">The route · fourteen days, six paths</p>
                  <div className="at-route-scroll">
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
                  </div>
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

          <ReflectSheet store={store} open={sheetOpen} onClose={() => setSheetOpen(false)} />

            <Footer />
          </>
        )}

        {openId === null && !sheetOpen ? (
          <div className="premium-action-dock" style={DOCK_STYLE}>
            <button
              type="button"
              className="premium-log-cta"
              style={CTA_STYLE}
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

export default Atlas;
