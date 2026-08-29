/**
 * The floating Cycle assistant — conversation panel.
 * Loads lazily on first open (see BloomCycleAI). Compact header, grounded
 * answers revealed with a gentle typewriter that can be stopped, contextual
 * quick prompts gated by real data, retry on failure, auto-scroll only when
 * the reader is near the bottom, Escape + focus handled by the dock.
 */

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Square, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CycleContext } from "@/lib/cycle/types";
import type { QuickPrompt } from "@/lib/cycle/assistant";
import type { Insight } from "@/lib/cycle/intelligence";
import type { Msg } from "./BloomCycleAI";
import { BloomMark } from "./BloomCycleAI";

export function AssistantPanel({
  context,
  insight,
  prompts,
  messages,
  input,
  setInput,
  ask,
  answering,
  error,
  onClose,
  useLogs = true,
  onToggleLogs,
  onQuickLog,
}: {
  context: CycleContext | null;
  insight: Insight | null;
  prompts: QuickPrompt[];
  messages: Msg[];
  input: string;
  setInput: (v: string) => void;
  ask: (q: string) => Promise<void>;
  answering: boolean;
  error: string | null;
  onClose: () => void;
  useLogs?: boolean | undefined;
  onToggleLogs?: ((on: boolean) => void) | undefined;
  onQuickLog?: (() => void) | undefined;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [reveal, setReveal] = useState<{ id: string; len: number } | null>(null);

  const last = messages[messages.length - 1] ?? null;
  const lastIsBloom = last?.role === "bloom";

  /* typewriter for the newest bloom message (instant under reduced motion) */
  useEffect(() => {
    if (!lastIsBloom || !last) {
      setReveal(null);
      return;
    }
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setReveal({ id: last.id, len: last.text.length });
      return;
    }
    const total = last.text.length;
    const step = Math.max(7, Math.ceil(total / 22));
    let shown = 0;
    setReveal({ id: last.id, len: 0 });
    const timer = window.setInterval(() => {
      shown = Math.min(total, shown + step);
      setReveal({ id: last.id, len: shown });
      if (shown >= total) window.clearInterval(timer);
    }, 34);
    return () => window.clearInterval(timer);
  }, [last?.id, last?.role, lastIsBloom]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages, reveal]);

  const greeted = messages.length > 0;

  return (
    <div
      role="dialog"
      aria-label="Bloom cycle assistant"
      className={cn(
        "fixed z-[70] flex flex-col overflow-hidden border border-border bg-[#161722] shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)]",
        "inset-x-0 bottom-0 max-h-[min(82dvh,660px)] rounded-t-2xl",
        "sm:inset-auto sm:right-6 sm:bottom-[5.25rem] sm:w-[380px] sm:max-h-[560px] sm:rounded-2xl",
      )}
    >
      <header className="flex items-center gap-2.5 border-b border-border/70 px-4 py-3">
        <span
          className="grid size-7 place-items-center rounded-full"
          style={{
            background: "color-mix(in oklab, var(--violet) 16%, transparent)",
            color: "var(--violet)",
          }}
        >
          <BloomMark className="size-4" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[13px] font-semibold">Bloom</p>
          <p className="mono truncate text-[9.5px] uppercase tracking-[0.08em] text-faint">
            cycle context · answers from your logs
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close assistant"
          className="grid size-7 place-items-center rounded-full text-faint transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-surface/30 px-4 py-1.5">
        <label className="flex min-w-0 cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={useLogs}
            onChange={(e) => onToggleLogs?.(e.target.checked)}
            className="size-3.5 accent-[var(--violet)]"
            aria-label="Use my cycle logs for answers"
          />
          <span className="mono truncate text-[9px] uppercase tracking-[0.07em] text-faint">
            {useLogs ? "reading your on-device logs" : "context off — general answers"}
          </span>
        </label>
        <div className="flex shrink-0 gap-1.5">
          {onQuickLog ? (
            <button
              type="button"
              onClick={onQuickLog}
              className="mono rounded-full border border-border px-2.5 py-1 text-[9px] uppercase tracking-[0.07em] text-muted-foreground transition-colors hover:text-foreground"
            >
              log today
            </button>
          ) : null}
          <button
            type="button"
            onClick={() =>
              document
                .getElementById("cycle-patterns")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="mono rounded-full border border-border px-2.5 py-1 text-[9px] uppercase tracking-[0.07em] text-muted-foreground transition-colors hover:text-foreground"
          >
            my patterns
          </button>
        </div>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5">
        {!greeted ? (
          <div className="flex flex-col gap-3">
            {insight ? (
              <div className="rounded-xl border border-border bg-surface/60 p-3">
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  {insight.text}
                </p>
                <p className="mono mt-1.5 text-[9px] uppercase tracking-[0.08em] text-faint">
                  from your data · {insight.why}
                </p>
              </div>
            ) : null}
            <p className="text-[12.5px] text-muted-foreground">
              {context?.currentDay
                ? `Cycle day ${context.currentDay}${context.currentPhase ? ` · ${context.currentPhase}` : ""}. Ask me about what's happening, why estimates move, or what's worth logging.`
                : "Ask me about phases, estimates, or what's worth logging — I only answer from what you've actually logged."}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {prompts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => void ask(p.question)}
                  className="rounded-full border border-border bg-surface/50 px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="flex flex-col gap-3" aria-live="polite">
            {messages.map((m) => {
              const shownLen = reveal !== null && reveal.id === m.id ? reveal.len : m.text.length;
              const display = m.role === "bloom" ? m.text.slice(0, shownLen) : m.text;
              const typing =
                m.role === "bloom" &&
                reveal !== null &&
                reveal.id === m.id &&
                reveal.len < m.text.length;
              return (
                <li
                  key={m.id}
                  className={cn(
                    "max-w-[92%] whitespace-pre-line text-[13px] leading-relaxed",
                    m.role === "you"
                      ? "ml-auto rounded-xl rounded-br-sm bg-surface-3/80 px-3 py-2 text-foreground"
                      : "rounded-xl rounded-bl-sm border border-border/70 bg-surface/60 px-3 py-2 text-muted-foreground",
                  )}
                >
                  {display}
                  {typing ? (
                    <button
                      type="button"
                      onClick={() => setReveal({ id: m.id, len: m.text.length })}
                      aria-label="Stop revealing answer"
                      className="mono ml-2 inline-flex items-center gap-1 align-middle text-[9px] uppercase tracking-[0.08em] text-faint hover:text-foreground"
                    >
                      <Square className="size-2" aria-hidden /> stop
                    </button>
                  ) : null}
                  {m.role === "bloom" && answering && m !== last ? (
                    <span className="mono text-[10px] text-faint">…thinking</span>
                  ) : null}
                </li>
              );
            })}
            {error ? (
              <li className="flex items-center justify-between gap-3 rounded-lg border border-rose/40 bg-rose/5 px-3 py-2 text-[12px] text-rose">
                {error}
                <button
                  type="button"
                  onClick={() => {
                    const prevYou = [...messages].reverse().find((m) => m.role === "you");
                    if (prevYou) void ask(prevYou.text);
                  }}
                  className="mono rounded-full border border-border px-2.5 py-1 text-[9px] uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground"
                >
                  Retry
                </button>
              </li>
            ) : null}
          </ol>
        )}
      </div>

      <form
        className="flex items-center gap-2 border-t border-border/70 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
      >
        <label className="sr-only" htmlFor="bloom-ask">
          Ask Bloom about your cycle
        </label>
        <input
          id="bloom-ask"
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={context ? "Ask about your cycle…" : "Loading your cycle context…"}
          className="min-w-0 flex-1 rounded-full border border-border bg-surface/60 px-3.5 py-2 text-[13px] outline-none transition-colors placeholder:text-faint/70 focus:border-border-strong"
        />
        <button
          type="submit"
          disabled={!input.trim() || answering || !context}
          aria-label="Send question"
          className="grid size-9 shrink-0 place-items-center rounded-full text-[var(--primary-foreground)] transition-transform enabled:hover:scale-105 disabled:opacity-40"
          style={{ background: "linear-gradient(140deg, var(--violet), var(--sky))" }}
        >
          <ArrowUp className="size-4" />
        </button>
      </form>
    </div>
  );
}
