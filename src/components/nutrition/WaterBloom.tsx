import { useEffect, useMemo, useRef, useState } from "react";

import { useTrackers } from "@/hooks/useTrackers";
import { applyQuickAdd, readTrackerValue } from "@/components/tk/shared";
import { trackerDef } from "@/lib/trackers/core";
import { fmtLitres } from "@/lib/format";

import {
  BLOOM_STAGE_WORDS,
  bloomStageOf,
  mountWaterScene,
  type WaterScene,
} from "./waterBloomScene";

/**
 * Water the Bloom — the plan's water, as a scene (Brief v7 WATER slice;
 * the owner's chosen design, 2026-11-20).
 *
 * The M-145 prose paragraph ("775 ml × 4, with your meals…") is gone.
 * In its place: a custom-painted canvas — a glass vase that fills as
 * the day's water is logged, and the Bloom flower opening through
 * bud → opening → half bloom → full bloom as the level rises.
 *
 * Numbers stay honest and single-sourced:
 * - TARGET is the plan's own figure, handed in by the section
 *   (plan.hydration.targetMl — the composer's number, unchanged).
 *   The same guide value is what Trackers now measures against, so
 *   the two surfaces cannot disagree (see lib/trackers/waterTarget).
 * - DRUNK is today's water from the one tracker store, read with the
 *   exact helper the Trackers tile reads, and the quick-adds write
 *   through the exact path the tile's buttons use (applyQuickAdd) —
 *   no second store, no second write path, so Plan and Trackers can
 *   never show different days.
 *
 * The canvas is decoration; the numbers live in HTML text, and the
 * scene container speaks the progress in words for assistive tech.
 */
export function WaterBloomPanel({ targetMl }: { targetMl: number }) {
  const store = useTrackers();
  const water = trackerDef("water");
  const drunk = readTrackerValue(store, "water") ?? 0;
  const [notice, setNotice] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<WaterScene | null>(null);
  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = mountWaterScene(canvas, { reducedMotion: reduced });
    sceneRef.current = scene;
    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
  }, [reduced]);

  const progress = targetMl > 0 ? Math.min(1, drunk / targetMl) : 0;
  useEffect(() => {
    sceneRef.current?.setProgress(progress);
  }, [progress]);

  const stage = bloomStageOf(progress);
  const litres = (ml: number) => (ml / 1000).toFixed(1);
  const ariaLabel = `Water today: ${litres(drunk)} of ${litres(targetMl)} litres. The bloom is ${BLOOM_STAGE_WORDS[stage]}.`;

  const quickAdd = (amount: number) => {
    const error = applyQuickAdd(store, "water", amount);
    setNotice(error ?? `${water.name} noted.`);
  };

  return (
    <div className="mt-5">
      <p className="nut-group-label">Water</p>
      <div className="water-bloom">
        <div
          className="water-bloom-scene"
          data-water-bloom
          role="img"
          aria-label={ariaLabel}
        >
          <canvas ref={canvasRef} className="water-bloom-canvas" aria-hidden="true" />
        </div>
        <div className="water-bloom-side">
          <p className="water-bloom-figure">
            {fmtLitres(drunk)} of {fmtLitres(targetMl)}
          </p>
          <p className="water-bloom-line">A glass on waking, then sip through the day.</p>
          <div className="water-bloom-actions">
            {water.quickAdds.map((amount) => (
              <button
                key={amount}
                type="button"
                className="water-bloom-add"
                onClick={() => quickAdd(amount)}
              >
                +{water.format(amount)}
              </button>
            ))}
          </div>
          <p className="water-bloom-notice" aria-live="polite">
            {notice}
          </p>
        </div>
      </div>
    </div>
  );
}
