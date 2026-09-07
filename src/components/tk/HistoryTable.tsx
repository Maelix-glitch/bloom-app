/**
 * HistoryTable — the record, row by row.
 *
 * Every column is a value someone typed. Empty cells are empty; nothing is
 * averaged into them. Rows can be loaded back into the log panel or deleted,
 * and the whole record exports as CSV.
 */

import { useEffect, useState } from "react";
import { Download, Pencil, Trash2 } from "lucide-react";

import { Button, Card } from "@/components/ci/primitives";
import { formatDateShort } from "@/lib/cycle/predict";
import { Metric } from "@/components/tk/designs/shared";
import {
  TRACKERS,
  trackerDef,
  valueOf,
  type DayEntry,
  type TrackerAnalysis,
} from "@/lib/trackers/core";

export function HistoryTable({
  days,
  analysis,
  disabled = false,
  onEdit,
  onDelete,
  onExport,
  onClearAll,
}: {
  days: readonly DayEntry[];
  analysis: TrackerAnalysis;
  disabled?: boolean;
  onEdit?: ((date: string) => void) | undefined;
  onDelete?: ((date: string) => void) | undefined;
  onExport?: (() => void) | undefined;
  onClearAll?: (() => void) | undefined;
}) {
  const rows = days.slice(0, 21);
  /* "Clear all" asks once, inline, and the answer can still be undone after. */
  const [confirmClear, setConfirmClear] = useState(false);
  useEffect(() => {
    if (days.length === 0) setConfirmClear(false);
  }, [days.length]);

  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ci-eyebrow">Your record</p>
          <h2 className="ci-display mt-1.5 text-[19px] leading-tight sm:text-[22px]">
            Every day you've logged
          </h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed ci-soft">
            {analysis.daysLogged} {analysis.daysLogged === 1 ? "day" : "days"} in the record · best
            run {analysis.bestStreak} {analysis.bestStreak === 1 ? "day" : "days"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onExport ? (
            <Button variant="ghost" size="sm" onClick={onExport} disabled={rows.length === 0}>
              <Download size={13} aria-hidden />
              Export CSV
            </Button>
          ) : null}
          {onClearAll && !confirmClear ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmClear(true)}
              disabled={disabled || days.length === 0}
              data-testid="tk-clear-all"
            >
              Clear all
            </Button>
          ) : null}
        </div>
      </div>

      {onClearAll && confirmClear ? (
        <div
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ci-hair"
          role="alertdialog"
          aria-live="polite"
          aria-label="Confirm clearing the record"
          data-testid="tk-clear-all-confirm"
        >
          <p className="text-[12.5px] leading-relaxed ci-soft">
            Remove all {days.length} {days.length === 1 ? "day" : "days"} from your record
            {" — "}every tracker, every date? You'll get a few seconds to undo.
          </p>
          <span className="flex items-center gap-2">
            <Button
              variant="danger"
              size="sm"
              disabled={disabled}
              onClick={() => {
                onClearAll();
                setConfirmClear(false);
              }}
              data-testid="tk-clear-all-yes"
            >
              Yes, clear everything
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>
              Keep it
            </Button>
          </span>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="mt-4 text-[12.5px] leading-relaxed ci-muted">
          Nothing logged yet. Save a day above and it lands here.
        </p>
      ) : (
        <div className="ci-scroll mt-4 overflow-x-auto">
          <table className="ci-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                {TRACKERS.map((def) => (
                  <th key={def.id} scope="col">
                    {def.name}
                  </th>
                ))}
                <th scope="col">
                  <span className="tk-sr">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((day) => (
                <tr key={day.date}>
                  <th scope="row">{formatDateShort(day.date)}</th>
                  {TRACKERS.map((def) => {
                    const value = valueOf(day, def.id);
                    const stat = analysis.trackers[def.id];
                    const met = value === null ? null : stat.met;
                    return (
                      <td key={def.id}>
                        {value === null ? (
                          <span className="ci-muted">—</span>
                        ) : (
                          <Metric
                            value={def.format(Math.round(value))}
                            className={
                              met === true
                                ? "tk2-cell-met"
                                : met === false
                                  ? "tk2-cell-under"
                                  : ""
                            }
                          />
                        )}
                      </td>
                    );
                  })}
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      {onEdit ? (
                        <button
                          type="button"
                          className="ci-btn ci-btn--ghost ci-btn--sm"
                          disabled={disabled}
                          onClick={() => onEdit(day.date)}
                        >
                          <Pencil size={12} aria-hidden />
                          Edit
                        </button>
                      ) : null}
                      {onDelete ? (
                        <button
                          type="button"
                          className="tk2-row-action"
                          disabled={disabled}
                          aria-label={`Delete ${formatDateShort(day.date)} — you can undo for a few seconds`}
                          title="Delete this day (undo available)"
                          onClick={() => onDelete(day.date)}
                        >
                          <Trash2 size={12} aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-[11.5px] leading-relaxed ci-muted">
        Showing the {rows.length} most recent {rows.length === 1 ? "day" : "days"}. Targets:{" "}
        {TRACKERS.map((def) => `${def.name} ${def.format(analysis.trackers[def.id].goal)}`).join(
          " · ",
        )}
        .
      </p>
      <p className="tk-sr">
        {trackerDef("sleep").name} is measured in hours, water in litres, everything else in
        minutes.
      </p>
    </Card>
  );
}

export default HistoryTable;
