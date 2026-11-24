import { useState } from "react";
import { Check, Plus } from "lucide-react";

import {
  COACH_LOG_KEY,
  loggedEntryIdFrom,
  parseCoachLogValue,
  type CoachPhotoEstimate,
} from "@/lib/nutrition/coachLog";
import { FOODLOG_KEY, parseFoodLogValue } from "@/lib/nutrition/store";
import type { LogEntry } from "@/lib/nutrition/types";
import { usePrefValue } from "@/lib/prefsStore";

import { CoachLogSheet } from "./CoachLogSheet";

const NO_ENTRIES: LogEntry[] = [];
const NO_LOGGED: Record<string, string> = {};

/**
 * The "Log this" action under a Coach photo-estimate reply (W4-3 N5,
 * design §4.4). Rendered only when the thread carries a usable
 * estimate for this message — the detection lives in the nutrition
 * lib; this component owns the two states the action can be in:
 *
 *   · not logged: the button, opening the confirm sheet. Nothing is
 *     written by rendering, opening, or closing — Coach listens
 *     first, and only the sheet's confirm logs.
 *   · logged: a quiet "Logged" line, read from the coach-log record
 *     against the live food log. If the entry is later deleted in the
 *     Nutrition tab, the record stops counting and the button
 *     returns — the log itself is the truth.
 */
export function CoachLogAction({
  messageId,
  estimate,
}: {
  messageId: string;
  estimate: CoachPhotoEstimate;
}) {
  const entries = usePrefValue(FOODLOG_KEY, parseFoodLogValue, NO_ENTRIES);
  const record = usePrefValue(COACH_LOG_KEY, parseCoachLogValue, NO_LOGGED);
  const [open, setOpen] = useState(false);

  if (loggedEntryIdFrom(record, entries, messageId)) {
    return (
      <p className="coach-logged-note">
        <Check className="coach-logged-icon" aria-hidden="true" />
        Logged to your food log
      </p>
    );
  }

  return (
    <div className="coach-log-row">
      <button
        type="button"
        className="coach-action"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Plus className="coach-action-icon" aria-hidden="true" />
        <span className="coach-action-label">Log this</span>
      </button>
      <span className="coach-log-hint">Photo estimate, you confirm the numbers first</span>
      <CoachLogSheet
        open={open}
        onClose={() => setOpen(false)}
        messageId={messageId}
        estimate={estimate}
      />
    </div>
  );
}
