/**
 * ShapeSheet + LayersSheet + DataSheet.
 *
 * Three small trays that share one rule: everything visible is a real edit.
 * The layer manager in particular is deliberately flat — no trees, no
 * grouping — because on a phone you want to see the whole stack at once and
 * tap twice to reorder.
 */

import {
  ArrowDownToLine,
  ArrowUpToLine,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  Unlock,
} from "lucide-react";

import { StorySheet } from "../StorySheet";
import { SHAPES, SHAPE_GROUPS, shapeById } from "@/lib/stories/canvas/shapes";
import {
  METRIC_HINTS,
  METRIC_LABELS,
  metricReading,
  readBloomStoryData,
} from "@/lib/stories/data/metrics";
import type {
  StoryDataMetric,
  StoryDataVariant,
  StoryElement,
  StoryShapeElement,
} from "@/lib/stories/types";
import { ColorField, FieldLabel, SliderRow } from "./controls";

/* ------------------------------- shapes ---------------------------------- */

export function ShapeSheet({
  el,
  onUpdate,
  onRemove,
  onClose,
}: {
  el: StoryShapeElement;
  onUpdate: (patch: Partial<StoryShapeElement>) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const def = shapeById(el.shape);
  return (
    <StorySheet
      title={def?.name ?? "Shape"}
      subtitle="Decor stays behind your words unless you send it forward."
      onClose={onClose}
      footer={
        <button type="button" className="se-sheet-btn se-sheet-btn-danger" onClick={onRemove}>
          <Trash2 className="size-3.5" aria-hidden /> Remove shape
        </button>
      }
    >
      <div className="se-panel">
        {SHAPE_GROUPS.map((g) => (
          <div key={g.id} className="flex flex-col gap-1.5">
            <FieldLabel>{g.label}</FieldLabel>
            <div className="se-shape-grid">
              {SHAPES.filter((s) => s.group === g.id).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onUpdate({ shape: s.id })}
                  aria-pressed={el.shape === s.id}
                  aria-label={s.name}
                  className="se-shape-tile"
                  data-active={el.shape === s.id}
                  title={s.name}
                >
                  <ShapeGlyph id={s.id} color={el.fill ?? "#F4EFE4"} />
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="se-divider" aria-hidden />
        <ColorField
          label="Fill"
          value={el.fill}
          allowNone
          onChange={(c) => onUpdate({ fill: c })}
        />
        <ColorField
          label="Outline"
          value={el.stroke}
          allowNone
          onChange={(c) => onUpdate({ stroke: c })}
        />
        <SliderRow
          label="Outline width"
          min={1}
          max={12}
          value={el.strokeWidth}
          onChange={(v) => onUpdate({ strokeWidth: v })}
        />
        <SliderRow
          label="Softness"
          min={0}
          max={40}
          value={el.blur}
          onChange={(v) => onUpdate({ blur: v })}
        />
        <SliderRow
          label="Opacity"
          min={5}
          max={100}
          value={el.opacity ?? 100}
          suffix="%"
          onChange={(v) => onUpdate({ opacity: v })}
        />
      </div>
    </StorySheet>
  );
}

export function ShapeGlyph({ id, color, size = 26 }: { id: string; color: string; size?: number }) {
  const def = shapeById(id);
  if (!def) return null;
  if (def.render.mode === "roundRect") {
    return (
      <span
        style={{
          width: size,
          height: size,
          display: "block",
          background: def.stroke ? "transparent" : color,
          border: def.stroke ? `2px solid ${color}` : undefined,
          borderRadius: `${def.render.radius * 100}%`,
        }}
        aria-hidden
      />
    );
  }
  if (def.render.mode === "radial") {
    return (
      <span
        style={{
          width: size,
          height: size,
          display: "block",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color} 0%, transparent 72%)`,
        }}
        aria-hidden
      />
    );
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden focusable="false">
      <path
        d={def.d}
        fill={def.stroke ? "none" : color}
        stroke={def.stroke ? color : "none"}
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* -------------------------------- layers --------------------------------- */

function labelFor(el: StoryElement): string {
  if (el.name) return el.name;
  switch (el.kind) {
    case "text":
      return el.text.trim().slice(0, 24) || "Text";
    case "photo":
      return el.slot ? `Photo · ${el.slot}` : "Photo";
    case "shape":
      return shapeById(el.shape)?.name ?? "Shape";
    case "data":
      return METRIC_LABELS[el.metric];
    case "sticker":
      return "Sticker";
    case "gif":
      return "GIF";
    case "drawing":
      return "Drawing";
    case "music":
      return "Music";
    default:
      return el.kind;
  }
}

const KIND_ABBR: Record<string, string> = {
  text: "Tx",
  photo: "Ph",
  shape: "Sh",
  data: "Dt",
  sticker: "St",
  gif: "Gf",
  drawing: "Dr",
  poll: "Pl",
  question: "Qs",
  slider: "Sl",
  countdown: "Cd",
  mention: "Mt",
  date: "Da",
  music: "Mu",
};

export function LayersSheet({
  elements,
  selectedId,
  onSelect,
  onMove,
  onPatch,
  onDuplicate,
  onDelete,
  onClose,
}: {
  elements: StoryElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** +1 forward, −1 backward. */
  onMove: (id: string, delta: number) => void;
  onPatch: (id: string, patch: Partial<StoryElement>) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const ordered = [...elements].sort((a, b) => b.z - a.z);
  return (
    <StorySheet
      title="Layers"
      subtitle={`${elements.length} on the canvas — top of the list is in front.`}
      onClose={onClose}
      label="Layer stack"
    >
      <ul className="se-layer-list">
        {ordered.map((el, i) => (
          <li key={el.id} className="se-layer-row" data-active={selectedId === el.id}>
            <button
              type="button"
              className="se-layer-main"
              onClick={() => onSelect(el.id)}
              aria-current={selectedId === el.id}
            >
              <span className="se-layer-badge" aria-hidden>
                {KIND_ABBR[el.kind] ?? "··"}
              </span>
              <span className="se-layer-name">{labelFor(el)}</span>
              {el.locked ? (
                <Lock className="size-3 shrink-0 opacity-60" aria-label="Locked" />
              ) : null}
              {el.visible === false ? (
                <EyeOff className="size-3 shrink-0 opacity-60" aria-label="Hidden" />
              ) : null}
            </button>
            <span className="se-layer-ops">
              <button
                type="button"
                onClick={() => onMove(el.id, 1)}
                disabled={i === 0}
                aria-label={`Bring ${labelFor(el)} forward`}
                className="se-op-btn"
              >
                <ArrowUpToLine className="size-3.5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onMove(el.id, -1)}
                disabled={i === ordered.length - 1}
                aria-label={`Send ${labelFor(el)} backward`}
                className="se-op-btn"
              >
                <ArrowDownToLine className="size-3.5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onPatch(el.id, { visible: el.visible === false })}
                aria-label={el.visible === false ? `Show ${labelFor(el)}` : `Hide ${labelFor(el)}`}
                className="se-op-btn"
              >
                {el.visible === false ? (
                  <EyeOff className="size-3.5" aria-hidden />
                ) : (
                  <Eye className="size-3.5" aria-hidden />
                )}
              </button>
              <button
                type="button"
                onClick={() => onPatch(el.id, { locked: !el.locked })}
                aria-label={el.locked ? `Unlock ${labelFor(el)}` : `Lock ${labelFor(el)}`}
                className="se-op-btn"
              >
                {el.locked ? (
                  <Unlock className="size-3.5" aria-hidden />
                ) : (
                  <Lock className="size-3.5" aria-hidden />
                )}
              </button>
              <button
                type="button"
                onClick={() => onDuplicate(el.id)}
                aria-label={`Duplicate ${labelFor(el)}`}
                className="se-op-btn"
              >
                <Copy className="size-3.5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onDelete(el.id)}
                aria-label={`Delete ${labelFor(el)}`}
                className="se-op-btn se-op-btn-danger"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </span>
          </li>
        ))}
      </ul>
    </StorySheet>
  );
}

/* --------------------------------- data ---------------------------------- */

const METRICS: StoryDataMetric[] = [
  "mood",
  "sleep",
  "water",
  "movement",
  "study",
  "energy",
  "habits",
  "streak",
  "points",
  "cycle",
  "today",
];

const VARIANTS: { id: StoryDataVariant; label: string }[] = [
  { id: "card", label: "Card" },
  { id: "ring", label: "Ring" },
  { id: "bars", label: "Bar" },
  { id: "inline", label: "Inline" },
  { id: "list", label: "List" },
  { id: "phase", label: "Phase" },
];

/**
 * Real readings only. A metric with nothing logged is shown greyed out with
 * the reason, never with an invented number.
 */
export function DataSheet({
  data,
  onAdd,
  onPatch,
  onRemove,
  selectedId,
  onClose,
}: {
  data: ReturnType<typeof readBloomStoryData>;
  onAdd: (metric: StoryDataMetric, variant: StoryDataVariant) => void;
  onPatch?: (patch: {
    variant?: StoryDataVariant;
    label?: string;
    accent?: string;
    manualValue?: string | null;
  }) => void;
  onRemove?: () => void;
  selectedId?: string | null;
  onClose: () => void;
}) {
  return (
    <StorySheet
      title="Bloom data"
      subtitle="Pulled from what you actually logged. Nothing is estimated or invented."
      onClose={onClose}
      label="Data widgets"
    >
      <ul className="se-data-list">
        {METRICS.map((metric) => {
          const reading = metricReading(data, metric);
          return (
            <li key={metric} className="se-data-row" data-empty={!reading}>
              <span className="se-data-body">
                <span className="se-data-title">{METRIC_LABELS[metric]}</span>
                <span className="se-data-note">
                  {reading
                    ? `${reading.value}${reading.sub ? ` · ${reading.sub}` : ""}`
                    : METRIC_HINTS[metric]}
                </span>
              </span>
              <span className="se-data-add">
                {VARIANTS.filter((v) => v.id !== "phase" || metric === "cycle")
                  .filter((v) => v.id !== "list" || metric === "habits")
                  .map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className="se-mini-btn"
                      onClick={() => onAdd(metric, v.id)}
                      aria-label={`Add ${METRIC_LABELS[metric]} as ${v.label}`}
                    >
                      {v.label}
                    </button>
                  ))}
              </span>
            </li>
          );
        })}
      </ul>
      {selectedId && onPatch ? (
        <SelectedDataControls onPatch={onPatch} onRemove={onRemove} />
      ) : null}
    </StorySheet>
  );
}

function SelectedDataControls({
  onPatch,
  onRemove,
}: {
  onPatch: (patch: {
    variant?: StoryDataVariant;
    label?: string;
    accent?: string;
    manualValue?: string | null;
  }) => void;
  onRemove?: (() => void) | undefined;
}) {
  return (
    <div className="se-panel">
      <div className="se-divider" aria-hidden />
      <FieldLabel>This widget</FieldLabel>
      <div className="flex gap-1 overflow-x-auto pb-1" role="radiogroup" aria-label="Widget style">
        {VARIANTS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={false}
            className="se-mini-btn"
            onClick={() => onPatch({ variant: v.id })}
          >
            {v.label}
          </button>
        ))}
      </div>
      <label className="se-field">
        <FieldLabel hint="Optional">Custom label</FieldLabel>
        <input
          onChange={(e) => onPatch({ label: e.target.value.slice(0, 28) })}
          placeholder="Today"
          maxLength={28}
          className="se-input"
        />
      </label>
      <label className="se-field">
        <FieldLabel hint="Used when Bloom has nothing logged">Your own number or word</FieldLabel>
        <input
          onChange={(e) => onPatch({ manualValue: e.target.value.slice(0, 24) || null })}
          placeholder="e.g. 6h 10m"
          maxLength={24}
          className="se-input"
        />
      </label>
      <ColorField label="Accent" value="#EED9A4" onChange={(c) => c && onPatch({ accent: c })} />
      {onRemove ? (
        <button type="button" className="se-sheet-btn se-sheet-btn-danger" onClick={onRemove}>
          <Trash2 className="size-3.5" aria-hidden /> Remove widget
        </button>
      ) : null}
    </div>
  );
}
