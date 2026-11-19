/**
 * LabReportsSection — the lab reports record on Profile.
 *
 * The person types in the values from their own printed lab reports;
 * Bloom stores them exactly as entered and shows each one against
 * the reference range printed on that same report — and nothing
 * more. No textbook ranges, no interpretation, no "normal/abnormal":
 * the flag wording is factual ("Above the range printed on your
 * report") and the standing disclaimer below says plainly that Bloom
 * does not interpret results.
 *
 * Trends are per test name AND unit: the same test in a different
 * unit is listed as its own series, never converted or merged.
 */

import { useState } from "react";
import { FileText, Info } from "lucide-react";

import { Input } from "@/components/ui/input";
import { fmtDate } from "@/lib/format";
import { usePrefValue } from "@/lib/prefsStore";
import {
  EMPTY_LABS,
  LABS_DISCLAIMER,
  LABS_KEY,
  addLabResult,
  flagLabel,
  groupLabResults,
  parseLabResult,
  parseLabsValue,
  removeLabResult,
  type LabResult,
} from "@/lib/labs/labs";

function fmtValue(n: number): string {
  return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(2)));
}

function fmtChange(change: number, unit: string): string {
  const sign = change > 0 ? "+" : "";
  return `${sign}${fmtValue(change)} ${unit} since the previous result`;
}

const inputLabel =
  "text-[length:var(--text-caption)] font-medium text-[color:var(--text-secondary)]";

