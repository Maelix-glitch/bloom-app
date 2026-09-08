/**
 * Which brain is answering.
 *
 * Small, quiet, and in the header rather than buried in settings — because the
 * honest thing is for the person to be able to see whether they're reading the
 * remote model or the on-device fallback, and to force either one.
 *
 * It renders whatever `providers.ts` registers, so adding a third AI later is
 * a table entry, not a component change.
 */

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Cpu, Sparkles } from "lucide-react";

import {
  activeProvider,
  PROVIDERS,
  setActiveProvider,
  type CoachProvider,
} from "@/lib/coach/providers";
import { useSound } from "@/hooks/useSound";
import { cn } from "@/lib/utils";

export function ProviderPicker({
  /** What actually answered the last message, when it differs from the choice. */
  lastSource,
}: {
  lastSource?: "edge" | "local" | undefined;
}) {
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

  /*
   * If they chose the remote model but the last answer came from the device,
   * say so. Silently degrading is how people end up mistrusting an assistant:
   * the answers get shorter and they never learn why.
   */
  const degraded = current.remote && lastSource === "local";

  return (
    <div className="coach-provider" ref={ref}>
      <button
        type="button"
        className="coach-provider-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        title={degraded ? "Answered on this device — the coach function didn't reply" : current.blurb}
      >
        {current.remote ? <Sparkles className="size-3" /> : <Cpu className="size-3" />}
        <span className="truncate">{current.name}</span>
        {degraded ? <span className="coach-provider-dot" aria-label="answered offline" /> : null}
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
                {p.remote ? <Sparkles className="size-3.5" /> : <Cpu className="size-3.5" />}
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
