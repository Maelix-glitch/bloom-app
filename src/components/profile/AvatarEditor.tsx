/**
 * AvatarEditor — choose, zoom, reposition, preview, remove. Deliberately
 * small: no rotation, no filters. Works with mouse and touch; exports one
 * optimized 512px square that the profile editor uploads exactly once, on
 * Save.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  exportAvatar,
  loadImageElement,
  readAsDataUrl,
  validateImageFile,
} from "@/lib/profile/media";
import { toast } from "sonner";

const STAGE = 260; // px, square display stage (shrinks with max-w)

export interface PendingAvatar {
  blob: Blob;
  previewUrl: string;
}

export function AvatarEditor({
  onStage,
  onRemove,
}: {
  onStage: (pending: PendingAvatar | null) => void;
  onRemove?: (() => void | Promise<void>) | undefined;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [rawUrl, setRawUrl] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const exportTimer = useRef<number | undefined>(undefined);

  const chooseFile = useCallback(async (file: File | null) => {
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setBusy(true);
    try {
      const url = await readAsDataUrl(file);
      const el = await loadImageElement(url);
      setRawUrl(url);
      setImg(el);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    } catch {
      toast.error("Couldn't open that image. Try another one.");
    } finally {
      setBusy(false);
    }
  }, []);

  /* geometry: at zoom z the crop square spans min(iw, ih)/z source pixels */
  const geo = (() => {
    if (!img) return null;
    const squareSizeSrc = Math.min(img.naturalWidth, img.naturalHeight) / zoom;
    const scale = STAGE / squareSizeSrc;
    const dispW = img.naturalWidth * scale;
    const dispH = img.naturalHeight * scale;
    const x = Math.min(0, Math.max(STAGE - dispW, offset.x));
    const y = Math.min(0, Math.max(STAGE - dispH, offset.y));
    return { dispW, dispH, x, y, scale, squareSizeSrc };
  })();

  /* keep the parent's pending export roughly in sync (debounced canvas work) */
  useEffect(() => {
    if (!img) {
      onStage(null);
      return;
    }
    window.clearTimeout(exportTimer.current);
    exportTimer.current = window.setTimeout(() => {
      if (!geo) return;
      void exportAvatar(img, {
        offsetX: -geo.x / geo.scale,
        offsetY: -geo.y / geo.scale,
        size: geo.squareSizeSrc,
      })
        .then((result) => onStage({ blob: result.blob, previewUrl: result.dataUrl }))
        .catch(() => toast.error("Couldn't prepare that photo."));
    }, 220);
    return () => window.clearTimeout(exportTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, geo === null, zoom, offset.x, offset.y]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!img || !geo) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: geo.x, oy: geo.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !geo) return;
    setOffset({ x: drag.ox + (e.clientX - drag.x), y: drag.oy + (e.clientY - drag.y) });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={(e) => {
          if (!img) return;
          e.preventDefault();
          setZoom((z) => Math.min(4, Math.max(1, z * (1 - e.deltaY * 0.0014))));
        }}
        className={cn(
          "relative w-full max-w-[260px] touch-none overflow-hidden rounded-2xl border border-border bg-surface-2/40 select-none",
          img ? "cursor-grab active:cursor-grabbing" : "cursor-default",
        )}
        style={{ aspectRatio: "1 / 1" }}
      >
        {img && geo ? (
          <img
            src={rawUrl ?? ""}
            alt="Photo framing preview"
            draggable={false}
            className="pointer-events-none absolute"
            style={{
              width: geo.dispW,
              height: geo.dispH,
              left: geo.x,
              top: geo.y,
              maxWidth: "none",
            }}
          />
        ) : (
          <span
            className="pointer-events-none absolute inset-0 grid place-items-center text-faint"
            aria-hidden
          >
            <span className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              {busy ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <ImagePlus className="size-6" strokeWidth={1.5} />
              )}
              <span className="text-[12.5px]">
                {busy ? "Reading…" : "Your photo will appear here"}
              </span>
            </span>
          </span>
        )}

        {/* dim everything outside the circular crop */}
        {img ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-[14%] rounded-full"
            style={{
              boxShadow: "0 0 0 2000px color-mix(in oklab, var(--background) 62%, transparent)",
            }}
          />
        ) : null}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[14%] rounded-full border border-foreground/20"
        />
      </div>

      {img ? (
        <div className="flex w-full max-w-[300px] flex-col gap-3">
          <label className="flex items-center gap-3">
            <span className="eyebrow shrink-0">Zoom</span>
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Photo zoom"
              className="h-1 w-full appearance-none rounded-full bg-surface-3 accent-[var(--profile-accent,var(--violet))]"
            />
          </label>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mono rounded-full border border-border px-3.5 py-1.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Choose another
            </button>
            <button
              type="button"
              onClick={() => {
                setImg(null);
                setRawUrl(null);
              }}
              className="mono rounded-full border border-border px-3.5 py-1.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel photo
            </button>
          </div>
        </div>
      ) : onRemove ? (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mono rounded-full border border-border px-4 py-1.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            Replace photo
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="mono rounded-full border border-border px-4 py-1.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-rose/40 hover:text-rose"
          >
            Remove photo
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="mono rounded-full border border-border px-4 py-1.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
        >
          Choose a photo
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          e.target.value = "";
          void chooseFile(file);
        }}
      />
    </div>
  );
}
