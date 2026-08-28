/**
 * StoryArchive — the private shelf for moments past. Owner-only (the data
 * layer itself only ever returns the user's rows). Grouped by time, not by
 * dashboard.
 */

import { useMemo } from "react";
import { Archive, Eye, Share2, Star, Trash2, X } from "lucide-react";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Story } from "@/lib/profile/types";
import { formatRelativeDay, groupStories } from "@/lib/profile/journey";
import { accentVar } from "@/components/mood/primitives";

export function StoryArchive({
  open,
  onClose,
  archived,
  active,
  onView,
  onShareAgain,
  onDelete,
  onAddToHighlight,
}: {
  open: boolean;
  onClose: () => void;
  archived: Story[];
  active: Story[];
  onView: (story: Story) => void;
  onShareAgain: (story: Story) => void;
  onDelete: (story: Story) => void;
  onAddToHighlight: (story: Story) => void;
}) {
  const groups = useMemo(() => groupStories([...archived, ...active]), [archived, active]);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 border-border bg-background p-0 sm:max-w-[440px]"
        showCloseButton={false}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <SheetTitle className="display text-[17px]">Story archive</SheetTitle>
              <SheetDescription className="mt-0.5 text-[12px] text-muted-foreground">
                Only you can see this. Moments rest here after 24 hours.
              </SheetDescription>
            </div>
            <SheetClose
              className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              aria-label="Close archive"
            >
              <X className="size-4" />
            </SheetClose>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {groups.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-center">
                <Archive className="size-5 text-faint" strokeWidth={1.5} aria-hidden />
                <p className="display text-[15px] text-muted-foreground">Nothing archived yet.</p>
                <p className="max-w-[30ch] text-[12.5px] text-faint">
                  Stories you create will settle here quietly once they leave the rail.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {groups.map((group) => (
                  <section key={group.label} aria-label={group.label}>
                    <p className="eyebrow mb-2">{group.label}</p>
                    <ul className="flex flex-col gap-2">
                      {group.stories.map((story) => (
                        <li
                          key={story.id}
                          className="group flex items-center gap-3 rounded-xl border border-border bg-surface/50 p-3 transition-colors hover:border-border-strong"
                        >
                          <button
                            type="button"
                            onClick={() => onView(story)}
                            aria-label={`Open story: ${story.title || story.kind}`}
                            className="grid size-11 shrink-0 place-items-center rounded-lg"
                            style={{
                              background: `color-mix(in oklab, ${accentVar[story.accent]} 14%, var(--surface-2))`,
                            }}
                          >
                            <Eye
                              className="size-4"
                              style={{ color: accentVar[story.accent] }}
                              strokeWidth={1.8}
                              aria-hidden
                            />
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium">
                              {story.title || storyKindLabel(story)}
                            </p>
                            <p className="mono truncate text-[10px] uppercase tracking-[0.06em] text-faint">
                              {formatRelativeDay(story.createdAt)} ·{" "}
                              {story.visibility === "public" ? "public" : "private"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                            <IconAction label="Share again" onClick={() => onShareAgain(story)}>
                              <Share2 className="size-3.5" />
                            </IconAction>
                            <IconAction
                              label={`Add ${story.title || "story"} to a highlight`}
                              onClick={() => onAddToHighlight(story)}
                            >
                              <Star className="size-3.5" />
                            </IconAction>
                            <IconAction label="Delete story" danger onClick={() => onDelete(story)}>
                              <Trash2 className="size-3.5" />
                            </IconAction>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const storyKindLabel = (story: Story) =>
  story.kind === "photo" ? "Photo moment" : story.kind === "mood" ? "Mood check-in" : "Moment";

function IconAction({
  children,
  label,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-8 place-items-center rounded-lg border border-transparent text-muted-foreground transition-colors",
        danger
          ? "hover:border-rose/40 hover:text-rose"
          : "hover:border-border-strong hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
