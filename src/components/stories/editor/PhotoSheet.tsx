/**
 * PhotoSheet — everything you can do to one photo layer.
 *
 * The canvas owns the gestures (drag to reposition, pinch to zoom, double-tap
 * to fit); this sheet owns the numbers those gestures would otherwise make
 * impossible to reach: mask, frame, crop reset, flip, filter, opacity, border.
 * Every control writes to the element, so nothing here is decorative.
 */

import { useState } from "react";
import {
  FlipHorizontal,
  FlipVertical,
  Images,
  RefreshCw,
  Scan,
  Sparkles,
  Trash2,
} from "lucide-react";

import { StorySheet } from "../StorySheet";
import { FRAMES, MASKS, maskClipPath, maskRadius } from "@/lib/stories/canvas/masks";
import { STORY_FILTERS, filterById } from "@/lib/stories/catalogs";
import type { PhotoFrame, PhotoMask, StoryPhotoElement } from "@/lib/stories/types";
import { ColorField, FieldLabel, SliderRow, SwatchRow } from "./controls";

type Tab = "photo" | "shape" | "crop" | "look";

const TABS: { id: Tab; label: string }[] = [
  { id: "photo", label: "Photo" },
  { id: "shape", label: "Shape" },
  { id: "crop", label: "Crop" },
  { id: "look", label: "Look" },
];

