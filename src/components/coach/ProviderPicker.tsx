/**
 * Which online model is answering.
 *
 * Small, quiet, and in the header rather than buried in settings — the coach
 * is strictly online, and this lets the person choose where the request
 * starts (Best available, or a specific key). It renders whatever
 * `providers.ts` registers, so adding a model later is a table entry, not a
 * component change.
 */

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Sparkles } from "lucide-react";

import {
  activeProvider,
  PROVIDERS,
  setActiveProvider,
  type CoachProvider,
} from "@/lib/coach/providers";
import { useSound } from "@/hooks/useSound";
import { cn } from "@/lib/utils";

export function ProviderPicker() {
  const [current, setCurrent] = useState<CoachProvider>(() => activeProvider());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const { sound } = useSound();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="coach-provider" ref={ref}>
      <button
        type="button"
        className="coach-provider-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        title={current.blurb}
      >
        <Sparkles className="size-3" />
        <span className="truncate">{current.name}</span>
        <ChevronDown className="size-3 opacity-60" aria-hidden />
      </button>

      {open ? (
        <div className="coach-provider-menu" role="listbox" aria-label="Coach model">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="option"
              aria-selected={p.id === current.id}
              className={cn("coach-provider-item", p.id === current.id && "is-on")}
              onClick={() => {
                sound("tap");
                setActiveProvider(p.id);
                setCurrent(p);
                setOpen(false);
              }}
            >
              <span className="coach-provider-item-icon">
                <Sparkles className="size-3.5" />
              </span>
              <span className="min-w-0">
                <span className="coach-provider-item-name">{p.name}</span>
                <span className="coach-provider-item-blurb">{p.blurb}</span>
              </span>
              {p.id === current.id ? <Check className="size-3.5 shrink-0" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
