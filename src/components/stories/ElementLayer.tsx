/**
 * ElementLayer — canvas gestures for the story editor.
 * Tap selects, drag moves, two-finger pinch scales + rotates, double-tap
 * edits text, drag-to-zone deletes. Handlers run in the capture phase so
 * selection (StoryCanvas, bubble phase) and gestures never fight.
 * Center snapping + alignment guides keep compositions tidy.
 */

import { useCallback, useRef, useState } from "react";

import { ELEMENT_LIMITS } from "@/lib/stories/elements";
import type { StoryElement } from "@/lib/stories/types";

interface LiveTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export function ElementLayer({
  elements,
  selectedId,
  onSelect,
  onTransform,
  onTransformEnd,
  onEditText,
  onDelete,
  onDragState,
  canvasRef,
  disabled = false,
  children,
}: {
  elements: StoryElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onTransform: (id: string, t: LiveTransform) => void;
  onTransformEnd: () => void;
  onEditText: (el: Extract<StoryElement, { kind: "text" }>) => void;
  onDelete: (id: string) => void;
  /** Live drag position for the delete zone; null when not dragging. */
  onDragState: (drag: { id: string; clientX: number; clientY: number } | null) => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const [guides, setGuides] = useState<{ v: boolean; h: boolean }>({ v: false, h: false });

  const elementsRef = useRef(elements);
  elementsRef.current = elements;
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    mode: "touch";
    startClient: { x: number; y: number };
    elStart: LiveTransform | null;
    elId: string | null;
    moved: boolean;
    pinchDist: number;
    pinchAngle: number;
  } | null>(null);
  const lastTap = useRef<{ at: number; x: number; y: number }>({ at: 0, x: 0, y: 0 });

  const elementById = useCallback((id: string | null): StoryElement | null => {
    if (!id) return null;
    return elementsRef.current.find((e) => e.id === id) ?? null;
  }, []);

  const toNormalized = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return { x: 0.5, y: 0.5 };
      return {
        x: Math.max(0.02, Math.min(0.98, (clientX - rect.left) / rect.width)),
        y: Math.max(0.02, Math.min(0.98, (clientY - rect.top) / rect.height)),
      };
    },
    [canvasRef],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 1) {
        gesture.current = {
          mode: "touch",
          startClient: { x: e.clientX, y: e.clientY },
          elStart: null,
          elId: null,
          moved: false,
          pinchDist: 0,
          pinchAngle: 0,
        };
      } else if (pointers.current.size === 2) {
        // Second finger: lock into pinch for the selected element.
        const pts = [...pointers.current.values()];
        const dx = pts[1]!.x - pts[0]!.x;
        const dy = pts[1]!.y - pts[0]!.y;
        const el = elementById(selectedRef.current);
        gesture.current = {
          mode: "touch",
          startClient: { x: e.clientX, y: e.clientY },
          elStart: el ? { x: el.x, y: el.y, scale: el.scale, rotation: el.rotation } : null,
          elId: el?.id ?? null,
          moved: true, // pinch is never a tap
          pinchDist: Math.max(1, Math.hypot(dx, dy)),
          pinchAngle: (Math.atan2(dy, dx) * 180) / Math.PI,
        };
        onDragState(null);
        setGuides({ v: false, h: false });
      }
    },
    [disabled, elementById, onDragState],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const g = gesture.current;
      if (!g || disabled) return;
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      /* two fingers: pinch scale + rotate */
      if (pointers.current.size >= 2 && g.elStart && g.elId) {
        const pts = [...pointers.current.values()];
        const dx = pts[1]!.x - pts[0]!.x;
        const dy = pts[1]!.y - pts[0]!.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        let rotation = g.elStart.rotation + (angle - g.pinchAngle);
        // Snap rotation near upright.
        const upright = ((rotation % 360) + 360) % 360;
        if (upright < 4 || upright > 356) rotation = Math.round(rotation / 360) * 360;
        const scale = Math.max(
          ELEMENT_LIMITS.minScale,
          Math.min(ELEMENT_LIMITS.maxScale, g.elStart.scale * (dist / g.pinchDist)),
        );
        onTransform(g.elId, { x: g.elStart.x, y: g.elStart.y, scale, rotation });
        return;
      }

      /* one finger: resolve the element lazily — selection lands in bubble
       * phase right after this capture handler, so read it on first move. */
      if (!g.elId) {
        const el = elementById(selectedRef.current);
        g.elId = el?.id ?? null;
        g.elStart = el ? { x: el.x, y: el.y, scale: el.scale, rotation: el.rotation } : null;
      }
      if (!g.elId || !g.elStart) return;

      const totalDx = e.clientX - g.startClient.x;
      const totalDy = e.clientY - g.startClient.y;
      if (!g.moved && Math.hypot(totalDx, totalDy) < 7) return;
      g.moved = true;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      let x = g.elStart.x + totalDx / rect.width;
      let y = g.elStart.y + totalDy / rect.height;
      x = Math.max(0.02, Math.min(0.98, x));
      y = Math.max(0.02, Math.min(0.98, y));

      // Center snapping with guides.
      const snapV = Math.abs(x - 0.5) < 0.018;
      const snapH = Math.abs(y - 0.5) < 0.018;
      if (snapV) x = 0.5;
      if (snapH) y = 0.5;
      setGuides((prev) => (prev.v === snapV && prev.h === snapH ? prev : { v: snapV, h: snapH }));

      onTransform(g.elId, { x, y, scale: g.elStart.scale, rotation: g.elStart.rotation });
      onDragState({ id: g.elId, clientX: e.clientX, clientY: e.clientY });
    },
    [disabled, elementById, canvasRef, onTransform, onDragState],
  );

  const endPointer = useCallback(
    (e: React.PointerEvent) => {
      const g = gesture.current;
      pointers.current.delete(e.pointerId);
      if (!g) return;

      if (pointers.current.size === 0) {
        gesture.current = null;
        setGuides({ v: false, h: false });
        onDragState(null);
        if (g.moved) {
          onTransformEnd();
          return;
        }
        /* a tap: double-tap on a text element opens the text editor */
        const now = Date.now();
        const last = lastTap.current;
        const isDouble =
          now - last.at < 320 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 28;
        lastTap.current = { at: now, x: e.clientX, y: e.clientY };
        if (isDouble) {
          const el = elementById(selectedRef.current);
          if (el?.kind === "text") {
            lastTap.current = { at: 0, x: 0, y: 0 };
            onEditText(el);
          }
        }
      } else if (pointers.current.size === 1) {
        // Dropping from pinch back to one finger: re-anchor the drag.
        const el = elementById(g.elId);
        const remaining = [...pointers.current.values()][0]!;
        gesture.current = {
          mode: "touch",
          startClient: { x: remaining.x, y: remaining.y },
          elStart: el ? { x: el.x, y: el.y, scale: el.scale, rotation: el.rotation } : null,
          elId: el?.id ?? null,
          moved: true,
          pinchDist: 0,
          pinchAngle: 0,
        };
      }
    },
    [elementById, onDragState, onEditText, onTransformEnd],
  );

  void toNormalized;

  return (
    <div
      className="absolute inset-0"
      style={{ touchAction: "none" }}
      onPointerDownCapture={onPointerDown}
      onPointerMoveCapture={onPointerMove}
      onPointerUpCapture={endPointer}
      onPointerCancelCapture={endPointer}
    >
      {children}
      {guides.v ? (
        <div className="se-guide" style={{ left: "50%", top: 0, bottom: 0, width: 1 }} />
      ) : null}
      {guides.h ? (
        <div className="se-guide" style={{ top: "50%", left: 0, right: 0, height: 1 }} />
      ) : null}
    </div>
  );
}

/** Delete-zone hit test shared by the editor. */
export function pointInRect(
  clientX: number,
  clientY: number,
  rect: DOMRect | null | undefined,
  padding = 12,
): boolean {
  if (!rect) return false;
  return (
    clientX >= rect.left - padding &&
    clientX <= rect.right + padding &&
    clientY >= rect.top - padding &&
    clientY <= rect.bottom + padding
  );
}
