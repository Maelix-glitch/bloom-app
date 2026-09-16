/**
 * StoryEditor — the immersive story canvas.
 * Media or a curated background fills the viewport; tools float at the edges.
 * Text, stickers, drawing, filters, music, GIFs, and interactive stickers
 * compose one element list with full undo/redo. Share previews exactly what
 * viewers will see, states who can see it, then publishes once.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  AtSign,
  Check,
  Download,
  ImagePlay,
  ImagePlus,
  Layers,
  LayoutTemplate,
  Music2,
  Paintbrush,
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
} from "lucide-react";
import { loadImageElement, validateImageFile } from "@/lib/profile/media";

import { StoryCanvas, type CanvasMedia } from "./StoryCanvas";
import { ElementLayer, pointInRect } from "./ElementLayer";
import { BackgroundSheet } from "./editor/BackgroundSheet";
import { PhotoSheet } from "./editor/PhotoSheet";
import { DataSheet, LayersSheet, ShapeSheet } from "./editor/ElementSheets";
import { TemplateBrowser } from "./TemplateBrowser";
import { StorySheet } from "./StorySheet";
import { TextTool, type TextToolValue } from "./TextTool";
import { StickerTray } from "./StickerTray";
import { InteractiveTray } from "./InteractiveTray";
import { FilterTool } from "./FilterTool";
import { GifTray, MusicTray, type PickedMusic } from "./MediaTrays";
import { DrawLayer, exportDrawing, type DrawStroke } from "./DrawLayer";
import { DRAW_COLORS, DRAW_SIZES_ROW } from "./editorBits";
import {
  ELEMENT_LIMITS,
  makeGifElement,
  makeMusicElement,
  makeStickerElement,
  makeTextElement,
  sanitizeElements,
  serializeElements,
} from "@/lib/stories/elements";
import { editorDraftStore } from "@/lib/stories/draftStore";
import { clearExportCache, exportStory } from "@/lib/stories/exporter";
import { DEFAULT_ADJUSTMENTS, backgroundById } from "@/lib/stories/catalogs";
import { presetBackground, type StoryBackgroundState } from "@/lib/stories/canvas/backgrounds";
import { makeDataElement, makePhotoElement, newElementId } from "@/lib/stories/elements";
import { readBloomStoryData } from "@/lib/stories/data/metrics";
import {
  instantiateTemplate,
  recordTemplateUse,
  type StoryTemplateDef,
} from "@/lib/stories/templates";
import type { BloomStoryData, StoryPhotoElement } from "@/lib/stories/types";
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
  /** What the canvas starts from. */
  base: "photo" | "video" | "background";
  photo?: LocalImage | undefined;
  video?: LocalVideo | undefined;
  videoThumbnail?: string | null | undefined;
  backgroundId?: string | undefined;
  templateId?: string | null | undefined;
  /** Story kind + provenance written at publish. */
  storyKind: StoryKind;
  source?: { kind: string; id: string } | null | undefined;
  captionTitle?: string | undefined;
  captionBody?: string | undefined;
  /** Per-source accent override (milestones bloom sage, rewards amber). */
  accent?: BloomAccent | undefined;
}

/** Restored draft state: canvas layers plus the words around them. */
export interface EditorInitialState {
  /** Full background state restored with the draft. */
  background?: StoryBackgroundState | null | undefined;
  elements: StoryElement[];
  strokes: DrawStroke[];
  filterId: string;
  adjustments: StoryAdjustments;
  captionTitle: string;
  captionBody: string;
  altText: string;
}

type Tool =
  | "sticker"
  | "interactive"
  | "filter"
  | "music"
  | "gif"
  | "caption"
  | "photo"
  | "background"
  | "layers"
  | "data"
  | "template"
  | null;

