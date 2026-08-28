/**
 * Calendar — a planning surface, not a color swatch board. Three months on
 * desktop (one on mobile), solid = logged, dashed/soft = estimated, a ring
 * for today, and a real day-detail surface on selection with keyboard
 * roving. Leap years, year rollovers, any first-weekday — the engine works
 * on UTC day arithmetic so none of them matter.
 */

import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { dayStateFor, fmtShort, localDateKey, pad2 } from "@/lib/cycle/engine";
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

function monthCells(year: number, month: number): { key: string; day: number; inMonth: boolean }[] {
  const first = new Date(Date.UTC(year, month, 1));
  const dowMon = (first.getUTCDay() + 6) % 7; // Monday-first grid
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

function DayCell({
  dateKey,
  dayNum,
  inMonth,
  isToday,
  isSelected,
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
  state: DayState;
  onSelect: () => void;
  tabIndex: number;
  onKeyNav: (e: React.KeyboardEvent) => void;
}) {
  const hasFlow = state.logged?.flow && state.logged.flow !== "none";
  return (
    <button
      type="button"
      role="gridcell"
      aria-selected={isSelected}
      aria-label={
        inMonth
          ? `${fmtShort(dateKey)}${hasFlow ? ", period logged" : ""}${state.logged ? ", logged" : ""}${state.predictedPeriod ? ", period estimated" : ""}${state.predictedFertile ? ", estimated fertile" : ""}${isToday ? ", today" : ""}`
          : undefined
      }
      tabIndex={tabIndex}
      onKeyDown={onKeyNav}
      onClick={onSelect}
      className={cn(
        "relative grid h-11 place-items-center rounded-lg border text-[12.5px] transition-[background-color,border-color,transform] duration-[var(--motion-fast)] outline-none",
        !inMonth && "pointer-events-none opacity-30",
        isSelected
          ? "border-foreground/50 bg-surface-3 font-semibold text-foreground"
          : "border-transparent text-muted-foreground hover:bg-surface-2/70 hover:text-foreground focus-visible:border-[color:var(--border-strong)]",
      )}
      style={
        hasFlow
          ? {
              background: "color-mix(in oklab, var(--cycle-menstrual) 26%, transparent)",
              borderColor: "color-mix(in oklab, var(--cycle-menstrual) 45%, transparent)",
              color: "var(--foreground)",
            }
          : state.logged
            ? { borderColor: "var(--border)" }
            : undefined
      }
    >
      <span>{dayNum}</span>
      {/* status glyphs — never color alone */}
      <span
        className="absolute inset-x-0 bottom-1 flex items-center justify-center gap-0.5"
        aria-hidden
      >
        {state.predictedPeriod ? (
          <span className="h-[3px] w-[14px] rounded-full border border-dashed border-[color:var(--cycle-menstrual)] opacity-80" />
        ) : null}
        {!state.predictedPeriod && state.predictedFertile ? (
          <span className="size-[5px] rounded-full bg-[color:var(--cycle-ovulation)] opacity-45" />
        ) : null}
        {state.predictedOvulation ? (
          <span className="size-[7px] rounded-full border-[1.5px] border-[color:var(--cycle-ovulation)]" />
        ) : null}
        {state.phase && !hasFlow && !state.predictedFertile ? (
          <span
            className="size-[4px] rounded-full"
            style={{ background: PHASE_COLOR[state.phase as PhaseKey], opacity: 0.6 }}
          />
        ) : null}
      </span>
      {isToday ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-[color:var(--profile-accent,var(--violet))] ring-offset-0"
        />
      ) : null}
      {state.logged?.symptoms.length ? (
        <span
          aria-hidden
          className="absolute right-1.5 top-1.5 size-[3px] rounded-full bg-[var(--muted-foreground)]"
        />
      ) : null}
    </button>
  );
}

function Month({
  year,
  month,
  entries,
  entryIndex,
  model,
  selected,
  onSelect,
  roving,
  setRoving,
}: {
  year: number;
  month: number;
  entries: CycleEntry[];
  entryIndex: Map<string, CycleEntry>;
  model: CycleModel;
  selected: string | null;
  onSelect: (k: string) => void;
  roving: string;
  setRoving: (k: string) => void;
}) {
  const cells = useMemo(() => monthCells(year, month), [year, month]);
  const today = model.today;
  const gridRef = useRef<HTMLDivElement | null>(null);

  const stateFor = (k: string) => dayStateFor(k, entries, model);

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
    if (e.shiftKey) onSelect(next.key);
  };

  return (
    <div className="min-w-0">
      <p className="mono mb-2 text-[10px] uppercase tracking-[0.1em] text-faint">
        {MONTH_NAMES[month]} <span className="text-foreground/70">{year}</span>
      </p>
      <div
        className="grid grid-cols-7 gap-y-0.5"
        role="grid"
        aria-label={`${MONTH_NAMES[month]} ${year}`}
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
        {cells.map((c, i) => (
          <DayCell
            key={c.key}
            dateKey={c.inMonth ? keyOf(year, month, c.day) : ""}
            dayNum={c.day}
            inMonth={c.inMonth}
            isToday={c.inMonth && keyOf(year, month, c.day) === today}
            isSelected={c.inMonth && keyOf(year, month, c.day) === selected}
            state={
              c.inMonth
                ? stateFor(keyOf(year, month, c.day))
                : {
                    logged: null,
                    phase: null,
                    predictedPeriod: false,
                    predictedFertile: false,
                    predictedOvulation: false,
                    pms: false,
                  }
            }
            onSelect={() => c.inMonth && onSelect(keyOf(year, month, c.day))}
            tabIndex={c.key === roving ? 0 : -1}
            onKeyNav={(e) => move(e, i)}
          />
        ))}
      </div>
    </div>
  );
}

