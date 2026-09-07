/**
 * B8 · "Bring my history in".
 *
 * Paste (or drop a file of) period dates from another app or a spreadsheet.
 * Nothing is written until the preview has been seen: every readable row is
 * listed with what would happen to it, every unreadable line is listed with
 * its line number and the reason, and the commit button says exactly how many
 * entries it will add.
 *
 * Parsing lives in `lib/data/importPeriods` (pure, tested); this component
 * only shows what that returned and calls the store's existing `add()`.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, FileUp, Upload } from "lucide-react";

import { BloomSheet, SheetBody, SheetItem } from "@/components/ui/bloom-sheet";
import { cn } from "@/lib/utils";
import { formatDate, type LogDraft, type PeriodLog } from "@/lib/cycle/predict";
import {
  describePreview,
  planImport,
  toDrafts,
  type ImportPreviewRow,
} from "@/lib/data/importPeriods";

const EXAMPLE = `2026-05-04,2026-05-08
2026-06-01,2026-06-06
2026-07-02
03/08/2026 to 07/08/2026`;

const STATUS_LABEL: Record<ImportPreviewRow["status"], string> = {
  new: "will be added",
  duplicate: "already here",
  overlaps: "skipped",
};

export function ImportPeriods({
  open,
  onClose,
  logs,
  today,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  logs: PeriodLog[];
  today: string;
  /** The store's own add — validation, sync and undo all stay where they are. */
  onAdd: (draft: LogDraft) => { ok: boolean };
}) {
  const [text, setText] = useState("");
  const [dayFirst, setDayFirst] = useState(true);
  const [added, setAdded] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const plan = useMemo(
    () => planImport(text, logs, { dayFirst, today }),
    [text, logs, dayFirst, today],
  );

  const ambiguous = useMemo(() => /\b\d{1,2}[-/.]\d{1,2}[-/.]\d{4}\b/.test(text), [text]);

  const commit = useCallback(() => {
    let ok = 0;
    for (const draft of toDrafts(plan.addable)) {
      if (onAdd(draft).ok) ok += 1;
    }
    setAdded(ok);
    setText("");
  }, [plan.addable, onAdd]);

  const readFile = useCallback((file: File) => {
    void file.text().then((body) => {
      setAdded(null);
      setText(body.slice(0, 200_000));
    });
  }, []);

  return (
    <BloomSheet
      open={open}
      onClose={() => {
        setAdded(null);
        onClose();
      }}
      title="Import period history"
      size="lg"
    >
      <SheetBody className="pb-5">
        <SheetItem className="px-5 pb-1 pt-1 sm:px-6">
          <h2 className="display text-[20px] leading-tight">Bring your history in</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Paste the start days from your old app, or drop its CSV here. Bloom shows you what it
            understood before anything is saved — three or four cycles are enough to stop the
            predictions being generic.
          </p>
        </SheetItem>

        <SheetItem className="px-5 pt-4 sm:px-6">
          <textarea
            data-testid="cycle-import-text"
            value={text}
            onChange={(e) => {
              setAdded(null);
              setText(e.target.value);
            }}
            onDrop={(e) => {
              const file = e.dataTransfer.files[0];
              if (file) {
                e.preventDefault();
                readFile(file);
              }
            }}
            rows={7}
            spellCheck={false}
            placeholder={EXAMPLE}
            className="mono w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-[12.5px] leading-relaxed outline-none focus:border-foreground/30"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) readFile(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              data-testid="cycle-import-file"
              onClick={() => fileRef.current?.click()}
              className="pf-btn h-9 px-3 text-[12.5px]"
            >
              <FileUp className="size-3.5" aria-hidden /> Choose a file
            </button>
            {ambiguous ? (
              <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <input
                  type="checkbox"
                  data-testid="cycle-import-dayfirst"
                  checked={dayFirst}
                  onChange={(e) => setDayFirst(e.target.checked)}
                />
                03/08/2026 means 3 August
              </label>
            ) : null}
          </div>
        </SheetItem>

        {added !== null ? (
          <SheetItem className="px-5 pt-4 sm:px-6">
            <p
              data-testid="cycle-import-done"
              className="flex items-center gap-2 rounded-xl border border-border bg-surface/50 px-4 py-3 text-[13px]"
            >
              <Check className="size-4" aria-hidden />
              {added} {added === 1 ? "period" : "periods"} added. Every prediction below has been
              recalculated.
            </p>
          </SheetItem>
        ) : null}

        {text.trim() !== "" ? (
          <>
            <SheetItem className="px-5 pt-4 sm:px-6">
              <p className="text-[12px] uppercase tracking-[0.08em] text-faint">
                {describePreview(plan, plan.problems)}
              </p>
            </SheetItem>

            {plan.rows.length > 0 ? (
              <SheetItem className="px-5 pt-2 sm:px-6">
                <ul
                  data-testid="cycle-import-preview"
                  className="max-h-64 overflow-y-auto rounded-xl border border-border bg-surface/50"
                >
                  {plan.rows.map((row) => (
                    <li
                      key={`${row.line}-${row.start}`}
                      className="flex items-baseline justify-between gap-3 border-b border-border/60 px-4 py-2 last:border-b-0"
                    >
                      <span className="mono text-[12.5px]">
                        {formatDate(row.start)}
                        {row.end ? ` – ${formatDate(row.end)}` : ""}
                      </span>
                      <span
                        className={cn(
                          "text-[11.5px]",
                          row.status === "new" ? "text-foreground" : "text-faint",
                        )}
                        title={row.note ?? ""}
                      >
                        {STATUS_LABEL[row.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              </SheetItem>
            ) : null}

            {plan.problems.length > 0 ? (
              <SheetItem className="px-5 pt-3 sm:px-6">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
                  <p className="flex items-center gap-2 text-[12.5px]">
                    <AlertTriangle className="size-3.5" aria-hidden />
                    {plan.problems.length} {plan.problems.length === 1 ? "line" : "lines"} couldn't
                    be read — nothing here is guessed at.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {plan.problems.slice(0, 8).map((p) => (
                      <li key={p.line} className="text-[12px] text-muted-foreground">
                        <span className="mono">line {p.line}</span> · {p.raw.slice(0, 40)} —{" "}
                        {p.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              </SheetItem>
            ) : null}

            <SheetItem className="px-5 pt-4 sm:px-6">
              <button
                type="button"
                data-testid="cycle-import-go"
                disabled={plan.counts.add === 0}
                onClick={commit}
                className={cn(
                  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-[13.5px] transition-colors",
                  plan.counts.add > 0
                    ? "border-border bg-foreground/5 hover:bg-foreground/10"
                    : "cursor-not-allowed border-border text-faint",
                )}
              >
                <Upload className="size-4" aria-hidden />
                {plan.counts.add > 0
                  ? `Add ${plan.counts.add} ${plan.counts.add === 1 ? "period" : "periods"}`
                  : "Nothing new to add"}
              </button>
            </SheetItem>
          </>
        ) : null}
      </SheetBody>
    </BloomSheet>
  );
}
