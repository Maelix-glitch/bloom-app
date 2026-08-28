/**
 * Featured moment — the one piece of content the user chooses to represent
 * them. Strong, quiet, and always explicit: nothing is featured by accident.
 */

import { useMemo, useState } from "react";
import { Check, Star } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { accentVar } from "@/components/mood/primitives";
import { cn } from "@/lib/utils";
import { formatRelativeDay } from "@/lib/profile/journey";
import type { BloomAccent, FeaturedMoment, Story } from "@/lib/profile/types";
import type { FeaturedSources, FeaturedContent } from "@/components/profile/ProfileView";

export function FeaturedCard({
  content,
  accent,
  onOpen,
}: {
  content: FeaturedContent;
  accent: BloomAccent;
  onOpen?: () => void;
}) {
  const varAccent = accentVar[accent];
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!onOpen}
      aria-label={onOpen ? "Open featured moment" : undefined}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border p-6 text-left transition-all duration-500 sm:p-7",
        onOpen ? "cursor-pointer hover:-translate-y-[2px]" : "cursor-default",
      )}
      style={{
        borderColor: `color-mix(in oklab, ${varAccent} 30%, transparent)`,
        background: `radial-gradient(130% 120% at 50% -10%, color-mix(in oklab, ${varAccent} 10%, var(--surface)), var(--surface) 60%)`,
        boxShadow: "var(--shadow-depth)",
      }}
    >
      <p className="eyebrow mb-3 flex items-center gap-1.5">
        <Star
          className="size-3"
          style={{ color: `color-mix(in oklab, ${varAccent} 80%, transparent)` }}
          aria-hidden
        />
        {content.eyebrow}
      </p>
      <p
        className="display text-[21px] leading-[1.25] text-balance sm:text-[24px]"
        style={{ maxWidth: "34ch" }}
      >
        {content.title}
      </p>
      {content.body ? (
        <p
          className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-muted-foreground"
          style={{ maxWidth: "54ch" }}
        >
          {content.body}
        </p>
      ) : null}
      <p className="mono mt-4 text-[10px] uppercase tracking-[0.08em] text-faint">{content.date}</p>
    </button>
  );
}

export function FeaturePrompt({
  onPick,
  onClear,
  hasFeatured,
}: {
  onPick: () => void;
  onClear?: () => void;
  hasFeatured: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onPick}
        className="mono rounded-full border border-border px-3.5 py-1.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
      >
        Change moment
      </button>
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="mono rounded-full px-3.5 py-1.5 text-[10px] uppercase tracking-[0.08em] text-faint transition-colors hover:text-rose"
        >
          Remove
        </button>
      ) : null}
    </div>
  );
}

export function FeaturedPicker({
  open,
  onClose,
  current,
  sources,
  stories,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  current: FeaturedMoment | null;
  sources: FeaturedSources;
  stories: Story[];
  onSelect: (featured: FeaturedMoment | null) => Promise<void>;
}) {
  const [savingId, setSavingId] = useState<string | null>(null);

  const candidates = useMemo(() => {
    const list: { key: string; label: string; sub: string; moment: FeaturedMoment }[] = [];
    for (const story of stories) {
      list.push({
        key: `story-${story.id}`,
        label: story.title || "Untitled moment",
        sub: `Story · ${formatRelativeDay(story.createdAt)}`,
        moment: { kind: "story", id: story.id },
      });
    }
    for (const note of sources.reflections) {
      list.push({
        key: `reflection-${note.id}`,
        label: note.title,
        sub: `Reflection · ${note.date}`,
        moment: { kind: "reflection", id: note.id },
      });
    }
    for (const reward of sources.rewards) {
      list.push({
        key: `reward-${reward.id}`,
        label: reward.title,
        sub: `Reward · ${reward.date}`,
        moment: { kind: "reward", id: reward.id },
      });
    }
    for (const m of sources.milestones) {
      list.push({
        key: `milestone-${m.id}`,
        label: m.label,
        sub: `Milestone · ${m.achievedAt ? formatRelativeDay(m.achievedAt) : ""}`,
        moment: { kind: "milestone", id: m.id },
      });
    }
    return list.slice(0, 30);
  }, [stories, sources]);

  const activeKey = current ? `${current.kind}-${current.id}` : null;

  const choose = async (moment: FeaturedMoment | null) => {
    setSavingId(moment ? `${moment.kind}-${moment.id}` : "clear");
    try {
      await onSelect(moment);
      onClose();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="top-1/2 left-1/2 max-h-[min(86dvh,640px)] w-[calc(100%-1.5rem)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border-border bg-background p-0 gap-0 flex flex-col">
        <div className="border-b border-border px-4 py-3">
          <DialogTitle className="display text-[16px]">What represents you right now?</DialogTitle>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {candidates.length === 0 ? (
            <p className="px-3 py-10 text-center text-[13px] text-muted-foreground">
              There's nothing to feature yet. Stories, reflections, rewards, and milestones will
              show up here.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              <li>
                <button
                  type="button"
                  onClick={() => void choose(null)}
                  className="flex w-full items-center justify-between rounded-xl border border-dashed border-border px-3.5 py-2.5 text-left text-[13px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                >
                  No featured moment
                  {activeKey === null ? <Check className="size-4 text-sage" aria-hidden /> : null}
                </button>
              </li>
              {candidates.map((c) => (
                <li key={c.key}>
                  <button
                    type="button"
                    disabled={savingId !== null}
                    onClick={() => void choose(c.moment)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors",
                      activeKey === c.key
                        ? "border-[color:var(--profile-accent-border,var(--border-strong))] bg-[color:var(--profile-accent-soft,var(--surface-2))]"
                        : "border-border bg-surface/50 hover:border-border-strong",
                      savingId === c.key && "opacity-60",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium">{c.label}</span>
                      <span className="mono block text-[10px] uppercase tracking-[0.06em] text-faint">
                        {c.sub}
                      </span>
                    </span>
                    {activeKey === c.key ? (
                      <Check className="size-4 shrink-0 text-sage" aria-hidden />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
