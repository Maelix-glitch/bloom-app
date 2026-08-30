/**
 * ConsoleRow — one tracker, one row: its ring, its fourteen-day line, its
 * streak beads and the buttons that log it in a tap.
 */

import type { TrackerDef } from "@/lib/trackers/core";
import { Ring } from "@/components/tk/Ring";
import { Sparkline } from "@/components/tk/Sparkline";
import { StreakBeads } from "@/components/tk/StreakBeads";
import { TrackerIcon, TRACKER_ACCENT } from "@/components/tk/icons";

export function ConsoleRow({
  def,
  value,
  goal,
  series,
  met,
  steps,
  onAdd,
  picks,
  onPick,
  onEdit,
}: {
  def: TrackerDef;
  value: number | null;
  goal?: number | null;
  series: (number | null)[];
  met: boolean[];
  steps?: { amount: number; label: string }[] | undefined;
  onAdd?: ((amount: number) => void) | undefined;
  picks?: number[] | undefined;
  onPick?: ((value: number) => void) | undefined;
  onEdit?: (() => void) | undefined;
}) {
  const accent = TRACKER_ACCENT[def.id];
  const share = value !== null && goal ? Math.min(value / goal, 1) : value !== null ? 1 : 0;

  return (
    <div className="tk-row" style={{ ["--tk-accent" as string]: accent }}>
      <Ring
        progress={share}
        accent={accent}
        size={46}
        stroke={5}
        empty={value === null}
        label={`${def.name}: ${def.format(value ?? 0)} against a target of ${def.format(goal ?? 0)}`}
      />

      <div className="tk-row__id">
        <TrackerIcon id={def.id} size={15} />
        <div className="min-w-0">
          <div className="tk-row__name">{def.name}</div>
          <div className="tk-row__value">
            {value === null ? "nothing logged yet" : def.format(value)}
            {goal ? ` of ${def.format(goal)}` : ""}
          </div>
        </div>
      </div>

      <Sparkline
        values={series}
        accent={accent}
        goal={goal ?? null}
        label={`${def.name} over the last ${series.length} days`}
      />

      <div className="tk-row__actions">
        <StreakBeads
          met={met}
          label={`${met.filter(Boolean).length} of the last ${met.length} days met the ${def.name.toLowerCase()} target`}
        />
        {picks?.map((p) => (
          <button
            key={p}
            type="button"
            className="tk-circle !h-[22px] !w-[22px] !text-[10px]"
            style={value === p ? { color: accent, borderColor: accent } : undefined}
            aria-label={`Set ${def.name} to ${p}`}
            aria-pressed={value === p}
            onClick={() => onPick?.(p)}
          >
            {p}
          </button>
        ))}
        {steps?.map((s) => (
          <button
            key={s.amount}
            type="button"
            className="tk-circle"
            aria-label={`Add ${s.label} to ${def.name}`}
            onClick={() => onAdd?.(s.amount)}
          >
            {s.label}
          </button>
        ))}
        {onEdit ? (
          <button type="button" className="tk-circle" aria-label={`Log ${def.name}`} onClick={onEdit}>
            +
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default ConsoleRow;
