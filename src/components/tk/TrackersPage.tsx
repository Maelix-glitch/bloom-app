/**
 * Trackers — the one design (the former "Atlas", chosen in UI update U6).
 *
 * Trackers as a map of the day. Today is a Bloom flower — one petal per
 * tracker, filled when its target is reached (Brief v6 Slice 6 retired
 * the twenty-four hour compass that stood here); each tracker is a
 * territory drawn from its own contour line; the history is one route
 * with six paths crossing it rather than six separate charts.
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

import { useCallback, useEffect, useState } from "react";
import { FeelIn } from "@/components/system/FeelIn";

import { Correlations } from "@/components/tk/Correlations";
import { HistoryTable } from "@/components/tk/HistoryTable";
import { SleepRecoverySection } from "@/components/tk/SleepRecoverySection";
import { StudyMap } from "@/components/tk/StudyMap";
import { TRACKERS, trackerDef, type TrackerId } from "@/lib/trackers/core";
import { formatDate } from "@/lib/cycle/predict";

import { Achievements, TargetsPanel } from "./Targets";
import { MetricsEntryModal } from "@/components/tk/MetricsEntryModal";
import { TrackerFlower } from "./TrackerFlower";
import { TrackerModal } from "./TrackerModal";
import { contour, loggedCount, routePath, spreadRouteDots } from "./atlasCharts";
import { onMetricsEntryRequest } from "@/lib/trackers/entrySheet";
import {
  applyQuickAdd,
  Footer,
  Metric,
  Observations,
  SyncNote,
  useTrackers,
} from "./shared";

/** Where day `i` of fourteen sits on the route chart. */
const routeX = (i: number) => Math.round((i / 13) * 690 + 15);

