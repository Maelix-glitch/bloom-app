/**
 * The floating Cycle assistant. Deterministic engine behind a provider
 * abstraction (a model adapter can replace it without touching this UI).
 * Never auto-opens, never nags; the launcher dot lights only for a real,
 * unshown insight. Answers reveal with a gentle typewriter that can be
 * stopped, and every answer is grounded in the passed context — no
 * invented facts, no diagnosis, no fake streaming promises.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Square, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CycleContext } from "@/lib/cycle/types";
import { deterministicProvider, quickPromptsFor } from "@/lib/cycle/assistant";
import type { Insight } from "@/lib/cycle/intelligence";
import { dismissStore } from "@/lib/cycle/intelligence";

interface Msg {
  id: string;
  role: "you" | "bloom";
  text: string;
}

const BloomMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
    <path
      d="M4 17c2.5-7.5 5.5-11.5 8-11.5s5.5 4 8 11.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <circle cx="12" cy="17.5" r="1.6" fill="currentColor" />
  </svg>
);

export function AssistantDock({
  context,
  insight,
  onSeenInsight,
}: {
  context: CycleContext | null;
  insight: Insight | null;
  onSeenInsight?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [answering, setAnswering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const revealTimer = useRef<number | undefined>(undefined);
  const abortRef = useRef<{ aborted: boolean } | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const [revealLen, setRevealLen] = useState(0);
  const [revealTarget, setRevealTarget] = useState<Msg | null>(null);

  const prompts = useMemo(() => (context ? quickPromptsFor(context) : []), [context]);
  const showDot =
    Boolean(insight) &&
    !dismissStore.isDismissed(`insight-seen:${insight?.id ?? ""}`) &&
    messages.length === 0;

  /* typewriter reveal — cancel-safe, cleaned up on unmount/stop. Roughly a
   * second of gentle pacing for a full answer, instant under reduced motion. */
  useEffect(() => {
    if (!revealTarget) return;
    const total = revealTarget.text.length;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setRevealLen(total);
      setAnswering(false);
      return;
    }
    const step = Math.max(6, Math.ceil(total / 26));
    let shown = 0;
    setRevealLen(0);
    revealTimer.current = window.setInterval(() => {
      shown = Math.min(total, shown + step);
      setRevealLen(shown);
      if (shown >= total) {
        window.clearInterval(revealTimer.current);
        setAnswering(false);
      }
    }, 40);
    return () => window.clearInterval(revealTimer.current);
  }, [revealTarget]);

  const stopReveal = useCallback(() => {
    window.clearInterval(revealTimer.current);
    if (revealTarget) {
      setRevealLen(revealTarget.text.length);
      setAnswering(false);
      setRevealTarget(null);
    }
  }, [revealTarget]);

  const ask = useCallback(
    async (question: string) => {
      if (!context || answering) return;
      const q = question.trim();
      if (!q) return;
      setInput("");
      setError(null);
      const mine: Msg = { id: `u-${Date.now()}`, role: "you", text: q };
      setMessages((m) => [...m, mine]);
      setAnswering(true);
      abortRef.current = { aborted: false };
      const ctrl = abortRef.current;
      try {
        const answer = await deterministicProvider(context, q, ctrl);
        if (ctrl.aborted) return;
        const a: Msg = { id: `a-${Date.now()}`, role: "bloom", text: answer };
        setMessages((m) => [...m, a]);
        setRevealTarget(a);
      } catch {
        setError("Couldn't answer that just now — try again in a moment.");
        setAnswering(false);
      }
    },
    [context, answering],
  );

  /* auto-scroll only when the user is already near the bottom */
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    if (near) el.scrollTop = el.scrollHeight;
  }, [messages, revealLen, answering]);

  const close = useCallback(() => {
    setOpen(false);
    stopReveal();
    abortRef.current = { aborted: true };
    launcherRef.current?.focus();
  }, [stopReveal]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (open && insight) onSeenInsight?.();
  }, [open, insight, onSeenInsight]);

  const greeted = messages.length > 0;

  return (
    <>
      {/* launcher */}
      <button
        ref={launcherRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={open ? "Close Bloom assistant" : "Open the Bloom cycle assistant"}
        aria-expanded={open}
        className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[70] grid size-[46px] place-items-center rounded-full border text-foreground shadow-[0_18px_40px_-18px_rgba(0,0,0,0.85)] transition-[transform,border-color] duration-[var(--motion-med)] hover:scale-[1.05] active:scale-[0.98] sm:right-6 sm:bottom-6"
        style={{
          background:
            "linear-gradient(150deg, color-mix(in oklab, var(--violet) 34%, var(--surface-2)), color-mix(in oklab, var(--sky) 22%, var(--surface-2)))",
          borderColor: "color-mix(in oklab, var(--violet) 45%, transparent)",
        }}
      >
        {open ? <X className="size-[18px]" /> : <BloomMark className="size-5" />}
        {showDot && !open ? (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-[#14151b] bg-[color:var(--cycle-ovulation)]"
          />
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Bloom cycle assistant"
          className={cn(
            "fixed z-[70] flex flex-col overflow-hidden border border-border bg-[#161722] shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)]",
            "inset-x-0 bottom-0 max-h-[min(78dvh,640px)] rounded-t-2xl",
            "sm:inset-auto sm:right-6 sm:bottom-[5.25rem] sm:w-[380px] sm:rounded-2xl",
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
              onClick={close}
              aria-label="Close assistant"
              className="grid size-7 place-items-center rounded-full text-faint transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </header>

          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5">
            {!greeted ? (
              <div className="flex flex-col gap-3">
                {insight ? (
                  <div className="rounded-xl border border-[color:var(--border)] bg-surface/60 p-3">
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
                  const isLast = messages[messages.length - 1]?.id === m.id;
                  const display =
                    m.role === "bloom" && revealTarget?.id === m.id
                      ? m.text.slice(0, revealLen)
                      : m.text;
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
                      {m.role === "bloom" && revealTarget?.id === m.id ? (
                        <button
                          type="button"
                          onClick={stopReveal}
                          aria-label="Stop revealing answer"
                          className="mono ml-2 inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.08em] text-faint align-middle hover:text-foreground"
                        >
                          <Square className="size-2" aria-hidden /> stop
                        </button>
                      ) : null}
                      {isLast && m.role === "bloom" && answering && revealTarget?.id !== m.id ? (
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
                      onClick={() => void ask(messages[messages.length - 2]?.text ?? "")}
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
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void ask(input);
                }
              }}
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
      ) : null}
    </>
  );
}
