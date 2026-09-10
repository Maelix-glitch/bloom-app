/**
 * StoryArchive — the private memory vault.
 * Expired and resting moments grouped by month on a cinematic timeline,
 * each card opening exactly as published. Owner-only: the data layer only
 * ever returns the user's own rows.
 */

import { useEffect, useMemo, useState } from "react";
import { Archive, Eye, MoreHorizontal, Share2, Star, Trash2, X } from "lucide-react";

import { StorySheet } from "./StorySheet";
import type { Story } from "@/lib/profile/types";
import { storyMediaUrl } from "@/lib/profile/storyMeta";
import { backgroundById } from "@/lib/stories/catalogs";
import { archiveDayLabel, archiveMonthKey, archiveMonthLabel } from "@/lib/stories/time";
import { accentVar } from "@/components/mood/primitives";
import { cn } from "@/lib/utils";

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
  const [menuStory, setMenuStory] = useState<Story | null>(null);

  const groups = useMemo(() => {
    const all = [...active, ...archived].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const map = new Map<string, Story[]>();
    for (const story of all) {
      const key = archiveMonthKey(story.createdAt);
      const list = map.get(key) ?? [];
      list.push(story);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [active, archived]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !menuStory) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, menuStory]);

  if (!open) return null;

  return (
    <div
      className="bstory fixed inset-0 z-[75] bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="Story archive"
    >
      <div className="mx-auto flex h-full w-full max-w-[640px] flex-col">
        <div className="flex items-center justify-between px-5 pt-[max(16px,env(safe-area-inset-top))]">
          <div>
            <p className="eyebrow">Only you can see this</p>
            <h2 className="display mt-1 text-[24px]">Memory vault</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close archive"
            className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-4">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-20 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-faint">
                <Archive className="size-5" strokeWidth={1.5} aria-hidden />
              </span>
              <p className="display text-[17px] text-muted-foreground">Nothing resting here yet.</p>
              <p className="max-w-[32ch] text-[12.5px] leading-relaxed text-faint">
                Stories you share settle here quietly after 24 hours — your personal history, kept
                safe.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {groups.map(([key, stories]) => (
                <section key={key} aria-label={archiveMonthLabel(key)}>
                  <div className="mb-3 flex items-baseline justify-between">
                    <h3 className="display text-[18px]">{archiveMonthLabel(key)}</h3>
                    <span className="mono text-[10.5px] uppercase tracking-[0.08em] text-faint">
                      {stories.length} {stories.length === 1 ? "memory" : "memories"}
                    </span>
                  </div>
                  <ul className="grid grid-cols-3 gap-2.5">
                    {stories.map((story) => (
                      <li key={story.id}>
                        <ArchiveCard
                          story={story}
                          onView={() => onView(story)}
                          onMenu={() => setMenuStory(story)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {menuStory ? (
        <StorySheet
          title={menuStory.title || "A moment"}
          subtitle={archiveDayLabel(menuStory.createdAt)}
          onClose={() => setMenuStory(null)}
        >
          <div className="flex flex-col gap-1.5 pb-3">
            <MenuButton
              icon={Eye}
              label="View"
              onClick={() => {
                setMenuStory(null);
                onView(menuStory);
              }}
            />
            <MenuButton
              icon={Share2}
              label="Share again · 24 hours"
              onClick={() => {
                setMenuStory(null);
                onShareAgain(menuStory);
              }}
            />
            <MenuButton
              icon={Star}
              label="Add to highlight"
              onClick={() => {
                setMenuStory(null);
                onAddToHighlight(menuStory);
              }}
            />
            <MenuButton
              icon={Trash2}
              label="Delete forever"
              danger
              onClick={() => {
                setMenuStory(null);
                onDelete(menuStory);
              }}
            />
          </div>
        </StorySheet>
      ) : null}
    </div>
  );
}

function MenuButton({
  icon: Icon,
  label,
  danger = false,
  onClick,
}: {
  icon: typeof Eye;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border border-border bg-surface/60 px-4 py-3.5 text-left text-[13.5px] font-medium transition-colors hover:border-border-strong",
        danger && "text-rose",
      )}
    >
      <Icon className="size-4" strokeWidth={1.8} aria-hidden />
      {label}
    </button>
  );
}

function ArchiveCard({
  story,
  onView,
  onMenu,
}: {
  story: Story;
  onView: () => void;
  onMenu: () => void;
}) {
  const [broken, setBroken] = useState(false);
  const url = story.mediaPath && !broken ? storyMediaUrl(story) : null;
  const background = backgroundById(story.backgroundId);
  const accent = accentVar[story.accent];

  return (
    <div className="sarc-card group aspect-[9/14]">
      <button
        type="button"
        onClick={onView}
        aria-label={`View story from ${archiveDayLabel(story.createdAt)}`}
        className="absolute inset-0 block size-full text-left"
      >
        {url ? (
          <img
            src={url}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setBroken(true)}
            className="size-full object-cover"
          />
        ) : (
          <span
            className="flex size-full flex-col justify-between p-2.5"
            style={{ background: background.css }}
          >
            <span
              className="grid size-6 place-items-center self-start rounded-full"
              style={{ background: "rgba(255,255,255,0.14)", color: background.ink }}
              aria-hidden
            >
              <Eye className="size-3" />
            </span>
            <span
              className="display line-clamp-4 text-[11px] leading-snug"
              style={{ color: background.ink }}
            >
              {story.title || story.body || "A moment"}
            </span>
          </span>
        )}
        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12"
          style={{ background: "linear-gradient(0deg, rgba(8,6,16,0.6), transparent)" }}
          aria-hidden
        />
        <span className="mono absolute bottom-1.5 left-2 text-[9px] tracking-[0.06em] text-white/75">
          {new Date(story.createdAt).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
          })}
        </span>
        {story.audience === "close" ? (
          <span
            className="absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.06em]"
            style={{ background: "rgba(20,17,29,0.7)", color: "var(--sage)" }}
            aria-label="Close friends story"
          >
            Close
          </span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onMenu();
        }}
        aria-label="Story options"
        className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/45 text-white/85 opacity-0 backdrop-blur-sm transition-opacity focus:opacity-100 group-hover:opacity-100"
      >
        <MoreHorizontal className="size-3.5" />
      </button>
      <span
        className="pointer-events-none absolute inset-x-3 bottom-0 h-[2px] rounded-full opacity-70"
        style={{ background: accent, marginBottom: 0 }}
        aria-hidden
      />
    </div>
  );
}
