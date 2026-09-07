/**
 * B8 · "Bring my history in".
 *
 * Someone arriving from another period app — or from a spreadsheet — starts
 * generic for three or four months, because the engine has nothing to average.
 * This parses pasted text or a file into period rows, tells the person exactly
 * what it understood *before* anything is written, and never silently drops a
 * line: every row that can't be used comes back with the line number and a
 * reason.
 *
 * Accepted, all in one paste:
 *   · the CSV `logsToCsv` writes — `start,end,flow,notes` (header optional)
 *   · one date per line ("just the start days")
 *   · `2026-08-03 to 2026-08-07`, `2026-08-03 - 2026-08-07`, tab or semicolon
 *   · `03/08/2026` (day-first) and `2026/08/03`, with the ambiguity resolved
 *     by the `dayFirst` option
 *
 * Pure: no storage, no clock beyond the `today` handed in.
 */

import {
  addDays,
  diffDays,
  formatDate,
  isValidDateKey,
  todayKey,
  type FlowLevel,
  type LogDraft,
  type PeriodLog,
} from "@/lib/cycle/predict";

export interface ImportRow {
  /** 1-based line in the pasted text, so the person can find it. */
  line: number;
  raw: string;
  start: string;
  end: string | null;
  flow: FlowLevel | null;
  notes: string | null;
}

export interface ImportProblem {
  line: number;
  raw: string;
  reason: string;
}

export type ImportStatus = "new" | "duplicate" | "overlaps";

export interface ImportPreviewRow extends ImportRow {
  status: ImportStatus;
  /** Why it isn't "new" — shown next to the row. */
  note?: string;
}

export interface ImportPreview {
  /** Every readable row, oldest first, with what would happen to it. */
  rows: ImportPreviewRow[];
  /** Lines that could not be read at all. */
  problems: ImportProblem[];
  /** Rows that would actually be added. */
  addable: ImportRow[];
  counts: { total: number; add: number; duplicate: number; overlaps: number; skipped: number };
}

export interface ParseOptions {
  /** `03/08/2026` → 3 August (true, the default) or 8 March (false). */
  dayFirst?: boolean;
  today?: string;
}

const FLOWS: FlowLevel[] = ["light", "medium", "heavy"];

const pad = (n: number) => String(n).padStart(2, "0");

/** One token → `YYYY-MM-DD`, or null when it is not a date at all. */
export function parseDateToken(token: string, dayFirst = true): string | null {
  const t = token.trim();
  if (t === "") return null;

  const iso = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(t);
  if (iso) {
    const key = `${iso[1]}-${pad(Number(iso[2]))}-${pad(Number(iso[3]))}`;
    return isValidDateKey(key) ? key : null;
  }

  const dmy = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(t);
  if (dmy) {
    const a = Number(dmy[1]);
    const b = Number(dmy[2]);
    /* a value over 12 can only be the day, whatever the option says */
    const day = a > 12 ? a : b > 12 ? b : dayFirst ? a : b;
    const month = a > 12 ? b : b > 12 ? a : dayFirst ? b : a;
    const key = `${dmy[3]}-${pad(month)}-${pad(day)}`;
    return isValidDateKey(key) ? key : null;
  }

  /* "3 Aug 2026" / "Aug 3, 2026" — accepted, but only when unambiguous */
  if (/[a-z]{3}/i.test(t)) {
    const parsed = new Date(`${t} 12:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      const key = `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
      return isValidDateKey(key) ? key : null;
    }
  }
  return null;
}

/** Split a line into fields: comma, semicolon, tab, or " to " / " - " between dates. */
function fields(line: string): string[] {
  if (/[,;\t]/.test(line)) {
    /* respect simple quoted fields so a note with a comma survives */
    const out: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i]!;
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else quoted = !quoted;
        continue;
      }
      if (!quoted && (ch === "," || ch === ";" || ch === "\t")) {
        out.push(cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    out.push(cur);
    return out.map((f) => f.trim());
  }
  const ranged = /\s+(?:to|–|—|-|until)\s+/i.exec(line);
  if (ranged) {
    return [line.slice(0, ranged.index).trim(), line.slice(ranged.index + ranged[0].length).trim()];
  }
  return [line.trim()];
}

const isHeader = (line: string): boolean => /^\s*start\b/i.test(line) && /end/i.test(line);

