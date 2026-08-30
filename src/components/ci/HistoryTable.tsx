/**
 * HistoryTable — everything logged, with the computed length since the
 * previous entry and a flag on any gap the averaging logic refused to trust.
 * Delete and clear are both two-step (no modal, no accidental wipe).
 */

import { useState } from "react";
import { Download, Pencil, Trash2, TriangleAlert } from "lucide-react";

import { Button, Card, SectionHead } from "./primitives";
import {
  formatDate,
  formatDateShort,
  type CycleAnalysis,
  type PeriodLog,
} from "@/lib/cycle/predict";

export function HistoryTable({
  analysis,
  logs,
  disabled = false,
  onEdit,
  onDelete,
  onClearAll,
  onExport,
}: {
  analysis: CycleAnalysis;
  logs: PeriodLog[];
  disabled?: boolean;
  onEdit: (log: PeriodLog) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onExport?: () => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const ordered = [...logs].sort((a, b) => b.start.localeCompare(a.start));
  const gapFor = (id: string) => analysis.gaps.find((g) => g.toId === id) ?? null;

  return (
    <Card>
      <SectionHead
        eyebrow="Your record"
        title="Every entry you've logged"
        note="Lengths marked as not counted were too short or too long to be a real cycle, so they stay out of the average — fix the gap and the average corrects itself."
        aside={
          onExport ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onExport}
              disabled={disabled || logs.length === 0}
            >
              <Download size={13} aria-hidden />
              Export CSV
            </Button>
          ) : null
        }
      />

      {ordered.length === 0 ? (
        <p className="mt-5 rounded-[var(--ci-radius-md)] border border-dashed px-4 py-8 text-center text-[13px] ci-muted ci-hair">
          Nothing logged yet. Add your first period above and this table fills in — the second entry
          is where predictions begin.
        </p>
      ) : (
        <>
          {/* table on wider screens */}
          <div className="ci-scroll mt-4 hidden overflow-x-auto md:block">
            <table className="ci-table">
              <thead>
                <tr>
                  <th scope="col">Started</th>
                  <th scope="col">Length since previous</th>
                  <th scope="col">Flow</th>
                  <th scope="col">Notes</th>
                  <th scope="col" className="text-right">
                    <span className="ci-sr">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {ordered.map((entry) => {
                  const gap = gapFor(entry.id);
                  const isFirst = !gap;
                  return (
                    <tr key={entry.id} className={gap && !gap.plausible ? "is-anomaly" : undefined}>
                      <td>
                        <span className="font-medium" style={{ color: "var(--ci-text)" }}>
                          {formatDate(entry.start)}
                        </span>
                        {entry.end ? (
                          <span className="mt-0.5 block text-[11.5px] ci-muted">
                            {formatDateShort(entry.start)} – {formatDateShort(entry.end)}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        {isFirst ? (
                          <span className="ci-muted">first entry</span>
                        ) : gap && !gap.plausible ? (
                          <span
                            className="inline-flex items-center gap-1.5 text-[12.5px]"
                            style={{ color: "var(--ci-ovulation)" }}
                            title={gap.reason ?? undefined}
                          >
                            <TriangleAlert size={13} aria-hidden />
                            {gap.days}d — not counted
                          </span>
                        ) : (
                          <span className="ci-num">{gap?.days}d</span>
                        )}
                      </td>
                      <td className="capitalize">
                        {entry.flow ?? <span className="ci-muted">—</span>}
                      </td>
                      <td className="max-w-[220px]">
                        {entry.notes ? (
                          <span className="line-clamp-2" title={entry.notes}>
                            {entry.notes}
                          </span>
                        ) : (
                          <span className="ci-muted">—</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(entry)}
                            disabled={disabled}
                            aria-label={`Edit the period starting ${formatDate(entry.start)}`}
                          >
                            <Pencil size={13} aria-hidden />
                            Edit
                          </Button>
                          {confirmId === entry.id ? (
                            <span className="flex items-center gap-1">
                              <Button
                                variant="danger"
                                size="sm"
                                disabled={disabled}
                                onClick={() => {
                                  onDelete(entry.id);
                                  setConfirmId(null);
                                }}
                              >
                                Delete
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                                Keep
                              </Button>
                            </span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={disabled}
                              onClick={() => setConfirmId(entry.id)}
                              aria-label={`Delete the period starting ${formatDate(entry.start)}`}
                            >
                              <Trash2 size={13} aria-hidden />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* stacked on mobile */}
          <ul className="mt-4 space-y-2.5 md:hidden">
            {ordered.map((entry) => {
              const gap = gapFor(entry.id);
              return (
                <li
                  key={entry.id}
                  className="rounded-[var(--ci-radius-md)] border px-3.5 py-3 ci-hair"
                  style={
                    gap && !gap.plausible
                      ? { background: "color-mix(in oklab, var(--ci-ovulation) 7%, transparent)" }
                      : undefined
                  }
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[14px] font-medium">{formatDate(entry.start)}</p>
                    {gap ? (
                      gap.plausible ? (
                        <p className="ci-num text-[12px] ci-soft">{gap.days}d cycle</p>
                      ) : (
                        <p
                          className="flex items-center gap-1.5 text-[12px]"
                          style={{ color: "var(--ci-ovulation)" }}
                        >
                          <TriangleAlert size={12} aria-hidden />
                          {gap.days}d — not counted
                        </p>
                      )
                    ) : (
                      <p className="text-[12px] ci-muted">first entry</p>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] ci-muted">
                    {entry.end ? (
                      <span>
                        {formatDateShort(entry.start)} – {formatDateShort(entry.end)}
                      </span>
                    ) : null}
                    {entry.flow ? <span className="capitalize">{entry.flow}</span> : null}
                    {entry.notes ? (
                      <span className="line-clamp-2 basis-full">{entry.notes}</span>
                    ) : null}
                  </div>
                  <div className="mt-2.5 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(entry)}
                      disabled={disabled}
                    >
                      <Pencil size={12} aria-hidden />
                      Edit
                    </Button>
                    {confirmId === entry.id ? (
                      <>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={disabled}
                          onClick={() => {
                            onDelete(entry.id);
                            setConfirmId(null);
                          }}
                        >
                          Delete
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                          Keep
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        onClick={() => setConfirmId(entry.id)}
                      >
                        <Trash2 size={12} aria-hidden />
                        Delete
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {ordered.length > 0 ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4 ci-hair">
          <p className="text-[11.5px] ci-muted">
            {ordered.length} {ordered.length === 1 ? "entry" : "entries"} · stored in this browser
            only
          </p>
          {confirmClear ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] ci-soft">Delete all {ordered.length} entries?</span>
              <Button
                variant="danger"
                size="sm"
                disabled={disabled}
                onClick={() => {
                  onClearAll();
                  setConfirmClear(false);
                }}
              >
                Yes, clear everything
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>
                Cancel
              </Button>
            </span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 size={13} aria-hidden />
              Clear all data
            </Button>
          )}
        </div>
      ) : null}
    </Card>
  );
}