interface Snapshot {
  elements: StoryElement[];
  strokes: DrawStroke[];
}

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
  const effectiveAccent = source.accent ?? accent;
  const composedTemplate = source.templateId
    ? (instantiateTemplate(source.templateId) ?? null)
    : null;
  /** Real Bloom readings. Data layers print these or an honest empty state. */
  const bloomData = useMemo<BloomStoryData>(() => readBloomStoryData(), []);

  const [elements, setElements] = useState<StoryElement[]>(() => {
    // A resumed draft wins over template/source seeding.
    if (initialState) return sanitizeElements(initialState.elements);
    const els: StoryElement[] = composedTemplate ? [...composedTemplate.composed.elements] : [];
    if (source.captionTitle && !composedTemplate) {
      els.push(
        makeTextElement(source.captionTitle, {
          preset: "editorial",
          color: source.base === "background" ? backgroundById(source.backgroundId).ink : "#f4efe4",
          x: 0.5,
          y: 0.4,
          z: 1,
        }),
      );
    }
    return els;
  });
  const [strokes, setStrokes] = useState<DrawStroke[]>(() => initialState?.strokes ?? []);
  const [backgroundId, setBackgroundId] = useState(source.backgroundId ?? "moonlight");
  const [background, setBackground] = useState<StoryBackgroundState>(
    () =>
      initialState?.background ??
      (composedTemplate
        ? composedTemplate.composed.background
        : presetBackground(source.backgroundId ?? "moonlight")),
  );
  const [filterId, setFilterId] = useState(initialState?.filterId ?? "none");
  const [adjustments, setAdjustments] = useState<StoryAdjustments>(
    initialState?.adjustments ?? DEFAULT_ADJUSTMENTS,
  );
  const [music, setMusic] = useState<PickedMusic | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>(null);
  const [textEditing, setTextEditing] = useState<{
    elementId: string | null;
    initial: TextToolValue | null;
  } | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState("#f4efe4");
  const [drawSize, setDrawSize] = useState(8);
  const [drawEraser, setDrawEraser] = useState(false);
  const [captionTitle, setCaptionTitle] = useState(
    initialState?.captionTitle || source.captionTitle || "",
  );
  const [captionBody, setCaptionBody] = useState(
    initialState?.captionBody || source.captionBody || "",
  );
  const [altText, setAltText] = useState(initialState?.altText ?? "");
  const [visibility, setVisibility] = useState<StoryVisibility>(defaultVisibility);
  const [audience, setAudience] = useState<StoryAudience>(defaultAudience);
  const [step, setStep] = useState<"edit" | "share" | "confirm-leave">("edit");
  const [publishing, setPublishing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [muted, setMuted] = useState(true);
  const [drag, setDrag] = useState<{ id: string; clientX: number; clientY: number } | null>(null);
  const [deleteHot, setDeleteHot] = useState(false);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const deleteRef = useRef<HTMLDivElement | null>(null);
  const draftTimer = useRef<number | undefined>(undefined);

  /* ------------------------------ history ------------------------------ */
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

  /** Record the current state before a discrete edit. Cap keeps memory sane. */
  const pushHistory = useCallback(() => {
    past.current.push(snapshot());
    if (past.current.length > 40) past.current.shift();
    future.current = [];
    setHistoryTick((t) => t + 1);
  }, [snapshot]);

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

  /* ------------------------------ selection ----------------------------- */
  const selected = elements.find((e) => e.id === selectedId) ?? null;

  const addElement = useCallback(
    (el: StoryElement) => {
      if (elements.length >= ELEMENT_LIMITS.maxElements) {
        toast("That's plenty of layers — remove one to add another.");
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

  /* One history entry per gesture: snapshot on first live update. */
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
    setSelectedId((sel) => sel);
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

  /* ------------------------------ delete zone --------------------------- */
  const onDragState = useCallback((d: { id: string; clientX: number; clientY: number } | null) => {
    setDrag(d);
    if (!d) {
      setDeleteHot(false);
      return;
    }
    const rect = deleteRef.current?.getBoundingClientRect();
    setDeleteHot(pointInRect(d.clientX, d.clientY, rect, 20));
  }, []);

  /* ------------------------------ resize --------------------------------
   * The corner handles are drawn by StoryCanvas; ElementLayer runs the actual
   * gesture in its capture handler (it reads `data-se-handle`). This just
   * clears any stale drag state so the delete zone never appears mid-resize. */
  const beginResize = useCallback(() => {
    setDrag(null);
    setDeleteHot(false);
  }, []);

  useEffect(() => {
    if (!drag && deleteHot) {
      /* released over the zone is handled below via ref mirror */
    }
  }, [drag, deleteHot]);

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

  /* ------------------------------ text ---------------------------------- */
  const openText = useCallback(
    (existing: Extract<StoryElement, { kind: "text" }> | null) => {
      if (!existing && elements.length >= ELEMENT_LIMITS.maxElements) {
        toast("That's plenty of layers — remove one to add another.");
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

  /* ------------------------------ draw ---------------------------------- */
  const addStroke = useCallback(
    (stroke: DrawStroke) => {
      past.current.push(snapshot());
      future.current = [];
      setStrokes((prev) => [...prev, stroke]);
      setHistoryTick((t) => t + 1);
    },
    [snapshot],
  );

  /* ------------------------------ draft --------------------------------- */
  const dirty = elements.length > 0 || strokes.length > 0 || filterId !== "none" || music !== null;

  useEffect(() => {
    if (step !== "edit") return;
    if (!dirty) return;
    if (source.base === "video") return; // files can't be restored; don't pretend
    window.clearTimeout(draftTimer.current);
    draftTimer.current = window.setTimeout(() => {
      void editorDraftStore.write({
        userId,
        savedAt: Date.now(),
        source:
          source.base === "video"
            ? {
                base: "video",
                videoFile: source.video?.blob ?? null,
                videoDurationMs: source.video?.durationMs ?? 0,
                videoWidth: source.video?.width ?? 0,
                videoHeight: source.video?.height ?? 0,
                videoThumbnail: source.videoThumbnail ?? null,
                storyKind: source.storyKind,
              }
            : {
                base: source.base === "photo" ? "photo" : "background",
                photoFile: source.photo?.blob ?? null,
                photoDataUrl: source.photo?.dataUrl ?? null,
                photoWidth: source.photo?.width ?? 0,
                photoHeight: source.photo?.height ?? 0,
                backgroundId,
                templateId: source.templateId ?? null,
                storyKind: source.storyKind,
              },
        background,
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
  }, [
    elements,
    strokes,
    background,
    backgroundId,
    filterId,
    adjustments,
    captionTitle,
    captionBody,
    altText,
    dirty,
    source,
    step,
    userId,
  ]);

  /* ------------------------------ publish ------------------------------- */
  const media: CanvasMedia = useMemo(() => {
    if (source.base === "video" && source.video) {
      return { type: "video", src: source.video.previewUrl, poster: source.videoThumbnail };
    }
    if (source.base === "photo" && source.photo) {
      return { type: "image", src: source.photo.dataUrl };
    }
    return { type: "none", src: null };
  }, [source]);

  const publishElements = useCallback((): StoryElement[] => {
    let els = serializeElements(elements);
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

  /**
   * Render the composition to a real 1080×1920 file and hand it to the OS.
   * Never a screenshot: type is re-laid out at export scale, so it stays sharp.
   */
  const saveImage = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    let url: string | null = null;
    try {
      const result = await exportStory({
        elements: publishElements(),
        background: source.base === "background" ? background : null,
        backgroundId,
        media: { src: media.src, type: media.type === "video" ? "video" : media.type },
        filterId: filterId === "none" ? null : filterId,
        data: bloomData,
      });
      url = result.url;
      const a = document.createElement("a");
      a.href = result.url;
      a.download = `bloom-story-${new Date().toISOString().slice(0, 10)}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast("Saved to your device.");
    } catch {
      toast.error("Couldn't render that image. Try again.");
    } finally {
      if (url) URL.revokeObjectURL(url);
      clearExportCache();
      setExporting(false);
    }
  }, [
    exporting,
    publishElements,
    source.base,
    background,
    backgroundId,
    media,
    filterId,
    bloomData,
  ]);

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
        // The composed background rides with the story; backgroundId alone can
        // only name a preset, and a template's paint is never just a preset.
        canvas: source.base === "background" ? background : null,
        filterId: filterId === "none" ? null : filterId,
        adjustments:
          JSON.stringify(adjustments) === JSON.stringify(DEFAULT_ADJUSTMENTS) ? null : adjustments,
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
        audio: music?.file
          ? { blob: music.file, contentType: music.file.type || "audio/mpeg" }
          : null,
        altText: altText.trim() || null,
        audience,
      });
      editorDraftStore.clear();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't post your story.");
    } finally {
      setPublishing(false);
    }
  }, [
    publishing,
    publishElements,
    onPublish,
    source,
    captionTitle,
    captionBody,
    effectiveAccent,
    visibility,
    filterId,
    adjustments,
    backgroundId,
    music,
    altText,
    audience,
  ]);

  const requestClose = useCallback(() => {
    if (dirty && step === "edit") {
      setStep("confirm-leave");
      return;
    }
    onClose();
  }, [dirty, step, onClose]);

  /* keyboard: undo/redo/escape */
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

  const ink =
    source.base === "background" ? background.ink || backgroundById(backgroundId).ink : "#f4efe4";
  /** Narrowed once so the data tray's callbacks can use a non-null id. */
  const dataSelected = selected?.kind === "data" ? selected : null;

  /* --------------------------- layer operations --------------------------- */
  const patchElement = useCallback(
    (id: string, patch: Partial<StoryElement>) => {
      pushHistory();
      setElements((prev) =>
        prev.map((e) => (e.id === id ? ({ ...e, ...patch } as StoryElement) : e)),
      );
    },
    [pushHistory],
  );

  const moveElement = useCallback(
    (id: string, delta: number) => {
      pushHistory();
      setElements((prev) => {
        const ordered = [...prev].sort((a, b) => a.z - b.z);
        const i = ordered.findIndex((e) => e.id === id);
        if (i < 0) return prev;
        const j = Math.max(0, Math.min(ordered.length - 1, i + delta));
        if (i === j) return prev;
        const [moved] = ordered.splice(i, 1);
        ordered.splice(j, 0, moved!);
        return ordered.map((e, index) => ({ ...e, z: index + 1 }));
      });
    },
    [pushHistory],
  );

  const duplicateElement = useCallback(
    (id: string) => {
      const src = elements.find((e) => e.id === id);
      if (!src) return;
      if (elements.length >= ELEMENT_LIMITS.maxElements) {
        toast("That's as many layers as one story can hold.");
        return;
      }
      const copy = { ...src, id: newElementId(), z: nextZ(elements) } as StoryElement;
      if ("x" in copy) copy.x = Math.min(0.92, copy.x + 0.03);
      if ("y" in copy) copy.y = Math.min(0.92, copy.y + 0.02);
      addElement(copy);
      setSelectedId(copy.id);
    },
    [elements, addElement],
  );

  /* ------------------------------ photo slots ----------------------------- */
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [fillTarget, setFillTarget] = useState<string | null>(null);
  const [objectUrls, setObjectUrls] = useState<string[]>([]);

  useEffect(
    () => () => {
      for (const url of objectUrls) URL.revokeObjectURL(url);
    },
    [objectUrls],
  );

  const requestPhotoFor = useCallback((id: string) => {
    setFillTarget(id);
    window.setTimeout(() => photoInputRef.current?.click(), 60);
  }, []);

  /** Accent as a real color — data widgets and new layers want a hex. */
  const accentColor =
    accent === "amber"
      ? "#EED9A4"
      : accent === "rose"
        ? "#E0A3B8"
        : accent === "sage"
          ? "#9DB89A"
          : accent === "sky"
            ? "#9FB6CF"
            : accent === "violet"
              ? "#B7A6E8"
              : "#F4EFE4";

  /** Swap the whole composition. Undoable, and it never touches captions. */
  const applyTemplate = useCallback(
    (def: StoryTemplateDef) => {
      const composed = instantiateTemplate(def);
      if (!composed) return;
      pushHistory();
      setElements(composed.composed.elements);
      setBackground(composed.composed.background);
      setSelectedId(null);
      recordTemplateUse(def.id);
      setStep("edit");
    },
    [pushHistory],
  );

  const addEmptyPhoto = useCallback(() => {
    if (elements.filter((e) => e.kind === "photo").length >= ELEMENT_LIMITS.maxPhotos) {
      toast("Nine photos is the most one story can carry.");
      return;
    }
    const el = makePhotoElement({
      x: 0.5,
      y: 0.5,
      w: 0.62,
      h: 0.34,
      z: nextZ(elements),
      mask: "rounded",
    });
    addElement(el);
    setSelectedId(el.id);
    requestPhotoFor(el.id);
  }, [elements, addElement, requestPhotoFor]);

  const onPhotoPicked = useCallback(
    async (file: File | null) => {
      if (!file || !fillTarget) return;
      const invalid = validateImageFile(file);
      if (invalid) {
        toast.error(invalid);
        return;
      }
      try {
        const img = await loadImageElement(URL.createObjectURL(file));
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result ?? "");
          const url = URL.createObjectURL(file);
          setObjectUrls((prev) => [...prev, url]);
          if (fillTarget === "__background__") {
            pushHistory();
            setBackground((bg) => ({
              ...bg,
              mode: "photo",
              photo: {
                src: dataUrl,
                fit: "fill",
                blur: 0,
                zoom: 1,
                panX: 0,
                panY: 0,
                opacity: 1,
              },
            }));
            setFillTarget(null);
            if (photoInputRef.current) photoInputRef.current.value = "";
            return;
          }
          const el = elements.find((e) => e.id === fillTarget);
          const aspect = img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 1.4;
          const slotW = el?.kind === "photo" ? el.w : undefined;
          const slotH = el?.kind === "photo" ? el.h : undefined;
          // A portrait slot stays portrait; a landscape one widens. Never
          // stretches a photo to fit a shape it was not drawn for.
          const resized =
            typeof slotW === "number" && typeof slotH === "number"
              ? aspect > 1.15 && slotH > slotW
                ? { h: Math.min(0.92, slotW * aspect) }
                : aspect < 0.87 && slotW > slotH
                  ? { w: Math.min(0.94, slotH / aspect) }
                  : {}
              : {};
          const patch: Partial<StoryPhotoElement> = {
            src: dataUrl,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
          };
          patchElement(fillTarget, { ...patch, ...resized });
          setTool(null);
        };
        reader.onerror = () => toast.error("Couldn't read that photo.");
        reader.readAsDataURL(file);
      } catch {
        toast.error("Couldn't open that photo.");
      } finally {
        setFillTarget(null);
        if (photoInputRef.current) photoInputRef.current.value = "";
      }
    },
    [fillTarget, elements, patchElement, pushHistory],
  );
  const canvasSize = canvasRef.current?.getBoundingClientRect();
  const [, forceMeasure] = useState(0);
  useEffect(() => {
    forceMeasure(1);
  }, []);

  /* -------------------------------- share -------------------------------- */
  if (step === "share") {
    const previewStory = { elements: publishElements() };
    return (
      <div
        className="bstory se-root fixed inset-0 z-[90] flex flex-col bg-black"
        role="dialog"
        aria-label="Share story"
      >
        <div className="flex items-center justify-between px-4 pt-[max(14px,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={() => setStep("edit")}
            aria-label="Back to editor"
            className="sv-icon-btn"
          >
            <ArrowLeft className="size-5" />
          </button>
          <p className="display text-[17px] text-white">Share to story</p>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Discard story"
            className="sv-icon-btn"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="relative mx-auto mt-3 min-h-0 w-full max-w-[400px] flex-1 overflow-hidden rounded-2xl border border-white/10">
          <StoryCanvas
            media={media}
            background={source.base === "background" ? background : null}
            backgroundId={backgroundId}
            filterId={filterId}
            adjustments={adjustments}
            elements={previewStory.elements}
            data={bloomData}
            mode="static"
          />
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-col gap-3 px-5 py-4 pb-[max(18px,env(safe-area-inset-bottom))]">
          <div>
            <p className="eyebrow mb-2 !text-white/50">Visible to</p>
            <div
              className="grid grid-cols-2 gap-2"
              role="radiogroup"
              aria-label="Who can see this story"
            >
              {(
                [
                  { key: "private", label: "Just me", hint: "Private archive" },
                  { key: "public", label: "Public", hint: "On your profile" },
                ] as const
              ).map((o) => (
                <button
                  key={o.key}
                  type="button"
                  role="radio"
                  aria-checked={visibility === o.key}
                  onClick={() => setVisibility(o.key)}
                  className={cn(
                    "rounded-2xl border px-3.5 py-3 text-left transition-all",
                    visibility === o.key
                      ? "border-[rgba(238,217,164,0.6)] bg-[rgba(238,217,164,0.12)]"
                      : "border-white/12 bg-white/5",
                  )}
                >
                  <span className="flex items-center gap-2 text-[13px] font-semibold text-white">
                    {visibility === o.key ? <Check className="size-3.5 text-[#eed9a4]" /> : null}
                    {o.label}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-white/55">{o.hint}</span>
                </button>
              ))}
            </div>
            {visibility === "public" ? (
              <div
                className="mt-2 grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-label="Story audience"
              >
                {(
                  [
                    { key: "all", label: "Everyone" },
                    { key: "close", label: "Close friends" },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    role="radio"
                    aria-checked={audience === o.key}
                    onClick={() => setAudience(o.key)}
                    className={cn(
                      "rounded-full border px-3 py-2 text-[12.5px] font-semibold transition-all",
                      audience === o.key
                        ? "border-[rgba(238,217,164,0.6)] bg-[rgba(238,217,164,0.12)] text-white"
                        : "border-white/12 bg-white/5 text-white/65",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            ) : null}
            <p className="mt-2 text-[11.5px] text-white/45">
              {visibility === "public"
                ? audience === "close"
                  ? "Only your close friends can see this. It expires in 24 hours."
                  : "Visible wherever your profile is shared. It expires in 24 hours."
                : "Only you — it rests in your private archive after 24 hours."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void publish()}
            disabled={publishing}
            className="se-chip-btn w-full justify-center !py-3 text-[14px] disabled:opacity-50"
            data-primary="true"
          >
            {publishing
              ? "Sharing…"
              : visibility === "public"
                ? "Share to story"
                : "Save to my story"}
          </button>
          <button
            type="button"
            onClick={saveImage}
            disabled={exporting}
            className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/15 text-[13px] font-semibold text-white/80 transition-colors hover:bg-white/5 disabled:opacity-50"
          >
            <Download className="size-4" aria-hidden />
            {exporting ? "Rendering…" : "Save as image (1080×1920)"}
          </button>
        </div>
      </div>
    );
  }

  if (step === "confirm-leave") {
    return (
      <div
        className="bstory fixed inset-0 z-[95] grid place-items-center bg-black/70 px-6 backdrop-blur-sm"
        role="alertdialog"
        aria-label="Discard story draft"
      >
        <div className="w-full max-w-[340px] rounded-3xl border border-white/10 bg-[#1c1930] p-6 text-center">
          <p className="display text-[19px] text-white">Leave the editor?</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">
            Your draft is saved on this device — except video, which can't be kept yet.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setStep("edit")}
              className="se-chip-btn justify-center"
              data-primary="true"
            >
              Keep editing
            </button>
            <button
              type="button"
              onClick={() => {
                editorDraftStore.clear();
                onClose();
              }}
              className="se-chip-btn justify-center"
            >
              <Trash2 className="size-3.5" aria-hidden /> Discard draft
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------------- edit --------------------------------- */
  const tools = [
    { id: "template", label: "Templates", icon: LayoutTemplate },
    { id: "photo", label: "Photo", icon: ImagePlus },
    { id: "text", label: "Text", icon: Type },
    { id: "sticker", label: "Stickers", icon: Sticker },
    { id: "background", label: "Back", icon: Paintbrush },
    { id: "data", label: "Data", icon: Activity },
    { id: "layers", label: "Layers", icon: Layers },
    { id: "interactive", label: "Polls", icon: SlidersHorizontal },
    { id: "draw", label: "Draw", icon: Wand2 },
    { id: "filter", label: "Look", icon: Sparkles },
    { id: "music", label: "Music", icon: Music2 },
    { id: "gif", label: "GIFs", icon: ImagePlay },
    { id: "caption", label: "Note", icon: AtSign },
  ] as const;

  return (
    <div
      className="bstory se-root fixed inset-0 z-[90] flex flex-col bg-black"
      role="dialog"
      aria-label="Story editor"
    >
      {/* top bar */}
      <div className="relative z-50 flex items-center justify-between px-3 pt-[max(12px,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={requestClose}
          aria-label="Close editor"
          className="sv-icon-btn"
        >
          <X className="size-5" />
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Undo"
            className="sv-icon-btn disabled:opacity-30"
          >
            <Undo2 className="size-[18px]" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            aria-label="Redo"
            className="sv-icon-btn disabled:opacity-30"
          >
            <Redo2 className="size-[18px]" />
          </button>
          {source.base === "video" ? (
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Unmute preview" : "Mute preview"}
              className="sv-icon-btn"
            >
              {muted ? <VolumeX className="size-[18px]" /> : <Volume2 className="size-[18px]" />}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setStep("share")}
          className="se-chip-btn !h-10"
          data-primary="true"
        >
          Share <ArrowLeft className="size-3.5 rotate-180" aria-hidden />
        </button>
      </div>

      {/* canvas */}
      <div className="relative grid min-h-0 flex-1 place-items-center">
        <div
          ref={canvasRef}
          className="se-stage relative overflow-hidden"
          /* max-height matters on short phones: without it a 9:16 canvas sized
           * from the available height overflows the space the tool rail left
           * and gets clipped by overflow-hidden. With both caps the box fits
           * inside the region and the aspect ratio picks the binding one. */
          style={{ aspectRatio: "9 / 16", height: "100%", maxWidth: "100%", maxHeight: "100%" }}
        >
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
              background={source.base === "background" ? background : null}
              backgroundId={source.base === "background" ? backgroundId : null}
              filterId={filterId}
              adjustments={adjustments}
              elements={elements}
              data={bloomData}
              mode="edit"
              selectedId={selectedId}
              onSelect={(id) => !drawing && setSelectedId(id)}
              onAddPhoto={(el) => requestPhotoFor(el.id)}
              onResizeStart={beginResize}
              resizeEnabled={!drawing && textEditing === null && tool === null}
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

          {/* safe frame while composing */}
          {drag ? (
            <>
              <div className="se-safe" style={{ top: 76, bottom: 150 }} aria-hidden />
            </>
          ) : null}

          {/* delete zone */}
          <div
            ref={deleteRef}
            className="se-delete-zone"
            data-visible={Boolean(drag)}
            data-hot={deleteHot}
            aria-hidden
          >
            <Trash2 className="size-4" aria-hidden /> Release to delete
          </div>

          {/* selected element actions */}
          {selected && !drag && !drawing ? (
            <div className="absolute left-1/2 top-[86px] z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/12 bg-black/55 p-1 backdrop-blur-md">
              {selected.kind === "text" ? (
                <button
                  type="button"
                  onClick={() => openText(selected)}
                  className="rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-white/85 transition-colors hover:bg-white/10"
                >
                  Edit
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  past.current.push(snapshot());
                  future.current = [];
                  setElements((prev) =>
                    prev.map((e) => (e.id === selected.id ? { ...e, z: nextZ(prev) } : e)),
                  );
                  setHistoryTick((t) => t + 1);
                }}
                className="rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-white/85 transition-colors hover:bg-white/10"
              >
                Front
              </button>
              <button
                type="button"
                onClick={() => deleteElement(selected.id)}
                aria-label="Delete selected"
                className="grid size-8 place-items-center rounded-full text-[#ff9d9d] transition-colors hover:bg-white/10"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* draw sub-bar */}
      {drawing ? (
        <div className="relative z-50 flex items-center gap-2 overflow-x-auto bg-black/60 px-4 py-3 backdrop-blur-md">
          {DRAW_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Draw in ${c}`}
              onClick={() => {
                setDrawColor(c);
                setDrawEraser(false);
              }}
              className="se-swatch"
              data-active={!drawEraser && drawColor === c}
              style={{ background: c }}
            />
          ))}
          <span className="mx-1 h-6 w-px shrink-0 bg-white/15" aria-hidden />
          {DRAW_SIZES_ROW.map((s) => (
            <button
              key={s}
              type="button"
              aria-label={`Brush size ${s}`}
              onClick={() => setDrawSize(s)}
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-full transition-colors",
                drawSize === s ? "bg-white/15" : "",
              )}
            >
              <span
                className="rounded-full bg-white"
                style={{ width: Math.min(20, 4 + s / 1.6), height: Math.min(20, 4 + s / 1.6) }}
              />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setDrawEraser((v) => !v)}
            aria-pressed={drawEraser}
            className={cn(
              "se-chip-btn ml-1 shrink-0 !h-9 text-[12px]",
              drawEraser && "!bg-white/20",
            )}
          >
            Eraser
          </button>
          <button
            type="button"
            onClick={() => setDrawing(false)}
            className="se-chip-btn shrink-0 !h-9 text-[12px]"
            data-primary="true"
          >
            <Check className="size-3.5" aria-hidden /> Done
          </button>
        </div>
      ) : (
        /* tool rail */
        <div className="se-rail relative z-50 flex gap-0.5 overflow-x-auto bg-black/60 px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
          {tools.map((t) => (
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
                if (t.id === "photo") {
                  const slots = elements.filter((e) => e.kind === "photo");
                  const empty = slots.find((e) => e.kind === "photo" && !e.src);
                  if (empty) {
                    requestPhotoFor(empty.id);
                    return;
                  }
                  if (slots.length === 0) {
                    addEmptyPhoto();
                    return;
                  }
                }
                setTool(t.id as Tool);
              }}
              className="se-tool-btn"
              data-active={tool === t.id}
            >
              <t.icon className="size-[22px]" strokeWidth={1.7} aria-hidden />
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* overlays */}
      {textEditing ? (
        <TextTool
          initial={textEditing.initial}
          defaultColor={ink}
          onSave={saveText}
          onClose={() => setTextEditing(null)}
        />
      ) : null}

      {/* hidden file input feeding the photo slots */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => void onPhotoPicked(e.target.files?.[0] ?? null)}
      />

      {tool === "template" ? (
        <TemplateBrowser
          data={bloomData}
          onClose={() => setTool(null)}
          onPick={(def) => {
            applyTemplate(def);
            setTool(null);
          }}
        />
      ) : null}

      {tool === "background" ? (
        <BackgroundSheet
          bg={background}
          onChange={(next) => {
            pushHistory();
            setBackground(next);
          }}
          onUsePhoto={() => requestPhotoFor("__background__")}
          onClose={() => setTool(null)}
        />
      ) : null}

      {tool === "layers" ? (
        <LayersSheet
          elements={elements}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMove={moveElement}
          onPatch={patchElement}
          onDuplicate={duplicateElement}
          onDelete={(id) => {
            deleteElement(id);
            setSelectedId(null);
          }}
          onClose={() => setTool(null)}
        />
      ) : null}

      {tool === "data" ? (
        <DataSheet
          data={bloomData}
          selectedId={dataSelected?.id ?? null}
          onAdd={(metric, variant) => {
            if (elements.length >= ELEMENT_LIMITS.maxElements) {
              toast("That's as many layers as one story can hold.");
              return;
            }
            const el = makeDataElement(metric, {
              x: 0.5,
              y: 0.72,
              z: nextZ(elements),
              variant,
              accent: accentColor,
              w: variant === "inline" ? 0.7 : 0.56,
              h: variant === "ring" ? 0.22 : variant === "inline" ? 0.05 : 0.13,
            });
            if (!el) return;
            addElement(el);
            setSelectedId(el.id);
          }}
          {...(dataSelected
            ? {
                onPatch: (patch: Record<string, unknown>) =>
                  patchElement(dataSelected.id, patch as Partial<StoryElement>),
                onRemove: () => {
                  deleteElement(dataSelected.id);
                  setSelectedId(null);
                },
              }
            : {})}
          onClose={() => setTool(null)}
        />
      ) : null}

      {tool === "photo" && selected?.kind !== "photo" ? (
        <StorySheet
          title="Photo"
          subtitle="Every photo is a slot: drag it, pinch it, or set it exactly."
          onClose={() => setTool(null)}
          label="Photo options"
        >
          <button type="button" className="se-wide-btn" onClick={addEmptyPhoto}>
            <ImagePlus className="size-4" aria-hidden /> Add a photo layer
          </button>
          <p className="se-hint">
            Tap any photo already on the canvas to fill it, move it, mask it or filter it. Empty
            slots show an “Add photo” tile.
          </p>
        </StorySheet>
      ) : null}

      {selected?.kind === "photo" && !tool ? (
        <PhotoSheet
          el={selected}
          onUpdate={(patch) => patchElement(selected.id, patch as Partial<StoryElement>)}
          onReplace={() => requestPhotoFor(selected.id)}
          onRemove={() => {
            deleteElement(selected.id);
            setSelectedId(null);
          }}
          onClose={() => setSelectedId(null)}
        />
      ) : null}

      {selected?.kind === "shape" && !tool ? (
        <ShapeSheet
          el={selected}
          onUpdate={(patch) => patchElement(selected.id, patch as Partial<StoryElement>)}
          onRemove={() => {
            deleteElement(selected.id);
            setSelectedId(null);
          }}
          onClose={() => setSelectedId(null)}
        />
      ) : null}

      {tool === "sticker" ? (
        <StickerTray
          onPick={(sticker) => {
            const el = makeStickerElement(sticker.id, {
              z: nextZ(elements),
              src: sticker.src,
              still: sticker.still,
              width: sticker.width,
              height: sticker.height,
            });
            if (el) addElement(el);
            else toast("That sticker couldn't be used.");
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
          preview={
            source.base === "photo" && source.photo
              ? source.photo.dataUrl
              : (source.videoThumbnail ?? null)
          }
          filterId={filterId}
          adjustments={adjustments}
          onFilter={setFilterId}
          onAdjustments={setAdjustments}
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
            if (picked.file) toast("Your audio will upload when you share.");
          }}
          onClose={() => setTool(null)}
        />
      ) : null}

      {tool === "gif" ? (
        <GifTray
          onPick={(gif) => {
            const el = makeGifElement(
              {
                gifId: gif.id,
                src: gif.src,
                still: gif.still,
                width: gif.width,
                height: gif.height,
              },
              { z: nextZ(elements) },
            );
            if (el) addElement(el);
            else toast("That GIF couldn't be used.");
            setTool(null);
          }}
          onClose={() => setTool(null)}
        />
      ) : null}

      {tool === "caption" ? (
        <CaptionSheet
          title={captionTitle}
          body={captionBody}
          altText={altText}
          hasMedia={source.base !== "background"}
          onSave={(t, b, a) => {
            setCaptionTitle(t);
            setCaptionBody(b);
            setAltText(a);
            setTool(null);
          }}
          onClose={() => setTool(null)}
        />
      ) : null}

      {music && step === "edit" && !drawing ? (
        <p className="sr-only" role="status">
          Music attached: {music.title} by {music.artist}
        </p>
      ) : null}
    </div>
  );
}

function CaptionSheet({
  title,
  body,
  altText,
  hasMedia,
  onSave,
  onClose,
}: {
  title: string;
  body: string;
  altText: string;
  hasMedia: boolean;
  onSave: (title: string, body: string, alt: string) => void;
  onClose: () => void;
}) {
  const [t, setT] = useState(title);
  const [b, setB] = useState(body);
  const [a, setA] = useState(altText);
  return (
    <StorySheet title="Note" subtitle="Words that travel with the story." onClose={onClose}>
      <div className="flex flex-col gap-4 pb-2">
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">Headline (optional)</span>
          <input
            value={t}
            onChange={(e) => setT(e.target.value.slice(0, 120))}
            placeholder="A line for the archive…"
            maxLength={120}
            className="display w-full rounded-xl border border-border bg-surface/60 px-3.5 py-2.5 text-[17px] outline-none transition-colors placeholder:text-faint/60 focus:border-border-strong"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">A few words (optional)</span>
          <textarea
            value={b}
            onChange={(e) => setB(e.target.value.slice(0, 2000))}
            placeholder="Say as much or as little as you like."
            rows={3}
            maxLength={2000}
            className="w-full resize-none rounded-xl border border-border bg-surface/60 px-3.5 py-2.5 text-[13.5px] leading-relaxed outline-none transition-colors placeholder:text-faint/60 focus:border-border-strong"
          />
        </label>
        {hasMedia ? (
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">Alt text (optional)</span>
            <input
              value={a}
              onChange={(e) => setA(e.target.value.slice(0, 300))}
              placeholder="Describe the image for screen readers…"
              maxLength={300}
              className="w-full rounded-xl border border-border bg-surface/60 px-3.5 py-2.5 text-[13px] outline-none transition-colors placeholder:text-faint/60 focus:border-border-strong"
            />
          </label>
        ) : null}
        <button
          type="button"
          onClick={() => onSave(t, b, a)}
          className="bsheet-primary w-full justify-center"
        >
          Save note
        </button>
      </div>
    </StorySheet>
  );
}
