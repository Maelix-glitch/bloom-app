import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Pin, ShieldCheck, Trash2 } from "lucide-react";

import { BloomIcon } from "@/components/icons/BloomIcon";
import { BloomSheet } from "@/components/ui/bloom-sheet";
import { Button } from "@/components/ui/button";
import type { CoachMemory } from "@/hooks/useCoachSystem";
import type { CoachRecord } from "@/lib/coach/responder";
import { savedDateLabel } from "@/lib/coach/ui-helpers";
import { cn } from "@/lib/utils";

export type CoachPanelTab = "context" | "memory";

interface CoachPanelStats {
  entries: number;
  /** Check-ins inside the averages' window — the count the Mood row pairs with. */
  periodEntries: number;
  /** The averages' window, lower-cased for mid-sentence use ("last 30 days"). */
  windowLabel: string;
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
      detail: `${stats.periodEntries} ${stats.periodEntries === 1 ? "check-in" : "check-ins"} · ${stats.windowLabel}`,
    });
    rows.push({
      label: "Energy",
      value: `${fmt(stats.avgEnergy)} / 10`,
      detail: `average · ${stats.windowLabel}`,
    });
    rows.push({
      label: "Stress",
      value: `${fmt(stats.avgStress)} / 10`,
      detail: `average · ${stats.windowLabel}`,
    });
  }
  for (const tracker of record.trackers) {
    if (tracker.daysLogged === 0) continue;
    /* A tracker can share a name with a check-in signal above: "Energy" is
       both a mood check-in field (x/10, recent average) and a tracker on
       its own scale (e.g. x/5). Two rows carrying one label on two scales
       read as the app contradicting itself, so a colliding tracker row
       names its source — both facts stay visible, and no label ever
       appears twice with two meanings. */
    const collides = rows.some((row) => row.label.toLowerCase() === tracker.name.toLowerCase());
    rows.push({
      label: collides ? `${tracker.name} tracker` : tracker.name,
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
                {memory.learnedAt ? (
                  <small>Saved {savedDateLabel(memory.learnedAt)}</small>
                ) : null}
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

/* ------------------------------- the sheet --------------------------------- */

/**
 * Personal context — a quiet sheet on the one overlay pattern (U6, plan
 * §5.2): BloomSheet owns the scrim, focus trap, escape and motion, and the
 * panel carries the `.coach-overlay-scope` token scope (the portal mounts
 * outside `.coach-page`). Real derived signals only; raw tracker history
 * is never shown here. The two tabs carry the registry's context/memory
 * glyphs — the concepts they were drawn for (U4).
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
  const title = tab === "context" ? "Personal context" : "Memory";
  return (
    <BloomSheet
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      className="coach-overlay-scope"
    >
      <div className="coach-overlay-stack">
        <div className="coach-panel-head">
          <div>
            <p className="coach-panel-kicker">Bloom</p>
            <h2 className="coach-panel-title">{title}</h2>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <BloomIcon name="close" size={16} />
          </Button>
        </div>
        <div className="coach-panel-tabs" role="tablist" aria-label="Coach details">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "context"}
            className={cn("coach-panel-tab", tab === "context" && "is-active")}
            onClick={() => onTab("context")}
          >
            <BloomIcon name="context" size={14} />
            Context
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "memory"}
            className={cn("coach-panel-tab", tab === "memory" && "is-active")}
            onClick={() => onTab("memory")}
          >
            <BloomIcon name="memory" size={14} />
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
      </div>
    </BloomSheet>
  );
}