/** Text → rows + the lines that couldn't be read. Nothing is written. */
export function parsePeriodImport(
  text: string,
  options: ParseOptions = {},
): { rows: ImportRow[]; problems: ImportProblem[] } {
  const dayFirst = options.dayFirst ?? true;
  const today = options.today ?? todayKey();
  const rows: ImportRow[] = [];
  const problems: ImportProblem[] = [];

  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  lines.forEach((raw, i) => {
    const line = i + 1;
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed.startsWith("#")) return;
    if (isHeader(trimmed)) return;

    const parts = fields(trimmed);
    const start = parseDateToken(parts[0] ?? "", dayFirst);
    if (!start) {
      problems.push({
        line,
        raw: trimmed,
        reason: "No start date here — expected something like 2026-08-03.",
      });
      return;
    }
    if (diffDays(today, start) > 0) {
      problems.push({
        line,
        raw: trimmed,
        reason: `${formatDate(start)} is in the future.`,
      });
      return;
    }

    const endToken = parts[1] ?? "";
    let end: string | null = null;
    if (endToken !== "") {
      end = parseDateToken(endToken, dayFirst);
      if (!end) {
        /* a second field that isn't a date is treated as flow/notes, not an error */
        end = null;
      } else if (end < start) {
        problems.push({
          line,
          raw: trimmed,
          reason: `The last day (${formatDate(end)}) is before the first (${formatDate(start)}).`,
        });
        return;
      } else if (diffDays(start, end) + 1 > 15) {
        problems.push({
          line,
          raw: trimmed,
          reason: "More than 15 days of bleeding — check the dates.",
        });
        return;
      } else if (diffDays(today, end) > 0) {
        end = null; // a future last day just means "still going"
      }
    }

    const rest = parts.slice(end ? 2 : 1).filter((p) => p !== "");
    const flowToken = rest.find((p) => FLOWS.includes(p.toLowerCase() as FlowLevel));
    const flow = flowToken ? (flowToken.toLowerCase() as FlowLevel) : null;
    const notes =
      rest
        .filter((p) => p !== flowToken)
        .join(" ")
        .trim()
        .slice(0, 400) || null;

    rows.push({ line, raw: trimmed, start, end, flow, notes });
  });

  return { rows, problems };
}

const lastDay = (log: { start: string; end?: string | null }): string =>
  log.end && isValidDateKey(log.end) ? log.end : log.start;

/**
 * What would happen if these rows were committed against `existing`. Rows are
 * checked against each other too, so a paste containing the same period twice
 * only adds it once.
 */
export function previewImport(
  rows: readonly ImportRow[],
  existing: readonly PeriodLog[],
): ImportPreview {
  const sorted = [...rows].sort((a, b) => a.start.localeCompare(b.start) || a.line - b.line);
  const taken: { start: string; end: string | null }[] = existing.map((e) => ({
    start: e.start,
    end: e.end ?? null,
  }));

  const out: ImportPreviewRow[] = [];
  const addable: ImportRow[] = [];

  for (const row of sorted) {
    const duplicate = taken.find((t) => t.start === row.start);
    if (duplicate) {
      out.push({
        ...row,
        status: "duplicate",
        note: "Already in your record — it will be kept as it is.",
      });
      continue;
    }
    const clash = taken.find((t) => row.start >= t.start && row.start <= lastDay(t));
    if (clash) {
      out.push({
        ...row,
        status: "overlaps",
        note: `Falls inside the period starting ${formatDate(clash.start)} — skipped.`,
      });
      continue;
    }
    out.push({ ...row, status: "new" });
    addable.push(row);
    taken.push({ start: row.start, end: row.end });
  }

  const counts = {
    total: out.length,
    add: addable.length,
    duplicate: out.filter((r) => r.status === "duplicate").length,
    overlaps: out.filter((r) => r.status === "overlaps").length,
    skipped: out.length - addable.length,
  };
  return { rows: out, problems: [], addable, counts };
}

/** Rows the preview approved → the drafts `add()` already takes. */
export function toDrafts(rows: readonly ImportRow[]): LogDraft[] {
  return rows.map((r) => ({
    start: r.start,
    end: r.end,
    flow: r.flow,
    notes: r.notes,
  }));
}

/** A short, honest sentence for the preview header. */
export function describePreview(
  preview: ImportPreview,
  problems: readonly ImportProblem[],
): string {
  const { add, duplicate, overlaps } = preview.counts;
  if (add === 0 && problems.length === 0 && preview.counts.total === 0) {
    return "Nothing to read yet — paste dates, or choose a file.";
  }
  const bits = [`${add} to add`];
  if (duplicate > 0) bits.push(`${duplicate} already here`);
  if (overlaps > 0) bits.push(`${overlaps} overlapping`);
  if (problems.length > 0) bits.push(`${problems.length} unreadable`);
  return bits.join(" · ");
}

/** Convenience for tests and callers: parse + preview in one step. */
export function planImport(
  text: string,
  existing: readonly PeriodLog[],
  options: ParseOptions = {},
): ImportPreview & { problems: ImportProblem[] } {
  const { rows, problems } = parsePeriodImport(text, options);
  const preview = previewImport(rows, existing);
  return { ...preview, problems };
}

/** Used by the preview to show a guessed cycle length once history lands. */
export function spanOf(rows: readonly ImportRow[]): { from: string; to: string } | null {
  if (rows.length === 0) return null;
  const starts = rows.map((r) => r.start).sort();
  return { from: starts[0]!, to: addDays(starts[starts.length - 1]!, 0) };
}
