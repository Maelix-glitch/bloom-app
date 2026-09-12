/**
 * StoryEditor — Instagram-exact story editor.
 * Full-screen black canvas, top bar X + tools (text, sticker, draw, filter, music, gif), bottom Your Story / Close Friends / Send.
 * Drawing: color palette + brush + eraser like IG.
 * Share: Instagram share sheet with Your Story / Close Friends.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  AtSign,
  Check,
  ImagePlay,
  Music2,
  Redo2,
  SlidersHorizontal,
  Sparkles,
  Sticker,
  Trash2,
  Type,
  Undo2,
  Volume2,
  VolumeX,
  Wand2,
  X,
  Send,
} from "lucide-react";

import { StoryCanvas, type CanvasMedia } from "./StoryCanvas";
import { ElementLayer, pointInRect } from "./ElementLayer";
import { TextTool, type TextToolValue } from "./TextTool";
import { StickerTray } from "./StickerTray";
import { InteractiveTray } from "./InteractiveTray";
import { FilterTool } from "./FilterTool";
import { RestyleTray } from "./RestyleTray";
import { GifTray, MusicTray, type PickedMusic } from "./MediaTrays";
import { DrawLayer, exportDrawing, type DrawStroke } from "./DrawLayer";
import { DRAW_COLORS, DRAW_SIZES_ROW } from "./editorBits";
import {
  ELEMENT_LIMITS,
  makeGifElement,
  makeMusicElement,
  makeStickerElement,
  makeTextElement,
  newElementId,
  sanitizeElements,
  serializeElements,
} from "@/lib/stories/elements";
import { DEFAULT_ADJUSTMENTS, STORY_TEMPLATES, backgroundById } from "@/lib/stories/catalogs";
import { recordStickerUse } from "@/lib/stories/stickers";
import type {
  StoryAdjustments,
  StoryAudience,
  StoryElement,
  StoryTextPreset,
} from "@/lib/stories/types";
import type { CreateStoryInput, LocalVideo } from "@/lib/profile/storyService";
import type { LocalImage } from "@/lib/profile/types";
import type { BloomAccent, StoryKind, StoryVisibility } from "@/lib/profile/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface EditorSource {
  base: "photo" | "video" | "background";
  photo?: LocalImage | undefined;
  video?: LocalVideo | undefined;
  videoThumbnail?: string | null | undefined;
  backgroundId?: string | undefined;
  templateId?: string | null | undefined;
  storyKind: StoryKind;
  source?: { kind: string; id: string } | null | undefined;
  captionTitle?: string | undefined;
  captionBody?: string | undefined;
  accent?: BloomAccent | undefined;
}

export interface EditorInitialState {
  elements: StoryElement[];
  strokes: DrawStroke[];
  filterId: string;
  adjustments: StoryAdjustments;
  captionTitle: string;
  captionBody: string;
  altText: string;
}

type Tool = "sticker" | "interactive" | "filter" | "restyle" | "music" | "gif" | "caption" | null;

interface Snapshot {
  elements: StoryElement[];
  strokes: DrawStroke[];
}

const DRAFT_KEY = "bloom.story.editor.draft.v2";

interface EditorDraft {
  userId: string;
  savedAt: number;
  source: {
    base: "photo" | "background";
    photoDataUrl: string | null;
    photoWidth: number;
    photoHeight: number;
    backgroundId: string;
    storyKind: StoryKind;
  };
  elements: StoryElement[];
  strokes: DrawStroke[];
  filterId: string;
  adjustments: StoryAdjustments;
  captionTitle: string;
  captionBody: string;
  altText: string;
}

export const editorDraftStore = {
  read(): EditorDraft | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as EditorDraft;
      if (!parsed || typeof parsed !== "object" || !parsed.source) return null;
      if (Date.now() - (parsed.savedAt || 0) > 7 * 86400000) return null;
      return parsed;
    } catch {
      return null;
    }
  },
  write(draft: EditorDraft): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  },
  clear(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {}
  },
};

function nextZ(elements: StoryElement[]): number {
  return elements.reduce((m, e) => Math.max(m, e.z), 0) + 1;
}

export function StoryEditor({
  source,
  initialState = null,
  userId,
  accent,
  defaultVisibility,
  defaultAudience,
  onPublish,
  onClose,
}: {
  source: EditorSource;
  initialState?: EditorInitialState | null | undefined;
  userId: string;
  accent: BloomAccent;
  defaultVisibility: StoryVisibility;
  defaultAudience: StoryAudience;
  onPublish: (input: CreateStoryInput) => Promise<void>;
  onClose: () => void;
}) {
  const template = source.templateId ? STORY_TEMPLATES.find((t) => t.id === source.templateId) ?? null : null;

  const [elements, setElements] = useState<StoryElement[]>(() => {
    if (initialState) return sanitizeElements(initialState.elements);
    const els: StoryElement[] = [];
    if (template) {
      els.push(
        makeTextElement(template.heading, {
          preset: template.preset,
          color: template.ink,
          x: 0.5,
          y: 0.3,
          z: 1,
        }),
      );
      for (const [i, stickerId] of template.stickerIds.entries()) {
        const s = makeStickerElement(stickerId, { x: 0.24 + i * 0.52, y: 0.72, z: 2 + i });
        if (s) els.push(s);
      }
    }
    if (source.captionTitle && !template) {
      els.push(
        makeTextElement(source.captionTitle, {
          preset: "classic",
          color: source.base === "background" ? backgroundById(source.backgroundId).ink : "#ffffff",
          x: 0.5,
          y: 0.4,
          z: 1,
        }),
      );
    }
    return els;
  });
  const [strokes, setStrokes] = useState<DrawStroke[]>(() => initialState?.strokes ?? []);
  const [backgroundId, setBackgroundId] = useState(source.backgroundId ?? template?.backgroundId ?? "ig-black");
  const [filterId, setFilterId] = useState(initialState?.filterId ?? "none");
  const [adjustments, setAdjustments] = useState<StoryAdjustments>(initialState?.adjustments ?? DEFAULT_ADJUSTMENTS);
  const [music, setMusic] = useState<PickedMusic | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>(null);
  const [textEditing, setTextEditing] = useState<{ elementId: string | null; initial: TextToolValue | null } | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState("#ffffff");
  const [drawSize, setDrawSize] = useState(8);
  const [drawEraser, setDrawEraser] = useState(false);
  const [captionTitle, setCaptionTitle] = useState(initialState?.captionTitle || source.captionTitle || "");
  const [captionBody, setCaptionBody] = useState(initialState?.captionBody || source.captionBody || "");
  const [altText, setAltText] = useState(initialState?.altText ?? "");
  const [visibility, setVisibility] = useState<StoryVisibility>(defaultVisibility);
  const [audience, setAudience] = useState<StoryAudience>(defaultAudience);
  const [step, setStep] = useState<"edit" | "share" | "confirm-leave">("edit");
  const [publishing, setPublishing] = useState(false);
  const [muted, setMuted] = useState(true);
  const [drag, setDrag] = useState<{ id: string; clientX: number; clientY: number } | null>(null);
  const [deleteHot, setDeleteHot] = useState(false);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const deleteRef = useRef<HTMLDivElement | null>(null);
  const draftTimer = useRef<number | undefined>(undefined);
  const gifFiles = useRef(new Map<string, { blob: Blob; contentType: string }>());
  const gifUrls = useRef<string[]>([]);

  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const [, setHistoryTick] = useState(0);

  const snapshot = useCallback(
    (): Snapshot => ({
      elements: serializeElements(elements),
      strokes: JSON.parse(JSON.stringify(strokes)) as DrawStroke[],
    }),
    [elements, strokes],
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(snapshot());
    setElements(prev.elements);
    setStrokes(prev.strokes);
    setSelectedId(null);
    setHistoryTick((t) => t + 1);
  }, [snapshot]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(snapshot());
    setElements(next.elements);
    setStrokes(next.strokes);
    setSelectedId(null);
    setHistoryTick((t) => t + 1);
  }, [snapshot]);

  const canUndo = past.current.length > 0;
  const canRedo = future.current.length > 0;

  const selected = elements.find((e) => e.id === selectedId) ?? null;

  const addElement = useCallback(
    (el: StoryElement) => {
      if (elements.length >= ELEMENT_LIMITS.maxElements) {
        toast("Too many stickers");
        return;
      }
      const placed = { ...el, x: 0.5, y: 0.42, z: nextZ(elements) };
      past.current.push(snapshot());
      future.current = [];
      setElements((prev) => [...prev, placed]);
      setSelectedId(placed.id);
      setHistoryTick((t) => t + 1);
    },
    [elements.length, snapshot],
  );

  const transformOpen = useRef(false);
  const liveTransform = useCallback(
    (id: string, t: { x: number; y: number; scale: number; rotation: number }) => {
      if (!transformOpen.current) {
        transformOpen.current = true;
        past.current.push(snapshot());
        if (past.current.length > 40) past.current.shift();
        future.current = [];
      }
      setElements((prev) => prev.map((e) => (e.id === id ? { ...e, ...t } : e)));
    },
    [snapshot],
  );

  const endTransform = useCallback(() => {
    if (!transformOpen.current) return;
    transformOpen.current = false;
    setHistoryTick((t) => t + 1);
  }, []);

  const deleteElement = useCallback(
    (id: string) => {
      past.current.push(snapshot());
      future.current = [];
      setElements((prev) => prev.filter((e) => e.id !== id));
      setSelectedId((sel) => (sel === id ? null : sel));
      setHistoryTick((t) => t + 1);
    },
    [snapshot],
  );

  const onDragState = useCallback((d: { id: string; clientX: number; clientY: number } | null) => {
    setDrag(d);
    if (!d) {
      setDeleteHot(false);
      return;
    }
    const rect = deleteRef.current?.getBoundingClientRect();
    setDeleteHot(pointInRect(d.clientX, d.clientY, rect, 20));
  }, []);

  const dragRef = useRef(drag);
  dragRef.current = drag;
  const hotRef = useRef(deleteHot);
  hotRef.current = deleteHot;

  const handleTransformEnd = useCallback(() => {
    const d = dragRef.current;
    if (d && hotRef.current) {
      deleteElement(d.id);
      setDrag(null);
      setDeleteHot(false);
      return;
    }
    endTransform();
  }, [deleteElement, endTransform]);

  const openText = useCallback(
    (existing: Extract<StoryElement, { kind: "text" }> | null) => {
      if (!existing && elements.length >= ELEMENT_LIMITS.maxElements) {
        toast("Too many layers");
        return;
      }
      setTextEditing({
        elementId: existing?.id ?? null,
        initial: existing
          ? {
              text: existing.text,
              preset: existing.preset,
              align: existing.align,
              color: existing.color,
              background: existing.background,
              opacity: existing.opacity,
              animation: existing.animation ?? "none",
            }
          : null,
      });
      setTool(null);
    },
    [elements.length],
  );

  const saveText = useCallback(
    (value: TextToolValue) => {
      setTextEditing(null);
      if (textEditing?.elementId) {
        const id = textEditing.elementId;
        past.current.push(snapshot());
        future.current = [];
        setElements((prev) =>
          prev.map((e) =>
            e.id === id && e.kind === "text"
              ? {
                  ...e,
                  text: value.text,
                  preset: value.preset as StoryTextPreset,
                  align: value.align,
                  color: value.color,
                  background: value.background,
                  opacity: value.opacity,
                  animation: value.animation,
                }
              : e,
          ),
        );
        setHistoryTick((t) => t + 1);
      } else {
        addElement(
          makeTextElement(value.text, {
            preset: value.preset,
            align: value.align,
            color: value.color,
            background: value.background,
            opacity: value.opacity,
            animation: value.animation,
          }),
        );
      }
    },
    [textEditing, snapshot, addElement],
  );

  const addStroke = useCallback(
    (stroke: DrawStroke) => {
      past.current.push(snapshot());
      future.current = [];
      setStrokes((prev) => [...prev, stroke]);
      setHistoryTick((t) => t + 1);
    },
    [snapshot],
  );

  const dirty = elements.length > 0 || strokes.length > 0 || filterId !== "none" || music !== null;

  useEffect(() => {
    if (step !== "edit") return;
    if (!dirty) return;
    if (source.base === "video") return;
    window.clearTimeout(draftTimer.current);
    draftTimer.current = window.setTimeout(() => {
      editorDraftStore.write({
        userId,
        savedAt: Date.now(),
        source: {
          base: source.base === "photo" ? "photo" : "background",
          photoDataUrl: source.photo?.dataUrl ?? null,
          photoWidth: source.photo?.width ?? 0,
          photoHeight: source.photo?.height ?? 0,
          backgroundId,
          storyKind: source.storyKind,
        },
        elements: serializeElements(elements),
        strokes,
        filterId,
        adjustments,
        captionTitle,
        captionBody,
        altText,
      });
    }, 800);
    return () => window.clearTimeout(draftTimer.current);
  }, [elements, strokes, backgroundId, filterId, adjustments, captionTitle, captionBody, altText, dirty, source, step, userId]);

  const media: CanvasMedia = useMemo(() => {
    if (source.base === "video" && source.video) {
      return { type: "video", src: source.video.previewUrl, poster: source.videoThumbnail };
    }
    if (source.base === "photo" && source.photo) {
      return { type: "image", src: source.photo.dataUrl };
    }
    return { type: "none", src: null };
  }, [source]);

  useEffect(
    () => () => {
      for (const url of gifUrls.current) URL.revokeObjectURL(url);
      gifUrls.current = [];
      gifFiles.current.clear();
    },
    [],
  );

  const publishElements = useCallback((): StoryElement[] => {
    let els = serializeElements(elements);
    const kept = new Set(els.map((e) => e.id));
    for (const e of elements) {
      if (e.kind === "gif" && !kept.has(e.id) && gifFiles.current.has(e.id)) els.push(e);
    }
    if (strokes.length > 0) {
      const rect = canvasRef.current?.getBoundingClientRect();
      const w = Math.min(720, Math.max(360, Math.round((rect?.width ?? 390) * 2)));
      const h = Math.round(w * ((rect?.height ?? 700) / Math.max(1, rect?.width ?? 390)));
      const src = exportDrawing(strokes, w, h);
      if (src) {
        els = els.filter((e) => e.kind !== "drawing");
        els.push({
          id: `drawing-${Date.now().toString(36)}`,
          kind: "drawing",
          x: 0.5,
          y: 0.5,
          scale: 1,
          rotation: 0,
          z: 999,
          src,
          width: w,
          height: h,
        });
      }
    }
    return els;
  }, [elements, strokes]);

  const publish = useCallback(async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      const els = publishElements();
      const firstText = els.find((e) => e.kind === "text");
      await onPublish({
        kind: source.storyKind,
        title: (captionTitle || (firstText?.kind === "text" ? firstText.text : "")).slice(0, 120),
        body: captionBody.slice(0, 2000),
        accent,
        atmosphere: "quiet",
        visibility,
        photo:
          source.base === "photo" && source.photo
            ? {
                dataUrl: source.photo.dataUrl,
                width: source.photo.width,
                height: source.photo.height,
                blob: source.photo.blob,
              }
            : null,
        video:
          source.base === "video" && source.video
            ? {
                previewUrl: source.video.previewUrl,
                width: source.video.width,
                height: source.video.height,
                durationMs: source.video.durationMs,
                blob: source.video.blob,
                contentType: source.video.contentType,
              }
            : null,
        source: source.source ?? null,
        elements: els,
        filterId: filterId === "none" ? null : filterId,
        adjustments: JSON.stringify(adjustments) === JSON.stringify(DEFAULT_ADJUSTMENTS) ? null : adjustments,
        backgroundId: source.base === "background" ? backgroundId : null,
        music: music
          ? {
              trackId: music.trackId,
              title: music.title,
              artist: music.artist,
              startMs: 0,
              durationMs: Math.min(music.durationMs || 15000, 60000),
              src: music.src,
            }
          : null,
        audio: music?.file ? { blob: music.file, contentType: music.file.type || "audio/mpeg" } : null,
        gifFiles: els.flatMap((e) => {
          if (e.kind !== "gif") return [];
          const file = gifFiles.current.get(e.id);
          if (!file) return [];
          return [{ elementId: e.id, blob: file.blob, contentType: file.contentType }];
        }),
        altText: altText.trim() || null,
        audience,
      });
      editorDraftStore.clear();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't share story");
    } finally {
      setPublishing(false);
    }
  }, [publishing, publishElements, onPublish, source, captionTitle, captionBody, accent, visibility, filterId, adjustments, backgroundId, music, altText, audience]);

  const requestClose = useCallback(() => {
    if (dirty && step === "edit") {
      setStep("confirm-leave");
      return;
    }
    onClose();
  }, [dirty, step, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (textEditing || tool) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (drawing) setDrawing(false);
        else if (selectedId) setSelectedId(null);
        else requestClose();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId && step === "edit") {
        e.preventDefault();
        deleteElement(selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [textEditing, tool, drawing, selectedId, step, undo, redo, requestClose, deleteElement]);

  const ink = source.base === "background" ? backgroundById(backgroundId).ink : "#ffffff";
  const canvasSize = canvasRef.current?.getBoundingClientRect();

  /* -------------------------------- share - Instagram -------------------------------- */
  if (step === "share") {
    const previewStory = { elements: publishElements() };
    return (
      <div className="fixed inset-0 z-[90] flex flex-col bg-black" role="dialog" aria-label="Share story">
        <div className="flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 border-b border-[#262626]">
          <button type="button" onClick={() => setStep("edit")} aria-label="Back" className="grid size-8 place-items-center rounded-full text-white">
            <ArrowLeft className="size-6" />
          </button>
          <p className="text-[16px] font-semibold text-white">Share</p>
          <button type="button" onClick={requestClose} aria-label="Close" className="grid size-8 place-items-center rounded-full text-white">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="relative mx-auto mt-4 aspect-[9/16] w-full max-w-[320px] flex-1 overflow-hidden rounded-xl border border-[#262626] bg-black">
            <StoryCanvas media={media} backgroundId={backgroundId} filterId={filterId} adjustments={adjustments} elements={previewStory.elements} mode="static" />
          </div>

          <div className="mx-auto flex w-full max-w-[400px] flex-col gap-4 bg-black px-4 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
            <div>
              <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#a8a8a8]">Share to</p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setVisibility("public");
                    setAudience("all");
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                    visibility === "public" && audience === "all"
                      ? "border-white bg-white text-black"
                      : "border-[#363636] bg-[#121212] text-white",
                  )}
                >
                  <span>
                    <span className="block text-[15px] font-semibold">Your story</span>
                    <span className="block text-[12px] opacity-70">Share to all followers for 24h</span>
                  </span>
                  {visibility === "public" && audience === "all" ? <Check className="size-5" /> : null}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVisibility("public");
                    setAudience("close");
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                    visibility === "public" && audience === "close"
                      ? "border-[#1DB954] bg-[#1DB954] text-white"
                      : "border-[#363636] bg-[#121212] text-white",
                  )}
                >
                  <span>
                    <span className="block text-[15px] font-semibold">Close friends</span>
                    <span className="block text-[12px] opacity-70">Only close friends see this</span>
                  </span>
                  {visibility === "public" && audience === "close" ? <Check className="size-5" /> : null}
                </button>

                <button
                  type="button"
                  onClick={() => setVisibility("private")}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                    visibility === "private" ? "border-white bg-white text-black" : "border-[#363636] bg-[#121212] text-white",
                  )}
                >
                  <span>
                    <span className="block text-[15px] font-semibold">Private</span>
                    <span className="block text-[12px] opacity-70">Only you, saved to archive</span>
                  </span>
                  {visibility === "private" ? <Check className="size-5" /> : null}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void publish()}
              disabled={publishing}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-[15px] font-semibold text-black disabled:opacity-50"
            >
              {publishing ? (
                "Sharing…"
              ) : (
                <>
                  <Send className="size-4" /> Share
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "confirm-leave") {
    return (
      <div className="fixed inset-0 z-[95] grid place-items-center bg-black/80 px-6 backdrop-blur-sm" role="alertdialog" aria-label="Discard">
        <div className="w-full max-w-[320px] rounded-2xl bg-[#262626] p-6 text-center">
          <p className="text-[18px] font-semibold text-white">Discard story?</p>
          <p className="mt-2 text-[14px] leading-relaxed text-[#a8a8a8]">If you leave, your edits won't be saved.</p>
          <div className="mt-6 flex flex-col gap-2">
            <button type="button" onClick={() => setStep("edit")} className="rounded-full bg-white py-3 text-[15px] font-semibold text-black">
              Keep editing
            </button>
            <button
              type="button"
              onClick={() => {
                editorDraftStore.clear();
                onClose();
              }}
              className="rounded-full bg-transparent py-3 text-[15px] font-semibold text-[#ff3040]"
            >
              Discard
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------------- edit - Instagram --------------------------------- */
  const topTools = [
    { id: "text", label: "Text", icon: Type },
    { id: "sticker", label: "Sticker", icon: Sticker },
    { id: "interactive", label: "Interactive", icon: SlidersHorizontal },
    { id: "draw", label: "Draw", icon: Wand2 },
    { id: "restyle", label: "Restyle", icon: Sparkles },
    { id: "filter", label: "Filter", icon: Sparkles },
    { id: "music", label: "Music", icon: Music2 },
    { id: "gif", label: "GIF", icon: ImagePlay },
  ] as const;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black" role="dialog" aria-label="Story editor">
      {/* Top bar - Instagram */}
      <div className="relative z-50 flex items-center justify-between px-3 pt-[max(10px,env(safe-area-inset-top))] pb-2">
        <button type="button" onClick={requestClose} aria-label="Close" className="grid size-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md">
          <X className="size-6" />
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Undo"
            className="grid size-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md disabled:opacity-30"
          >
            <Undo2 className="size-5" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            aria-label="Redo"
            className="grid size-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md disabled:opacity-30"
          >
            <Redo2 className="size-5" />
          </button>
          {source.base === "video" ? (
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Unmute" : "Mute"}
              className="grid size-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md"
            >
              {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setStep("share")}
          className="flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-[14px] font-semibold text-black"
        >
          Next <ArrowLeft className="size-4 rotate-180" />
        </button>
      </div>

      {/* Top tools - Instagram (sticker, text, draw etc) */}
      <div className="relative z-40 flex items-center justify-end gap-1 px-3 pb-2">
        {topTools.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              if (t.id === "text") {
                openText(null);
                return;
              }
              if (t.id === "draw") {
                setDrawing(true);
                setSelectedId(null);
                return;
              }
              setTool(t.id as Tool);
            }}
            aria-label={t.label}
            className="grid size-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md"
          >
            <t.icon className="size-5" strokeWidth={2} />
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="relative min-h-0 flex-1 bg-black">
        <div ref={canvasRef} className="absolute inset-0 overflow-hidden bg-black">
          <ElementLayer
            elements={elements}
            selectedId={drawing ? null : selectedId}
            onSelect={(id) => !drawing && setSelectedId(id)}
            onTransform={liveTransform}
            onTransformEnd={handleTransformEnd}
            onEditText={(el) => openText(el)}
            onDelete={deleteElement}
            onDragState={onDragState}
            canvasRef={canvasRef}
            disabled={drawing || textEditing !== null || tool !== null}
          >
            <StoryCanvas
              media={media}
              backgroundId={source.base === "background" ? backgroundId : null}
              filterId={filterId}
              adjustments={adjustments}
              elements={elements}
              mode="edit"
              selectedId={selectedId}
              onSelect={(id) => !drawing && setSelectedId(id)}
              muted={muted}
            />
          </ElementLayer>

          {drawing ? (
            <DrawLayer
              strokes={strokes}
              color={drawEraser ? "#000000" : drawColor}
              size={drawSize}
              opacity={drawEraser ? 1 : 0.92}
              eraser={drawEraser}
              onStroke={addStroke}
              canvasSize={{ width: canvasSize?.width ?? 390, height: canvasSize?.height ?? 700 }}
            />
          ) : null}

          {/* Delete zone - Instagram trash at bottom when dragging */}
          <div
            ref={deleteRef}
            className={cn(
              "absolute left-1/2 bottom-[100px] z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#262626] px-5 py-2.5 text-[14px] font-medium text-white transition-all",
              drag ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none",
              deleteHot && "bg-[#ff3040] scale-110",
            )}
            aria-hidden
          >
            <Trash2 className="size-5" /> {deleteHot ? "Release to delete" : "Drag here to delete"}
          </div>

          {/* Selected actions - Instagram style */}
          {selected && !drag && !drawing ? (
            <div className="absolute left-1/2 top-[80px] z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/60 p-1 backdrop-blur-md border border-white/10">
              {selected.kind === "text" ? (
                <button
                  type="button"
                  onClick={() => openText(selected)}
                  className="rounded-full px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-white/10"
                >
                  Edit
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  past.current.push(snapshot());
                  future.current = [];
                  setElements((prev) => prev.map((e) => (e.id === selected.id ? { ...e, z: nextZ(prev) } : e)));
                  setHistoryTick((t) => t + 1);
                }}
                className="rounded-full px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-white/10"
              >
                Front
              </button>
              <button
                type="button"
                onClick={() => deleteElement(selected.id)}
                aria-label="Delete"
                className="grid size-8 place-items-center rounded-full text-[#ff3040] hover:bg-white/10"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Bottom bar - Instagram Your Story / Close Friends / Send */}
      {drawing ? (
        <div className="relative z-50 flex items-center gap-2 overflow-x-auto bg-black px-4 py-3 border-t border-[#262626]">
          {DRAW_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              onClick={() => {
                setDrawColor(c);
                setDrawEraser(false);
              }}
              className={cn("size-8 shrink-0 rounded-full border-2 transition-transform", !drawEraser && drawColor === c ? "border-white scale-110" : "border-transparent")}
              style={{ background: c }}
            />
          ))}
          <span className="mx-1 h-6 w-px shrink-0 bg-[#363636]" aria-hidden />
          {DRAW_SIZES_ROW.map((s) => (
            <button
              key={s}
              type="button"
              aria-label={`Size ${s}`}
              onClick={() => setDrawSize(s)}
              className={cn("grid size-8 shrink-0 place-items-center rounded-full", drawSize === s ? "bg-white/20" : "")}
            >
              <span className="rounded-full bg-white" style={{ width: Math.min(18, 3 + s / 1.8), height: Math.min(18, 3 + s / 1.8) }} />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setDrawEraser((v) => !v)}
            aria-pressed={drawEraser}
            className={cn("ml-2 shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium", drawEraser ? "bg-white text-black" : "bg-[#262626] text-white")}
          >
            Eraser
          </button>
          <button
            type="button"
            onClick={() => setDrawing(false)}
            className="ml-auto shrink-0 rounded-full bg-white px-4 py-1.5 text-[13px] font-semibold text-black"
          >
            Done
          </button>
        </div>
      ) : (
        <div className="relative z-50 flex items-center justify-between gap-3 bg-black px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 border-t border-[#262626]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void publish()}
              disabled={publishing}
              className="flex items-center gap-2 rounded-full bg-[#1a1a1a] border border-[#363636] px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
            >
              <span className="size-6 rounded-full bg-[#363636] grid place-items-center text-[10px]">You</span>
              Your story
            </button>
            <button
              type="button"
              onClick={() => {
                setAudience("close");
                setVisibility("public");
                void publish();
              }}
              disabled={publishing}
              className="flex items-center gap-1.5 rounded-full bg-[#1DB954] px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              <span className="size-4 rounded-full bg-white/20 grid place-items-center">★</span> Close friends
            </button>
          </div>

          <button
            type="button"
            onClick={() => setStep("share")}
            className="grid size-10 place-items-center rounded-full bg-white text-black"
            aria-label="Send"
          >
            <Send className="size-5" />
          </button>
        </div>
      )}

      {/* Overlays */}
      {textEditing ? (
        <TextTool initial={textEditing.initial} defaultColor={ink} onSave={saveText} onClose={() => setTextEditing(null)} />
      ) : null}

      {tool === "sticker" ? (
        <StickerTray
          onPick={(id) => {
            const el = makeStickerElement(id, { z: nextZ(elements) });
            if (el) {
              recordStickerUse(id);
              addElement(el);
            }
            setTool(null);
          }}
          onClose={() => setTool(null)}
        />
      ) : null}

      {tool === "interactive" ? (
        <InteractiveTray
          onAdd={(el) => {
            addElement(el);
            setTool(null);
          }}
          onClose={() => setTool(null)}
        />
      ) : null}

      {tool === "filter" ? (
        <FilterTool
          preview={source.base === "photo" && source.photo ? source.photo.dataUrl : source.videoThumbnail ?? null}
          filterId={filterId}
          adjustments={adjustments}
          onFilter={setFilterId}
          onAdjustments={setAdjustments}
          onClose={() => setTool(null)}
        />
      ) : null}

      {tool === "restyle" ? (
        <RestyleTray
          onPick={(effect) => {
            // Apply restyle as filter — map to filter id if exists else use adjustments
            const mapped = (() => {
              const name = effect.id.toLowerCase();
              if (name.includes("bw") || name.includes("b-w")) return "moon";
              if (name.includes("warm")) return "warm";
              if (name.includes("dreamy") || name.includes("soft")) return "soft";
              return effect.id;
            })();
            setFilterId(mapped);
            setTool(null);
            toast(`Applied ${effect.name}`);
          }}
          onClose={() => setTool(null)}
        />
      ) : null}

      {tool === "music" ? (
        <MusicTray
          onPick={(picked) => {
            setMusic(picked);
            past.current.push(snapshot());
            future.current = [];
            setElements((prev) => {
              const without = prev.filter((e) => e.kind !== "music");
              return [
                ...without,
                makeMusicElement(
                  {
                    trackId: picked.trackId,
                    title: picked.title,
                    artist: picked.artist,
                    durationMs: picked.durationMs,
                    ...(picked.src ? { src: picked.src } : {}),
                  },
                  { z: nextZ(prev) },
                ),
              ];
            });
            setHistoryTick((t) => t + 1);
            setTool(null);
            if (picked.file) toast("Audio will upload when you share");
          }}
          onClose={() => setTool(null)}
        />
      ) : null}

      {tool === "gif" ? (
        <GifTray
          onPick={(gif, file) => {
            if (file) {
              gifUrls.current.push(gif.src);
              const el: Extract<StoryElement, { kind: "gif" }> = {
                id: newElementId(),
                kind: "gif",
                x: 0.5,
                y: 0.42,
                scale: 1,
                rotation: 0,
                z: nextZ(elements),
                gifId: gif.id.slice(0, 120),
                src: gif.src,
                width: Math.min(1200, Math.max(16, Math.round(gif.width) || 200)),
                height: Math.min(1200, Math.max(16, Math.round(gif.height) || 200)),
              };
              gifFiles.current.set(el.id, { blob: file, contentType: file.type || "image/gif" });
              addElement(el);
              setTool(null);
              return;
            }
            const el = makeGifElement(
              { gifId: gif.id, src: gif.src, still: gif.still, width: gif.width, height: gif.height },
              { z: nextZ(elements) },
            );
            if (el) addElement(el);
            else toast("Couldn't use that GIF");
            setTool(null);
          }}
          onClose={() => setTool(null)}
        />
      ) : null}

      {tool === "caption" ? (
        <div className="fixed inset-0 z-[92] flex flex-col justify-end bg-black/60" role="dialog" aria-label="Caption">
          <div className="rounded-t-[12px] bg-[#121212] border-t border-[#262626] p-4">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#363636]" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold text-white">Caption</h2>
              <button type="button" onClick={() => setTool(null)} className="text-[14px] font-medium text-[#0095f6]">
                Done
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <input
                value={captionTitle}
                onChange={(e) => setCaptionTitle(e.target.value.slice(0, 120))}
                placeholder="Add caption…"
                maxLength={120}
                className="w-full rounded-lg bg-[#262626] px-4 py-3 text-[15px] text-white outline-none placeholder:text-[#a8a8a8]"
              />
              <textarea
                value={captionBody}
                onChange={(e) => setCaptionBody(e.target.value.slice(0, 2000))}
                placeholder="More…"
                rows={3}
                maxLength={2000}
                className="w-full resize-none rounded-lg bg-[#262626] px-4 py-3 text-[15px] text-white outline-none placeholder:text-[#a8a8a8]"
              />
              <button
                type="button"
                onClick={() => setTool(null)}
                className="rounded-full bg-white py-3 text-[15px] font-semibold text-black"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
