/**
 * DrawLayer — freehand drawing for the story editor.
 * Strokes live in normalized coordinates so they survive any canvas size;
 * the parent owns them (undo/redo), this layer only draws + captures.
 * Eraser, sizes, opacity, and a flattened PNG export for publishing.
 */

import { useCallback, useEffect, useRef } from "react";

export interface DrawPoint {
  x: number;
  y: number;
}

export interface DrawStroke {
  id: string;
  color: string;
  size: number;
  opacity: number;
  eraser: boolean;
  points: DrawPoint[];
}

export const DRAW_SIZES = [4, 8, 14, 24];

function paintStroke(
  ctx: CanvasRenderingContext2D,
  stroke: DrawStroke,
  width: number,
  height: number,
) {
  const pts = stroke.points;
  if (pts.length === 0) return;
  ctx.save();
  ctx.globalAlpha = stroke.opacity;
  ctx.globalCompositeOperation = stroke.eraser ? "destination-out" : "source-over";
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const first = pts[0];
  if (!first) {
    ctx.restore();
    return;
  }
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(first.x * width, first.y * height, stroke.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(first.x * width, first.y * height);
  for (let i = 1; i < pts.length - 1; i += 1) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    if (!p1 || !p2) continue;
    const midX = ((p1.x + p2.x) / 2) * width;
    const midY = ((p1.y + p2.y) / 2) * height;
    ctx.quadraticCurveTo(p1.x * width, p1.y * height, midX, midY);
  }
  const last = pts[pts.length - 1];
  if (!last) {
    ctx.restore();
    return;
  }
  ctx.lineTo(last.x * width, last.y * height);
  ctx.stroke();
  ctx.restore();
}

/** Flatten strokes to a PNG data URL at the given pixel size. */
export function exportDrawing(strokes: DrawStroke[], width: number, height: number): string | null {
  try {
    if (!strokes || strokes.length === 0) return null;
    if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height)) return null;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(2, Math.round(width));
    canvas.height = Math.max(2, Math.round(height));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    for (const stroke of strokes) {
      if (!stroke?.points?.length) continue;
      paintStroke(ctx, stroke, canvas.width, canvas.height);
    }
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export function DrawLayer({
  strokes,
  color,
  size,
  opacity,
  eraser,
  onStroke,
  canvasSize,
}: {
  strokes: DrawStroke[];
  color: string;
  size: number;
  opacity: number;
  eraser: boolean;
  onStroke: (stroke: DrawStroke) => void;
  canvasSize: { width: number; height: number };
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeRef = useRef<DrawStroke | null>(null);

  /* repaint on strokes / size change */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(2, Math.round(canvasSize.width * dpr));
    canvas.height = Math.max(2, Math.round(canvasSize.height * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokes) paintStroke(ctx, stroke, canvas.width, canvas.height);
    if (activeRef.current) paintStroke(ctx, activeRef.current, canvas.width, canvas.height);
  }, [strokes, canvasSize]);

  const pointFromEvent = useCallback((e: React.PointerEvent): DrawPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0.5, y: 0.5 };
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { x: 0.5, y: 0.5 };
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  }, []);

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokes) paintStroke(ctx, stroke, canvas.width, canvas.height);
    if (activeRef.current) paintStroke(ctx, activeRef.current, canvas.width, canvas.height);
  }, [strokes]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 size-full"
      style={{ touchAction: "none", cursor: "crosshair", zIndex: 30 }}
      aria-label="Drawing canvas"
      onPointerDown={(e) => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        activeRef.current = {
          id: `stroke-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
          color,
          size,
          opacity,
          eraser,
          points: [pointFromEvent(e)],
        };
        repaint();
      }}
      onPointerMove={(e) => {
        try {
          const active = activeRef.current;
          if (!active || e.buttons === 0) return;
          e.stopPropagation();
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;
          const events =
            typeof (e.nativeEvent as any).getCoalescedEvents === "function"
              ? (e.nativeEvent as any).getCoalescedEvents()
              : [e.nativeEvent];
          for (const evt of events as PointerEvent[]) {
            active.points.push({
              x: Math.max(0, Math.min(1, (evt.clientX - rect.left) / rect.width)),
              y: Math.max(0, Math.min(1, (evt.clientY - rect.top) / rect.height)),
            });
          }
          repaint();
        } catch {}
      }}
      onPointerUp={(e) => {
        const active = activeRef.current;
        activeRef.current = null;
        if (active && active.points.length > 0) onStroke(active);
        else repaint();
      }}
      onPointerCancel={() => {
        activeRef.current = null;
        repaint();
      }}
    />
  );
}
