/**
 * CycleCalendar — a secondary exploration tool, not the star of the page.
 * One primary month with a real context rail: the selected day's truth on
 * the right (on mobile, directly beneath), plus an honest "this month at a
 * glance" derived from the same engine. Marks: logged period (rose wash),
 * estimated period (dashed), fertile (gold dot), ovulation (ring), today
 * (violet edge). Cells stay flat — no giant dark cards per date. Keyboard
 * roving grid, prev/next/Today controls, leap-safe UTC math.
 */

import { useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Pencil, Plus } from "lucide-react";

import { SELECT, TAP } from "@/lib/cycle/motion";
import { cn } from "@/lib/utils";
import { dayStateFor, fmtShort, localDateKey, pad2 } from "@/lib/cycle/engine";
import { dayStateCopy, evidenceGlyph } from "@/lib/cycle/presentation";
import type { CycleEntry, CycleModel, DayState, PhaseKey } from "@/lib/cycle/types";
import { PHASE_COLOR } from "@/lib/cycle/palette";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function monthCells(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const dowMon = (first.getUTCDay() + 6) % 7; // Monday-first
  const daysIn = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: { key: string; day: number; inMonth: boolean }[] = [];
  for (let i = 0; i < dowMon; i++) {
    const d = new Date(Date.UTC(year, month, 1 - (dowMon - i)));
    cells.push({ key: `pre-${d.toISOString()}`, day: d.getUTCDate(), inMonth: false });
  }
  for (let d = 1; d <= daysIn; d++)
    cells.push({ key: `m${year}-${month}-${d}`, day: d, inMonth: true });
  while (cells.length % 7 !== 0) {
    const next = new Date(
      Date.UTC(year, month, daysIn + (cells.length % 7 === 0 ? 7 : cells.length % 7)),
    );
    cells.push({ key: `post-${next.toISOString()}`, day: next.getUTCDate(), inMonth: false });
  }
  return cells;
}

const keyOf = (y: number, m: number, d: number) => `${y}-${pad2(m + 1)}-${pad2(d)}`;
const EMPTY_STATE: DayState = {
  logged: null,
  phase: null,
  predictedPeriod: false,
  predictedFertile: false,
  predictedOvulation: false,
  pms: false,
};

function DayCell({
  dateKey,
  dayNum,
  inMonth,
  isToday,
  isSelected,
  isInspect = false,
  state,
  onSelect,
  tabIndex,
  onKeyNav,
}: {
  dateKey: string;
  dayNum: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isInspect?: boolean;
  state: DayState;
  onSelect: () => void;
  tabIndex: number;
  onKeyNav: (e: React.KeyboardEvent) => void;
}) {
  const hasFlow = state.logged?.flow && state.logged.flow !== "none";
  const tint =
    !hasFlow && state.phase && !state.logged
      ? `color-mix(in oklab, ${PHASE_COLOR[state.phase as PhaseKey]} 9%, transparent)`
      : undefined;
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      transition={TAP}
      type="button"
      role="gridcell"
      aria-selected={isSelected}
      aria-label={
        inMonth
          ? `${fmtShort(dateKey)}${hasFlow ? ", period logged" : ""}${state.logged && !hasFlow ? ", logged" : ""}${
              state.predictedPeriod ? ", period estimated" : ""
            }${state.predictedFertile ? ", estimated fertile" : ""}${state.predictedOvulation ? ", estimated ovulation" : ""}${
              isToday ? ", today" : ""
            }`
          : undefined
      }
      disabled={!inMonth}
      tabIndex={inMonth ? tabIndex : -1}
      onKeyDown={onKeyNav}
      onClick={onSelect}
      className={cn(
        "cy-cell",
        hasFlow && "cy-cell--flow",
        isSelected && "cy-cell--sel",
        isInspect && "cy-cell--inspect",
        isToday && "cy-cell--today",
        !inMonth && "pointer-events-none opacity-25",
      )}
    >
      <span>{dayNum}</span>
      {/* status glyphs — never color alone */}
      <span
        className="absolute inset-x-0 bottom-[5px] flex items-center justify-center gap-0.5"
        aria-hidden
      >
        {state.predictedPeriod ? (
          <span className="h-[2.5px] w-[13px] rounded-full border border-dashed border-[color:var(--cycle-menstrual)] opacity-90" />
        ) : null}
        {!state.predictedPeriod && state.predictedFertile ? (
          <span className="size-[4px] rounded-full bg-[color:var(--cycle-ovulation)] opacity-60" />
        ) : null}
        {state.predictedOvulation ? (
          <span className="size-[6px] rounded-full border-[1.5px] border-[color:var(--cycle-ovulation)]" />
        ) : null}
        {state.phase && !hasFlow && !state.predictedFertile ? (
          <span
            className="size-[3px] rounded-full"
            style={{ background: PHASE_COLOR[state.phase as PhaseKey], opacity: 0.55 }}
          />
        ) : null}
      </span>
      {state.logged?.symptoms.length ? (
        <span
          aria-hidden
          className="absolute right-1.5 top-1.5 size-[3px] rounded-full bg-[var(--muted-foreground)]"
        />
      ) : null}
    </motion.button>
  );
}