export function TrackersPage({ theme = "nocturne" }: { theme?: string }) {
  const store = useTrackers();
  const { analysis, today, hydrated } = store;
  const [notice, setNotice] = useState<string | null>(null);
  const hasDays = analysis.daysLogged > 0;

  /* only what this person tracks — switched-off trackers keep their history but leave the page */
  const defs = TRACKERS.filter((def) => store.active.includes(def.id));

  /* The flower (Brief v6 §5.2; M-131): one petal per tracker, filled
     from the core's own reached state — `met` is metGoal() against the
     person's goal, the same state the retired dial's centre figure
     counted as goalsMetToday. Nothing new is defined here. */
  const petals = defs.map((def) => ({
    id: def.id,
    name: def.name,
    met: analysis.trackers[def.id].met === true,
  }));

  /* One tap on a tile's quick log writes through the store's own save
     path (applyQuickAdd in shared.tsx — the write the log sheet's
     increments always used), and the page's live region says so. */
  const quickAdd = (id: TrackerId, amount: number) => {
    const error = applyQuickAdd(store, id, amount);
    setNotice(error ?? `${trackerDef(id).name} noted on the map.`);
  };

  const [openId, setOpenId] = useState<TrackerId | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  /*
   * The "Reflect & log today" entry (Brief v6 Slice 2; M-130): the
   * floating pill that used to sit over this page is deleted — its
   * action now lives in the global dock, which dispatches the
   * metrics-entry bus. The sheet opens with the exact handler the pill
   * called.
   */
  useEffect(() => onMetricsEntryRequest(() => setSheetOpen(true)), []);

  const closeModal = useCallback(() => {
    setOpenId(null);
    /* focus returns to the card that opened it, so the page isn't left nowhere */
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`.at-territory[data-id="${openId}"]`)?.focus();
    });
  }, [openId]);

  /*
   * The route chart, computed across all six series at once. Each tracker
   * is scaled to its own peak, so a lone logged day lands at the same
   * height for every tracker — and on the same day, at the same x. Without
   * the spread, six first-day dots coincide exactly and only the
   * last-painted one shows; the legend still counts the other five.
   * spreadRouteDots separates the dots inside their day's column; lines
   * stay per-series (they can only coincide when two trackers genuinely
   * share a shape, and both colours then read as one path).
   */
  const routeSeries = defs.map((def) => {
    const stat = analysis.trackers[def.id];
    const values = stat.series.map((p) => p.value);
    const peak = Math.max(...values.map((v) => v ?? 0), 1);
    const y = (v: number) => Math.round(200 - (v / peak) * 170);
    return { def, stat, path: routePath(values, routeX, y) };
  });
  const routeDots = spreadRouteDots(
    routeSeries.flatMap((s) => s.path.singles.map((d) => ({ ...d, id: s.def.id }))),
    8,
    4,
    200,
  );

  return (
    <div className="ci ci-root tk2-root" data-theme={theme}>
      <div className="at">
        <header className="at-head">
          <p className="at-kicker">
            {hasDays
              ? `${analysis.daysLogged} ${analysis.daysLogged === 1 ? "day" : "days"} tracked`
              : "start tracking"}{" "}
            ·{" "}
            {analysis.goalsMetToday}/{analysis.goalsCounted} targets today
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
            {/* ------------------------------ the flower ---------------------------- */}
            <FeelIn as="section" className="at-board">
              <div className="at-flower-col">
                <TrackerFlower petals={petals} />
              </div>

              <div className="at-board-main">
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
                        {/* The contour only exists once a day is logged.
                            On an empty tile the dotted "nothing here"
                            baseline stood in for an action; the quick
                            log below is that action now (M-129). */}
                        {shape.logged === 0 ? null : (
                          <svg
                            viewBox="0 0 240 54"
                            className="at-contour"
                            role="img"
                            aria-label={`${def.name}: ${shape.logged} of ${values.length} days logged`}
                          >
                            {/* The ground axis — y=51 is exactly where a
                                value of zero maps in this plot. It stays
                                under the data in every logged state, as
                                the chart's ground. */}
                            <line x1="0" y1="51" x2="240" y2="51" className="at-contour-empty" />
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
                          </svg>
                        )}
                        {/* Quick log (§4.3; M-129): the tracker's own
                            primary input, on the tile. Increments write
                            through applyQuickAdd — the store's own save
                            path; sleep's total and energy's rating open
                            / set through the same flows as the sheet.
                            The buttons stop propagation: the card behind
                            them opens the full log sheet. */}
                        <div className="at-territory-actions">
                          {def.id === "sleep" ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenId("sleep");
                              }}
                            >
                              Log last night
                            </button>
                          ) : def.id === "energy" ? (
                            <span role="group" aria-label="Log energy" className="at-energy-dots">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  aria-pressed={stat.today === n}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    quickAdd("energy", n);
                                  }}
                                >
                                  {n}
                                </button>
                              ))}
                            </span>
                          ) : (
                            def.quickAdds.map((amount) => (
                              <button
                                key={amount}
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  quickAdd(def.id, amount);
                                }}
                              >
                                +{def.format(amount)}
                              </button>
                            ))
                          )}
                        </div>
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
            </FeelIn>
            <p aria-live="polite" className="at-notice">
              {notice}
            </p>

            {/* ---------------------- targets, shown not formed -------------------- */}
            <FeelIn as="section" className="at-section">
              <p className="at-sectionhead">Targets</p>
              <TargetsPanel store={store} />
            </FeelIn>

            {hasDays ? (
              <FeelIn as="section" className="at-section">
                <p className="at-sectionhead">Achievements</p>
                <Achievements analysis={analysis} />
              </FeelIn>
            ) : null}

            {hasDays ? (
              <>
                {/* ------------------------------ the route --------------------------- */}
                {/* The route renders only when a series actually has a
                    logged day — a record of notes alone would otherwise
                    stand a head over a blank chart (M-134). */}
                {routeSeries.some((s) => s.path.logged > 0) ? (
                <FeelIn as="section" className="at-section">
                  <p className="at-sectionhead">The route · fourteen days, six paths</p>
                  <div className="at-route-scroll">
                    <svg
                      viewBox="0 0 720 230"
                      className="at-route"
                      role="img"
                      aria-label="Fourteen days of all six trackers"
                    >
                      {routeSeries.map(({ def, path }) =>
                        path.logged === 0 ? null : (
                          <g key={def.id}>
                            {path.lines.map((d) => (
                              <path key={d} d={d} className="at-route-line" data-id={def.id} />
                            ))}
                          </g>
                        ),
                      )}
                      {/* dots after every line, so no path can paint over one;
                          the <title> is the chart family's native hover
                          affordance (the cycle charts use the same) */}
                      {routeDots.map((dot) => {
                        const s = routeSeries.find((r) => r.def.id === dot.id)!;
                        const day = s.stat.series[dot.i];
                        return (
                          <circle
                            key={dot.id}
                            cx={dot.x}
                            cy={dot.y}
                            r={3}
                            className="at-route-dot"
                            data-id={dot.id}
                          >
                            <title>
                              {`${s.def.name} · ${day ? formatDate(day.date) : ""} · ${s.def.format(Math.round(dot.v))}`}
                            </title>
                          </circle>
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
                </FeelIn>
                ) : null}

                {/* ------------------------------ study field -------------------------- */}
                <FeelIn as="section" className="at-section">
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
                </FeelIn>

                {/* ------------------------------- the deep read ---------------------- */}
                <FeelIn as="section" className="at-section">
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
                </FeelIn>

                {/* Observations renders nothing for an empty list, so
                    the section itself is gated on there being something
                    to show — no head over an empty body (M-134). */}
                {analysis.observations.length > 0 ? (
                  <FeelIn as="section" className="at-section">
                    <p className="at-sectionhead">What the record shows</p>
                    <Observations
                      items={analysis.observations}
                      className="at-observations"
                      caption="From your own logged days"
                    />
                  </FeelIn>
                ) : null}

                {store.active.includes("sleep") ? (
                  <SleepRecoverySection days={store.days} today={today} />
                ) : null}

                {analysis.correlations.length > 0 ? (
                  <FeelIn as="section" className="at-section">
                    <p className="at-sectionhead">What moves together</p>
                    <Correlations items={analysis.correlations} />
                  </FeelIn>
                ) : null}

                <FeelIn as="section" className="at-section">
                  <p className="at-sectionhead">Field notes · every entry</p>
                  <HistoryTable days={store.days} analysis={analysis} onDelete={store.removeDay} />
                </FeelIn>
              </>
            ) : (
              <FeelIn as="section" className="at-section">
                <p className="at-statement">
                  Nothing plotted yet. Add one day above and the contours, the route and the deep
                  read all draw themselves from it.
                </p>
              </FeelIn>
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

      </div>
    </div>
  );
}

export default TrackersPage;