export function PhotoSheet({
  el,
  onUpdate,
  onReplace,
  onRemove,
  onClose,
}: {
  el: StoryPhotoElement;
  onUpdate: (patch: Partial<StoryPhotoElement>) => void;
  onReplace: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("photo");

  return (
    <StorySheet
      title={el.slot ? `Photo · ${el.slot}` : "Photo"}
      subtitle="Reposition it on the canvas, or set it exactly here."
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="se-sheet-btn grow"
            onClick={() =>
              onUpdate({ zoom: 1, panX: 0, panY: 0, rotation: 0, flipX: false, flipY: false })
            }
          >
            <RefreshCw className="size-3.5" aria-hidden /> Reset transform
          </button>
          <button
            type="button"
            className="se-sheet-btn se-sheet-btn-danger"
            onClick={onRemove}
            aria-label="Remove this photo"
          >
            <Trash2 className="size-3.5" aria-hidden /> Remove
          </button>
        </div>
      }
    >
      <div className="se-tabs" role="tablist" aria-label="Photo options">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className="se-tab"
            data-active={tab === t.id}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "photo" ? (
        <div className="se-panel">
          <button type="button" className="se-wide-btn" onClick={onReplace}>
            <Images className="size-4" aria-hidden />
            {el.src ? "Replace photo" : "Add a photo"}
          </button>

          <label className="se-field">
            <FieldLabel>Alt text</FieldLabel>
            <input
              value={el.alt}
              onChange={(e) => onUpdate({ alt: e.target.value.slice(0, 160) })}
              placeholder="Describe this photo for screen readers"
              maxLength={160}
              className="se-input"
            />
          </label>

          <SliderRow
            label="Opacity"
            min={10}
            max={100}
            value={el.opacity ?? 100}
            suffix="%"
            onChange={(v) => onUpdate({ opacity: v })}
          />
        </div>
      ) : null}

      {tab === "shape" ? (
        <div className="se-panel">
          <SwatchRow
            label="Mask"
            value={el.mask}
            onChange={(id) => onUpdate({ mask: id as PhotoMask })}
            options={MASKS.map((m) => ({
              id: m.id,
              name: m.name,
              node: (
                <span
                  className="se-mask-chip"
                  style={{
                    clipPath: maskClipPath(m.id),
                    borderRadius: maskClipPath(m.id) ? undefined : maskRadius(m.id),
                  }}
                />
              ),
            }))}
          />

          <SwatchRow
            label="Frame"
            value={el.frame}
            onChange={(id) => onUpdate({ frame: id as PhotoFrame })}
            options={FRAMES.map((f) => ({
              id: f.id,
              name: f.name,
              node: <span className="se-frame-chip" data-frame={f.id} />,
            }))}
          />

          <ColorField
            label="Frame color"
            value={el.frameColor}
            onChange={(c) => onUpdate({ frameColor: c ?? "#FFFFFF" })}
          />

          <SliderRow
            label="Drop shadow"
            min={0}
            max={1}
            step={1}
            value={el.shadow ? 1 : 0}
            onChange={(v) => onUpdate({ shadow: v >= 1 })}
          />
        </div>
      ) : null}

      {tab === "crop" ? (
        <div className="se-panel">
          <SliderRow
            label="Zoom"
            min={1}
            max={3}
            step={0.01}
            value={el.zoom}
            onChange={(v) => onUpdate({ zoom: v })}
          />
          <SliderRow
            label="Shift across"
            min={-50}
            max={50}
            value={el.panX * 100}
            suffix="%"
            onChange={(v) => onUpdate({ panX: v / 100 })}
          />
          <SliderRow
            label="Shift down"
            min={-50}
            max={50}
            value={el.panY * 100}
            suffix="%"
            onChange={(v) => onUpdate({ panY: v / 100 })}
          />
          <SliderRow
            label="Rotate"
            min={-180}
            max={180}
            value={el.rotation}
            suffix="°"
            onChange={(v) => onUpdate({ rotation: v })}
          />

          <div className="se-btn-row">
            <button
              type="button"
              className="se-icon-btn"
              data-active={el.flipX}
              aria-pressed={el.flipX}
              onClick={() => onUpdate({ flipX: !el.flipX })}
            >
              <FlipHorizontal className="size-4" aria-hidden /> Flip
            </button>
            <button
              type="button"
              className="se-icon-btn"
              data-active={el.flipY}
              aria-pressed={el.flipY}
              onClick={() => onUpdate({ flipY: !el.flipY })}
            >
              <FlipVertical className="size-4" aria-hidden /> Mirror
            </button>
            <button
              type="button"
              className="se-icon-btn"
              data-active={el.fit === "contain"}
              aria-pressed={el.fit === "contain"}
              onClick={() => onUpdate({ fit: el.fit === "contain" ? "cover" : "contain" })}
            >
              <Scan className="size-4" aria-hidden /> {el.fit === "contain" ? "Fill" : "Fit"}
            </button>
          </div>
        </div>
      ) : null}

      {tab === "look" ? (
        <div className="se-panel">
          <FieldLabel hint="Subtle, still photographic">Filter</FieldLabel>
          <div className="se-filter-grid">
            {STORY_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onUpdate({ filterId: f.id })}
                aria-pressed={el.filterId === f.id}
                className="se-filter-tile"
                data-active={el.filterId === f.id}
                title={f.hint}
              >
                <span
                  className="se-filter-swatch"
                  style={{
                    backgroundImage:
                      "linear-gradient(140deg,#f0e6d2,#c9a3a8 45%,#6d6f86 78%,#2a2740)",
                    filter: filterById(f.id).css,
                  }}
                  aria-hidden
                />
                <span>{f.name}</span>
              </button>
            ))}
          </div>

          <ColorField
            label="Border"
            value={el.border?.color ?? null}
            allowNone
            onChange={(c) =>
              onUpdate({
                border: c ? { color: c, width: el.border ? el.border.width : 3 } : null,
              })
            }
          />
          {el.border ? (
            <SliderRow
              label="Border width"
              min={1}
              max={14}
              value={el.border.width}
              onChange={(v) =>
                onUpdate({
                  border: el.border ? { color: el.border.color, width: v } : null,
                })
              }
            />
          ) : null}

          <button
            type="button"
            className="se-toggle"
            role="switch"
            aria-checked={el.blurFill}
            data-on={el.blurFill}
            onClick={() => onUpdate({ blurFill: !el.blurFill })}
          >
            <span>
              <Sparkles className="mr-1.5 inline size-3.5" aria-hidden />
              Blurred photo fill
            </span>
            <span className="se-toggle-track" aria-hidden>
              <span className="se-toggle-knob" />
            </span>
          </button>
        </div>
      ) : null}
    </StorySheet>
  );
}
