/**
 * Moments — the story collection as a gallery, not a table. Real kinds only;
 * filter chips appear only for kinds that actually exist. Photo stories use
 * their real image; everything else carries its own accent field.
 */

import { useMemo, useState } from "react";
import { LayoutGrid, MoreHorizontal, RotateCcw, Rows3, Star } from "lucide-react";

import { accentVar } from "@/components/mood/primitives";
import { cn } from "@/lib/utils";
import { isStoryActive, type Story, type StoryKind } from "@/lib/profile/types";
import { storyMediaUrl } from "@/lib/profile/storyMeta";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const KIND_LABEL: Record<StoryKind, string> = {
  text: "Note",
  photo: "Photo",
  mood: "Mood",
  reflection: "Reflection",
  win: "Win",
  reward: "Reward",
  milestone: "Milestone",
};

const FILTER_ORDER: { key: StoryKind | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "mood", label: "Mood" },
  { key: "win", label: "Wins" },
  { key: "reflection", label: "Reflections" },
  { key: "milestone", label: "Milestones" },
  { key: "reward", label: "Rewards" },
  { key: "photo", label: "Photos" },
  { key: "text", label: "Notes" },
];

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

function MomentCard({
  story,
  index,
  onOpen,
  onDelete,
  onAddToHighlight,
  onShareAgain,
}: {
  story: Story;
  index: number;
  onOpen: (index: number) => void;
  onDelete: (story: Story) => void;
  onAddToHighlight: (story: Story) => void;
  onShareAgain: (story: Story) => void;
}) {
  const [imgOk, setImgOk] = useState(true);
  const media = story.kind === "photo" && story.mediaPath && imgOk ? storyMediaUrl(story) : null;
  const varAccent = accentVar[story.accent];
  const active = isStoryActive(story);

  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      aria-label={`Open moment: ${story.title || KIND_LABEL[story.kind]}`}
      className="group relative flex aspect-[3/4] w-full flex-col overflow-hidden rounded-2xl border border-border/70 text-left transition-[transform,border-color,box-shadow] duration-[var(--motion-med)] hover:-translate-y-[2px] hover:border-border-strong hover:shadow-[0_24px_50px_-30px_rgba(0,0,0,0.9)]"
      style={{
        background: media
          ? "var(--surface-2)"
          : `radial-gradient(130% 105% at 50% -10%, color-mix(in oklab, ${varAccent} 30%, var(--surface)), color-mix(in oklab, ${varAccent} 8%, var(--surface)) 55%, var(--surface) 100%)`,
      }}
    >
      {media ? (
        <img
          src={media}
          alt=""
          loading="lazy"
          onError={() => setImgOk(false)}
          className="absolute inset-0 size-full object-cover transition-transform duration-[var(--motion-slow)] group-hover:scale-[1.03]"
        />
      ) : null}

      {/* scrim keeps the chrome readable over any image */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
        style={{ background: "linear-gradient(to top, rgba(8,9,13,0.78), transparent)" }}
      />

      <span className="relative flex items-start justify-between p-2.5">
        <span className="mono rounded-full bg-black/35 px-2 py-1 text-[8.5px] uppercase tracking-[0.09em] text-white/85 backdrop-blur-[3px]">
          {KIND_LABEL[story.kind]}
        </span>
        {active ? (
          <span
            aria-label="Still on the rail"
            className="mt-0.5 size-[7px] rounded-full"
            style={{
              background: varAccent,
              boxShadow: `0 0 0 3px color-mix(in oklab, ${varAccent} 22%, transparent)`,
            }}
          />
        ) : null}
      </span>

      <span className="relative mt-auto block px-3 pb-3">
        <span className="display line-clamp-2 text-[16px] leading-snug text-[#F3F1EA] drop-shadow-[0_1px_10px_rgba(0,0,0,0.45)]">
          {story.title || "A moment"}
        </span>
        {story.title && story.body ? (
          <span className="mt-1 line-clamp-2 block text-[12px] leading-snug text-white/75">
            {story.body}
          </span>
        ) : story.body ? (
          <span className="line-clamp-3 text-[12.5px] leading-snug text-white/80">
            {story.body}
          </span>
        ) : null}
        <span className="mono mt-1.5 block text-[9px] uppercase tracking-[0.08em] text-white/55">
          {dateLabel(story.createdAt)}
        </span>
      </span>

      <span
        onClick={(e) => e.stopPropagation()}
        className="absolute right-1.5 bottom-1.5 z-10 opacity-0 transition-opacity duration-[var(--motion-fast)] focus-within:opacity-100 group-hover:opacity-100"
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Options for ${story.title || KIND_LABEL[story.kind]}`}
            className="grid size-7 place-items-center rounded-full bg-black/45 text-white/80 backdrop-blur-[3px] transition-colors hover:bg-black/65 hover:text-white"
          >
            <MoreHorizontal className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px] border-border bg-surface-2">
            <DropdownMenuItem
              onClick={() => onAddToHighlight(story)}
              className="cursor-pointer gap-2 text-[13px] focus:bg-surface-3"
            >
              <Star className="size-3.5 text-faint" /> Add to highlight
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onShareAgain(story)}
              className="cursor-pointer gap-2 text-[13px] focus:bg-surface-3"
            >
              <RotateCcw className="size-3.5 text-faint" aria-hidden /> Share again
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={() => onDelete(story)}
              className="cursor-pointer gap-2 text-[13px] text-muted-foreground focus:bg-surface-3 focus:text-rose"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </span>
    </button>
  );
}

export function MomentsGrid({
  stories,
  onOpenAt,
  onDelete,
  onAddToHighlight,
  onShareAgain,
  onCreate,
}: {
  stories: Story[];
  onOpenAt: (index: number) => void;
  onDelete: (story: Story) => void;
  onAddToHighlight: (story: Story) => void;
  onShareAgain: (story: Story) => void;
  onCreate: () => void;
}) {
  const [filter, setFilter] = useState<StoryKind | "all">("all");
  const [layout, setLayout] = useState<"grid" | "rows">("grid");

  const kindsPresent = useMemo(() => {
    const set = new Set(stories.map((s) => s.kind));
    return FILTER_ORDER.filter((f) => f.key === "all" || set.has(f.key as StoryKind));
  }, [stories]);

  const shown = useMemo(
    () => (filter === "all" ? stories : stories.filter((s) => s.kind === filter)),
    [stories, filter],
  );

  if (stories.length === 0) {
    return (
      <button
        type="button"
        onClick={onCreate}
        className="group flex w-full items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3.5 text-left transition-colors hover:border-[color:var(--profile-accent-border)]"
      >
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full text-[15px] leading-none text-[var(--profile-accent,var(--violet))]"
          style={{
            background: "color-mix(in oklab, var(--profile-accent,var(--violet)) 12%, transparent)",
          }}
        >
          +
        </span>
        <span className="min-w-0 flex-1 text-[13px] text-muted-foreground">
          <span className="font-medium text-foreground">No moments yet — that's okay.</span> Tap to
          keep the first one.
        </span>
        <span className="mono shrink-0 text-[9.5px] uppercase tracking-[0.08em] text-faint transition-colors group-hover:text-foreground">
          New moment
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {kindsPresent.length > 2 ? (
          <div
            className="no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto"
            role="tablist"
            aria-label="Filter moments"
          >
            {kindsPresent.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "mono shrink-0 rounded-full border px-3 py-1 text-[10px] tracking-[0.05em] uppercase transition-colors duration-[var(--motion-fast)]",
                  filter === f.key
                    ? "border-[color:var(--profile-accent-border)] bg-[color:var(--profile-accent-soft)] text-foreground"
                    : "border-border text-faint hover:border-border-strong hover:text-muted-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="flex-1" />
        )}
        <button
          type="button"
          aria-label={layout === "grid" ? "Switch to list" : "Switch to grid"}
          onClick={() => setLayout(layout === "grid" ? "rows" : "grid")}
          className="grid size-7 shrink-0 place-items-center rounded-lg border border-border text-faint transition-colors hover:border-border-strong hover:text-foreground"
        >
          {layout === "grid" ? <Rows3 className="size-3.5" /> : <LayoutGrid className="size-3.5" />}
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-[12.5px] text-muted-foreground">
          Nothing under this filter yet.
        </p>
      ) : layout === "grid" ? (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {shown.map((story) => (
            <li key={story.id}>
              <MomentCard
                story={story}
                index={stories.indexOf(story)}
                onOpen={onOpenAt}
                onDelete={onDelete}
                onAddToHighlight={onAddToHighlight}
                onShareAgain={onShareAgain}
              />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {shown.map((story) => {
            const varAccent = accentVar[story.accent];
            return (
              <li key={story.id}>
                <button
                  type="button"
                  onClick={() => onOpenAt(stories.indexOf(story))}
                  className="flex w-full items-center gap-3 rounded-xl border border-border/70 bg-surface/40 px-3.5 py-2.5 text-left transition-colors hover:border-border-strong"
                >
                  <span
                    aria-hidden
                    className="size-8 shrink-0 rounded-lg"
                    style={{
                      background: `linear-gradient(135deg, color-mix(in oklab, ${varAccent} 45%, var(--surface-2)), var(--surface-2))`,
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">
                      {story.title || `${KIND_LABEL[story.kind]} moment`}
                    </span>
                    <span className="mono block text-[9.5px] uppercase tracking-[0.07em] text-faint">
                      {KIND_LABEL[story.kind]} · {dateLabel(story.createdAt)}
                    </span>
                  </span>
                  {isStoryActive(story) ? (
                    <span className="mono rounded-full border border-[color:var(--profile-accent-border)] px-2 py-0.5 text-[8.5px] uppercase tracking-[0.08em] text-[var(--profile-accent,var(--violet))]">
                      live
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
