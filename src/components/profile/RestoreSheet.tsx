/**
 * RestoreSheet — the other half of "Download everything".
 *
 * Pick a bloom export JSON, see exactly what it holds before anything
 * happens, choose merge (this device wins on conflicts) or replace, and only
 * then is a single key written. The app reloads afterwards so every store
 * re-reads disk — no half-restored in-memory state.
 */

import { useRef, useState } from "react";
import { FileUp, RotateCw } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  applyRestore,
  parseBundle,
  type ParseResult,
  type RestoreMode,
  type RestoreReport,
} from "@/lib/data/restore";

export function RestoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [mode, setMode] = useState<RestoreMode>("merge");
  const [report, setReport] = useState<RestoreReport | null>(null);

  const reset = () => {
    setFileName(null);
    setParsed(null);
    setReport(null);
    setMode("merge");
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    setReport(null);
    const text = await file.text();
    setParsed(parseBundle(text));
  };

  const apply = () => {
    if (!parsed?.ok) return;
    const r = applyRestore(window.localStorage, parsed.bundle, mode);
    setReport(r);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetTitle className="display text-[17px]">Restore from backup</SheetTitle>
        <SheetDescription className="mt-0.5 text-[12px] text-muted-foreground">
          Reads a “Download everything” file back into this browser.
        </SheetDescription>

        {report ? (
          <div className="mt-5 space-y-4">
            <p className="text-[13px] leading-relaxed text-foreground">
              Restored with <span className="text-foreground">{mode}</span> — what landed:
            </p>
            <ul className="space-y-1.5">
              {report.sections.map((s) => (
                <li
                  key={s.label}
                  className="flex justify-between text-[12.5px] text-muted-foreground"
                >
                  <span>{s.label}</span>
                  <span>
                    {s.restored} restored{s.kept > 0 ? ` · ${s.kept} kept as-is` : ""}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">
              Skipped: {report.skipped.join("; ")}.
            </p>
            <button
              type="button"
              className="w-full rounded-full bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
              onClick={() => window.location.assign("/")}
            >
              Reload Bloom to see it
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-surface-2/40 px-4 py-3 text-[13px] text-foreground transition-colors hover:bg-surface-2"
              onClick={() => inputRef.current?.click()}
            >
              <FileUp className="size-4" />
              {fileName ?? "Choose a backup file (.json)"}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
            />

            {parsed && !parsed.ok ? (
              <p className="text-[12.5px] text-rose" role="alert">
                {parsed.error}
              </p>
            ) : null}

            {parsed?.ok ? (
              <>
                <p className="text-[12px] text-muted-foreground">
                  Backup from {new Date(parsed.bundle.exportedAt).toLocaleString()} —{" "}
                  {parsed.bundle.counts.habits} habits, {parsed.bundle.counts.habitLogs} ticks,{" "}
                  {parsed.bundle.counts.trackerDays} tracker days,{" "}
                  {parsed.bundle.counts.moodEntries} mood check-ins, {parsed.bundle.counts.periods}{" "}
                  periods.
                </p>

                <div className="grid gap-2">
                  {(
                    [
                      ["merge", "Merge — keep what's on this device when both copies have a row"],
                      ["replace", "Replace — this device becomes the backup"],
                    ] as [RestoreMode, string][]
                  ).map(([m, label]) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`rounded-xl border px-4 py-2.5 text-left text-[12.5px] transition-colors ${
                        mode === m
                          ? "border-primary/60 bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="w-full rounded-full bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  onClick={apply}
                >
                  Restore to this device
                </button>
              </>
            ) : null}
          </div>
        )}

        {report ? (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <RotateCw className="size-3" /> nothing is sent anywhere; this stayed on your device
          </p>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
