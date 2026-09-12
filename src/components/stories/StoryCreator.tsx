/**
 * StoryCreator — Instagram-exact "Add to story" screen.
 * Matches screenshot: X | Add to story | Settings gear
 * Row: Templates / Effects / Music / Collage dark cards
 * Recents dropdown + Select pill, 3-col gallery with camera tile first, STORY button bottom.
 * Templates expanded to 25 IG aesthetic.
 */

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  Camera,
  Settings,
  X,
  ChevronDown,
  Copy,
  Image as ImageIcon,
  Music2,
  Sparkles,
  LayoutGrid,
  Trash2,
} from "lucide-react";

import { StoryEditor, editorDraftStore, type EditorInitialState, type EditorSource } from "./StoryEditor";
import { CameraCapture } from "./CameraCapture";
import { STORY_BACKGROUNDS, STORY_TEMPLATES, STORY_FILTERS } from "@/lib/stories/catalogs";
import { cn } from "@/lib/utils";
import { processStoryPhoto, probeVideoFile, validateImageFile, validateVideoFile } from "@/lib/profile/media";
import type { CreateStoryInput, LocalVideo } from "@/lib/profile/storyService";
import type { BloomAccent, Milestone, StoryKind, StoryVisibility } from "@/lib/profile/types";
import type { StoryAudience } from "@/lib/stories/types";
import type { MoodEntry } from "@/lib/mood/types";
import type { RewardRecord } from "@/lib/profile/journey";
import { EMOTION_MAP } from "@/lib/mood/types";
import { shareSourceForMilestone, shareSourceForReward } from "./ShareCard";
import { toast } from "sonner";

const dayLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

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
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<"templates" | "effects" | "music" | "collage" | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(() => {
    const d = editorDraftStore.read();
    return d && d.userId === userId ? d : null;
  });

  const photoRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLInputElement | null>(null);
  const sourceApplied = useRef(false);

  useEffect(() => {
    if (!initialSource || sourceApplied.current) return;
    const entry = moodEntries.find((e) => e.id === initialSource.id);
    if (!entry) return;
    sourceApplied.current = true;
    const primary = entry.emotions[0] ?? "neutral";
    const meta = EMOTION_MAP[primary];
    setEditorSource({
      base: "background",
      backgroundId: primary === "neutral" ? "ig-black" : "ig-midnight",
      storyKind: initialSource.kind === "reflection" ? "reflection" : "mood",
      source: { kind: "mood", id: entry.id },
      accent: meta.accent,
      captionTitle: `${initialSource.kind === "reflection" ? "Reflection" : "Mood"} · ${dayLabel(entry.timestamp)}`,
      captionBody: entry.note?.trim() ?? "",
    });
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
  }, [initialMilestone, initialReward]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !editorSource && !cameraOpen && !sheet) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editorSource, cameraOpen, sheet, onClose]);

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
      toast.error("Couldn't use that image");
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
      setEditorSource({ base: "video", video, videoThumbnail: probe.thumbnail, storyKind: "video" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't use that video");
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
        toast.error("Draft photo gone");
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

  // Instagram top mode cards — exactly like screenshot
  const modeCards = [
    {
      id: "templates",
      label: "Templates",
      icon: () => (
        <div className="flex -space-x-1">
          <span className="grid size-6 place-items-center rounded-full bg-[#feda75] text-[10px]">🌸</span>
          <span className="grid size-6 place-items-center rounded-full bg-[#fa7e1e] text-[10px]">🔥</span>
          <span className="grid size-6 place-items-center rounded-full bg-[#d62976] text-[10px]">✨</span>
        </div>
      ),
    },
    {
      id: "effects",
      label: "Effects",
      icon: () => (
        <div className="relative">
          <span className="text-[28px]">🤠</span>
          <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-[#363636] text-[10px]">✨</span>
        </div>
      ),
    },
    {
      id: "music",
      label: "Music",
      icon: () => (
        <div className="relative">
          <span className="grid size-8 place-items-center rounded-full bg-[#1a1a1a] border border-[#363636] text-[16px]">💿</span>
          <span className="absolute -right-1 -top-1 text-[14px]">🎵</span>
        </div>
      ),
    },
    {
      id: "collage",
      label: "Collage",
      icon: () => (
        <div className="flex gap-0.5">
          <span className="text-[20px]">👨‍🎤</span>
          <span className="text-[20px] -ml-2">🧑‍🎤</span>
        </div>
      ),
    },
  ] as const;

  // Gallery: first is camera, rest are backgrounds + some mock recents
  const galleryItems = useMemo(() => {
    const items: { id: string; type: "camera" | "background"; bg?: (typeof STORY_BACKGROUNDS)[0] }[] = [
      { id: "camera", type: "camera" },
    ];
    // Add 20 backgrounds as recents to fill grid like screenshot
    const bgs = [...STORY_BACKGROUNDS.filter((b) => b.id.startsWith("ig-")).slice(0, 12), ...STORY_BACKGROUNDS.slice(0, 8)];
    for (const bg of bgs) {
      items.push({ id: bg.id, type: "background", bg });
    }
    return items;
  }, []);

  return (
    <div className="fixed inset-0 z-[88] flex flex-col bg-black text-white" role="dialog" aria-label="Add to story">
      <div className="flex h-full w-full flex-col">
        {/* Top bar — Instagram exact from screenshot */}
        <div className="flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3">
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center text-white">
            <X className="size-7" strokeWidth={2} />
          </button>
          <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-white">Add to story</h2>
          <button type="button" aria-label="Settings" className="grid size-8 place-items-center text-white">
            <Settings className="size-7" strokeWidth={1.8} />
          </button>
        </div>

        {/* Mode cards — Templates / Effects / Music / Collage — screenshot exact */}
        <div className="flex gap-3 overflow-x-auto px-4 pb-4 scrollbar-none">
          {modeCards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => setSheet(card.id as any)}
              className="flex h-[96px] w-[96px] shrink-0 flex-col items-center justify-center gap-2 rounded-[20px] bg-[#1e1e1e] border border-[#2a2a2a] active:scale-95 transition-transform"
            >
              <span className="grid size-10 place-items-center">
                <card.icon />
              </span>
              <span className="text-[14px] font-medium text-white">{card.label}</span>
            </button>
          ))}
        </div>

        {/* Recents header — screenshot exact */}
        <div className="flex items-center justify-between px-4 py-3">
          <button type="button" className="flex items-center gap-1 text-white">
            <span className="text-[20px] font-semibold">Recents</span>
            <ChevronDown className="size-5 text-white" />
          </button>

          <button
            type="button"
            onClick={() => setSelectMode((v) => !v)}
            className={cn(
              "flex items-center gap-2 rounded-full bg-[#2a2a2a] px-4 py-2 text-[14px] font-medium text-white border border-[#3a3a3a]",
              selectMode && "bg-white text-black border-white",
            )}
          >
            <Copy className="size-5" />
            Select
          </button>
        </div>

        {/* Gallery grid — 3 cols, camera first tile like screenshot */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-black pb-[100px]">
          {pendingDraft ? (
            <div className="mx-4 mb-3 flex items-center justify-between gap-3 rounded-xl border border-[#262626] bg-[#121212] px-4 py-3">
              <p className="text-[13px] text-[#a8a8a8]">Unfinished draft</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    editorDraftStore.clear();
                    setPendingDraft(null);
                  }}
                  className="grid size-8 place-items-center rounded-full text-[#a8a8a8]"
                >
                  <Trash2 className="size-4" />
                </button>
                <button type="button" onClick={() => void resumeDraft()} className="h-8 rounded-full bg-white px-4 text-[13px] font-semibold text-black">
                  Resume
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-[2px] bg-black">
            {galleryItems.map((item) => {
              if (item.type === "camera") {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCameraOpen(true)}
                    className="relative aspect-[3/4] bg-[#121212] flex items-center justify-center active:opacity-80 transition-opacity"
                  >
                    <Camera className="size-8 text-white" strokeWidth={1.5} />
                  </button>
                );
              }
              const bg = item.bg!;
              const isSelected = selectedIds.has(bg.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (selectMode) {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(bg.id)) next.delete(bg.id);
                        else next.add(bg.id);
                        return next;
                      });
                      return;
                    }
                    setEditorSource({ base: "background", backgroundId: bg.id, storyKind: "text" });
                  }}
                  className="relative aspect-[3/4] overflow-hidden active:opacity-80 transition-opacity"
                  style={{ background: bg.css }}
                >
                  {selectMode && isSelected ? (
                    <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-[#0095f6] border-2 border-white text-white text-[12px] font-bold">
                      ✓
                    </span>
                  ) : null}
                  {selectMode ? (
                    <span className="absolute right-2 top-2 size-6 rounded-full border-2 border-white bg-black/20" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Mock additional rows to look like screenshot has many images */}
          <div className="grid grid-cols-3 gap-[2px] mt-[2px]">
            {STORY_BACKGROUNDS.slice(0, 9).map((bg) => (
              <button
                key={`extra-${bg.id}`}
                type="button"
                onClick={() => setEditorSource({ base: "background", backgroundId: bg.id, storyKind: "text" })}
                className="aspect-[3/4] overflow-hidden"
                style={{ background: bg.css }}
              />
            ))}
          </div>
        </div>

        {/* Bottom STORY button — screenshot exact centered pill */}
        <div className="pointer-events-none fixed bottom-0 left-0 right-0 flex justify-center pb-[max(20px,env(safe-area-inset-bottom))] pt-4 bg-gradient-to-t from-black via-black/80 to-transparent">
          <button
            type="button"
            onClick={() => {
              if (selectMode && selectedIds.size > 0) {
                const first = Array.from(selectedIds)[0];
                setEditorSource({ base: "background", backgroundId: first, storyKind: "text" });
                return;
              }
              setEditorSource({ base: "background", backgroundId: "ig-black", storyKind: "text" });
            }}
            className="pointer-events-auto rounded-full bg-[#363636] px-8 py-3 text-[14px] font-semibold tracking-[0.15em] text-white border border-[#4a4a4a] active:scale-95 transition-transform"
          >
            STORY
          </button>
        </div>

        {/* Quick actions bottom left? */}
        <div className="pointer-events-none fixed bottom-0 left-4 pb-[max(24px,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            className="pointer-events-auto grid size-10 place-items-center rounded-full bg-[#1a1a1a] border border-[#363636] text-white"
          >
            <ImageIcon className="size-5" />
          </button>
        </div>
      </div>

      {/* Sheets */}
      {sheet === "templates" ? (
        <div className="fixed inset-0 z-[90] flex flex-col justify-end bg-black/60" role="dialog" aria-label="Templates">
          <div className="flex max-h-[85vh] w-full flex-col rounded-t-[20px] bg-[#121212] border-t border-[#262626]">
            <div className="flex flex-col items-center gap-3 border-b border-[#262626] px-4 py-3">
              <div className="h-1 w-10 rounded-full bg-[#363636]" />
              <div className="flex w-full items-center justify-between">
                <h3 className="text-[16px] font-semibold text-white">Templates</h3>
                <button type="button" onClick={() => setSheet(null)} className="text-[14px] font-medium text-[#0095f6]">
                  Done
                </button>
              </div>
            </div>
            <div className="overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                {STORY_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSheet(null);
                      setEditorSource({ base: "background", backgroundId: t.backgroundId, templateId: t.id, storyKind: "text" });
                    }}
                    className="flex flex-col gap-2 text-left active:scale-[0.97] transition-transform"
                  >
                    <span
                      className="flex aspect-[9/12] w-full flex-col justify-between rounded-2xl border border-[#262626] p-3"
                      style={{ background: STORY_BACKGROUNDS.find((b) => b.id === t.backgroundId)?.css }}
                    >
                      <span className="text-[14px] font-bold leading-tight" style={{ color: t.ink }}>
                        {t.heading}
                      </span>
                      <span className="text-[11px]" style={{ color: t.ink, opacity: 0.7 }}>
                        {t.hint}
                      </span>
                    </span>
                    <span className="px-1 text-[13px] font-medium text-white">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button type="button" onClick={() => setSheet(null)} className="absolute inset-0 -z-10" aria-label="Close" />
        </div>
      ) : null}

      {sheet === "effects" ? (
        <div className="fixed inset-0 z-[90] flex flex-col justify-end bg-black/60" role="dialog" aria-label="Effects">
          <div className="flex max-h-[70vh] w-full flex-col rounded-t-[20px] bg-[#121212] border-t border-[#262626]">
            <div className="flex flex-col items-center gap-3 border-b border-[#262626] px-4 py-3">
              <div className="h-1 w-10 rounded-full bg-[#363636]" />
              <div className="flex w-full items-center justify-between">
                <h3 className="text-[16px] font-semibold text-white">Effects</h3>
                <button type="button" onClick={() => setSheet(null)} className="text-[14px] font-medium text-[#0095f6]">
                  Done
                </button>
              </div>
            </div>
            <div className="overflow-y-auto p-4">
              <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
                {STORY_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setSheet(null);
                      setEditorSource({ base: "background", backgroundId: "ig-black", storyKind: "text" });
                      // filter will be applied in editor via initialState later — for now just open editor
                    }}
                    className="flex flex-col items-center gap-2 shrink-0 active:scale-95 transition-transform"
                  >
                    <span className="grid size-16 place-items-center rounded-full bg-[#1a1a1a] border border-[#262626] text-white">
                      <Sparkles className="size-6" />
                    </span>
                    <span className="text-[12px] text-white">{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button type="button" onClick={() => setSheet(null)} className="absolute inset-0 -z-10" aria-label="Close" />
        </div>
      ) : null}

      {sheet === "music" ? (
        <div className="fixed inset-0 z-[90] flex flex-col justify-end bg-black/60" role="dialog" aria-label="Music">
          <div className="flex max-h-[70vh] w-full flex-col rounded-t-[20px] bg-[#121212] border-t border-[#262626]">
            <div className="flex flex-col items-center gap-3 border-b border-[#262626] px-4 py-3">
              <div className="h-1 w-10 rounded-full bg-[#363636]" />
              <div className="flex w-full items-center justify-between">
                <h3 className="text-[16px] font-semibold text-white">Music</h3>
                <button type="button" onClick={() => setSheet(null)} className="text-[14px] font-medium text-[#0095f6]">
                  Done
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-4 gap-3">
                {["Trending", "Chill", "Love", "Party", "Focus", "Sad", "Happy", "Vibes"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setSheet(null);
                      setEditorSource({ base: "background", backgroundId: "ig-black", storyKind: "text" });
                    }}
                    className="flex flex-col items-center gap-2 rounded-xl bg-[#1a1a1a] border border-[#262626] p-3 active:scale-95"
                  >
                    <span className="grid size-10 place-items-center rounded-full bg-[#262626] text-white">
                      <Music2 className="size-5" />
                    </span>
                    <span className="text-[12px] text-white">{m}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button type="button" onClick={() => setSheet(null)} className="absolute inset-0 -z-10" aria-label="Close" />
        </div>
      ) : null}

      {sheet === "collage" ? (
        <div className="fixed inset-0 z-[90] flex flex-col justify-end bg-black/60" role="dialog" aria-label="Collage">
          <div className="flex max-h-[70vh] w-full flex-col rounded-t-[20px] bg-[#121212] border-t border-[#262626]">
            <div className="flex flex-col items-center gap-3 border-b border-[#262626] px-4 py-3">
              <div className="h-1 w-10 rounded-full bg-[#363636]" />
              <div className="flex w-full items-center justify-between">
                <h3 className="text-[16px] font-semibold text-white">Collage</h3>
                <button type="button" onClick={() => setSheet(null)} className="text-[14px] font-medium text-[#0095f6]">
                  Done
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSheet(null);
                      setEditorSource({ base: "background", backgroundId: "ig-black", storyKind: "text" });
                    }}
                    className="aspect-[4/3] rounded-xl bg-[#1a1a1a] border border-[#262626] grid place-items-center active:scale-95"
                  >
                    <LayoutGrid className="size-8 text-[#a8a8a8]" />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button type="button" onClick={() => setSheet(null)} className="absolute inset-0 -z-10" aria-label="Close" />
        </div>
      ) : null}

      {cameraOpen ? (
        <CameraCapture
          onPhoto={(photo) => {
            setCameraOpen(false);
            setEditorSource({
              base: "photo",
              photo: { dataUrl: photo.dataUrl, width: photo.width, height: photo.height, blob: photo.blob },
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

export type { StoryKind };
