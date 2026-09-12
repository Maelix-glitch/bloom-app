/**
 * StoryCreator — Instagram-exact "Add to story" — screenshot pixel-perfect.
 * No extra Bloom stuff, just Instagram: X | Add to story | gear, 4 cards, Recents + Select, 3-col gallery, STORY pill.
 * Templates / Effects / Music / Collage sheets are Instagram-exact dark, no crashes.
 */

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Camera, Settings, X, ChevronDown, Copy, Image as ImageIcon, Music2, Sparkles, LayoutGrid, Trash2 } from "lucide-react";

import { StoryEditor, editorDraftStore, type EditorInitialState, type EditorSource } from "./StoryEditor";
import { CameraCapture } from "./CameraCapture";
import { STORY_BACKGROUNDS, STORY_TEMPLATES, STORY_FILTERS } from "@/lib/stories/catalogs";
import { cn } from "@/lib/utils";
import { processStoryPhoto, validateImageFile } from "@/lib/profile/media";
import type { CreateStoryInput } from "@/lib/profile/storyService";
import type { BloomAccent, Milestone, StoryKind, StoryVisibility } from "@/lib/profile/types";
import type { StoryAudience } from "@/lib/stories/types";
import type { MoodEntry } from "@/lib/mood/types";
import type { RewardRecord } from "@/lib/profile/journey";
import { toast } from "sonner";

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
  const [sheet, setSheet] = useState<"templates" | "effects" | "music" | "collage" | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingDraft, setPendingDraft] = useState(() => {
    try {
      const d = editorDraftStore.read();
      return d && d.userId === userId ? d : null;
    } catch {
      return null;
    }
  });

  const photoRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !editorSource && !cameraOpen && !sheet) onClose();
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
    try {
      const processed = await processStoryPhoto(file);
      setEditorSource({
        base: "photo",
        photo: { dataUrl: processed.dataUrl, width: processed.width, height: processed.height, blob: processed.blob },
        storyKind: "photo",
      });
    } catch {
      toast.error("Couldn't use image");
    }
  }, []);

  const resumeDraft = useCallback(async () => {
    const draft = pendingDraft;
    if (!draft) return;
    try {
      if (draft.source.base === "photo" && draft.source.photoDataUrl) {
        const res = await fetch(draft.source.photoDataUrl);
        const blob = await res.blob();
        setEditorSource({
          base: "photo",
          photo: { dataUrl: draft.source.photoDataUrl, width: draft.source.photoWidth, height: draft.source.photoHeight, blob },
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
      }
      setEditorSource({ base: "background", backgroundId: draft.source.backgroundId, storyKind: draft.source.storyKind });
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
    } catch {
      toast.error("Draft expired");
    }
  }, [pendingDraft]);

  const publish = useCallback(
    async (input: CreateStoryInput) => {
      await onPublish(input);
      if (editorSource?.base === "video" && editorSource.video) URL.revokeObjectURL(editorSource.video.previewUrl);
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
          if (editorSource.base === "video" && editorSource.video) URL.revokeObjectURL(editorSource.video.previewUrl);
          setEditorSource(null);
          setEditorDraft(null);
        }}
      />
    );
  }

  const gallery = useMemo(() => {
    const bgs = STORY_BACKGROUNDS.filter((b) => b.id.startsWith("ig-"));
    return [{ id: "camera", type: "camera" as const }, ...bgs.map((bg) => ({ id: bg.id, type: "bg" as const, bg }))];
  }, []);

  return (
    <div className="fixed inset-0 z-[88] flex flex-col bg-black text-white" role="dialog" aria-label="Add to story">
      {/* Top */}
      <div className="flex items-center justify-between px-4 pt-[max(10px,env(safe-area-inset-top))] pb-3 shrink-0">
        <button type="button" onClick={onClose} className="grid size-8 place-items-center text-white">
          <X className="size-7" strokeWidth={2.2} />
        </button>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em]">Add to story</h1>
        <button type="button" className="grid size-8 place-items-center text-white">
          <Settings className="size-6" strokeWidth={2} />
        </button>
      </div>

      {/* Mode cards — IG exact 4 dark rounded-20 */}
      <div className="flex gap-3 overflow-x-auto px-3 pb-4 shrink-0 scrollbar-none">
        <button
          type="button"
          onClick={() => setSheet("templates")}
          className="flex h-[92px] w-[92px] shrink-0 flex-col items-center justify-center gap-2 rounded-[18px] bg-[#1c1c1e] border border-[#2c2c2e] active:scale-[0.96] transition-transform"
        >
          <span className="flex items-center justify-center">
            <span className="size-7 rounded-full bg-[#feda75] grid place-items-center text-[12px] -mr-1.5 border-2 border-[#1c1c1e]">A</span>
            <span className="size-7 rounded-full bg-[#fa7e1e] grid place-items-center text-[12px] -mr-1.5 border-2 border-[#1c1c1e]">B</span>
            <span className="size-7 rounded-full bg-[#d62976] grid place-items-center text-[12px] border-2 border-[#1c1c1e]">C</span>
          </span>
          <span className="text-[13px] font-medium">Templates</span>
        </button>

        <button
          type="button"
          onClick={() => setSheet("effects")}
          className="flex h-[92px] w-[92px] shrink-0 flex-col items-center justify-center gap-2 rounded-[18px] bg-[#1c1c1e] border border-[#2c2c2e] active:scale-[0.96] transition-transform"
        >
          <span className="relative grid size-9 place-items-center rounded-full bg-[#2c2c2e] text-[20px]">✨</span>
          <span className="text-[13px] font-medium">Effects</span>
        </button>

        <button
          type="button"
          onClick={() => setSheet("music")}
          className="flex h-[92px] w-[92px] shrink-0 flex-col items-center justify-center gap-2 rounded-[18px] bg-[#1c1c1e] border border-[#2c2c2e] active:scale-[0.96] transition-transform"
        >
          <span className="grid size-9 place-items-center rounded-full bg-[#2c2c2e]">
            <Music2 className="size-5" />
          </span>
          <span className="text-[13px] font-medium">Music</span>
        </button>

        <button
          type="button"
          onClick={() => setSheet("collage")}
          className="flex h-[92px] w-[92px] shrink-0 flex-col items-center justify-center gap-2 rounded-[18px] bg-[#1c1c1e] border border-[#2c2c2e] active:scale-[0.96] transition-transform"
        >
          <span className="grid size-9 place-items-center rounded-lg bg-[#2c2c2e]">
            <LayoutGrid className="size-5" />
          </span>
          <span className="text-[13px] font-medium">Collage</span>
        </button>
      </div>

      {/* Recents */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button type="button" className="flex items-center gap-1">
          <span className="text-[18px] font-semibold">Recents</span>
          <ChevronDown className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => setSelectMode((v) => !v)}
          className={cn(
            "flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium border",
            selectMode ? "bg-white text-black border-white" : "bg-[#2a2a2a] text-white border-[#3a3a3a]",
          )}
        >
          <Copy className="size-4" /> Select
        </button>
      </div>

      {/* Gallery */}
      <div className="flex-1 overflow-y-auto pb-[110px]">
        {pendingDraft ? (
          <div className="mx-3 mb-3 flex items-center justify-between rounded-xl bg-[#1c1c1e] border border-[#2c2c2e] px-4 py-3">
            <span className="text-[13px] text-[#a8a8a8]">Draft</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  editorDraftStore.clear();
                  setPendingDraft(null);
                }}
                className="grid size-8 place-items-center rounded-full bg-[#2c2c2e] text-white"
              >
                <Trash2 className="size-4" />
              </button>
              <button type="button" onClick={() => void resumeDraft()} className="rounded-full bg-white px-4 h-8 text-[13px] font-semibold text-black">
                Resume
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-[2px]">
          {gallery.map((item) => {
            if (item.type === "camera") {
              return (
                <button
                  key="camera"
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  className="aspect-[3/4] bg-[#1c1c1e] flex items-center justify-center"
                >
                  <Camera className="size-7 text-white" strokeWidth={1.6} />
                </button>
              );
            }
            const bg = (item as any).bg as (typeof STORY_BACKGROUNDS)[0];
            const sel = selectedIds.has(bg.id);
            return (
              <button
                key={bg.id}
                type="button"
                onClick={() => {
                  if (selectMode) {
                    setSelectedIds((s) => {
                      const n = new Set(s);
                      if (n.has(bg.id)) n.delete(bg.id);
                      else n.add(bg.id);
                      return n;
                    });
                  } else {
                    setEditorSource({ base: "background", backgroundId: bg.id, storyKind: "text" });
                  }
                }}
                className="relative aspect-[3/4] overflow-hidden"
                style={{ background: bg.css }}
              >
                {selectMode && (
                  <span className={cn("absolute right-2 top-2 size-6 rounded-full border-2 border-white grid place-items-center", sel ? "bg-[#0095f6] border-white" : "bg-black/30")}>
                    {sel ? <span className="text-[12px]">✓</span> : null}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* STORY pill */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 flex justify-center pb-[max(18px,env(safe-area-inset-bottom))] bg-gradient-to-t from-black via-black/70 to-transparent pt-6">
        <button
          type="button"
          onClick={() => {
            if (selectMode && selectedIds.size > 0) {
              const first = Array.from(selectedIds)[0]!;
              setEditorSource({ base: "background", backgroundId: first, storyKind: "text" });
            } else {
              setEditorSource({ base: "background", backgroundId: "ig-black", storyKind: "text" });
            }
          }}
          className="pointer-events-auto rounded-full bg-[#363636] border border-[#4a4a4a] px-8 py-2.5 text-[13px] font-semibold tracking-[0.18em] text-white active:scale-95"
        >
          STORY
        </button>
      </div>

      <button type="button" onClick={() => photoRef.current?.click()} className="fixed bottom-0 left-4 mb-[max(20px,env(safe-area-inset-bottom))] grid size-10 place-items-center rounded-full bg-[#1c1c1e] border border-[#2c2c2e] text-white">
        <ImageIcon className="size-5" />
      </button>

      {/* Templates sheet — IG exact */}
      {sheet === "templates" && (
        <div className="fixed inset-0 z-[90] flex flex-col justify-end bg-black/70">
          <div className="flex max-h-[88vh] w-full flex-col rounded-t-[16px] bg-black border-t border-[#262626]">
            <div className="flex flex-col items-center px-4 py-3 border-b border-[#262626]">
              <div className="h-1 w-9 rounded-full bg-[#363636] mb-3" />
              <div className="flex w-full items-center justify-between">
                <span className="text-[16px] font-semibold">Templates</span>
                <button type="button" onClick={() => setSheet(null)} className="text-[15px] font-medium text-white">
                  <X className="size-5" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto p-3">
              <div className="grid grid-cols-2 gap-3">
                {STORY_TEMPLATES.map((t) => {
                  const bg = STORY_BACKGROUNDS.find((b) => b.id === t.backgroundId);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSheet(null);
                        setEditorSource({ base: "background", backgroundId: t.backgroundId, templateId: t.id, storyKind: "text" });
                      }}
                      className="text-left active:scale-[0.98] transition-transform"
                    >
                      <div
                        className="aspect-[9/12] w-full rounded-[16px] border border-[#262626] p-3 flex flex-col justify-between overflow-hidden"
                        style={{ background: bg?.css ?? "#000" }}
                      >
                        <span className="text-[18px] font-bold leading-tight" style={{ color: t.ink }}>
                          {t.heading}
                        </span>
                        <span className="text-[12px] leading-tight" style={{ color: t.ink, opacity: 0.8 }}>
                          {t.hint}
                        </span>
                      </div>
                      <div className="mt-2 px-1">
                        <p className="text-[13px] font-medium text-white leading-tight">{t.name}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <button type="button" className="absolute inset-0 -z-10" onClick={() => setSheet(null)} aria-label="Close" />
        </div>
      )}

      {/* Effects sheet — IG exact filters */}
      {sheet === "effects" && (
        <div className="fixed inset-0 z-[90] flex flex-col justify-end bg-black/70">
          <div className="flex max-h-[75vh] w-full flex-col rounded-t-[16px] bg-black border-t border-[#262626]">
            <div className="flex flex-col items-center px-4 py-3 border-b border-[#262626]">
              <div className="h-1 w-9 rounded-full bg-[#363636] mb-3" />
              <div className="flex w-full items-center justify-between">
                <span className="text-[16px] font-semibold">Effects</span>
                <button type="button" onClick={() => setSheet(null)} className="text-white">
                  <X className="size-5" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto p-4">
              <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#a8a8a8] mb-3">Filters</p>
              <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2">
                {STORY_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setSheet(null);
                      setEditorSource({ base: "background", backgroundId: "ig-black", storyKind: "text" });
                    }}
                    className="flex flex-col items-center gap-2 shrink-0 active:scale-95"
                  >
                    <span className="size-16 rounded-full bg-[#1c1c1e] border border-[#2c2c2e] grid place-items-center overflow-hidden">
                      <span className="size-12 rounded-full" style={{ background: f.id === "none" ? "#000" : "linear-gradient(45deg,#feda75,#d62976)", filter: f.css === "none" ? undefined : f.css }} />
                    </span>
                    <span className="text-[11px] text-white max-w-[64px] truncate">{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button type="button" className="absolute inset-0 -z-10" onClick={() => setSheet(null)} aria-label="Close" />
        </div>
      )}

      {/* Music sheet — IG exact */}
      {sheet === "music" && (
        <div className="fixed inset-0 z-[90] flex flex-col justify-end bg-black/70">
          <div className="flex max-h-[75vh] w-full flex-col rounded-t-[16px] bg-black border-t border-[#262626]">
            <div className="flex flex-col items-center px-4 py-3 border-b border-[#262626]">
              <div className="h-1 w-9 rounded-full bg-[#363636] mb-3" />
              <div className="flex w-full items-center justify-between">
                <span className="text-[16px] font-semibold">Music</span>
                <button type="button" onClick={() => setSheet(null)} className="text-white">
                  <X className="size-5" />
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-3">
                {["For you", "Trending", "Chill", "Love", "Party", "Focus"].map((c) => (
                  <span key={c} className="shrink-0 rounded-full bg-white text-black px-4 py-1.5 text-[13px] font-medium">
                    {c}
                  </span>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                {[
                  { title: "Die With A Smile", artist: "Lady Gaga, Bruno Mars" },
                  { title: "APT.", artist: "ROSE, Bruno Mars" },
                  { title: "Espresso", artist: "Sabrina Carpenter" },
                  { title: "Birds of a Feather", artist: "Billie Eilish" },
                ].map((s) => (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => {
                      setSheet(null);
                      setEditorSource({ base: "background", backgroundId: "ig-black", storyKind: "text" });
                    }}
                    className="flex items-center gap-3 rounded-xl p-2 hover:bg-[#1c1c1e] text-left"
                  >
                    <span className="size-12 rounded-md bg-[#1c1c1e] border border-[#2c2c2e] grid place-items-center">
                      <Music2 className="size-5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-[14px] font-medium text-white">{s.title}</span>
                      <span className="block truncate text-[12px] text-[#a8a8a8]">{s.artist}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button type="button" className="absolute inset-0 -z-10" onClick={() => setSheet(null)} aria-label="Close" />
        </div>
      )}

      {/* Collage sheet — IG exact */}
      {sheet === "collage" && (
        <div className="fixed inset-0 z-[90] flex flex-col justify-end bg-black/70">
          <div className="flex max-h-[70vh] w-full flex-col rounded-t-[16px] bg-black border-t border-[#262626]">
            <div className="flex flex-col items-center px-4 py-3 border-b border-[#262626]">
              <div className="h-1 w-9 rounded-full bg-[#363636] mb-3" />
              <div className="flex w-full items-center justify-between">
                <span className="text-[16px] font-semibold">Collage</span>
                <button type="button" onClick={() => setSheet(null)} className="text-white">
                  <X className="size-5" />
                </button>
              </div>
            </div>
            <div className="p-4 grid grid-cols-3 gap-3">
              {[
                "M1:1",
                "M1:2",
                "M2:1",
                "M2:2",
                "M3:1",
                "M1:3",
              ].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    setSheet(null);
                    setEditorSource({ base: "background", backgroundId: "ig-black", storyKind: "text" });
                  }}
                  className="aspect-square rounded-xl bg-[#1c1c1e] border border-[#2c2c2e] grid place-items-center active:scale-95"
                >
                  <span className="text-[12px] text-[#a8a8a8]">{l}</span>
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="absolute inset-0 -z-10" onClick={() => setSheet(null)} aria-label="Close" />
        </div>
      )}

      {cameraOpen && (
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
      )}

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
    </div>
  );
}

export type { StoryKind };
