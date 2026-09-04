/**
 * TrackersPage — the whole page body, themed through the shared Bloom design
 * system so it matches whatever direction is applied on /cycle-styles.
 *
 * Order: where today stands, log it, then what the record says. Every figure
 * comes from days the person actually logged; an empty day is never filled in.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { History, Sparkles, Waypoints } from "lucide-react";

import { Atmosphere } from "@/components/ci/Atmosphere";
import { Reveal } from "@/components/ci/motion";
import { Button, Card } from "@/components/ci/primitives";
import { AdvancedCard } from "@/components/tk/AdvancedCard";
import { ConsoleRow } from "@/components/tk/ConsoleRow";
import { DayDial } from "@/components/tk/DayDial";
import { Tile, TrackerIcon, TrackerTile, TRACKER_ACCENT } from "@/components/tk/icons";
import { useTrackers } from "@/hooks/useTrackers";
import { addDays, todayKey } from "@/lib/cycle/predict";
import {
  TRACKERS,
  emptyDay,
  trackerDef,
  valueOf,
  type TrackerId,
} from "@/lib/trackers/core";
import type { DayEntry } from "@/lib/trackers/core";
import { daysToCsv } from "@/lib/trackers/store";

import { Correlations } from "./Correlations";
import { HistoryTable } from "./HistoryTable";
import { LogPanel } from "./LogPanel";
import { SeriesBars } from "./SeriesBars";
import { StudyMap } from "./StudyMap";
import { TodayStrip } from "./TodayStrip";

/** One tap writes to today: water, movement and screen add up, study adds a
 *  session, energy sets the rating outright. */
const QUICK: Partial<
  Record<TrackerId, { steps?: { amount: number; label: string }[]; picks?: number[] }>
> = {
  water: { steps: [{ amount: 250, label: "+250" }, { amount: 500, label: "+500" }] },
  movement: { steps: [{ amount: 10, label: "+10m" }, { amount: 20, label: "+20m" }] },
  screen: { steps: [{ amount: 30, label: "+30m" }, { amount: 60, label: "+1h" }] },
  study: { steps: [{ amount: 25, label: "+25m" }, { amount: 50, label: "+50m" }] },
  energy: { picks: [1, 2, 3, 4, 5] },
};

