/**
 * Story editor — shared sheet primitives.
 *
 * Compact, touch-first controls that every tray reuses: swatch rows, hex
 * entry, labelled sliders, segmented rows. Nothing here is a desktop panel
 * shrunk down; each control is a 44px target with a visible selected state
 * that does not depend on colour alone.
 */

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import {
  BLOOM_PALETTE,
  isValidHex,
  normalizeHex,
  paletteById,
} from "@/lib/stories/canvas/backgrounds";
import { cn } from "@/lib/utils";

/* ------------------------------ recent colors ---------------------------- */

const RECENT_COLORS_KEY = "bloom.story.colors.recent.v1";
const SAVED_COLORS_KEY = "bloom.story.colors.saved.v1";

function readColors(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list)
      ? list.filter((v): v is string => typeof v === "string" && isValidHex(v))
      : [];
  } catch {
    return [];
  }
}

function writeColors(key: string, list: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(list.slice(0, 24)));
  } catch {
    /* best-effort */
  }
}

export function recentColors(): string[] {
  return readColors(RECENT_COLORS_KEY);
}

export function savedColors(): string[] {
  return readColors(SAVED_COLORS_KEY);
}

export function rememberColor(color: string): void {
  if (!isValidHex(color)) return;
  const hex = normalizeHex(color);
  writeColors(RECENT_COLORS_KEY, [hex, ...readColors(RECENT_COLORS_KEY).filter((c) => c !== hex)]);
}

export function saveColor(color: string): string[] {
  const hex = normalizeHex(color);
  const list = readColors(SAVED_COLORS_KEY);
  const next = list.includes(hex) ? list.filter((c) => c !== hex) : [hex, ...list];
  writeColors(SAVED_COLORS_KEY, next);
  return next;
}

/* --------------------------------- label --------------------------------- */

export function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <p className="se-field-label">
      {children}
      {hint ? <span>{hint}</span> : null}
    </p>
  );
}

/* --------------------------------- slider -------------------------------- */

export function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="se-slider-row">
      <span className="se-slider-name">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="se-slider-value">
        {Math.round(value * 100) / 100}
        {suffix}
      </span>
    </label>
  );
}

/* ------------------------------ segment row ------------------------------ */

export function SegmentRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: T; label: string; icon?: React.ComponentType<{ className?: string }> }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-1 overflow-x-auto pb-0.5" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            onClick={() => onChange(o.id)}
            className="se-seg"
            data-active={value === o.id}
          >
            {o.icon ? <o.icon className="size-3.5" aria-hidden /> : null}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ color picker ----------------------------- */

export function ColorField({
  label,
  value,
  onChange,
  allowNone = false,
}: {
  label: string;
  value: string | null;
  onChange: (color: string | null) => void;
  allowNone?: boolean;
}) {
  const [hex, setHex] = useState(value ?? "");
  const [tick, setTick] = useState(0);
  const recents = recentColors();
  const saved = savedColors();

  useEffect(() => {
    setHex(value ?? "");
  }, [value]);

  const commit = (next: string) => {
    onChange(next);
    rememberColor(next);
    setTick((t) => t + 1);
  };

  const current = value ?? "#FFFFFF";

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>

      <div
        className="flex items-center gap-2 overflow-x-auto pb-0.5"
        role="radiogroup"
        aria-label={label}
      >
        {allowNone ? (
          <button
            type="button"
            role="radio"
            aria-checked={value === null}
            aria-label="No color"
            onClick={() => onChange(null)}
            className="se-swatch se-swatch-none"
            data-active={value === null}
          >
            <span className="se-swatch-slash" aria-hidden />
          </button>
        ) : null}
        {BLOOM_PALETTE.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={current.toLowerCase() === s.color.toLowerCase()}
            aria-label={s.label}
            title={s.label}
            onClick={() => commit(s.color)}
            className="se-swatch"
            data-active={current.toLowerCase() === s.color.toLowerCase()}
            style={{ background: s.color }}
          />
        ))}
      </div>

      {recents.length > 0 || saved.length > 0 ? (
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          {[...new Set([...saved, ...recents])].slice(0, 14).map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Use ${c}`}
              title={c}
              onClick={() => commit(c)}
              className="se-swatch"
              data-active={current.toUpperCase() === c.toUpperCase()}
              style={{ background: c }}
            />
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <label
          className="se-swatch relative grid shrink-0 place-items-center overflow-hidden"
          style={{
            background: `conic-gradient(from 0deg, ${current}, #e0a3b8, #eed9a4, #9db89a, #9fb6cf, #b7a6e8, ${current})`,
          }}
          title="Custom color"
        >
          <span className="sr-only">Custom color</span>
          <input
            type="color"
            value={isValidHex(current) ? (current.length === 7 ? current : "#ffffff") : "#ffffff"}
            onChange={(e) => commit(normalizeHex(e.target.value))}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={`Custom ${label}`}
          />
        </label>
        <input
          value={hex}
          onChange={(e) => {
            const next = e.target.value.trim();
            setHex(next);
            if (isValidHex(next)) commit(normalizeHex(next));
          }}
          placeholder="#F4EFE4"
          maxLength={9}
          spellCheck={false}
          aria-label={`${label} hex value`}
          className="se-hex-input"
        />
        <button
          type="button"
          onClick={() => {
            saveColor(current);
            setTick((t) => t + 1);
          }}
          className="se-mini-btn"
          title="Save this color"
        >
          Save
        </button>
      </div>
      <span className="sr-only" aria-live="polite">
        {paletteById(
          BLOOM_PALETTE.find((p) => p.color.toUpperCase() === current.toUpperCase())?.id ?? "",
        )?.label ?? current}
        {tick > 0 ? "" : ""}
      </span>
    </div>
  );
}

/* -------------------------------- swatch --------------------------------- */

export function SwatchRow({
  label,
  options,
  value,
  onChange,
  columns = 5,
}: {
  label: string;
  options: { id: string; name: string; node: React.ReactNode; aspect?: number }[];
  value: string;
  onChange: (id: string) => void;
  columns?: number;
}) {
  void columns;
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <div className="se-swatch-grid">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-label={o.name}
            aria-pressed={value === o.id}
            className="se-swatch-cell"
            data-active={value === o.id}
          >
            <span className="se-swatch-art">{o.node}</span>
            <span className="se-swatch-name">{o.name}</span>
            {value === o.id ? <Check className="se-swatch-check" aria-hidden /> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- toggle -------------------------------- */

export function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("se-toggle", checked && "se-toggle-on")}
    >
      <span>{label}</span>
      <span className="se-toggle-track" aria-hidden>
        <span className="se-toggle-knob" />
      </span>
    </button>
  );
}
