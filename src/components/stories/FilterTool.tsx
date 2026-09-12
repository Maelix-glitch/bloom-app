/**
 * FilterTool — Instagram-exact filter carousel.
 * Dark sheet, horizontal scroll thumbnails like IG, with Adjust.
 */

import { useState } from "react";
import { RotateCcw } from "lucide-react";

import { DEFAULT_ADJUSTMENTS, STORY_FILTERS, adjustmentsToCss } from "@/lib/stories/catalogs";
import type { StoryAdjustments } from "@/lib/stories/types";
import { cn } from "@/lib/utils";

const SLIDERS: { id: keyof StoryAdjustments; label: string; min: number; max: number }[] = [
  { id: "brightness", label: "Brightness", min: -100, max: 100 },
  { id: "contrast", label: "Contrast", min: -100, max: 100 },
  { id: "saturation", label: "Saturation", min: -100, max: 100 },
  { id: "warmth", label: "Warmth", min: -100, max: 100 },
];

export function FilterTool({
  preview,
  filterId,
  adjustments,
  onFilter,
  onAdjustments,
  onClose,
}: {
  preview: string | null;
  filterId: string;
  adjustments: StoryAdjustments;
  onFilter: (id: string) => void;
  onAdjustments: (a: StoryAdjustments) => void;
  onClose: () => void;
}) {
  const [showAdjust, setShowAdjust] = useState(false);
  const touched = filterId !== "none" || JSON.stringify(adjustments) !== JSON.stringify(DEFAULT_ADJUSTMENTS);

  const thumb = (filterCss: string, wash?: [string, string, number]) => (
    <span className="relative block size-full overflow-hidden bg-[#262626]">
      {preview ? (
        <img src={preview} alt="" draggable={false} className="size-full object-cover" style={{ filter: filterCss }} />
      ) : (
        <span className="block size-full" style={{ background: "linear-gradient(45deg, #feda75, #d62976)", filter: filterCss }} />
      )}
      {wash ? (
        <span
          className="absolute inset-0"
          style={{ background: wash[0], mixBlendMode: wash[1] as React.CSSProperties["mixBlendMode"] }}
          aria-hidden
        />
      ) : null}
    </span>
  );

  return (
    <div className="fixed inset-0 z-[91] flex flex-col justify-end bg-black/60" role="dialog" aria-label="Filters">
      <div className="flex max-h-[70vh] w-full flex-col rounded-t-[12px] bg-[#121212] border-t border-[#262626]">
        <div className="flex flex-col gap-3 border-b border-[#262626] px-4 py-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-[#363636]" />
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-white">Filters</h2>
            <button type="button" onClick={onClose} className="text-[14px] font-medium text-[#0095f6]">
              Done
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-4 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2" role="radiogroup" aria-label="Filters">
            {STORY_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={filterId === f.id}
                onClick={() => onFilter(f.id)}
                className="flex flex-col items-center gap-1.5 shrink-0"
                title={f.hint}
              >
                <span
                  className={cn(
                    "block size-[64px] overflow-hidden rounded-lg border-2 transition-all",
                    filterId === f.id ? "border-white scale-[1.05]" : "border-transparent",
                  )}
                >
                  {thumb(f.css, f.wash)}
                </span>
                <span className={cn("text-[11px] font-medium", filterId === f.id ? "text-white" : "text-[#a8a8a8]")}>
                  {f.name}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowAdjust((v) => !v)}
              aria-expanded={showAdjust}
              className={cn(
                "rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors",
                showAdjust ? "border-white bg-white text-black" : "border-[#363636] bg-[#262626] text-white",
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
                className="flex items-center gap-1.5 text-[13px] text-[#a8a8a8] hover:text-white"
              >
                <RotateCcw className="size-4" /> Reset
              </button>
            ) : (
              <span />
            )}
          </div>

          {showAdjust ? (
            <div className="flex flex-col gap-4 border-t border-[#262626] pt-4">
              {SLIDERS.map((s) => (
                <label key={s.id} className="grid grid-cols-[90px_1fr_40px] items-center gap-3">
                  <span className="text-[13px] text-[#a8a8a8]">{s.label}</span>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={1}
                    value={adjustments[s.id]}
                    onChange={(e) => onAdjustments({ ...adjustments, [s.id]: Number(e.target.value) })}
                    aria-label={s.label}
                    className="w-full accent-white"
                  />
                  <span className="text-right text-[11px] text-[#737373] tabular-nums">{adjustments[s.id]}</span>
                </label>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 -z-10" />
    </div>
  );
}
