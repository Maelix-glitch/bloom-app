/**
 * StoryCreator — Instagram-exact creation entry.
 * Dark full-screen (#000) like Instagram's story creation, with quick modes,
 * backgrounds, templates, and Bloom sources. Everything lands in StoryEditor.
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
  Settings,
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

  useEffect(() => {
    if (!initialSource || sourceApplied.current) return;
    const entry = moodEntries.find((e) => e.id === initialSource.id);
    if (!entry) return;
    sourceApplied.current = true;
    if (initialSource.kind === "reflection") openReflection(entry);
    else openMood(entry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSource, moodEntries]);

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
      if (editorSource?.base === "video" && editorSource.video) {
        URL.revokeObjectURL(editorSource.video.previewUrl);
      }
      setEditorSource(null);
      setEditorDraft(null);
      onClose();
    },
    [onPublish, editorSource, onClose],
  );

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
      hint: "From gallery",
      icon: ImageIcon,
      art: flowerBranchArt,
    },
    {
      id: "video",
      label: "Video",
      hint: "Up to 1 min",
      icon: Clapperboard,
      art: mountainLakeArt,
    },
    { id: "text", label: "Text", hint: "Aa", icon: Type, art: duskArt },
  ];

  return (
    <div
      className="fixed inset-0 z-[88] flex flex-col bg-black text-white"
      role="dialog"
      aria-label="Create a story"
    >
      <div className="mx-auto flex h-full w-full max-w-[560px] flex-col">
        {/* Instagram top bar */}
        <div className="flex items-center justify-between px-4 pt-[max(14px,env(safe-area-inset-top))] pb-3 border-b border-[#262626]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-full text-white hover:bg-white/10 transition-colors"
          >
            <X className="size-6" />
          </button>
          <h2 className="text-[16px] font-semibold tracking-[0.01em]">New story</h2>
          <button
            type="button"
            aria-label="Settings"
            className="grid size-8 place-items-center rounded-full text-white hover:bg-white/10 transition-colors"
          >
            <Settings className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-4 bg-black">
          {pendingDraft ? (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#262626] bg-[#121212] px-4 py-3">
              <p className="text-[13px] text-[#a8a8a8]">Unfinished story draft</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    editorDraftStore.clear();
                    setPendingDraft(null);
                  }}
                  aria-label="Discard draft"
                  className="grid size-8 place-items-center rounded-full text-[#a8a8a8] hover:text-white transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void resumeDraft()}
                  className="h-8 rounded-full bg-white px-4 text-[13px] font-semibold text-black"
                >
                  Resume
                </button>
              </div>
            </div>
          ) : null}

          {/* Instagram quick modes - dark cards */}
          <div className="grid grid-cols-2 gap-3">
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
                className="relative flex min-h-[140px] flex-col justify-end gap-1 overflow-hidden rounded-2xl border border-[#262626] bg-[#121212] p-3 text-left transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                <img src={m.art} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <span className="relative grid size-8 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md">
                  <m.icon className="size-4" strokeWidth={1.8} aria-hidden />
                </span>
                <span className="relative text-[15px] font-semibold text-white">{m.label}</span>
                <span className="relative text-[12px] text-white/70">{busy ? "Preparing…" : m.hint}</span>
              </button>
            ))}
          </div>

          {backgroundsOpen ? (
            <section className="mt-6" aria-label="Choose a background">
              <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#a8a8a8]">Background</p>
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
                      className="block aspect-[9/14] w-full rounded-xl border border-[#262626] transition-transform group-active:scale-95"
                      style={{ background: b.css }}
                    />
                    <span className="text-[10px] text-[#a8a8a8]">{b.name}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-6" aria-label="Story templates">
            <div className="mb-3 flex items-baseline justify-between">
              <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#a8a8a8]">Templates</p>
              <button
                type="button"
                onClick={openWin}
                className="inline-flex items-center gap-1 text-[12px] text-[#a8a8a8] hover:text-white transition-colors"
              >
                <Sprout className="size-3.5" aria-hidden /> Quick win
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
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
                  className="group w-[130px] shrink-0 text-left"
                >
                  <span
                    className="flex aspect-[9/13] w-full flex-col justify-between overflow-hidden rounded-2xl border border-[#262626] p-3 transition-transform group-active:scale-[0.97]"
                    style={{
                      background: STORY_BACKGROUNDS.find((b) => b.id === t.backgroundId)?.css,
                    }}
                  >
                    <span className="text-[13px] font-semibold leading-snug" style={{ color: t.ink }}>
                      {t.heading}
                    </span>
                    <span className="text-[10.5px]" style={{ color: t.ink, opacity: 0.75 }}>
                      {t.hint}
                    </span>
                  </span>
                  <span className="mt-2 block truncate px-1 text-[12px] font-medium text-white">
                    {t.name}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-6" aria-label="From your Bloom">
            <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#a8a8a8]">From your Bloom</p>
            <div className="flex flex-col gap-2">
              {moodEntries.length > 0 ? (
                <FromBloomRow
                  icon={CloudSun}
                  label="Recent check-in"
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
                  label="Reflection"
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
                  <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-[#a8a8a8]">
                    <Gift className="size-3.5" aria-hidden /> Rewards
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
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
                  <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-[#a8a8a8]">
                    <Flag className="size-3.5" aria-hidden /> Milestones
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
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
                <p className="rounded-xl border border-dashed border-[#262626] px-4 py-5 text-center text-[13px] text-[#a8a8a8]">
                  As you log moods and earn rewards, they'll wait here — ready to become stories.
                </p>
              ) : null}
            </div>
          </section>

          <p className="mt-8 text-center text-[12px] text-[#737373]">
            Stories disappear after 24 hours
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
    <div className="overflow-hidden rounded-xl border border-[#262626] bg-[#121212]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#262626] text-[#a8a8a8]">
          <Icon className="size-4" strokeWidth={1.8} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-white">{label}</span>
          <span className="block text-[12px] text-[#a8a8a8]">{hint}</span>
        </span>
        <ArrowRight
          className={cn("size-4 shrink-0 text-[#737373] transition-transform", open && "rotate-90")}
          aria-hidden
        />
      </button>
      {open ? (
        <ul className="flex flex-col gap-1 border-t border-[#262626] px-2 py-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onPick(item.id)}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#262626] transition-colors"
              >
                <span className="truncate text-[13px] text-white">{item.title}</span>
                <ArrowRight className="size-3.5 shrink-0 text-[#737373]" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export type { StoryKind };