export function CycleCalendar({
  model,
  entries,
  onQuickLog,
  onEditDay,
  inspectDate = null,
  onInspect,
}: {
  model: CycleModel;
  entries: CycleEntry[];
  onQuickLog: (date: string) => void;
  onEditDay: (entry: CycleEntry) => void;
  /** day focused elsewhere on the page — echoed here as a soft ring */
  inspectDate?: string | null;
  onInspect?: (date: string | null) => void;
}) {
  const [anchor, setAnchor] = useState(() => {
    const [y, m] = localDateKey().split("-").map(Number);
    return { y: y ?? 1970, m: (m ?? 1) - 1 };
  });
  const [selected, setSelectedRaw] = useState<string | null>(null);
  const setSelected = (k: string | null) => {
    setSelectedRaw(k);
    onInspect?.(k === model.today ? null : k);
  };
  const [roving, setRoving] = useState<string>("");
  const gridRef = useRef<HTMLDivElement | null>(null);

  const cells = useMemo(() => monthCells(anchor.y, anchor.m), [anchor]);
  const monthKeys = useMemo(
    () => cells.filter((c) => c.inMonth).map((c) => keyOf(anchor.y, anchor.m, c.day)),
    [cells, anchor],
  );

  const stateFor = (k: string) => dayStateFor(k, entries, model);

  const shift = (dir: number) => {
    const d = new Date(Date.UTC(anchor.y, anchor.m + dir, 1));
    setAnchor({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
    setSelected(null);
  };

  const selState = selected ? stateFor(selected) : null;
  const selCopy = selState ? dayStateCopy(selState) : null;

  const glance = useMemo(() => {
    let periodDays = 0;
    let fertileDays = 0;
    let ovuDay: number | null = null;
    let loggedDays = 0;
    for (const k of monthKeys) {
      const s = stateFor(k);
      if (s.logged) loggedDays += 1;
      if (s.predictedPeriod || (s.logged?.flow && s.logged.flow !== "none")) periodDays += 1;
      if (s.predictedFertile) fertileDays += 1;
      if (s.predictedOvulation) ovuDay = Number(k.slice(8, 10));
    }
    return { periodDays, fertileDays, ovuDay, loggedDays, total: monthKeys.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKeys, entries, model]);

  const move = (e: React.KeyboardEvent, index: number) => {
    const deltas: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: 7,
      ArrowUp: -7,
    };
    const d = deltas[e.key];
    if (d === undefined) return;
    e.preventDefault();
    const next = cells[Math.min(cells.length - 1, Math.max(0, index + d))];
    if (!next || !next.inMonth) return;
    setRoving(next.key);
    const el = gridRef.current?.querySelectorAll<HTMLButtonElement>("[role='gridcell']")[index + d];
    el?.focus();
    if (e.shiftKey) setSelected(next.key);
  };

  return (
    <div className="cy-cal">
      <div className="min-w-0">
        <div className="mb-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Previous month"
            className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="text-center">
            <p className="cy-title text-[19px] leading-none">
              {MONTH_NAMES[anchor.m]} <span className="text-muted-foreground">{anchor.y}</span>
            </p>
            <p className="mono mt-1 text-[8.5px] uppercase tracking-[0.1em] text-faint">
              {glance.loggedDays} of {glance.total} days logged
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const [y, m] = localDateKey().split("-").map(Number);
                setAnchor({ y: y ?? 1970, m: (m ?? 1) - 1 });
                setSelected(null);
              }}
              className="mono rounded-full border border-border px-2.5 py-1 text-[9px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => shift(1)}
              aria-label="Next month"
              className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div
          className="grid grid-cols-7 gap-0.5"
          role="grid"
          aria-label={`${MONTH_NAMES[anchor.m]} ${anchor.y}`}
          ref={gridRef}
        >
          {DOW.map((d) => (
            <span
              key={d}
              role="columnheader"
              aria-label={d}
              className="pb-1 text-center text-[9.5px] uppercase tracking-wider text-faint"
            >
              {d}
            </span>
          ))}
          {cells.map((c, i) => {
            const k = c.inMonth ? keyOf(anchor.y, anchor.m, c.day) : "";
            return (
              <DayCell
                key={c.key}
                dateKey={k}
                dayNum={c.day}
                inMonth={c.inMonth}
                isToday={c.inMonth && k === model.today}
                isSelected={c.inMonth && k === selected}
                state={c.inMonth ? stateFor(k) : EMPTY_STATE}
                isInspect={c.inMonth && k === inspectDate}
                onSelect={() => c.inMonth && setSelected(k)}
                tabIndex={c.key === roving ? 0 : -1}
                onKeyNav={(e) => move(e, i)}
              />
            );
          })}
        </div>

        <p className="mono mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] uppercase tracking-[0.08em] text-faint">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2 rounded-[3px] bg-[color-mix(in_oklab,var(--cycle-menstrual)_40%,transparent)]"
              aria-hidden
            />{" "}
            logged flow
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2 rounded-[3px] border border-dashed border-[color:var(--cycle-menstrual)]"
              aria-hidden
            />{" "}
            period estimated
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-[5px] rounded-full bg-[color:var(--cycle-ovulation)] opacity-60"
              aria-hidden
            />{" "}
            fertile est.
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-[7px] rounded-full border-[1.5px] border-[color:var(--cycle-ovulation)]"
              aria-hidden
            />{" "}
            ovulation est.
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-[7px] w-[7px] rounded-full ring-[1.5px] ring-[color:var(--violet)]"
              aria-hidden
            />{" "}
            today
          </span>
        </p>
      </div>

      {/* context rail */}
      <aside data-qa="cal-rail" className="min-w-0" aria-label="Selected day and month context">
        {selected && selState ? (
          <div
            className="rounded-xl bg-surface/55 p-4 ring-1 ring-[var(--cycle-hair)]"
            role="region"
            aria-label={`Details for ${fmtShort(selected)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="cy-title text-[17px]">{selCopy?.title ?? fmtShort(selected)}</p>
                <p className="mt-0.5 text-[11.5px] text-faint">{fmtShort(selected)}</p>
              </div>
              <button
                type="button"
                aria-label="Close day detail"
                onClick={() => setSelected(null)}
                className="mono -mt-0.5 rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-faint transition-colors hover:text-foreground"
              >
                close
              </button>
            </div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              {selState.logged ? (
                <>
                  Logged
                  {selState.logged.flow && selState.logged.flow !== "none"
                    ? ` · flow: ${selState.logged.flow}`
                    : ""}
                  {selState.logged.mood ? ` · mood: ${selState.logged.mood.toLowerCase()}` : ""}
                  {selState.logged.energy ? ` · energy ${selState.logged.energy}/5` : ""}
                  {selState.logged.sleep_hours ? ` · ${selState.logged.sleep_hours}h sleep` : ""}
                  {selState.logged.symptoms.length > 0
                    ? ` · ${selState.logged.symptoms.join(", ")}`
                    : ""}
                </>
              ) : (
                "Nothing logged for this day."
              )}
            </p>
            <div className="mt-2 space-y-1 text-[11.5px] text-faint">
              <p className="inline-flex flex-wrap items-center gap-1.5">
                <span
                  className="size-2 rounded-full border border-[color:var(--cycle-menstrual)]"
                  style={{
                    background:
                      selState.bleedingState !== "unlogged" && selState.bleedingState !== "none"
                        ? "var(--cycle-menstrual)"
                        : "transparent",
                  }}
                  aria-hidden
                />
                {evidenceGlyph(selState.bleedingProvenance)} {selCopy?.support}
                {selState.predictedPeriod ? " · Bloom estimate for your period" : ""}
              </p>
              <p className="inline-flex flex-wrap items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{
                    background: selState.reproductivePhase
                      ? PHASE_COLOR[selState.reproductivePhase as PhaseKey]
                      : "transparent",
                    boxShadow: selState.reproductivePhase
                      ? undefined
                      : "inset 0 0 0 1px var(--cycle-hair-strong)",
                  }}
                  aria-hidden
                />
                {evidenceGlyph(selState.reproductiveProvenance)} {selCopy?.secondary}
                {selState.predictedFertile ? " · likely fertile window" : ""}
                {selState.predictedOvulation ? " · estimated ovulation" : ""}
              </p>
            </div>
            <p className="mt-2 rounded-lg border border-[var(--cycle-hair)] px-2.5 py-2 text-[11.5px] leading-relaxed text-muted-foreground">
              <b className="font-medium text-foreground">Why:</b> {selState.provenance.reason}
            </p>
            {selState.conflict ? (
              <p className="mt-2 rounded-lg border border-amber/30 bg-amber/5 px-2.5 py-2 text-[11.5px] leading-relaxed text-amber">
                {selState.conflict.message}
              </p>
            ) : null}
            {selState.logged?.notes ? (
              <p className="mt-2 text-[12.5px] italic leading-relaxed text-muted-foreground">
                &ldquo;{selState.logged.notes}&rdquo;
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => (selState.logged ? onEditDay(selState.logged) : onQuickLog(selected!))}
              className="cy-btn cy-btn--quiet mt-3 w-full justify-center"
            >
              {selState.logged ? (
                <>
                  <Pencil className="size-3" aria-hidden /> Edit day
                </>
              ) : (
                <>
                  <Plus className="size-3" aria-hidden /> Log this day
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <p className="cy-eyebrow">This month at a glance</p>
            <GlanceLine
              label="period days"
              value={glance.periodDays > 0 ? `${glance.periodDays}` : "—"}
              tone="var(--cycle-menstrual)"
              note={glance.periodDays > 0 ? "logged + estimated" : "nothing in range"}
            />
            <GlanceLine
              label="fertile days (est.)"
              value={glance.fertileDays > 0 ? `${glance.fertileDays}` : "—"}
              tone="var(--cycle-follicular)"
              note={model.confidence === "assumed" ? "general pattern" : "from your model"}
            />
            <GlanceLine
              label="estimated ovulation"
              value={glance.ovuDay ? `day ${glance.ovuDay}` : "—"}
              tone="var(--cycle-ovulation)"
              note={glance.ovuDay ? "window, not a fixed hour" : "not this month"}
            />
            <p className="mt-1 text-[11.5px] leading-relaxed text-faint">
              Pick any date to see what Bloom actually knows about it — nothing more, nothing
              invented.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

function GlanceLine({
  label,
  value,
  tone,
  note,
}: {
  label: string;
  value: string;
  tone: string;
  note: string;
}) {
  return (
    <div className="flex items-baseline gap-2.5 border-b border-[var(--cycle-hair)] pb-2">
      <span
        className="mt-[3px] inline-block size-[7px] shrink-0 self-center rounded-full"
        style={{ background: tone }}
        aria-hidden
      />
      <span className="min-w-0 flex-1 text-[12px] text-muted-foreground">{label}</span>
      <span className="mono text-[12px] text-foreground">{value}</span>
      <span className="mono w-[110px] shrink-0 truncate text-right text-[8.5px] uppercase tracking-[0.06em] text-faint">
        {note}
      </span>
    </div>
  );
}
