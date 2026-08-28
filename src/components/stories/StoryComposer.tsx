/**
 * StoryComposer — the creation ritual. Mode → compose → preview → publish.
 * Every existing-data mode (mood/reflection/reward/milestone) only ever
 * surfaces what the user explicitly picked, in an editable draft, and nothing
 * is published without a deliberate preview.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CloudSun,
  Flag,
  Gift,
  Image as ImageIcon,
  NotebookPen,
  Sprout,
  Type,
  X,
} from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { accentVar } from "@/components/mood/primitives";
import { cn } from "@/lib/utils";
import { EMOTION_MAP } from "@/lib/mood/types";
import type { MoodEntry } from "@/lib/mood/types";
import { storyDraft } from "@/lib/profile/drafts";
import type { RewardRecord } from "@/lib/profile/journey";
import {
  BLOOM_ACCENTS,
  STORY_KIND_LABELS,
  type BloomAccent,
  type LocalImage,
  type Milestone,
  type StoryDraft,
  type StoryKind,
  type StoryVisibility,
} from "@/lib/profile/types";
import { processStoryPhoto, validateImageFile } from "@/lib/profile/media";
import type { CreateStoryInput } from "@/lib/profile/storyService";
import { StoryContent } from "@/components/stories/StoryContent";
import { toast } from "sonner";

const MODES: Array<{
  kind: StoryKind;
  icon: typeof Type;
  needs?: "mood" | "note" | "reward" | "milestone";
}> = [
  { kind: "text", icon: Type },
  { kind: "photo", icon: ImageIcon },
  { kind: "mood", icon: CloudSun, needs: "mood" },
  { kind: "reflection", icon: NotebookPen, needs: "note" },
  { kind: "win", icon: Sprout },
  { kind: "reward", icon: Gift, needs: "reward" },
  { kind: "milestone", icon: Flag, needs: "milestone" },
];

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

const emptyDraft = (accent: BloomAccent, visibility: StoryVisibility): StoryDraft => ({
  kind: "text",
  title: "",
  body: "",
  accent,
  visibility,
  photo: null,
  source: null,
});

export function StoryComposer({
  open,
  userId,
  defaultAccent,
  defaultVisibility,
  moodEntries,
  rewards,
  milestones,
  initialSource = null,
  onPublish,
  onClose,
}: {
  open: boolean;
  userId: string;
  defaultAccent: BloomAccent;
  defaultVisibility: StoryVisibility;
  moodEntries: MoodEntry[];
  rewards: RewardRecord[];
  milestones: Milestone[];
  initialSource?: { kind: "mood" | "reflection"; id: string } | null;
  onPublish: (input: CreateStoryInput) => Promise<void>;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"mode" | "edit" | "preview" | "confirm-close">("mode");
  const [draft, setDraft] = useState<StoryDraft>(() =>
    emptyDraft(defaultAccent, defaultVisibility),
  );
  const [dirty, setDirty] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<StoryDraft | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const draftTimer = useRef<number | undefined>(undefined);

  const isDirty = useMemo(
    () => dirty && (draft.title.trim() !== "" || draft.body.trim() !== "" || Boolean(draft.photo)),
    [dirty, draft],
  );

  const sourceApplied = useRef(false);

  /* drafts: offer to resume, never destroy silently.
   * Only reset on a real closed→open transition so a dev-mode effect
   * re-run (or any unrelated re-render) can never wipe a just-applied pick. */
  const prevOpen = useRef(false);
  useEffect(() => {
    if (open && !prevOpen.current) {
      setStep("mode");
      setDraft(emptyDraft(defaultAccent, defaultVisibility));
      setDirty(false);
      const stored = storyDraft.read() as { value: StoryDraft; userId: string } | null;
      if (stored && stored.userId === userId) setPendingRestore(stored.value);
    }
    prevOpen.current = open;
    if (!open) sourceApplied.current = false;
  }, [open, userId, defaultAccent, defaultVisibility]);

  useEffect(() => {
    if (!open || !isDirty) return;
    window.clearTimeout(draftTimer.current);
    draftTimer.current = window.setTimeout(() => {
      storyDraft.write({ value: draft, userId });
    }, 600);
    return () => window.clearTimeout(draftTimer.current);
  }, [draft, isDirty, open, userId]);

  const clearDraft = useCallback(() => storyDraft.clear(), []);

  /* deep-link from Mood: "share as story" pre-fills this entry */
  useEffect(() => {
    if (!open) return;
    if (!initialSource || sourceApplied.current) return;
    const entry = moodEntries.find((e) => e.id === initialSource.id);
    if (!entry) return;
    sourceApplied.current = true;
    if (initialSource.kind === "reflection") pickReflection(entry);
    else pickMood(entry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialSource, moodEntries]);

  const patch = useCallback((next: Partial<StoryDraft>) => {
    setDraft((d) => ({ ...d, ...next }));
    setDirty(true);
  }, []);

  const requestClose = useCallback(() => {
    if (isDirty && step !== "preview") {
      setStep("confirm-close");
      return;
    }
    onClose();
  }, [isDirty, step, onClose]);

  const pickMood = (entry: MoodEntry) => {
    const primary = entry.emotions[0] ?? "neutral";
    patch({
      kind: "mood",
      title: `Mood · ${dayLabel(entry.timestamp)}`,
      body:
        entry.note?.trim() ||
        `${Math.round(entry.mood)}/10 — feeling ${EMOTION_MAP[primary].label.toLowerCase()}.`,
      accent: EMOTION_MAP[primary].accent,
      source: { kind: "mood", id: entry.id },
    });
    setStep("edit");
  };

  const pickReflection = (entry: MoodEntry) => {
    patch({
      kind: "reflection",
      title: `Reflection · ${dayLabel(entry.timestamp)}`,
      body: entry.note?.trim() ?? "",
      accent: EMOTION_MAP[entry.emotions[0] ?? "neutral"].accent,
      source: { kind: "mood", id: entry.id },
    });
    setStep("edit");
  };

  const pickReward = (reward: RewardRecord) => {
    patch({
      kind: "reward",
      title: reward.title,
      body: "Something earned and kept.",
      accent: "amber",
      source: { kind: "reward", id: reward.id },
    });
    setStep("edit");
  };

  const pickMilestone = (milestone: Milestone) => {
    patch({
      kind: "milestone",
      title: milestone.label,
      body: milestone.detail,
      accent: "sage",
      source: { kind: "milestone", id: milestone.id },
    });
    setStep("edit");
  };

  const onPickPhoto = async (file: File | null) => {
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setPhotoBusy(true);
    try {
      const processed = await processStoryPhoto(file);
      patch({
        kind: "photo",
        photo: {
          dataUrl: processed.dataUrl,
          blob: processed.blob,
          width: processed.width,
          height: processed.height,
        },
        accent: defaultAccent,
      });
      setStep("edit");
    } catch {
      toast.error("Couldn't use that image. Try another one.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const publish = async () => {
    setPublishing(true);
    try {
      await onPublish({
        kind: draft.kind,
        title: draft.title,
        body: draft.body,
        accent: draft.accent,
        visibility: draft.visibility,
        photo: draft.photo,
        source: draft.source,
      });
      clearDraft();
      setDirty(false);
      onClose();
    } catch (error) {
      // Never delete the draft on failure — the user can hit Publish again.
      toast.error(error instanceof Error ? error.message : "Couldn't publish your story.");
    } finally {
      setPublishing(false);
    }
  };

  const previewStory = useMemo(
    () => ({
      id: "preview",
      kind: draft.kind,
      title: draft.title,
      body: draft.body,
      mediaPath: null as string | null,
      mediaWidth: draft.photo?.width ?? null,
      mediaHeight: draft.photo?.height ?? null,
      accent: draft.accent,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      visibility: draft.visibility,
      deletedAt: null,
    }),
    [draft],
  );

  const reflections = useMemo(
    () => moodEntries.filter((e) => e.note && e.note.trim().length > 0),
    [moodEntries],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) requestClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn(
          "top-1/2 left-1/2 max-h-[min(92dvh,760px)] w-[calc(100%-1.5rem)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[20px] border-border bg-background p-0 gap-0",
          "flex flex-col",
        )}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          requestClose();
        }}
      >
        <>
          {/* chrome */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-3">
              {step === "edit" || step === "preview" ? (
                <button
                  type="button"
                  aria-label="Back"
                  onClick={() => setStep(step === "preview" ? "edit" : "mode")}
                  className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  <ArrowLeft className="size-4" />
                </button>
              ) : null}
              <DialogTitle className="display text-[16px]">
                {step === "mode"
                  ? "What kind of moment?"
                  : step === "edit"
                    ? STORY_KIND_LABELS[draft.kind]
                    : step === "preview"
                      ? "Who can see this?"
                      : "Keep your draft?"}
              </DialogTitle>
            </div>
            <button
              type="button"
              aria-label="Close composer"
              onClick={requestClose}
              className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {pendingRestore && step === "mode" ? (
              <div className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/50 px-4 py-3">
                <p className="text-[13px] text-muted-foreground">You have an unfinished story.</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="mono rounded-full border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => {
                      setPendingRestore(null);
                      clearDraft();
                    }}
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    className="mono rounded-full border border-border-strong bg-surface-3 px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] text-foreground"
                    onClick={() => {
                      setDraft(pendingRestore);
                      setDirty(true);
                      setPendingRestore(null);
                      setStep("edit");
                    }}
                  >
                    Resume
                  </button>
                </div>
              </div>
            ) : null}

            {step === "mode" ? (
              <div className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-3">
                {MODES.filter((mode) => {
                  if (mode.needs === "mood") return moodEntries.length > 0;
                  if (mode.needs === "note") return reflections.length > 0;
                  if (mode.needs === "reward") return rewards.length > 0;
                  if (mode.needs === "milestone") return milestones.length > 0;
                  return true;
                }).map((mode) => (
                  <button
                    key={mode.kind}
                    type="button"
                    onClick={() => {
                      if (mode.kind === "mood") {
                        setStep("edit");
                        patch({ kind: "mood" });
                        return;
                      }
                      if (mode.kind === "reflection") {
                        setStep("edit");
                        patch({ kind: "reflection" });
                        return;
                      }
                      if (mode.kind === "reward") {
                        setStep("edit");
                        patch({ kind: "reward" });
                        return;
                      }
                      if (mode.kind === "milestone") {
                        setStep("edit");
                        patch({ kind: "milestone" });
                        return;
                      }
                      if (mode.kind === "photo") {
                        fileRef.current?.click();
                        return;
                      }
                      patch({ kind: mode.kind });
                      setStep("edit");
                    }}
                    className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-surface/60 p-3.5 text-left transition-all duration-300 hover:-translate-y-[1px] hover:border-border-strong"
                  >
                    <mode.icon
                      className="size-[18px] text-faint transition-colors group-hover:text-foreground"
                      strokeWidth={1.7}
                      aria-hidden
                    />
                    <span className="text-[13px] font-medium">{STORY_KIND_LABELS[mode.kind]}</span>
                    <span className="text-[11.5px] leading-snug text-muted-foreground">
                      {MODE_HINTS[mode.kind]}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {step === "edit" && needsSourcePick(draft) && draft.kind === "mood" ? (
              <div className="p-4">
                <p className="eyebrow mb-3">Pick a check-in — only this one becomes the story</p>
                <ul className="flex flex-col gap-2">
                  {moodEntries
                    .slice(-6)
                    .reverse()
                    .map((entry) => (
                      <li key={entry.id}>
                        <MoodRow entry={entry} onPick={() => pickMood(entry)} />
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}

            {step === "edit" && needsSourcePick(draft) && draft.kind === "reflection" ? (
              <div className="p-4">
                <p className="eyebrow mb-3">Pick a reflection to share — you'll edit it first</p>
                <ul className="flex flex-col gap-2">
                  {reflections
                    .slice(-6)
                    .reverse()
                    .map((entry) => (
                      <li key={entry.id}>
                        <MoodRow entry={entry} onPick={() => pickReflection(entry)} showNote />
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}

            {step === "edit" && needsSourcePick(draft) && draft.kind === "reward" ? (
              <div className="p-4">
                <p className="eyebrow mb-3">Choose a reward</p>
                <ul className="flex flex-col gap-2">
                  {rewards.map((reward) => (
                    <li key={reward.id}>
                      <button
                        type="button"
                        onClick={() => pickReward(reward)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface/60 px-4 py-3 text-left transition-colors hover:border-border-strong"
                      >
                        <span>
                          <span className="block text-[13.5px] font-medium">{reward.title}</span>
                          <span className="mono block text-[10px] uppercase tracking-[0.06em] text-faint">
                            {reward.claimed_at ? dayLabel(reward.claimed_at) : ""}
                          </span>
                        </span>
                        <ArrowRight className="size-4 shrink-0 text-faint" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {step === "edit" && needsSourcePick(draft) && draft.kind === "milestone" ? (
              <div className="p-4">
                <p className="eyebrow mb-3">Choose a milestone</p>
                <ul className="flex flex-col gap-2">
                  {milestones.map((milestone) => (
                    <li key={milestone.id}>
                      <button
                        type="button"
                        onClick={() => pickMilestone(milestone)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface/60 px-4 py-3 text-left transition-colors hover:border-border-strong"
                      >
                        <span>
                          <span className="block text-[13.5px] font-medium">{milestone.label}</span>
                          <span className="block text-[11.5px] text-muted-foreground">
                            {milestone.detail}
                          </span>
                        </span>
                        <ArrowRight className="size-4 shrink-0 text-faint" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {step === "edit" && !needsSourcePick(draft) ? (
              <div className="flex flex-col gap-4 p-4">
                {draft.photo ? (
                  <div className="overflow-hidden rounded-xl border border-border bg-surface-2/40">
                    <img
                      src={draft.photo.dataUrl}
                      alt="Your story photo preview"
                      className="mx-auto max-h-[280px] w-auto"
                    />
                    <div className="flex items-center justify-between border-t border-border px-3 py-2">
                      <span className="mono text-[10px] uppercase tracking-[0.08em] text-faint">
                        {photoBusy ? "Preparing…" : `${draft.photo.width}×${draft.photo.height}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          patch({ photo: null });
                          setStep("mode");
                        }}
                        className="mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Change photo
                      </button>
                    </div>
                  </div>
                ) : null}

                <label className="flex flex-col gap-1.5">
                  <span className="eyebrow">Headline (optional)</span>
                  <input
                    value={draft.title}
                    onChange={(e) => patch({ title: e.target.value.slice(0, 120) })}
                    placeholder={
                      draft.kind === "win"
                        ? "Finished something I've been avoiding."
                        : "Today felt lighter."
                    }
                    maxLength={120}
                    className="display w-full rounded-xl border border-transparent bg-transparent px-3 py-2 text-[20px] leading-snug outline-none transition-colors placeholder:text-faint/70 focus:border-border focus:bg-surface-2/40"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="eyebrow">A few words (optional)</span>
                  <textarea
                    value={draft.body}
                    onChange={(e) => patch({ body: e.target.value.slice(0, 2000) })}
                    placeholder="Say as much or as little as you like."
                    rows={draft.kind === "photo" ? 2 : 4}
                    className="w-full resize-none rounded-xl border border-transparent bg-transparent px-3 py-2 text-[14px] leading-relaxed text-muted-foreground outline-none transition-colors placeholder:text-faint/60 focus:border-border focus:bg-surface-2/40 focus:text-foreground"
                  />
                </label>

                <AccentPicker value={draft.accent} onChange={(accent) => patch({ accent })} />
              </div>
            ) : null}

            {step === "preview" ? (
              <div className="flex flex-col">
                <div
                  className="mx-4 mt-4 h-[320px] overflow-hidden rounded-2xl border border-border"
                  style={{ background: "var(--surface)" }}
                >
                  {draft.photo ? (
                    <img
                      src={draft.photo.dataUrl}
                      alt="Preview of your story"
                      className="size-full object-contain"
                    />
                  ) : (
                    <StoryContent story={{ ...previewStory, mediaPath: null }} compact />
                  )}
                </div>

                <div className="flex flex-col gap-4 p-4">
                  <div>
                    <p className="eyebrow mb-2">Visibility</p>
                    <div
                      className="grid grid-cols-2 gap-2"
                      role="radiogroup"
                      aria-label="Who can see this story"
                    >
                      {(
                        [
                          {
                            key: "private",
                            label: "Just me",
                            hint: "Stays in your private archive.",
                          },
                          {
                            key: "public",
                            label: "Public",
                            hint: "Visible when your profile is shared.",
                          },
                        ] as const
                      ).map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          role="radio"
                          aria-checked={draft.visibility === option.key}
                          onClick={() => patch({ visibility: option.key })}
                          className={cn(
                            "rounded-xl border px-3.5 py-3 text-left transition-all duration-200",
                            draft.visibility === option.key
                              ? "border-[color:var(--profile-accent-border,var(--border-strong))] bg-[color:var(--profile-accent-soft,var(--surface-2))]"
                              : "border-border bg-surface/60 hover:border-border-strong",
                          )}
                        >
                          <span className="flex items-center gap-2 text-[13px] font-medium">
                            {draft.visibility === option.key ? (
                              <Check
                                className="size-3.5"
                                style={{ color: accentVar[draft.accent] }}
                              />
                            ) : null}
                            {option.label}
                          </span>
                          <span className="mt-0.5 block text-[11.5px] leading-snug text-muted-foreground">
                            {option.hint}
                          </span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[11.5px] text-faint">
                      Private by default. Stories expire after 24 hours and rest in your archive.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* action bar */}
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            {step === "mode" ? (
              <p className="text-[11.5px] text-faint">
                Share something small when you feel like it.
              </p>
            ) : null}
            {step === "edit" ? (
              <>
                <p className="mono text-[10px] uppercase tracking-[0.08em] text-faint">
                  {draft.title.length + draft.body.length > 0 ? `draft saved` : ""}
                </p>
                <button
                  type="button"
                  onClick={() => setStep("preview")}
                  disabled={photoBusy}
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-medium text-[var(--primary-foreground,var(--background))] transition-transform duration-300 enabled:hover:scale-[1.02] disabled:opacity-60"
                  style={{
                    background: `linear-gradient(135deg, ${accentVar[draft.accent]}, var(--sky))`,
                  }}
                >
                  Preview <ArrowRight className="size-3.5" aria-hidden />
                </button>
              </>
            ) : null}
            {step === "preview" ? (
              <button
                type="button"
                onClick={() => void publish()}
                disabled={publishing}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-medium text-[var(--primary-foreground,var(--background))] transition-transform duration-300 enabled:hover:scale-[1.02] disabled:opacity-60"
                style={{
                  background: `linear-gradient(135deg, ${accentVar[draft.accent]}, var(--sky))`,
                }}
              >
                {publishing
                  ? "Publishing…"
                  : draft.visibility === "public"
                    ? "Publish story"
                    : "Save to my archive"}
              </button>
            ) : null}
            {step === "confirm-close" ? (
              <div className="flex w-full flex-wrap items-center justify-between gap-3">
                <p className="text-[13px] text-muted-foreground">Keep your draft for later?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="mono rounded-full border border-border px-4 py-2 text-[10px] uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      clearDraft();
                      setDirty(false);
                      onClose();
                    }}
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    className="mono rounded-full border border-border-strong bg-surface-3 px-4 py-2 text-[10px] uppercase tracking-[0.08em] text-foreground"
                    onClick={() => {
                      storyDraft.write({ value: draft, userId });
                      onClose();
                    }}
                  >
                    Keep draft
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              e.target.value = "";
              void onPickPhoto(file);
            }}
          />
        </>
      </DialogContent>
    </Dialog>
  );
}

function needsSourcePick(draft: StoryDraft): boolean {
  if (draft.source) return false;
  return (
    draft.kind === "mood" ||
    draft.kind === "reflection" ||
    draft.kind === "reward" ||
    draft.kind === "milestone"
  );
}

const MODE_HINTS: Record<StoryKind, string> = {
  text: "A line, a thought, a date.",
  photo: "Something you saw and kept.",
  mood: "A check-in, on your terms.",
  reflection: "Words you already wrote.",
  win: "Small counts.",
  reward: "Something earned.",
  milestone: "How far you've come.",
};

function MoodRow({
  entry,
  onPick,
  showNote = false,
}: {
  entry: MoodEntry;
  onPick: () => void;
  showNote?: boolean;
}) {
  const primary = entry.emotions[0] ?? "neutral";
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface/60 px-4 py-3 text-left transition-colors hover:border-border-strong"
    >
      <span
        className="grid size-9 shrink-0 place-items-center rounded-full text-[12px] font-medium"
        style={{
          background: `color-mix(in oklab, ${accentVar[EMOTION_MAP[primary].accent]} 14%, transparent)`,
          color: accentVar[EMOTION_MAP[primary].accent],
        }}
        aria-hidden
      >
        {Math.round(entry.mood)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-foreground">
          {dayLabel(entry.timestamp)} · {EMOTION_MAP[primary].label}
        </span>
        <span
          className={cn(
            "block truncate text-[11.5px] text-muted-foreground",
            !showNote && "hidden",
          )}
        >
          {entry.note?.trim() || ""}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-faint" aria-hidden />
    </button>
  );
}

export function AccentPicker({
  value,
  onChange,
  label = "Accent",
}: {
  value: BloomAccent;
  onChange: (accent: BloomAccent) => void;
  label?: string;
}) {
  return (
    <div>
      <p className="eyebrow mb-2">{label}</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {BLOOM_ACCENTS.map((accent) => (
          <button
            key={accent}
            type="button"
            role="radio"
            aria-checked={value === accent}
            aria-label={`${accent} accent`}
            onClick={() => onChange(accent)}
            className={cn(
              "relative grid size-8 place-items-center rounded-full border transition-all duration-200",
              value === accent
                ? "border-foreground/40"
                : "border-border hover:border-border-strong",
            )}
            style={{
              background: `color-mix(in oklab, ${accentVar[accent]} 26%, var(--surface-2))`,
            }}
          >
            {value === accent ? <Check className="size-3.5 text-foreground" aria-hidden /> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
