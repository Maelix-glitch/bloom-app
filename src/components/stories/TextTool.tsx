/**
 * TextTool — the full-screen, distraction-free text editor.
 * Ten Bloom presets, alignment, curated colors + custom, backgrounds,
 * opacity, and subtle entrance animations. Cancelling never destroys the
 * previous text; the editor owns undo.
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
  animation: "none" | "fade" | "rise" | "type";
}

const BACKGROUNDS: { id: StoryTextBackground; label: string }[] = [
  { id: "none", label: "None" },
  { id: "pill", label: "Pill" },
  { id: "highlight", label: "Mark" },
  { id: "outline", label: "Line" },
  { id: "veil", label: "Veil" },
];

const ANIMATIONS: { id: TextToolValue["animation"]; label: string }[] = [
  { id: "none", label: "Still" },
  { id: "fade", label: "Fade" },
  { id: "rise", label: "Rise" },
  { id: "type", label: "Type" },
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
      color: defaultColor,
      background: "none",
      opacity: 100,
      animation: "none",
    },
  );
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const preset = fontPresetById(value.preset);

  useEffect(() => {
    const t = window.setTimeout(() => areaRef.current?.focus(), 120);
    return () => window.clearTimeout(t);
  }, []);

  const canSave = value.text.trim().length > 0;

  return (
    <div
      className="bstory fixed inset-0 z-[92] flex flex-col bg-[rgba(10,8,20,0.86)] backdrop-blur-xl"
      role="dialog"
      aria-label="Add text"
    >
      {/* top bar */}
      <div className="flex items-center justify-between px-4 pt-[max(14px,env(safe-area-inset-top))]">
        <button type="button" onClick={onClose} aria-label="Cancel text" className="sv-icon-btn">
          <X className="size-5" />
        </button>
        <div
          className="flex items-center gap-1 rounded-full bg-white/10 p-1"
          role="radiogroup"
          aria-label="Text alignment"
        >
          {(
            [
              { id: "left", icon: AlignLeft, label: "Align left" },
              { id: "center", icon: AlignCenter, label: "Align center" },
              { id: "right", icon: AlignRight, label: "Align right" },
            ] as const
          ).map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={value.align === a.id}
              aria-label={a.label}
              onClick={() => setValue((v) => ({ ...v, align: a.id }))}
              className={cn(
                "grid size-9 place-items-center rounded-full transition-colors",
                value.align === a.id ? "bg-white text-black" : "text-white/70",
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
          aria-label="Save text"
          className="se-chip-btn !h-10 disabled:opacity-40"
          data-primary="true"
        >
          <Check className="size-4" aria-hidden /> Done
        </button>
      </div>

      {/* canvas */}
      <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto px-8 py-6">
        <textarea
          ref={areaRef}
          value={value.text}
          onChange={(e) =>
            setValue((v) => ({ ...v, text: e.target.value.slice(0, ELEMENT_LIMITS.maxTextLength) }))
          }
          placeholder="Tap to type…"
          rows={4}
          maxLength={ELEMENT_LIMITS.maxTextLength}
          aria-label="Story text"
          data-bg={value.background}
          className="se-text w-full resize-none bg-transparent text-center outline-none placeholder:text-white/35"
          style={{
            fontFamily: preset.fontFamily,
            fontWeight: preset.fontWeight,
            fontStyle: preset.fontStyle,
            letterSpacing: preset.letterSpacing,
            lineHeight: preset.lineHeight,
            textTransform: preset.textTransform,
            fontSize: Math.min(44, preset.baseSize),
            color: value.color,
            opacity: value.opacity / 100,
            textAlign: value.align,
            textShadow: value.background === "none" ? preset.shadow : "none",
            background:
              value.background === "none" || value.background === "outline"
                ? "transparent"
                : "rgba(20,17,29,0.62)",
            borderColor: value.background === "outline" ? value.color : undefined,
          }}
        />
      </div>

      {/* controls */}
      <div className="flex flex-col gap-3 px-4 pb-[max(18px,env(safe-area-inset-bottom))]">
        <p
          className="mono text-center text-[10px] uppercase tracking-[0.1em] text-white/40"
          role="status"
        >
          {value.text.length}/{ELEMENT_LIMITS.maxTextLength}
        </p>

        {/* presets */}
        <div className="flex gap-1 overflow-x-auto pb-1" role="radiogroup" aria-label="Text style">
          {STORY_FONTS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={value.preset === f.id}
              onClick={() => setValue((v) => ({ ...v, preset: f.id }))}
              className="se-preset shrink-0"
              data-active={value.preset === f.id}
              title={f.hint}
            >
              <span
                aria-hidden
                style={{
                  fontFamily: f.fontFamily,
                  fontWeight: f.fontWeight,
                  fontStyle: f.fontStyle,
                  fontSize: 21,
                  lineHeight: 1.2,
                }}
              >
                Ag
              </span>
              <span className="text-[9.5px]">{f.name}</span>
            </button>
          ))}
        </div>

        {/* colors */}
        <div
          className="flex items-center gap-2.5 overflow-x-auto py-1"
          role="radiogroup"
          aria-label="Text color"
        >
          {STORY_PALETTE.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={value.color === s.color}
              aria-label={s.label}
              title={s.label}
              onClick={() => setValue((v) => ({ ...v, color: s.color }))}
              className="se-swatch"
              data-active={value.color === s.color}
              style={{ background: s.color }}
            />
          ))}
          <label
            className="se-swatch relative grid shrink-0 place-items-center overflow-hidden !outline-dashed"
            style={{
              background: "conic-gradient(#e0a3b8, #eed9a4, #9db89a, #9fb6cf, #b7a6e8, #e0a3b8)",
            }}
            title="Custom color"
          >
            <span className="sr-only">Custom color</span>
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(value.color) ? value.color : "#f4efe4"}
              onChange={(e) => setValue((v) => ({ ...v, color: e.target.value }))}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Custom text color"
            />
          </label>
        </div>

        {/* background + animation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <div
            className="flex items-center gap-1 rounded-full bg-white/10 p-1"
            role="radiogroup"
            aria-label="Text background"
          >
            {BACKGROUNDS.map((b) => (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={value.background === b.id}
                onClick={() => setValue((v) => ({ ...v, background: b.id }))}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors",
                  value.background === b.id ? "bg-white text-black" : "text-white/70",
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
          <div
            className="flex items-center gap-1 rounded-full bg-white/10 p-1"
            role="radiogroup"
            aria-label="Text animation"
          >
            {ANIMATIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={value.animation === a.id}
                onClick={() => setValue((v) => ({ ...v, animation: a.id }))}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors",
                  value.animation === a.id ? "bg-white text-black" : "text-white/70",
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
