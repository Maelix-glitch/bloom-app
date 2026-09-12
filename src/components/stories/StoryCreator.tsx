/**
 * StoryCreator — Instagram-exact "Add to story" — screenshot pixel-perfect.
 * No extra Bloom stuff, just Instagram: X | Add to story | gear, 4 cards, Recents + Select, 3-col gallery, STORY pill.
 * Templates / Effects / Music / Collage sheets are Instagram-exact dark, no crashes.
 */

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Camera, Settings, X, ChevronDown, Copy, Image as ImageIcon, Music2, Sparkles, LayoutGrid, Trash2 } from "lucide-react";

import { StoryEditor, editorDraftStore, type EditorInitialState, type EditorSource } from "./StoryEditor";
import { CameraCapture } from "./CameraCapture";
import { STORY_BACKGROUNDS, STORY_TEMPLATES } from "@/lib/stories/catalogs";
import { RestyleTray } from "./RestyleTray";
import { EffectsTray } from "./EffectsTray";
import { StoryErrorBoundary } from "./ErrorBoundary";
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
      <StoryErrorBoundary>
        <StoryEditor
          source={editorSource}
          initialState={editorDraft}
          userId={userId}
          accent={defaultAccent}
          defaultVisibility={defaultVisibility}
          defaultAudience={defaultAudience}
          onPublish={publish}
          onClose={() => {
            try {
              if (editorSource.base === "video" && editorSource.video) URL.revokeObjectURL(editorSource.video.previewUrl);
            } catch {}
            setEditorSource(null);
            setEditorDraft(null);
          }}
        />
      </StoryErrorBoundary>
    );
  }

  const gallery = useMemo(() => {
    const bgs = STORY_BACKGROUNDS.filter((b) => b.id.startsWith("ig-"));
    return [{ id: "camera", type: "camera" as const }, ...bgs.map((bg) => ({ id: bg.id, type: "bg" as const, bg }))];
  }, []);

  return (
    <StoryErrorBoundary>
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

      {/* Mode cards — IG exact Drafts / Templates / Effects / Collage from screenshot */}
      <div className="flex gap-3 overflow-x-auto px-3 pb-4 shrink-0 scrollbar-none">
        <button
          type="button"
          onClick={() => {
            if (pendingDraft) void resumeDraft();
            else toast("No drafts");
          }}
          className="flex h-[92px] w-[92px] shrink-0 flex-col items-center justify-center gap-2 rounded-[18px] bg-[#1c1c1e] border border-[#2c2c2e] active:scale-[0.96] transition-transform"
        >
          <span className="grid size-9 place-items-center rounded-lg bg-[#2c2c2e] border border-dashed border-white/20">
            <span className="text-[20px]">⊕</span>
          </span>
          <span className="text-[13px] font-medium">Drafts</span>
        </button>

        <button
          type="button"
          onClick={() => setSheet("templates")}
          className="flex h-[92px] w-[92px] shrink-0 flex-col items-center justify-center gap-2 rounded-[18px] bg-[#1c1c1e] border border-[#2c2c2e] active:scale-[0.96] transition-transform"
        >
          <span className="flex items-center justify-center">
            <span className="size-7 rounded-full bg-[#feda75] grid place-items-center text-[10px] -mr-1.5 border-2 border-[#1c1c1e]">A</span>
            <span className="size-7 rounded-full bg-[#fa7e1e] grid place-items-center text-[10px] -mr-1.5 border-2 border-[#1c1c1e]">B</span>
            <span className="size-7 rounded-full bg-[#d62976] grid place-items-center text-[10px] border-2 border-[#1c1c1e]">✨</span>
          </span>
          <span className="text-[13px] font-medium">Templates</span>
        </button>

        <button
          type="button"
          onClick={() => setSheet("effects")}
          className="flex h-[92px] w-[92px] shrink-0 flex-col items-center justify-center gap-2 rounded-[18px] bg-[#1c1c1e] border border-[#2c2c2e] active:scale-[0.96] transition-transform"
        >
          <span className="relative grid size-9 place-items-center rounded-lg bg-[#2c2c2e] overflow-hidden">
            <span className="text-[18px]">🤠</span>
          </span>
          <span className="text-[13px] font-medium">Effects</span>
        </button>

        <button
          type="button"
          onClick={() => setSheet("collage")}
          className="flex h-[92px] w-[92px] shrink-0 flex-col items-center justify-center gap-2 rounded-[18px] bg-[#1c1c1e] border border-[#2c2c2e] active:scale-[0.96] transition-transform"
        >
          <span className="grid size-9 place-items-center rounded-lg bg-[#2c2c2e] overflow-hidden">
            <span className="text-[18px]">👩‍🎤</span>
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
                  try {
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
                  } catch (e) {
                    console.error(e);
                    toast.error("Couldn't open editor");
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

      {/* Bottom nav — POST STORY REEL LIVE — IG exact from screenshot */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 flex flex-col items-center gap-3 pb-[max(12px,env(safe-area-inset-bottom))] bg-gradient-to-t from-black via-black/80 to-transparent pt-8">
        <div className="pointer-events-auto flex items-center gap-6">
          <button type="button" className="text-[14px] tracking-[0.15em] text-[#737373] font-medium">
            POST
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                if (selectMode && selectedIds.size > 0) {
                  const arr = Array.from(selectedIds);
                  const first = arr[0] ?? "ig-black";
                  setEditorSource({ base: "background", backgroundId: first, storyKind: "text" });
                } else {
                  setEditorSource({ base: "background", backgroundId: "ig-black", storyKind: "text" });
                }
              } catch {
                toast.error("Couldn't open editor");
              }
            }}
            className="text-[15px] tracking-[0.15em] text-white font-bold"
          >
            STORY
          </button>
          <button type="button" className="text-[14px] tracking-[0.15em] text-[#737373] font-medium">
            REEL
          </button>
          <button type="button" className="text-[14px] tracking-[0.15em] text-[#737373] font-medium">
            LIVE
          </button>
        </div>
      </div>

      <button type="button" onClick={() => photoRef.current?.click()} className="fixed bottom-0 left-4 mb-[max(48px,env(safe-area-inset-bottom))] grid size-10 place-items-center rounded-full bg-[#1c1c1e] border border-[#2c2c2e] text-white">
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

      {/* Effects sheet — IG exact Effects (face filters) + Restyle toggle */}
      {sheet === "effects" && (
        <EffectsTray
          onPick={(effect) => {
            setSheet(null);
            setEditorSource({ base: "background", backgroundId: "ig-black", storyKind: "text" });
            toast(`Effect: ${effect.name} — try in camera`);
          }}
          onClose={() => setSheet(null)}
        />
      )}

      {/* Music sheet — IG exact */}
      {sheet === "music" && (
        <div className="fixed inset-0 z-[90] flex flex-col justify-end bg-black/70">
          <div className="flex max-h-[80vh] w-full flex-col rounded-t-[16px] bg-[#121212] border-t border-[#262626]">
            <div className="flex flex-col items-center px-4 py-3 border-b border-[#262626]">
              <div className="h-1 w-9 rounded-full bg-[#363636] mb-3" />
              <div className="flex w-full items-center justify-between">
                <span className="text-[16px] font-semibold text-white">Music</span>
                <button type="button" onClick={() => setSheet(null)} className="grid size-8 place-items-center rounded-full bg-[#262626] text-white">
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto p-4">
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-4">
                {["For you", "Trending", "Chill", "Love", "Party", "Focus"].map((c, i) => (
                  <span
                    key={c}
                    className={cn(
                      "shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium border",
                      i === 0 ? "bg-white text-black border-white" : "bg-[#262626] text-white border-[#363636]",
                    )}
                  >
                    {c}
                  </span>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                {[
                  { title: "Die With A Smile", artist: "Lady Gaga, Bruno Mars", color: "#feda75" },
                  { title: "APT.", artist: "ROSE, Bruno Mars", color: "#fa7e1e" },
                  { title: "Espresso", artist: "Sabrina Carpenter", color: "#d62976" },
                  { title: "Birds of a Feather", artist: "Billie Eilish", color: "#962fbf" },
                  { title: "West Coast", artist: "Lana Del Rey • 4:16", color: "#4f5bd5" },
                  { title: "Reflections", artist: "The Neighbourhood • 4:04", color: "#0095f6" },
                ].map((s) => (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => {
                      setSheet(null);
                      setEditorSource({ base: "background", backgroundId: "ig-black", storyKind: "text" });
                    }}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[#1e1e1e] text-left active:scale-[0.98] transition-transform"
                  >
                    <span className="size-12 rounded-lg grid place-items-center text-white font-bold text-[10px] shrink-0" style={{ background: s.color }}>
                      ♪
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-[14px] font-semibold text-white">{s.title}</span>
                      <span className="block truncate text-[12px] text-[#a8a8a8]">{s.artist}</span>
                    </span>
                    <span className="size-8 rounded-full border border-[#363636] grid place-items-center text-white">
                      <Music2 className="size-4" />
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
          <div className="flex max-h-[75vh] w-full flex-col rounded-t-[16px] bg-[#121212] border-t border-[#262626]">
            <div className="flex flex-col items-center px-4 py-3 border-b border-[#262626]">
              <div className="h-1 w-9 rounded-full bg-[#363636] mb-3" />
              <div className="flex w-full items-center justify-between">
                <span className="text-[16px] font-semibold text-white">Collage</span>
                <button type="button" onClick={() => setSheet(null)} className="grid size-8 place-items-center rounded-full bg-[#262626] text-white">
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3 overflow-y-auto">
              {[
                { id: "2-split", label: "2 vertical", icon: "▥" },
                { id: "2-horiz", label: "2 horizontal", icon: "▤" },
                { id: "3-grid", label: "3 grid", icon: "▦" },
                { id: "4-grid", label: "4 grid", icon: "▩" },
                { id: "big-small", label: "Big + small", icon: "◧" },
                { id: "3-vertical", label: "3 vertical", icon: "▧" },
              ].map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    setSheet(null);
                    setEditorSource({ base: "background", backgroundId: "ig-black", storyKind: "text" });
                  }}
                  className="aspect-[4/3] rounded-[12px] bg-[#1e1e1e] border border-[#2c2c2e] flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <span className="text-[24px] text-white">{l.icon}</span>
                  <span className="text-[12px] text-[#a8a8a8]">{l.label}</span>
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
    </StoryErrorBoundary>
  );
}

export type { StoryKind };
