/**
 * TextTool — Instagram-exact text editor.
 * 5 IG styles: Classic, Modern, Neon, Typewriter, Strong.
 * Top: X + alignment, Done. Center: large centered text. Bottom: color palette + style selector.
 */

import { useEffect, useRef, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, Check, X } from "lucide-react";

import { STORY_FONTS, STORY_PALETTE, fontPresetById } from "@/lib/stories/catalogs";
import { ELEMENT_LIMITS } from "@/lib/stories/elements";
import type { StoryTextAlign, StoryTextBackground, StoryTextPreset } from "@/lib/stories/types";
import { cn } from "@/lib/utils";

export interface TextToolValue {
  text: string;
  preset: StoryTextPreset;
  align: StoryTextAlign;
  color: string;
  background: StoryTextBackground;
  opacity: number;
  animation: "none" | "fade" | "rise" | "type" | "float" | "pulse";
}

const IG_BACKGROUNDS: { id: StoryTextBackground; label: string; icon: string }[] = [
  { id: "none", label: "None", icon: "A" },
  { id: "pill", label: "Fill", icon: "A■" },
  { id: "highlight", label: "Mark", icon: "A▬" },
  { id: "outline", label: "Line", icon: "A□" },
];

export function TextTool({
  initial,
  defaultColor,
  onSave,
  onClose,
}: {
  initial: TextToolValue | null;
  defaultColor: string;
  onSave: (value: TextToolValue) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState<TextToolValue>(
    initial ?? {
      text: "",
      preset: "classic",
      align: "center",
      color: defaultColor || "#ffffff",
      background: "none",
      opacity: 100,
      animation: "none",
    },
  );
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const preset = fontPresetById(value.preset);

  useEffect(() => {
    const t = window.setTimeout(() => areaRef.current?.focus(), 100);
    return () => window.clearTimeout(t);
  }, []);

  const canSave = value.text.trim().length > 0;

  // Only show IG 5 main styles in UI, not legacy
  const igFonts = STORY_FONTS.filter((f) => ["classic", "modern", "neon", "typewriter", "strong"].includes(f.id));

  return (
    <div className="fixed inset-0 z-[92] flex flex-col bg-black/90 backdrop-blur-sm" role="dialog" aria-label="Add text">
      {/* Top bar - Instagram */}
      <div className="flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3">
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-full bg-white/10 text-white">
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-1 rounded-full bg-[#262626] p-1" role="radiogroup" aria-label="Alignment">
          {[
            { id: "left", icon: AlignLeft, label: "Left" },
            { id: "center", icon: AlignCenter, label: "Center" },
            { id: "right", icon: AlignRight, label: "Right" },
          ].map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={value.align === a.id}
              aria-label={a.label}
              onClick={() => setValue((v) => ({ ...v, align: a.id as StoryTextAlign }))}
              className={cn(
                "grid size-8 place-items-center rounded-full transition-colors",
                value.align === a.id ? "bg-white text-black" : "text-white/60",
              )}
            >
              <a.icon className="size-4" />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => canSave && onSave(value)}
          disabled={!canSave}
          aria-label="Done"
          className="rounded-full bg-white px-4 py-1.5 text-[14px] font-semibold text-black disabled:opacity-40"
        >
          Done
        </button>
      </div>

      {/* Center text - Instagram */}
      <div className="grid min-h-0 flex-1 place-items-center px-6 py-8">
        <textarea
          ref={areaRef}
          value={value.text}
          onChange={(e) => setValue((v) => ({ ...v, text: e.target.value.slice(0, ELEMENT_LIMITS.maxTextLength) }))}
          placeholder="Type something…"
          rows={3}
          maxLength={ELEMENT_LIMITS.maxTextLength}
          aria-label="Story text"
          className="w-full resize-none bg-transparent text-center outline-none placeholder:text-white/40"
          style={{
            fontFamily: preset.fontFamily,
            fontWeight: preset.fontWeight,
            fontStyle: preset.fontStyle,
            letterSpacing: preset.letterSpacing,
            lineHeight: preset.lineHeight,
            textTransform: preset.textTransform,
            fontSize: 32,
            color: value.color,
            textAlign: value.align,
            textShadow: preset.shadow,
            background:
              value.background === "none" ? "transparent" : value.background === "pill" ? value.color : "transparent",
            color: value.background === "pill" ? (value.color === "#ffffff" ? "#000" : "#fff") : value.color,
            padding: value.background !== "none" ? "8px 16px" : undefined,
            borderRadius: value.background === "pill" ? 8 : undefined,
            border: value.background === "outline" ? `2px solid ${value.color}` : undefined,
          }}
        />
      </div>

      {/* Bottom controls - Instagram */}
      <div className="flex flex-col gap-4 bg-black px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
        <p className="text-center text-[11px] tracking-wide text-white/40 tabular-nums">
          {value.text.length}/{ELEMENT_LIMITS.maxTextLength}
        </p>

        {/* Style selector - Instagram 5 styles */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1" role="radiogroup" aria-label="Text style">
          {igFonts.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={value.preset === f.id}
              onClick={() => setValue((v) => ({ ...v, preset: f.id as StoryTextPreset }))}
              className={cn(
                "flex h-[48px] min-w-[48px] shrink-0 flex-col items-center justify-center rounded-lg border px-3 transition-colors",
                value.preset === f.id ? "border-white bg-white text-black" : "border-[#363636] bg-[#121212] text-white",
              )}
            >
              <span
                style={{
                  fontFamily: f.fontFamily,
                  fontWeight: f.fontWeight,
                  fontStyle: f.fontStyle,
                  fontSize: 18,
                }}
              >
                Aa
              </span>
              <span className="mt-0.5 text-[9px] font-medium">{f.name}</span>
            </button>
          ))}
        </div>

        {/* Color palette - Instagram rainbow */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1" role="radiogroup" aria-label="Color">
          {STORY_PALETTE.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={value.color === s.color}
              aria-label={s.label}
              onClick={() => setValue((v) => ({ ...v, color: s.color }))}
              className={cn(
                "size-8 shrink-0 rounded-full border-2 transition-transform",
                value.color === s.color ? "border-white scale-110" : "border-transparent",
              )}
              style={{ background: s.color }}
            />
          ))}
          <label
            className="relative grid size-8 shrink-0 place-items-center rounded-full border-2 border-dashed border-white/30"
            style={{ background: "conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)" }}
          >
            <span className="sr-only">Custom</span>
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(value.color) ? value.color : "#ffffff"}
              onChange={(e) => setValue((v) => ({ ...v, color: e.target.value }))}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Custom color"
            />
          </label>
        </div>

        {/* Background toggle - Instagram A */}
        <div className="flex items-center justify-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-[#262626] p-1" role="radiogroup" aria-label="Background">
            {IG_BACKGROUNDS.map((b) => (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={value.background === b.id}
                onClick={() => setValue((v) => ({ ...v, background: b.id }))}
                className={cn(
                  "rounded-full px-3 py-1 text-[12px] font-semibold transition-colors",
                  value.background === b.id ? "bg-white text-black" : "text-white/60",
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