export function LabReportsSection() {
  const labs = usePrefValue(LABS_KEY, parseLabsValue, EMPTY_LABS);
  const groups = groupLabResults(labs.results);

  const [formOpen, setFormOpen] = useState(false);
  const [testName, setTestName] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [refLow, setRefLow] = useState("");
  const [refHigh, setRefHigh] = useState("");
  const [labName, setLabName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const low = refLow.trim() === "" ? undefined : Number(refLow);
    const high = refHigh.trim() === "" ? undefined : Number(refHigh);
    const candidate: LabResult = {
      id: `lab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      testName: testName.trim(),
      value: Number(value),
      unit: unit.trim(),
      reportDate,
      ...(low !== undefined ? { refLow: low } : {}),
      ...(high !== undefined ? { refHigh: high } : {}),
      ...(labName.trim() !== "" ? { labName: labName.trim() } : {}),
      recordedAt: new Date().toISOString(),
    };
    if (!parseLabResult(candidate) || !addLabResult(candidate)) {
      setError(
        "Check the result: it needs a test name, a number, a unit and the report's date — and the range's low must not be above its high.",
      );
      return;
    }
    setError(null);
    setFormOpen(false);
    setTestName("");
    setValue("");
    setUnit("");
    setRefLow("");
    setRefHigh("");
    setLabName("");
  };

  return (
    <div className="pf-card pf-card--pad">
      <div className="pf-section-head">
        <div>
          <p className="pf-eyebrow">Health records</p>
          <h2 className="pf-title">Lab reports</h2>
        </div>
      </div>

      {/* The safety sentence is the most important text on this card,
          so it renders as a note (system slice): full-contrast 14px on
          a surface-2 ground with a rule — never the smallest, dimmest
          line here (diagnosis finding #15). */}
      <p className="note">
        <Info className="size-4" aria-hidden />
        <span>{LABS_DISCLAIMER}</span>
      </p>

      {groups.length === 0 ? (
        /* The empty state is a row (empty-state slice, diagnosis §C);
           the Add a result button below it is the action. */
        <div className="empty-row mt-4">
          <span className="empty-row-icon" aria-hidden>
            <FileText className="size-4" />
          </span>
          <p className="empty-row-text">
            <strong>No results yet.</strong> Add the values from a printed report and
            Bloom will keep them here, each shown against the range printed on that
            report.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-5">
          {groups.map((group) => {
            const label = flagLabel(group.latest);
            const latest = group.latest;
            return (
              <div key={`${group.testName}-${group.unit}`}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-[length:var(--text-callout)] font-semibold">
                    {group.testName}
                  </h3>
                  <span className="text-[length:var(--text-callout)]">
                    {fmtValue(latest.value)} {latest.unit}
                  </span>
                  <span className="text-[length:var(--text-caption)] text-faint">
                    {fmtDate(latest.reportDate)}
                    {latest.labName ? ` · ${latest.labName}` : ""}
                  </span>
                </div>
                {label ? (
                  <p className="mt-1">
                    <span className="inline-block rounded-full border border-border px-2 py-0.5 text-[length:var(--text-caption)] text-[color:var(--text-secondary)]">
                      {label}
                    </span>
                  </p>
                ) : null}
                {latest.refLow !== undefined || latest.refHigh !== undefined ? (
                  <p className="mt-1 text-[length:var(--text-caption)] text-faint">
                    Range on your report:{" "}
                    {latest.refLow !== undefined ? fmtValue(latest.refLow) : "—"} to{" "}
                    {latest.refHigh !== undefined ? fmtValue(latest.refHigh) : "—"} {latest.unit}
                  </p>
                ) : null}
                {group.points.length > 1 ? (
                  <ul className="mt-2 grid gap-1">
                    {[...group.points].reverse().map((point) => (
                      <li
                        key={point.result.id}
                        className="flex flex-wrap items-baseline gap-x-2 text-[length:var(--text-caption)] text-[color:var(--text-secondary)]"
                      >
                        <span>{fmtDate(point.result.reportDate)}</span>
                        <span>
                          {fmtValue(point.result.value)} {point.result.unit}
                        </span>
                        {point.changeFromPrevious !== null && point.changeFromPrevious !== 0 ? (
                          <span className="text-faint">
                            ({fmtChange(point.changeFromPrevious, point.result.unit)})
                          </span>
                        ) : null}
                        <button
                          type="button"
                          className="text-faint underline underline-offset-2"
                          onClick={() => removeLabResult(point.result.id)}
                          aria-label={`Remove ${point.result.testName} result from ${fmtDate(point.result.reportDate)}`}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1">
                    <button
                      type="button"
                      className="text-[length:var(--text-caption)] text-faint underline underline-offset-2"
                      onClick={() => removeLabResult(latest.id)}
                      aria-label={`Remove ${latest.testName} result from ${fmtDate(latest.reportDate)}`}
                    >
                      Remove
                    </button>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {formOpen ? (
        <form
          className="mt-5 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="grid gap-1.5">
            <label className={inputLabel} htmlFor="lab-test-name">
              Test name (as printed on the report)
            </label>
            <Input
              id="lab-test-name"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="e.g. HbA1c"
              autoComplete="off"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label className={inputLabel} htmlFor="lab-value">
                Value
              </label>
              <Input
                id="lab-value"
                type="number"
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="5.6"
              />
            </div>
            <div className="grid gap-1.5">
              <label className={inputLabel} htmlFor="lab-unit">
                Unit (as printed)
              </label>
              <Input
                id="lab-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="%"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <label className={inputLabel} htmlFor="lab-date">
              Date on the report
            </label>
            <Input
              id="lab-date"
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label className={inputLabel} htmlFor="lab-ref-low">
                Range on the report — low (optional)
              </label>
              <Input
                id="lab-ref-low"
                type="number"
                step="any"
                value={refLow}
                onChange={(e) => setRefLow(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <label className={inputLabel} htmlFor="lab-ref-high">
                Range on the report — high (optional)
              </label>
              <Input
                id="lab-ref-high"
                type="number"
                step="any"
                value={refHigh}
                onChange={(e) => setRefHigh(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <label className={inputLabel} htmlFor="lab-name">
              Lab name (optional)
            </label>
            <Input
              id="lab-name"
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
              autoComplete="off"
            />
          </div>
          {error ? (
            <p role="alert" className="text-[length:var(--text-caption)] text-[color:var(--danger)]">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="pf-btn h-10 px-4">
              Save result
            </button>
            <button
              type="button"
              className="pf-btn pf-btn--ghost h-10 px-4"
              onClick={() => {
                setFormOpen(false);
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4">
          <button type="button" className="pf-btn h-10 px-4" onClick={() => setFormOpen(true)}>
            Add a result
          </button>
        </div>
      )}
    </div>
  );
}
