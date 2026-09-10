/**
 * FilterTool — curated Bloom looks plus quiet adjustments.
 * Non-destructive: the original media is preserved, the filter id +
 * adjustments travel with the story and render everywhere identically.
 */

import { useState } from "react";
import { RotateCcw } from "lucide-react";

import { StorySheet } from "./StorySheet";
import { DEFAULT_ADJUSTMENTS, STORY_FILTERS, adjustmentsToCss } from "@/lib/stories/catalogs";
import type { StoryAdjustments } from "@/lib/stories/types";
import { cn } from "@/lib/utils";

const SLIDERS: { id: keyof StoryAdjustments; label: string; min: number; max: number }[] = [
  { id: "brightness", label: "Brightness", min: -100, max: 100 },
  { id: "contrast", label: "Contrast", min: -100, max: 100 },
  { id: "saturation", label: "Saturation", min: -100, max: 100 },
  { id: "warmth", label: "Warmth", min: -100, max: 100 },
  { id: "fade", label: "Fade", min: 0, max: 100 },
];

export function FilterTool({
  preview,
  filterId,
  adjustments,
  onFilter,
  onAdjustments,
  onClose,
}: {
  /** Thumbnail data URL / remote URL, or null for a gradient swatch. */
  preview: string | null;
  filterId: string;
  adjustments: StoryAdjustments;
  onFilter: (id: string) => void;
  onAdjustments: (a: StoryAdjustments) => void;
  onClose: () => void;
}) {
  const [showAdjust, setShowAdjust] = useState(false);
  const touched =
    filterId !== "none" || JSON.stringify(adjustments) !== JSON.stringify(DEFAULT_ADJUSTMENTS);

  const thumb = (filterCss: string, wash?: [string, string, number]) => (
    <span className="relative block size-full overflow-hidden bg-surface-3">
      {preview ? (
        <img
          src={preview}
          alt=""
          draggable={false}
          className="size-full object-cover"
          style={{ filter: filterCss }}
        />
      ) : (
        <span
          className="block size-full"
          style={{
            background: "linear-gradient(160deg, #b7a6e8, #e0a3b8 55%, #eed9a4)",
            filter: filterCss,
          }}
        />
      )}
      {wash ? (
        <span
          className="absolute inset-0"
          style={{
            background: wash[0],
            mixBlendMode: wash[1] as React.CSSProperties["mixBlendMode"],
          }}
          aria-hidden
        />
      ) : null}
    </span>
  );

  return (
    <StorySheet
      title="Look"
      subtitle="Cinematic, never gimmicky."
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowAdjust((v) => !v)}
            aria-expanded={showAdjust}
            className={cn(
              "rounded-full border px-4 py-2 text-[12.5px] font-semibold transition-colors",
              showAdjust
                ? "border-border-strong bg-surface-3 text-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            Adjust
          </button>
          {touched ? (
            <button
              type="button"
              onClick={() => {
                onFilter("none");
                onAdjustments(DEFAULT_ADJUSTMENTS);
              }}
              className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <RotateCcw className="size-3.5" aria-hidden /> Reset
            </button>
          ) : (
            <span />
          )}
          <button type="button" onClick={onClose} className="bsheet-primary !h-10 px-5 text-[13px]">
            Done
          </button>
        </div>
      }
    >
      <div className="flex gap-3 overflow-x-auto pb-3 pt-1" role="radiogroup" aria-label="Filters">
        {STORY_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={filterId === f.id}
            onClick={() => onFilter(f.id)}
            className="se-filter-cell"
            data-active={filterId === f.id}
            title={f.hint}
          >
            <span className="se-filter-thumb">{thumb(f.css, f.wash)}</span>
            <span className="text-[11px] font-medium text-muted-foreground">{f.name}</span>
          </button>
        ))}
      </div>

      {showAdjust ? (
        <div
          className="flex flex-col gap-3 border-t border-border pt-4"
          style={{ filter: adjustmentsToCss(adjustments) === "none" ? undefined : undefined }}
        >
          {SLIDERS.map((s) => (
            <label key={s.id} className="grid grid-cols-[92px_1fr_40px] items-center gap-3">
              <span className="text-[12.5px] text-muted-foreground">{s.label}</span>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={1}
                value={adjustments[s.id]}
                onChange={(e) => onAdjustments({ ...adjustments, [s.id]: Number(e.target.value) })}
                aria-label={s.label}
                className="w-full accent-[var(--amber)]"
              />
              <span className="mono text-right text-[11px] text-faint">{adjustments[s.id]}</span>
            </label>
          ))}
          <p className="text-[11.5px] text-faint">
            Adjustments layer over the filter and never touch your original.
          </p>
        </div>
      ) : null}
    </StorySheet>
  );
}
