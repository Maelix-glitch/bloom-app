/**
 * HighlightComposer — name, cover accent, and story selection in one calm
 * dialog. No multi-step wizard.
 */

import { useEffect, useMemo, useState } from "react";
import { Check, Trash2 } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { accentVar } from "@/components/mood/primitives";
import { cn } from "@/lib/utils";
import {
  BLOOM_ACCENTS,
  STORY_KIND_LABELS,
  type BloomAccent,
  type HighlightItem,
  type Story,
} from "@/lib/profile/types";
import { formatRelativeDay } from "@/lib/profile/journey";

export function HighlightComposer({
  open,
  editing,
  allStories,
  preselectedStoryId,
  defaultAccent,
  onSave,
  onDelete,
  onClose,
}: {
  open: boolean;
  editing: HighlightItem | null;
  allStories: Story[];
  preselectedStoryId: string | null;
  defaultAccent: BloomAccent;
  onSave: (
    id: string | null,
    name: string,
    accent: BloomAccent,
    storyIds: string[],
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [accent, setAccent] = useState<BloomAccent>(defaultAccent);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setName(editing?.name ?? "");
    setAccent(editing?.accent ?? defaultAccent);
    setSelected(
      editing ? editing.stories.map((s) => s.id) : preselectedStoryId ? [preselectedStoryId] : [],
    );
  }, [open, editing, defaultAccent, preselectedStoryId]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const valid = useMemo(() => name.trim().length >= 1 && name.trim().length <= 40, [name]);

  const save = async () => {
    if (!valid) {
      setError("Give it a short name.");
      return;
    }
    setSaving(true);
    try {
      await onSave(editing?.id ?? null, name.trim(), accent, selected);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that highlight.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="top-1/2 left-1/2 max-h-[min(90dvh,700px)] w-[calc(100%-1.5rem)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border-border bg-background p-0 gap-0 flex flex-col"
      >
        <>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <DialogTitle className="display text-[16px]">
              {editing ? "Edit highlight" : "New highlight"}
            </DialogTitle>
            <button
              type="button"
              aria-label="Close highlight editor"
              onClick={onClose}
              className="mono rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Close
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <label className="flex flex-col gap-1.5">
              <span className="eyebrow">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 40))}
                placeholder="Moments, Wins, Routines…"
                maxLength={40}
                className="display w-full rounded-xl border border-transparent bg-transparent px-3 py-2 text-[18px] outline-none transition-colors placeholder:text-faint/60 focus:border-border focus:bg-surface-2/40"
              />
            </label>

            <div className="mt-4">
              <p className="eyebrow mb-2">Cover</p>
              <div
                className="flex flex-wrap gap-2"
                role="radiogroup"
                aria-label="Highlight cover accent"
              >
                {BLOOM_ACCENTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    role="radio"
                    aria-checked={accent === a}
                    aria-label={`${a} cover`}
                    onClick={() => setAccent(a)}
                    className={cn(
                      "grid size-8 place-items-center rounded-md border transition-colors",
                      accent === a
                        ? "border-foreground/40"
                        : "border-border hover:border-border-strong",
                    )}
                    style={{
                      background: `color-mix(in oklab, ${accentVar[a]} 24%, var(--surface-2))`,
                    }}
                  >
                    {accent === a ? (
                      <Check className="size-3.5 text-foreground" aria-hidden />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="eyebrow mb-2">Stories {allStories.length === 0 && "— none yet"}</p>
              {allStories.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-surface-2/30 px-4 py-5 text-center text-[12.5px] text-muted-foreground">
                  Highlights keep stories forever — once you've made a few stories, they'll appear
                  here to choose from.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {allStories.map((story) => {
                    const isOn = selected.includes(story.id);
                    return (
                      <li key={story.id}>
                        <button
                          type="button"
                          onClick={() => toggle(story.id)}
                          aria-pressed={isOn}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors",
                            isOn
                              ? "border-[color:var(--profile-accent-border,var(--border-strong))] bg-[color:var(--profile-accent-soft,var(--surface-2))]"
                              : "border-border bg-surface/50 hover:border-border-strong",
                          )}
                        >
                          <span
                            className="grid size-6 shrink-0 place-items-center rounded-md border"
                            style={{
                              borderColor: `color-mix(in oklab, ${accentVar[story.accent]} 45%, transparent)`,
                              background: `color-mix(in oklab, ${accentVar[story.accent]} 14%, transparent)`,
                            }}
                            aria-hidden
                          >
                            {isOn ? (
                              <Check
                                className="size-3.5"
                                style={{ color: accentVar[story.accent] }}
                              />
                            ) : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium">
                              {story.title || STORY_KIND_LABELS[story.kind]}
                            </span>
                            <span className="mono block text-[10px] uppercase tracking-[0.06em] text-faint">
                              {STORY_KIND_LABELS[story.kind]} · {formatRelativeDay(story.createdAt)}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {error ? <p className="mt-3 text-[12.5px] text-rose">{error}</p> : null}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
            {editing ? (
              <button
                type="button"
                onClick={() => void onDelete(editing.id).then(onClose)}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-[12px] text-muted-foreground transition-colors hover:border-rose/40 hover:text-rose"
              >
                <Trash2 className="size-3.5" aria-hidden /> Delete
              </button>
            ) : (
              <span className="text-[11.5px] text-faint">Highlights are permanent.</span>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || allStories.length === 0}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-medium transition-transform duration-300 enabled:hover:scale-[1.02] disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${accentVar[accent]}, var(--sky))`,
                color: "var(--primary-foreground)",
              }}
            >
              {saving ? "Saving…" : editing ? "Save changes" : "Create highlight"}
            </button>
          </div>
        </>
      </DialogContent>
    </Dialog>
  );
}