export function CycleCalendar({
  model,
  entries,
  onQuickLog,
  onEditDay,
}: {
  model: CycleModel;
  entries: CycleEntry[];
  onQuickLog: (date: string) => void;
  onEditDay: (entry: CycleEntry) => void;
}) {
  const [anchor, setAnchor] = useState(() => {
    const t = new Date(`${localDateKey()}T00:00:00`);
    return { y: t.getFullYear(), m: t.getMonth() };
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [roving, setRoving] = useState<string>("");

  const entryIndex = useMemo(() => new Map(entries.map((e) => [e.date, e])), [entries]);
  const months = useMemo(
    () =>
      [-1, 0, 1].map((o) => {
        const d = new Date(Date.UTC(anchor.y, anchor.m + o, 1));
        return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
      }),
    [anchor],
  );

  const shift = (dir: number) => {
    const d = new Date(Date.UTC(anchor.y, anchor.m + dir, 1));
    setAnchor({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
    setSelected(null);
  };

  const sel = selected ? (entryIndex.get(selected) ?? null) : null;
  const selState = selected ? dayStateFor(selected, entries, model) : null;

  return (
    <div className="rounded-2xl border border-border/80 bg-surface/35 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="Previous month"
          className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const t = new Date();
              setAnchor({ y: t.getFullYear(), m: t.getMonth() });
              setSelected(null);
            }}
            className="mono rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Today
          </button>
        </div>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Next month"
          className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {months.map(({ y, m }, i) => (
          <div key={`${y}-${m}`} className={i === 1 ? undefined : "hidden sm:block"}>
            <Month
              year={y}
              month={m}
              entries={entries}
              entryIndex={entryIndex}
              model={model}
              selected={selected}
              onSelect={(k) => setSelected((s) => (s === k ? null : k))}
              roving={roving}
              setRoving={setRoving}
            />
          </div>
        ))}
      </div>

      {selected && selState ? (
        <div
          className="mt-4 rounded-xl border border-border bg-surface/70 p-4"
          role="region"
          aria-label={`Details for ${fmtShort(selected)}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="display text-[16px]">{fmtShort(selected)}</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {selState.logged ? (
                  <>
                    Logged
                    {selState.logged.flow && selState.logged.flow !== "none"
                      ? ` · flow: ${selState.logged.flow}`
                      : ""}
                    {selState.logged.mood ? ` · mood: ${selState.logged.mood.toLowerCase()}` : ""}
                    {selState.logged.energy ? ` · energy ${selState.logged.energy}/5` : ""}
                    {selState.logged.symptoms.length > 0
                      ? ` · ${selState.logged.symptoms.join(", ")}`
                      : ""}
                  </>
                ) : (
                  "Nothing logged for this day"
                )}
              </p>
              {selState.phase ? (
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] text-faint">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: PHASE_COLOR[selState.phase as PhaseKey] }}
                    aria-hidden
                  />
                  {selState.logged ? "logged phase" : "estimated"} · {selState.phase}
                  {selState.predictedPeriod ? " · inside estimated period days" : ""}
                  {selState.predictedFertile ? " · inside estimated fertile window" : ""}
                  {selState.predictedOvulation ? " · estimated ovulation day" : ""}
                </p>
              ) : null}
              {selState.logged?.notes ? (
                <p className="mt-1.5 max-w-[46ch] text-[12.5px] italic text-muted-foreground">
                  "{selState.logged.notes}"
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-2">
              {selState.logged ? (
                <button
                  type="button"
                  onClick={() => onEditDay(selState.logged!)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                >
                  <Pencil className="size-3" aria-hidden /> Edit day
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onQuickLog(selected!)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                >
                  <Plus className="size-3" aria-hidden /> Log this day
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <p className="mono mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[9px] uppercase tracking-[0.08em] text-faint">
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
            className="size-[6px] rounded-full bg-[color:var(--cycle-ovulation)] opacity-60"
            aria-hidden
          />{" "}
          fertile est.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="size-[8px] rounded-full border-[1.5px] border-[color:var(--cycle-ovulation)]"
            aria-hidden
          />{" "}
          ovulation est.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-[3px] w-4 rounded-full ring-2 ring-[color:var(--profile-accent,var(--violet))]"
            aria-hidden
          />{" "}
          today
        </span>
      </p>
    </div>
  );
}