const TRACKER_HINT =
  "sleep has a field of its own below, because a night is worth typing out";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Late night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function download(name: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function TrackersPage({ theme = "nocturne", preview = false }: { theme?: string; preview?: boolean }) {
  const store = useTrackers();
  const { analysis, goals, today, hydrated } = store;
  const [date, setDate] = useState<string>(() => todayKey());
  const [focus, setFocus] = useState<TrackerId | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /* a new day rolls the form over with it */
  useEffect(() => {
    setDate((current) => (current === "" ? today : current));
  }, [today]);

  const focusTracker = useCallback((id: TrackerId) => {
    setFocus(id);
    logRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }, []);

  const editDate = useCallback((next: string) => {
    setDate(next);
    logRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }, []);

  const exportCsv = useCallback(() => {
    download(`bloom-trackers-${today}.csv`, daysToCsv(store.days));
  }, [store.days, today]);

  const hasDays = analysis.daysLogged > 0;
  const defs = TRACKERS;
  const todayEntry = store.days.find((d) => d.date === today) ?? emptyDay(today);

  /* A tap on a quick-add writes straight to today and saves it. */
  const quickAdd = useCallback(
    (id: TrackerId, amount: number, absolute = false) => {
      const current = store.days.find((d) => d.date === today) ?? emptyDay(today);
      const next: DayEntry = { ...current, date: today };
      if (id === "water") next.waterMl = (current.waterMl ?? 0) + amount;
      if (id === "movement") next.movementMinutes = (current.movementMinutes ?? 0) + amount;
      if (id === "screen") next.screenMinutes = (current.screenMinutes ?? 0) + amount;
      if (id === "energy") next.energy = absolute ? amount : (current.energy ?? 0) + amount;
      if (id === "study") {
        next.sessions = [
          ...current.sessions,
          { subject: "General", minutes: amount, startAt: null },
        ];
      }
      const result = store.saveDay(next);
      if (result.ok) {
        setNotice(
          absolute && id === "energy"
            ? `Energy set to ${amount} of 5 for today.`
            : `${trackerDef(id).name} now reads ${trackerDef(id).format(
                valueOf(next, id) ?? 0,
              )} for today.`,
        );
      } else {
        setNotice(Object.values(result.errors)[0] ?? "That didn't save.");
      }
    },
    [store, today],
  );

  return (
    <div className="ci ci-root tk-root" data-theme={theme}>
      <Atmosphere />
      <div className="ci-grain" aria-hidden />
      <div className="ci-veil" aria-hidden />

      <div className="ci-shell">
        <header className="ci-rise max-w-[68ch]">
          <p className="ci-eyebrow">{greeting()} · Bloom Trackers</p>
          <h1 className="ci-display mt-3 text-[30px] leading-[1.08] sm:text-[40px]">
            Six things a day,
            <br />
            <span style={{ color: "var(--tk-water)" }}>read back honestly.</span>
          </h1>
          <p className="mt-4 text-[14px] leading-relaxed ci-soft sm:text-[15px]">
            Sleep, water, study, movement, energy and screen time — one row per day. Nothing here is
            estimated, nothing is filled in for you, and nothing is advice.
          </p>
          <ul className="mt-5 flex flex-wrap gap-1.5">
            {TRACKERS.map((def) => (
              <li
                key={def.id}
                className="tk-chip"
                style={{ ["--tk-accent" as string]: TRACKER_ACCENT[def.id] }}
              >
                <TrackerIcon id={def.id} size={12} />
                {def.name}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] ci-muted">
            <span>stored in this browser only</span>
            <span aria-hidden>·</span>
            <span>your own numbers, not a recommendation</span>
            {preview ? (
              <>
                <span aria-hidden>·</span>
                <span style={{ color: "var(--ci-ovulation)" }}>preview — editing disabled</span>
              </>
            ) : null}
          </div>
        </header>

        {!hydrated ? (
          <div className="mt-10 space-y-4" aria-hidden>
            <div className="ci-card h-[220px] animate-pulse" />
            <div className="ci-card h-[160px] animate-pulse" />
          </div>
        ) : (
          <>
            {hasDays ? (
              <div className="mt-6">
                <TodayStrip
                  analysis={analysis}
                  goals={goals}
                  onGoalChange={preview ? undefined : store.setGoal}
                  onResetGoals={preview ? undefined : store.resetGoals}
                />
              </div>
            ) : null}

            {/* -------------------------------- the console ------------------------------- */}
            <section className="tk-panel mt-6" aria-labelledby="tk-console">
              <div className="tk-head" style={{ ["--tk-accent" as string]: "var(--ci-late)" }}>
                <TrackerTile id="sleep" />
                <span className="tk-head__label" id="tk-console">
                  Today · one row each
                </span>
                <span className="tk-head__rule" />
                <span className="tk-head__aside">
                  {analysis.goalsMetToday} of {TRACKERS.length} on target
                </span>
              </div>

              <div className="mt-5">
                <DayDial
                  entry={todayEntry}
                  defs={defs}
                  goals={goals}
                  metToday={analysis.goalsMetToday}
                />
              </div>

              <div className="tk-console mt-5">
                {defs.map((def) => {
                  const stat = analysis.trackers[def.id];
                  return (
                  <ConsoleRow
                    key={def.id}
                    def={def}
                    value={stat.today}
                    goal={stat.goal}
                    series={stat.series.map((p) => p.value)}
                    met={stat.series.map((p) => p.met === true)}
                    steps={QUICK[def.id]?.steps}
                    picks={QUICK[def.id]?.picks}
                    onAdd={preview ? undefined : (amount) => quickAdd(def.id, amount)}
                    onPick={preview ? undefined : (value) => quickAdd(def.id, value, true)}
                    onEdit={preview ? undefined : () => focusTracker(def.id)}
                  />
                  );
                })}
              </div>

              <p className="mt-3 text-[11.5px] ci-muted">
                Quick-adds write straight to today — {TRACKER_HINT}.
              </p>
              <p
                aria-live="polite"
                className="mt-1.5 text-[12px]"
                style={{ color: "var(--tk-water)" }}
              >
                {notice}
              </p>
            </section>

            {!hasDays ? (
              <Card className="ci-rise mt-8">
                <p className="ci-eyebrow">Start here</p>
                <h2 className="ci-display mt-2 text-[22px] leading-tight sm:text-[26px]">
                  One day is enough to begin.
                </h2>
                <p className="mt-3 max-w-[62ch] text-[13px] leading-relaxed ci-soft">
                  Log today — even just a glass of water or last night's sleep — and the rings,
                  streaks and charts below start drawing themselves from your own record.
                </p>
                <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  {[
                    "Sleep: bedtime and wake time, or just the hours.",
                    "Water: quick-add 250ml at a time, or type the total.",
                    "Study: sessions with a subject and an optional start time.",
                    "Movement, energy and screen time: one field each.",
                  ].map((line) => (
                    <li key={line} className="flex gap-2.5 text-[12.5px] leading-relaxed ci-soft">
                      <span
                        aria-hidden
                        className="mt-[7px] h-[5px] w-[5px] shrink-0 rotate-45 rounded-[1px]"
                        style={{ background: "var(--ci-follicular)" }}
                      />
                      {line}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="primary"
                  className="mt-6"
                  onClick={() =>
                    logRef.current?.scrollIntoView({
                      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                        ? "auto"
                        : "smooth",
                      block: "start",
                    })
                  }
                >
                  Log your first day
                </Button>
              </Card>
            ) : null}

            {/* ---------------------------------- log ---------------------------------- */}
            <div ref={logRef} className="mt-4">
              <Reveal>
                <LogPanel
                  days={store.days}
                  today={today}
                  date={date}
                  onDateChange={setDate}
                  onSave={store.saveDay}
                  onDelete={store.removeDay}
                  disabled={preview}
                  focus={focus}
                />
              </Reveal>
            </div>

            {hasDays ? (
              <>
                {/* ------------------------------ sleep & water --------------------------- */}
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="tk-panel" aria-labelledby="tk-h-02">
                    <div className="tk-head" style={{ ["--tk-accent" as string]: TRACKER_ACCENT.sleep }}>
                    <TrackerTile id="sleep" />
                      <span className="tk-head__label" id="tk-h-02">Sleep</span>
                      <span className="tk-head__rule" />
                      <span className="tk-head__aside">Bars against your target; the dashed line is it.</span>
                    </div>
                    <h3 className="mt-2.5 font-[family-name:var(--ci-font-display)] text-[17px] leading-snug">
                      Last fourteen nights
                    </h3>
                    <div className="mt-4">
                      <SeriesBars
                        id="sleep"
                        series={analysis.trackers.sleep.series}
                        goal={goals.sleepMinutes}
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-4 ci-hair">
                      <StatBox
                        label="Average"
                        value={fmt("sleep", analysis.trackers.sleep.avg7)}
                      />
                      <StatBox
                        label="Steadiness"
                        value={
                          analysis.trackers.sleep.spread === null
                            ? "—"
                            : `±${Math.round(analysis.trackers.sleep.spread)}m`
                        }
                      />
                      <StatBox
                        label="Best night"
                        value={fmt("sleep", analysis.trackers.sleep.best)}
                      />
                    </div>
                  </div>

                  <div className="tk-panel" aria-labelledby="tk-h-03">
                    <div className="tk-head" style={{ ["--tk-accent" as string]: TRACKER_ACCENT.water }}>
                    <TrackerTile id="water" />
                      <span className="tk-head__label" id="tk-h-03">Water</span>
                      <span className="tk-head__rule" />
                      <span className="tk-head__aside">Filled bars reached the target you set.</span>
                    </div>
                    <h3 className="mt-2.5 font-[family-name:var(--ci-font-display)] text-[17px] leading-snug">
                      Last fourteen days
                    </h3>
                    <div className="mt-4">
                      <SeriesBars
                        id="water"
                        series={analysis.trackers.water.series}
                        goal={goals.waterMl}
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-4 ci-hair">
                      <StatBox label="Average" value={fmt("water", analysis.trackers.water.avg7)} />
                      <StatBox
                        label="Streak"
                        value={`${analysis.trackers.water.streak}d`}
                      />
                      <StatBox
                        label="Best day"
                        value={fmt("water", analysis.trackers.water.best)}
                      />
                    </div>
                  </div>
                </div>

                {/* --------------------------- study & the rest --------------------------- */}
                <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                  <div className="tk-panel" aria-labelledby="tk-h-04">
                    <div className="tk-head" style={{ ["--tk-accent" as string]: TRACKER_ACCENT.study }}>
                    <TrackerTile id="study" />
                      <span className="tk-head__label" id="tk-h-04">Study</span>
                      <span className="tk-head__rule" />
                      <span className="tk-head__aside">Colour is how the day compared with your daily target.</span>
                    </div>
                    <h3 className="mt-2.5 font-[family-name:var(--ci-font-display)] text-[17px] leading-snug">
                      Twelve weeks, one cell per day
                    </h3>
                    <div className="mt-4">
                      <StudyMap days={store.days} today={today} goal={goals.studyMinutes} />
                    </div>

                    {analysis.subjects.length > 0 ? (
                      <div className="mt-5 border-t pt-4 ci-hair">
                        <p className="ci-eyebrow">Where the time went</p>
                        <div className="mt-3 space-y-2">
                          {analysis.subjects.slice(0, 6).map((s) => {
                            const top = analysis.subjects[0]?.minutes ?? 1;
                            return (
                              <div key={s.subject} className="flex items-center gap-3">
                                <span className="w-[92px] shrink-0 truncate text-[12px]">
                                  {s.subject}
                                </span>
                                <div
                                  className="h-[7px] flex-1 overflow-hidden rounded-full"
                                  style={{
                                    background:
                                      "color-mix(in oklab, var(--ci-text) 9%, transparent)",
                                  }}
                                  aria-hidden
                                >
                                  <div
                                    style={{
                                      width: `${Math.round((s.minutes / top) * 100)}%`,
                                      height: "100%",
                                      borderRadius: 999,
                                      background: "var(--ci-ovulation)",
                                    }}
                                  />
                                </div>
                                <span className="ci-num w-[74px] shrink-0 text-right text-[11.5px] ci-muted">
                                  {trackerDef("study").format(s.minutes)} · {s.sessions}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {analysis.studyHours.length > 0 ? (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="ci-eyebrow">Busiest starts</span>
                        {analysis.studyHours.map((h) => (
                          <span key={h.hour} className="tk-chip">
                            {String(h.hour).padStart(2, "0")}:00 ·{" "}
                            {trackerDef("study").format(h.minutes)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4">
                    <div className="tk-panel" aria-labelledby="tk-h-05">
                      <div className="tk-head" style={{ ["--tk-accent" as string]: TRACKER_ACCENT.movement }}>
                      <TrackerTile id="movement" />
                        <span className="tk-head__label" id="tk-h-05">Movement</span>
                        <span className="tk-head__rule" />
                        <span className="tk-head__aside">Against your daily target.</span>
                      </div>
                      <h3 className="mt-2.5 font-[family-name:var(--ci-font-display)] text-[17px] leading-snug">
                        Minutes on your feet
                      </h3>
                      <div className="mt-4">
                        <SeriesBars
                          id="movement"
                          series={analysis.trackers.movement.series}
                          goal={goals.movementMinutes}
                          height={84}
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[11.5px] ci-muted">
                        <span>
                          Average {fmt("movement", analysis.trackers.movement.avg7)}
                        </span>
                        <span>Streak {analysis.trackers.movement.streak}d</span>
                      </div>
                    </div>

                    <div className="tk-panel" aria-labelledby="tk-h-06">
                      <div className="tk-head" style={{ ["--tk-accent" as string]: TRACKER_ACCENT.screen }}>
                      <TrackerTile id="screen" />
                        <span className="tk-head__label" id="tk-h-06">Energy & screen</span>
                        <span className="tk-head__rule" />
                        <span className="tk-head__aside">Energy reads 1–5; screen is measured against your ceiling.</span>
                      </div>
                      <h3 className="mt-2.5 font-[family-name:var(--ci-font-display)] text-[17px] leading-snug">
                        The two that answer each other
                      </h3>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="ci-eyebrow">Energy · last 14</p>
                          <div className="mt-2">
                            <SeriesBars
                              id="energy"
                              series={analysis.trackers.energy.series}
                              goal={goals.energy}
                              height={72}
                              showAxis={false}
                            />
                          </div>
                          <p className="mt-2 text-[11.5px] ci-muted">
                            Average{" "}
                            {analysis.trackers.energy.avg7 === null
                              ? "—"
                              : `${analysis.trackers.energy.avg7.toFixed(1)}/5`}
                          </p>
                        </div>
                        <div>
                          <p className="ci-eyebrow">Screen · last 14</p>
                          <div className="mt-2">
                            <SeriesBars
                              id="screen"
                              series={analysis.trackers.screen.series}
                              goal={goals.screenMinutes}
                              height={72}
                              showAxis={false}
                            />
                          </div>
                          <p className="mt-2 text-[11.5px] ci-muted">
                            Average {fmt("screen", analysis.trackers.screen.avg7)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* --------------------------- the advanced read --------------------------- */}
                <div className="mt-4">
                  <AdvancedCard insight={analysis.advanced} defs={defs} />
                </div>

                {/* ------------------------- what the record says ------------------------- */}
                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
                  <div className="tk-panel" aria-labelledby="tk-h-07">
                    <div className="tk-head" style={{ ["--tk-accent" as string]: "var(--ci-late)" }}>
                    <Tile icon={Sparkles} accent={"var(--ci-late)"} />
                      <span className="tk-head__label" id="tk-h-07">Observations</span>
                      <span className="tk-head__rule" />
                      <span className="tk-head__aside">Descriptions of your own record. Not advice, and not a diagnosis.</span>
                    </div>
                    <h3 className="mt-2.5 font-[family-name:var(--ci-font-display)] text-[17px] leading-snug">
                      What we're noticing
                    </h3>
                    <div className="mt-4 space-y-2">
                      {analysis.observations.length === 0 ? (
                        <p className="text-[12.5px] leading-relaxed ci-muted">
                          A few more days logged and these start writing themselves.
                        </p>
                      ) : (
                        analysis.observations.map((line) => (
                          <div className="tk-note" key={line}>
                            <i aria-hidden />
                            <span>{line}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="tk-panel" aria-labelledby="tk-h-08">
                    <div className="tk-head" style={{ ["--tk-accent" as string]: "var(--ci-luteal)" }}>
                    <Tile icon={Waypoints} accent={"var(--ci-luteal)"} />
                      <span className="tk-head__label" id="tk-h-08">Correlations</span>
                      <span className="tk-head__rule" />
                      <span className="tk-head__aside">Every line carries the number of days behind it.</span>
                    </div>
                    <h3 className="mt-2.5 font-[family-name:var(--ci-font-display)] text-[17px] leading-snug">
                      What moves together
                    </h3>
                    <div className="mt-4">
                      <Correlations items={analysis.correlations} />
                    </div>
                  </div>
                </div>

                {/* --------------------------------- record -------------------------------- */}
                <div className="mt-4">
                  <Reveal>
                    <HistoryTable
                      days={store.days}
                      analysis={analysis}
                      disabled={preview}
                      onEdit={preview ? undefined : editDate}
                      onDelete={preview ? undefined : store.removeDay}
                      onExport={exportCsv}
                      onClearAll={preview ? undefined : store.clearAll}
                    />
                  </Reveal>
                </div>

                <p className="mt-4 text-[11.5px] leading-relaxed ci-muted">
                  The tracker record covers the {analysis.daysLogged} days you logged between{" "}
                  {store.days.length > 0
                    ? `${store.days[store.days.length - 1]!.date} and ${store.days[0]!.date}`
                    : "—"}
                  . Days you didn't log are left out of every average rather than counted as zero.
                </p>
              </>
            ) : null}

            <footer className="ci-rise mt-8 border-t pt-5 ci-hair">
              <p className="text-[11.5px] leading-relaxed ci-muted">
                Everything on this page is computed from the days you logged in this browser. It is
                not medical advice, it cannot diagnose anything, and the targets are numbers you
                chose — not recommendations from us. Your data stays on this device unless you
                export it.
              </p>
              <p className="mt-3 text-[11.5px] ci-muted">
                Bloom · Trackers · {addDays(today, 0)}
              </p>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="ci-eyebrow">{label}</p>
      <p className="ci-num mt-1 text-[15px] leading-none">{value}</p>
    </div>
  );
}

function fmt(id: TrackerId, value: number | null): string {
  return value === null ? "—" : trackerDef(id).format(Math.round(value));
}
