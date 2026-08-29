/**
 * The floating Cycle assistant — launcher half.
 * The launcher is instant and local; the conversation UI (panel) is
 * code-split and loads on first open, so nothing about the assistant blocks
 * the Cycle page. Never auto-opens; the dot lights only for a real, unseen
 * insight. Chat state lives here so closing/reopening preserves it.
 *
 * The answers come from a deterministic, context-grounded engine (see
 * lib/cycle/assistant) — provider-shaped so a language-model adapter can
 * replace it behind the same signature.
 */

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import type { CycleContext } from "@/lib/cycle/types";
import { deterministicProvider, genericAnswer, quickPromptsFor } from "@/lib/cycle/assistant";
import type { Insight } from "@/lib/cycle/intelligence";
import { dismissStore } from "@/lib/cycle/intelligence";

export interface Msg {
  id: string;
  role: "you" | "bloom";
  text: string;
}

const AssistantPanel = lazy(() =>
  import("./AssistantPanel").then((m) => ({ default: m.AssistantPanel })),
);

export const BloomMark = ({ className }: { className?: string }) => (
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

export function BloomCycleAI({
  context,
  insight,
  onSeenInsight,
  onQuickLog,
}: {
  context: CycleContext | null;
  insight: Insight | null;
  onSeenInsight?: () => void;
  onQuickLog?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [answering, setAnswering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const [useLogs, setUseLogs] = useState(true);
  useEffect(() => {
    try {
      const v = window.localStorage.getItem("bloom.cycle.assistant.ctx");
      if (v !== null) setUseLogs(v === "1");
    } catch {
      /* default stays on */
    }
  }, []);
  const toggleUseLogs = useCallback((on: boolean) => {
    setUseLogs(on);
    try {
      window.localStorage.setItem("bloom.cycle.assistant.ctx", on ? "1" : "0");
    } catch {
      /* session-only */
    }
  }, []);

  const prompts = useMemo(() => (context ? quickPromptsFor(context) : []), [context]);
  const showDot =
    Boolean(insight) &&
    messages.length === 0 &&
    !dismissStore.isDismissed(`insight-seen:${insight?.id ?? ""}`);

  const ask = useCallback(
    async (question: string) => {
      if (!context || answering) return; // prevent duplicate requests
      const q = question.trim();
      if (!q) return;
      setInput("");
      setError(null);
      setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "you", text: q }]);
      setAnswering(true);
      const run = (async () => {
        try {
          const answer =
            !useLogs || !context
              ? genericAnswer(q)
              : await deterministicProvider(context, q, { aborted: false });
          setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "bloom", text: answer }]);
        } catch {
          setError("Couldn't answer that just now — try again in a moment.");
        } finally {
          setAnswering(false);
        }
      })();
      inFlight.current = run;
    },
    [context, answering, useLogs],
  );

  const close = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);
  const toggle = useCallback(() => (open ? close() : setOpen(true)), [open, close]);

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

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={toggle}
        aria-label={open ? "Close Bloom assistant" : "Open the Bloom cycle assistant"}
        aria-expanded={open}
        className="cy-ai fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[70] sm:right-6 sm:bottom-6"
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
        <Suspense
          fallback={
            <div
              role="status"
              aria-label="Loading the assistant"
              className="fixed inset-x-0 bottom-0 z-[70] h-[52dvh] animate-pulse rounded-t-2xl border border-border bg-[#161722] sm:inset-auto sm:right-6 sm:bottom-[5.25rem] sm:h-[460px] sm:w-[380px] sm:rounded-2xl"
            />
          }
        >
          <AssistantPanel
            context={useLogs ? context : null}
            useLogs={useLogs}
            onToggleLogs={toggleUseLogs}
            onQuickLog={onQuickLog}
            insight={insight}
            prompts={prompts}
            messages={messages}
            input={input}
            setInput={setInput}
            ask={ask}
            answering={answering}
            error={error}
            onClose={close}
          />
        </Suspense>
      ) : null}
    </>
  );
}
