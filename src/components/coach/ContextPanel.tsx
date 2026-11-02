import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Pin, ShieldCheck, Trash2, X } from "lucide-react";

import type { CoachMemory } from "@/hooks/useCoachSystem";
import type { CoachRecord } from "@/lib/coach/responder";
import { cn } from "@/lib/utils";

export type CoachPanelTab = "context" | "memory";

interface CoachPanelStats {
  entries: number;
  avg: number;
  avgEnergy: number;
  avgStress: number;
}

const fmt = (value: number | null | undefined, digits = 1): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 10 ** digits) / 10 ** digits;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(digits);
};

const CATEGORY_LABEL: Record<CoachMemory["category"], string> = {
  pattern: "Patterns",
  preference: "Preferences",
  goal: "Goals",
  context: "Context",
};

/* --------------------------------- content --------------------------------- */

function ContextView({
  record,
  stats,
  profileConnected,
  onSignInNeeded,
}: {
  record: CoachRecord;
  stats: CoachPanelStats;
  profileConnected: boolean;
  onSignInNeeded: () => void;
}) {
  const rows: { label: string; value: string; detail: string }[] = [];
  if (stats.entries > 0) {
    rows.push({
      label: "Mood",
      value: `${fmt(stats.avg)} / 10`,
      detail: `${stats.entries} ${stats.entries === 1 ? "check-in" : "check-ins"}`,
    });
    rows.push({ label: "Energy", value: `${fmt(stats.avgEnergy)} / 10`, detail: "recent average" });
    rows.push({ label: "Stress", value: `${fmt(stats.avgStress)} / 10`, detail: "recent average" });
  }
  for (const tracker of record.trackers) {
    if (tracker.daysLogged === 0) continue;
    rows.push({
      label: tracker.name,
      value: tracker.avg7 !== null ? tracker.format(Math.round(tracker.avg7)) : "—",
      detail: `${tracker.daysLogged} ${tracker.daysLogged === 1 ? "day" : "days"} logged`,
    });
  }
  if (record.cycle && record.cycle.daysLogged > 0) {
    rows.push({
      label: "Cycle",
      value:
        record.cycle.cycleDay !== null && record.cycle.phaseLabel
          ? `Day ${record.cycle.cycleDay}`
          : `${record.cycle.daysLogged} days logged`,
      detail: record.cycle.phaseLabel ?? "history kept",
    });
  }
  if (record.memories.length > 0) {
    rows.push({
      label: "Saved context",
      value: `${record.memories.length} pinned`,
      detail: "things you asked Bloom to keep",
    });
  }

  return (
    <div className="coach-panel-body">
      <p className="coach-panel-lede">
        Bloom works from a <strong>derived</strong> view of your record — averages and patterns,
        never your raw entries.
      </p>
      {rows.length > 0 ? (
        <div className="coach-signal-list">
          {rows.map((row) => (
            <div key={row.label} className="coach-signal-row">
              <span className="coach-signal-dot" aria-hidden="true" />
              <span className="coach-signal-copy">
                <strong>{row.label}</strong>
                <small>{row.detail}</small>
              </span>
              <span className="coach-signal-value">{row.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="coach-panel-empty">
          <p>Nothing is tracked yet.</p>
          <p>
            Log a mood, a tracker or a habit anywhere in Bloom and this list will show exactly what
            the Coach can honestly speak from.
          </p>
        </div>
      )}
      <div className="coach-panel-note">
        <ShieldCheck className="coach-panel-note-icon" aria-hidden="true" />
        <span>
          {profileConnected
            ? "Only approved context shapes a reply. Your record stays yours."
            : "Nothing here is shared — everything stays on this device."}
        </span>
      </div>
      {!profileConnected ? (
        <Link to="/profile" className="coach-panel-signin" onClick={onSignInNeeded}>
          Sign in to sync your Coach across devices
        </Link>
      ) : null}
    </div>
  );
}

function MemoryView({
  memories,
  onToggle,
  onForget,
  profileConnected,
}: {
  memories: CoachMemory[];
  onToggle: (memory: CoachMemory) => void;
  onForget: (memory: CoachMemory) => void;
  profileConnected: boolean;
}) {
  const [filter, setFilter] = useState<CoachMemory["category"] | "all">("all");
  const filtered = memories.filter((m) => filter === "all" || m.category === filter);
  return (
    <div className="coach-panel-body">
      <p className="coach-panel-lede">
        What Bloom keeps from your conversations — pin the important ones, forget the rest here.
      </p>
      <div className="coach-memory-filters" role="group" aria-label="Filter saved context">
        {(["all", "pattern", "preference", "goal", "context"] as const).map((key) => (
          <button
            key={key}
            type="button"
            className={cn("coach-memory-filter", filter === key && "is-active")}
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
          >
            {key === "all" ? "All" : CATEGORY_LABEL[key]}
          </button>
        ))}
      </div>
      {filtered.length > 0 ? (
        <ul className="coach-memory-list">
          {filtered.map((memory) => (
            <li key={memory.id} className="coach-memory-item">
              <span className="coach-memory-copy">
                <span className="coach-memory-category">{CATEGORY_LABEL[memory.category]}</span>
                <span className="coach-memory-text">{memory.text}</span>
                {memory.learnedAt ? <small>Saved {memory.learnedAt}</small> : null}
              </span>
              <span className="coach-memory-actions">
                <button
                  type="button"
                  className={cn("coach-memory-action", memory.pinned && "is-on")}
                  onClick={() => onToggle(memory)}
                  aria-label={memory.pinned ? "Unpin memory" : "Pin memory"}
                  title={memory.pinned ? "Unpin" : "Pin"}
                >
                  <Pin className="size-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="coach-memory-action"
                  onClick={() => onForget(memory)}
                  aria-label="Forget memory"
                  title="Forget"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="coach-panel-empty">
          <p>{memories.length === 0 ? "Nothing saved yet." : "Nothing in this view."}</p>
          <p>
            {profileConnected
              ? "When you ask Bloom to remember something, it appears here."
              : "Saved context works on this device without an account."}
          </p>
        </div>
      )}
      <div className="coach-panel-note">
        <ShieldCheck className="coach-panel-note-icon" aria-hidden="true" />
        <span>Review, pin or forget anything — it&rsquo;s always your call.</span>
      </div>
    </div>
  );
}

/* ----------------------------- the slide-over ------------------------------ */

/**
 * Personal context — a quiet right-hand slide-over. Real derived signals
 * only; raw tracker history is never shown here.
 */
export function CoachContextPanel({
  open,
  tab,
  onTab,
  onClose,
  record,
  stats,
  memories,
  profileConnected,
  onToggleMemory,
  onForgetMemory,
}: {
  open: boolean;
  tab: CoachPanelTab;
  onTab: (tab: CoachPanelTab) => void;
  onClose: () => void;
  record: CoachRecord;
  stats: CoachPanelStats;
  memories: CoachMemory[];
  profileConnected: boolean;
  onToggleMemory: (memory: CoachMemory) => void;
  onForgetMemory: (memory: CoachMemory) => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = "coach-context-panel-title";

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="coach-panel-backdrop"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24 }}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) onClose();
          }}
        >
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="coach-panel"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="coach-panel-head">
              <div>
                <p className="coach-panel-kicker">Bloom</p>
                <h2 id={titleId} className="coach-panel-title">
                  {tab === "context" ? "Personal context" : "Memory"}
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                className="coach-panel-close"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="coach-panel-tabs" role="tablist" aria-label="Coach details">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "context"}
                className={cn("coach-panel-tab", tab === "context" && "is-active")}
                onClick={() => onTab("context")}
              >
                Context
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "memory"}
                className={cn("coach-panel-tab", tab === "memory" && "is-active")}
                onClick={() => onTab("memory")}
              >
                Memory{memories.length > 0 ? ` · ${memories.length}` : ""}
              </button>
            </div>
            {tab === "context" ? (
              <ContextView
                record={record}
                stats={stats}
                profileConnected={profileConnected}
                onSignInNeeded={onClose}
              />
            ) : (
              <MemoryView
                memories={memories}
                onToggle={onToggleMemory}
                onForget={onForgetMemory}
                profileConnected={profileConnected}
              />
            )}
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
