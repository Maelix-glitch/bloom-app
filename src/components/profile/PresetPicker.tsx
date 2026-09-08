/**
 * The photographs Bloom offers instead of two grey initials.
 *
 * A horizontal rail rather than a grid: a grid of nine photos dominates the
 * sheet and makes "upload your own" look like the afterthought, whereas a rail
 * reads as a suggestion you can flick past. Each swatch borrows its own
 * dominant hue for the selected ring, so the choice looks intentional rather
 * than like a system highlight dropped on top of a picture.
 */

import { Check } from "lucide-react";
import { motion } from "motion/react";

import { useSound } from "@/hooks/useSound";
import { PRESET_AVATARS, presetPath } from "@/lib/profile/presetAvatars";

export function PresetPicker({
  value,
  onPick,
}: {
  /** The currently chosen `preset:` path, if any. */
  value: string | null;
  onPick: (path: string) => void;
}) {
  const { sound } = useSound();

  return (
    <div className="bedit-presets">
      <p className="bedit-presets-label">Or choose one of ours</p>
      <div className="bedit-presets-rail" role="radiogroup" aria-label="Suggested profile photos">
        {PRESET_AVATARS.map((p, i) => {
          const path = presetPath(p.id);
          const on = value === path;
          return (
            <motion.button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={p.label}
              title={p.label}
              className="bedit-preset"
              data-on={on}
              style={{ ["--preset-tint" as string]: p.tint }}
              onClick={() => {
                sound("tap");
                onPick(path);
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * i, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              whileTap={{ scale: 0.94 }}
            >
              <img src={p.src} alt="" loading="lazy" />
              <span className="bedit-preset-tick" aria-hidden>
                <Check size={12} strokeWidth={3} />
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
