import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { Download, Pencil, Search, Sparkles, Trash2 } from "lucide-react";

import { bucketOf } from "@/lib/mood/analytics";
import { EMOTION_MAP, type MoodEntry, type Valence } from "@/lib/mood/types";
import { Insufficient, Panel, SectionHead, accentVar, type Accent } from "./primitives";
import { cn } from "@/lib/utils";

type ValenceFilter = "all" | Valence;

export function History({
  entries,
  onEdit,
  onDelete,
  onShareStory,
}: {
  entries: MoodEntry[];
  onEdit: (entry: MoodEntry) => void;
  onDelete: (id: string) => void;
  /** Optional Mood → Story bridge (explicit user action, preview required). */
  onShareStory?: (entry: MoodEntry) => void;
}) {
  const [query, setQuery] = useState("");
  const [valence, setValence] = useState<ValenceFilter>("all");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...entries]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .filter((e) => {
        if (valence !== "all") {
          const v = e.emotions.some((k) => EMOTION_MAP[k]?.valence === valence);
          if (valence === "neutral" ? e.emotions.length > 0 && !v : !v) return false;
        }
        if (!q) return true;
        const hay = [e.note ?? "", ...e.tags, ...e.emotions].join(" ").toLowerCase();
        return hay.includes(q);
      });
  }, [entries, query, valence]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bloom-mood-export-${dayjs().format("YYYY-MM-DD")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel className="p-6" glow="amber">
      <SectionHead
        eyebrow="Records"
        title="Entry history"
        sub="Every raw record, searchable and editable. The analytics layer never mutates these."
        right={
          <button
            type="button"
            onClick={exportJson}
            disabled={!entries.length}
            className="mono inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-40"
          >
            <Download className="size-3" /> Export JSON
          </button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-[10px] border border-border bg-surface-2 px-3 py-2 transition-colors focus-within:border-border-strong">
          <Search className="size-3.5 text-faint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, tags, emotions…"
            className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-faint"
          />
        </label>
        <div className="flex gap-1.5">
          {(["all", "positive", "neutral", "negative"] as ValenceFilter[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setValence(v)}
              aria-pressed={valence === v}
              className={cn(
                "mono rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] transition-all duration-300",
                valence === v
                  ? "border-amber/60 bg-[var(--dim-amber)] text-amber"
                  : "border-border text-faint hover:text-muted-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Insufficient>
          {entries.length === 0
            ? "No entries yet — log your first check-in to begin the record."
            : "Nothing matches this search or filter."}
        </Insufficient>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {filtered.slice(0, 60).map((e) => {
            const accent = bucketOf(e.mood).accent as Accent;
            const confirming = confirmId === e.id;
            return (
              <div key={e.id} className="group flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
                <span
                  className="numeric w-10 text-[16px]"
                  style={{ color: accentVar[accent] }}
                  title={`Mood ${e.mood}/10`}
                >
                  {e.mood.toFixed(0)}
                </span>
                <span className="mono w-[132px] text-[11px] text-faint">
                  {dayjs(e.timestamp).format("MMM D YYYY · HH:mm")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-foreground">
                    {e.note || e.tags.map((t) => `#${t}`).join(" ") || "—"}
                  </span>
                  {e.emotions.length ? (
                    <span className="mono mt-0.5 block text-[10px] uppercase tracking-[0.08em] text-faint">
                      {e.emotions.map((k) => EMOTION_MAP[k]?.label ?? k).join(" · ")}
                    </span>
                  ) : null}
                </span>
                <span className="mono hidden text-[11px] text-faint sm:block">
                  <span className="text-sage">E{e.energy}</span> · <span className="text-rose">S{e.stress}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  {onShareStory ? (
                    <button
                      type="button"
                      onClick={() => onShareStory(e)}
                      aria-label="Share as story"
                      title="Share as story"
                      className="rounded-full border border-border p-2 text-faint opacity-0 transition-all hover:border-border-strong hover:text-foreground focus:opacity-100 group-hover:opacity-100"
                    >
                      <Sparkles className="size-3.5" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onEdit(e)}
                    aria-label="Edit entry"
                    className="rounded-full border border-border p-2 text-faint opacity-0 transition-all hover:border-border-strong hover:text-foreground focus:opacity-100 group-hover:opacity-100"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  {confirming ? (
                    <span className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onDelete(e.id);
                          setConfirmId(null);
                        }}
                        className="mono rounded-full border border-rose/50 px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] text-rose transition-colors hover:bg-[var(--dim-rose)]"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="mono rounded-full border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] text-faint hover:text-foreground"
                      >
                        Keep
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(e.id)}
                      aria-label="Delete entry"
                      className="rounded-full border border-border p-2 text-faint opacity-0 transition-all hover:border-rose/50 hover:text-rose focus:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </span>
              </div>
            );
          })}
          {filtered.length > 60 ? (
            <p className="mono pt-4 text-center text-[10px] uppercase tracking-[0.08em] text-faint">
              Showing 60 of {filtered.length} — refine the search to narrow further
            </p>
          ) : null}
        </div>
      )}
    </Panel>
  );
}
