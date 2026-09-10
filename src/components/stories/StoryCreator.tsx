/**
 * StoryCreator — the way into a story.
 * Camera, gallery photo/video, text on a curated background, cinematic
 * templates, or a moment drafted from real Bloom data (mood, reflections,
 * rewards, milestones). Everything lands in the StoryEditor; nothing here
 * publishes. Drafts resume; video drafts stay honest about files.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Camera,
  Clapperboard,
  CloudSun,
  Flag,
  Gift,
  Image as ImageIcon,
  NotebookPen,
  Sprout,
  Trash2,
  Type,
  X,
} from "lucide-react";

import {
  StoryEditor,
  editorDraftStore,
  type EditorInitialState,
  type EditorSource,
} from "./StoryEditor";
import { CameraCapture } from "./CameraCapture";
import { BloomShareCard, shareSourceForMilestone, shareSourceForReward } from "./ShareCard";
import { STORY_BACKGROUNDS, STORY_TEMPLATES } from "@/lib/stories/catalogs";
import { EMOTION_MAP } from "@/lib/mood/types";
import type { MoodEntry } from "@/lib/mood/types";
import type { RewardRecord } from "@/lib/profile/journey";
import { cn } from "@/lib/utils";
import {
  processStoryPhoto,
  probeVideoFile,
  validateImageFile,
  validateVideoFile,
} from "@/lib/profile/media";
import type { CreateStoryInput, LocalVideo } from "@/lib/profile/storyService";
import type { BloomAccent, Milestone, StoryKind, StoryVisibility } from "@/lib/profile/types";
import type { StoryAudience } from "@/lib/stories/types";
import heroWindow from "@/assets/mood/hero-window.jpg";
import flowerBranchArt from "@/assets/mood/flower-branch.jpg";
import mountainLakeArt from "@/assets/mood/mountain-lake.jpg";
import duskArt from "@/assets/home/window-dusk.jpg";
import { toast } from "sonner";

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

export function StoryCreator({
  userId,
  defaultAccent,
  defaultVisibility,
  defaultAudience,
  moodEntries,
  rewards,
  milestones,
  initialSource = null,
  initialMilestone = null,
  initialReward = null,
  onPublish,
  onClose,
}: {
  userId: string;
  defaultAccent: BloomAccent;
  defaultVisibility: StoryVisibility;
  defaultAudience: StoryAudience;
  moodEntries: MoodEntry[];
  rewards: RewardRecord[];
  milestones: Milestone[];
  initialSource?: { kind: "mood" | "reflection"; id: string } | null;
  initialMilestone?: Milestone | null;
  initialReward?: RewardRecord | null;
  onPublish: (input: CreateStoryInput) => Promise<void>;
  onClose: () => void;
}) {
  const [editorSource, setEditorSource] = useState<EditorSource | null>(null);
  const [editorDraft, setEditorDraft] = useState<EditorInitialState | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [backgroundsOpen, setBackgroundsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(() => {
    const d = editorDraftStore.read();
    return d && d.userId === userId ? d : null;
  });

  const photoRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLInputElement | null>(null);
  const sourceApplied = useRef(false);

  const reflections = useMemo(
    () => moodEntries.filter((e) => e.note && e.note.trim().length > 0),
    [moodEntries],
  );

  /* deep-link from Mood: "share as story" opens the editor pre-filled */
  useEffect(() => {
    if (!initialSource || sourceApplied.current) return;
    const entry = moodEntries.find((e) => e.id === initialSource.id);
    if (!entry) return;
    sourceApplied.current = true;
    if (initialSource.kind === "reflection") openReflection(entry);
    else openMood(entry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSource, moodEntries]);

  /* milestone / reward share shortcuts open the editor pre-filled */
  const shareApplied = useRef(false);
  useEffect(() => {
    if (shareApplied.current || editorSource) return;
    if (initialMilestone) {
      shareApplied.current = true;
      setEditorSource(shareSourceForMilestone(initialMilestone));
    } else if (initialReward) {
      shareApplied.current = true;
      setEditorSource(shareSourceForReward(initialReward));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMilestone, initialReward]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !editorSource && !cameraOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editorSource, cameraOpen, onClose]);

  /* ------------------------------- sources ------------------------------ */

  const openMood = useCallback((entry: MoodEntry) => {
    const primary = entry.emotions[0] ?? "neutral";
    const meta = EMOTION_MAP[primary];
    setEditorSource({
      base: "background",
      backgroundId: "moonlight",
      storyKind: "mood",
      source: { kind: "mood", id: entry.id },
      accent: meta.accent,
      captionTitle: `Mood · ${dayLabel(entry.timestamp)}`,
      captionBody:
        entry.note?.trim() || `${Math.round(entry.mood)}/10 — feeling ${meta.label.toLowerCase()}.`,
    });
  }, []);

  const openReflection = useCallback((entry: MoodEntry) => {
    const primary = entry.emotions[0] ?? "neutral";
    setEditorSource({
      base: "background",
      backgroundId: "quiet-room",
      storyKind: "reflection",
      source: { kind: "mood", id: entry.id },
      accent: EMOTION_MAP[primary].accent,
      captionTitle: `Reflection · ${dayLabel(entry.timestamp)}`,
      captionBody: entry.note?.trim() ?? "",
    });
  }, []);

  const openReward = useCallback((reward: RewardRecord) => {
    setEditorSource(shareSourceForReward(reward));
  }, []);

  const openMilestone = useCallback((milestone: Milestone) => {
    setEditorSource(shareSourceForMilestone(milestone));
  }, []);

  const openWin = useCallback(() => {
    setEditorSource({
      base: "background",
      backgroundId: "golden-hour",
      templateId: "little-win",
      storyKind: "win",
      accent: "amber",
    });
  }, []);

  const onPhotoFile = useCallback(async (file: File | null) => {
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setBusy(true);
    try {
      const processed = await processStoryPhoto(file);
      setEditorSource({
        base: "photo",
        photo: {
          dataUrl: processed.dataUrl,
          width: processed.width,
          height: processed.height,
          blob: processed.blob,
        },
        storyKind: "photo",
      });
    } catch {
      toast.error("Couldn't use that image. Try another one.");
    } finally {
      setBusy(false);
    }
  }, []);

  const onVideoFile = useCallback(async (file: File | null) => {
    if (!file) return;
    const invalid = validateVideoFile(file);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setBusy(true);
    try {
      const probe = await probeVideoFile(file);
      const video: LocalVideo = {
        previewUrl: URL.createObjectURL(file),
        width: probe.width,
        height: probe.height,
        durationMs: probe.durationMs,
        blob: file,
        contentType: file.type,
      };
      setEditorSource({
        base: "video",
        video,
        videoThumbnail: probe.thumbnail,
        storyKind: "video",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't use that video.");
    } finally {
      setBusy(false);
    }
  }, []);

  const resumeDraft = useCallback(async () => {
    const draft = pendingDraft;
    if (!draft) return;
    if (draft.source.base === "photo" && draft.source.photoDataUrl) {
      try {
        const res = await fetch(draft.source.photoDataUrl);
        const blob = await res.blob();
        setEditorSource({
          base: "photo",
          photo: {
            dataUrl: draft.source.photoDataUrl,
            width: draft.source.photoWidth,
            height: draft.source.photoHeight,
            blob,
          },
          storyKind: draft.source.storyKind,
        });
        setEditorDraft({
          elements: draft.elements,
          strokes: draft.strokes,
          filterId: draft.filterId,
          adjustments: draft.adjustments,
          captionTitle: draft.captionTitle,
          captionBody: draft.captionBody,
          altText: draft.altText,
        });
        setPendingDraft(null);
        return;
      } catch {
        toast.error("That draft's photo is gone — starting fresh.");
      }
    }
    // Background draft: fully restorable.
    setEditorSource({
      base: "background",
      backgroundId: draft.source.backgroundId,
      storyKind: draft.source.storyKind,
    });
    setEditorDraft({
      elements: draft.elements,
      strokes: draft.strokes,
      filterId: draft.filterId,
      adjustments: draft.adjustments,
      captionTitle: draft.captionTitle,
      captionBody: draft.captionBody,
      altText: draft.altText,
    });
    setPendingDraft(null);
  }, [pendingDraft]);

  const publish = useCallback(
    async (input: CreateStoryInput) => {
      await onPublish(input);
      // Revoke any object URLs we minted for the session.
      if (editorSource?.base === "video" && editorSource.video) {
        URL.revokeObjectURL(editorSource.video.previewUrl);
      }
      setEditorSource(null);
      setEditorDraft(null);
      onClose();
    },
    [onPublish, editorSource, onClose],
  );

  /* ------------------------------ editor -------------------------------- */
  if (editorSource) {
    return (
      <StoryEditor
        source={editorSource}
        initialState={editorDraft}
        userId={userId}
        accent={defaultAccent}
        defaultVisibility={defaultVisibility}
        defaultAudience={defaultAudience}
        onPublish={publish}
        onClose={() => {
          if (editorSource.base === "video" && editorSource.video) {
            URL.revokeObjectURL(editorSource.video.previewUrl);
          }
          setEditorSource(null);
          setEditorDraft(null);
        }}
      />
    );
  }

  /* ------------------------------ picker -------------------------------- */
  const quickModes: {
    id: string;
    label: string;
    hint: string;
    icon: typeof Camera;
    art: string;
  }[] = [
    { id: "camera", label: "Camera", hint: "Capture now", icon: Camera, art: heroWindow },
    {
      id: "photo",
      label: "Photo",
      hint: "From your gallery",
      icon: ImageIcon,
      art: flowerBranchArt,
    },
    {
      id: "video",
      label: "Video",
      hint: "Up to a minute",
      icon: Clapperboard,
      art: mountainLakeArt,
    },
    { id: "text", label: "Text", hint: "Words, beautifully", icon: Type, art: duskArt },
  ];

  return (
    <div
      className="bstory fixed inset-0 z-[88] flex flex-col bg-background"
      role="dialog"
      aria-label="Create a story"
    >
      <div className="mx-auto flex h-full w-full max-w-[560px] flex-col">
        <div className="flex items-center justify-between px-5 pt-[max(16px,env(safe-area-inset-top))]">
          <div>
            <h2 className="display text-[22px]">New story</h2>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              A little moment from your life.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close story creator"
            className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
          {pendingDraft ? (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/60 px-4 py-3">
              <p className="text-[13px] text-muted-foreground">You have an unfinished story.</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    editorDraftStore.clear();
                    setPendingDraft(null);
                  }}
                  aria-label="Discard draft"
                  className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:text-rose"
                >
                  <Trash2 className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void resumeDraft()}
                  className="bsheet-primary h-9 px-4 text-[12.5px]"
                >
                  Resume
                </button>
              </div>
            </div>
          ) : null}

          {/* quick modes */}
          <div className="grid grid-cols-2 gap-2.5">
            {quickModes.map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={busy}
                onClick={() => {
                  if (m.id === "camera") setCameraOpen(true);
                  else if (m.id === "photo") photoRef.current?.click();
                  else if (m.id === "video") videoRef.current?.click();
                  else setBackgroundsOpen(true);
                }}
                className="sc-mode-tile disabled:opacity-60"
              >
                <img src={m.art} alt="" loading="lazy" decoding="async" />
                <span className="grid size-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur-md">
                  <m.icon className="size-4" strokeWidth={1.8} aria-hidden />
                </span>
                <span className="text-[14px] font-semibold text-white">{m.label}</span>
                <span className="text-[11.5px] text-white/70">{busy ? "Preparing…" : m.hint}</span>
              </button>
            ))}
          </div>

          {/* backgrounds */}
          {backgroundsOpen ? (
            <section className="mt-6" aria-label="Choose a background">
              <p className="eyebrow mb-2.5">Start with a background</p>
              <div className="grid grid-cols-5 gap-2">
                {STORY_BACKGROUNDS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() =>
                      setEditorSource({ base: "background", backgroundId: b.id, storyKind: "text" })
                    }
                    aria-label={`${b.name} background`}
                    title={b.name}
                    className="group flex flex-col items-center gap-1.5"
                  >
                    <span
                      className="block aspect-[9/14] w-full rounded-xl border border-border transition-transform group-active:scale-95"
                      style={{ background: b.css }}
                    />
                    <span className="text-[10px] text-muted-foreground">{b.name}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {/* templates */}
          <section className="mt-6" aria-label="Story templates">
            <div className="mb-2.5 flex items-baseline justify-between">
              <p className="eyebrow">Templates</p>
              <button
                type="button"
                onClick={openWin}
                className="inline-flex items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
              >
                <Sprout className="size-3.5" aria-hidden /> Quick win
              </button>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {STORY_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    setEditorSource({
                      base: "background",
                      backgroundId: t.backgroundId,
                      templateId: t.id,
                      storyKind: "text",
                    })
                  }
                  className="group w-[128px] shrink-0 text-left"
                >
                  <span
                    className="flex aspect-[9/13] w-full flex-col justify-between overflow-hidden rounded-2xl border border-border p-3 transition-transform group-active:scale-[0.97]"
                    style={{
                      background: STORY_BACKGROUNDS.find((b) => b.id === t.backgroundId)?.css,
                    }}
                  >
                    <span className="display text-[13px] leading-snug" style={{ color: t.ink }}>
                      {t.heading}
                    </span>
                    <span className="text-[10.5px]" style={{ color: t.ink, opacity: 0.75 }}>
                      {t.hint}
                    </span>
                  </span>
                  <span className="mt-1.5 block truncate px-0.5 text-[11.5px] font-medium">
                    {t.name}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* from bloom */}
          <section className="mt-6" aria-label="From your Bloom">
            <p className="eyebrow mb-2.5">From your Bloom</p>
            <div className="flex flex-col gap-2">
              {moodEntries.length > 0 ? (
                <FromBloomRow
                  icon={CloudSun}
                  label="A recent check-in"
                  hint="Only the one you pick"
                  items={moodEntries
                    .slice(-4)
                    .reverse()
                    .map((e) => ({
                      id: e.id,
                      title: `${dayLabel(e.timestamp)} · ${EMOTION_MAP[e.emotions[0] ?? "neutral"].label} · ${Math.round(e.mood)}/10`,
                    }))}
                  onPick={(id) => {
                    const entry = moodEntries.find((e) => e.id === id);
                    if (entry) openMood(entry);
                  }}
                />
              ) : null}
              {reflections.length > 0 ? (
                <FromBloomRow
                  icon={NotebookPen}
                  label="A reflection"
                  hint="Words you already wrote"
                  items={reflections
                    .slice(-4)
                    .reverse()
                    .map((e) => ({
                      id: e.id,
                      title: (e.note ?? "").trim().slice(0, 64) || dayLabel(e.timestamp),
                    }))}
                  onPick={(id) => {
                    const entry = reflections.find((e) => e.id === id);
                    if (entry) openReflection(entry);
                  }}
                />
              ) : null}
              {rewards.length > 0 ? (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                    <Gift className="size-3.5" aria-hidden /> Rewards earned
                  </p>
                  <div className="flex gap-2.5 overflow-x-auto pb-1">
                    {rewards.slice(0, 6).map((reward) => (
                      <button
                        key={reward.id}
                        type="button"
                        onClick={() => openReward(reward)}
                        aria-label={`Share ${reward.title} as a story`}
                        className="w-[132px] shrink-0 transition-transform active:scale-[0.97]"
                      >
                        <BloomShareCard
                          eyebrow="Reward"
                          title={reward.title}
                          backgroundId="golden-hour"
                          stickerId="habit.win-1"
                          compact
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {milestones.length > 0 ? (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                    <Flag className="size-3.5" aria-hidden /> Milestones reached
                  </p>
                  <div className="flex gap-2.5 overflow-x-auto pb-1">
                    {milestones.slice(0, 6).map((milestone) => (
                      <button
                        key={milestone.id}
                        type="button"
                        onClick={() => openMilestone(milestone)}
                        aria-label={`Share ${milestone.label} as a story`}
                        className="w-[132px] shrink-0 transition-transform active:scale-[0.97]"
                      >
                        <BloomShareCard
                          eyebrow="Milestone"
                          title={milestone.label}
                          backgroundId="garden"
                          stickerId="habit.streak-1"
                          compact
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {moodEntries.length === 0 &&
              reflections.length === 0 &&
              rewards.length === 0 &&
              milestones.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-center text-[12.5px] text-muted-foreground">
                  As you log moods and earn rewards, they'll wait for you here — ready to become
                  stories, only when you choose.
                </p>
              ) : null}
            </div>
          </section>

          <p className="mt-6 text-center text-[11.5px] text-faint">
            Stories last 24 hours, then rest in your private archive.
          </p>
        </div>
      </div>

      {cameraOpen ? (
        <CameraCapture
          onPhoto={(photo) => {
            setCameraOpen(false);
            setEditorSource({
              base: "photo",
              photo: {
                dataUrl: photo.dataUrl,
                width: photo.width,
                height: photo.height,
                blob: photo.blob,
              },
              storyKind: "photo",
            });
          }}
          onVideo={(video) => {
            setCameraOpen(false);
            setEditorSource({ base: "video", video, videoThumbnail: null, storyKind: "video" });
          }}
          onClose={() => setCameraOpen(false)}
        />
      ) : null}

      <input
        ref={photoRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          e.target.value = "";
          void onPhotoFile(file);
        }}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          e.target.value = "";
          void onVideoFile(file);
        }}
      />
    </div>
  );
}

function FromBloomRow({
  icon: Icon,
  label,
  hint,
  items,
  onPick,
}: {
  icon: typeof CloudSun;
  label: string;
  hint: string;
  items: { id: string; title: string }[];
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-3 text-muted-foreground">
          <Icon className="size-4" strokeWidth={1.8} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-semibold">{label}</span>
          <span className="block text-[11.5px] text-faint">{hint}</span>
        </span>
        <ArrowRight
          className={cn("size-4 shrink-0 text-faint transition-transform", open && "rotate-90")}
          aria-hidden
        />
      </button>
      {open ? (
        <ul className="flex flex-col gap-1 border-t border-border px-2 py-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onPick(item.id)}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
              >
                <span className="truncate text-[13px]">{item.title}</span>
                <ArrowRight className="size-3.5 shrink-0 text-faint" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export type { StoryKind };
