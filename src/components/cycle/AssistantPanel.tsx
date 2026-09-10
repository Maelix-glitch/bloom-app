/**
 * AssistantPanel — the conversation half of the floating Cycle assistant.
 *
 * `BloomCycleAI` owns the state (messages, the question, the in-flight flag,
 * the "use my logs" switch); this component only renders it. Every answer is
 * computed from the person's own cycle record by `lib/cycle/assistant`, so the
 * panel never has anything to invent — when the record is thin the engine says
 * so, and the panel shows the honest "log more first" path instead.
 *
 * Mobile it docks to the bottom of the screen as a sheet; from `sm` up it floats
 * beside the launcher. Escape closes it (handled by the launcher).
 */

import { useEffect, useRef, type FormEvent } from "react";
import { Loader2, Send, X } from "lucide-react";

import type { CycleContext } from "@/lib/cycle/types";
import type { Insight } from "@/lib/cycle/intelligence";
import type { QuickPrompt } from "@/lib/cycle/assistant";
import type { Msg } from "./BloomCycleAI";
import { BloomMark } from "./BloomCycleAI";

export interface AssistantPanelProps {
  context: CycleContext | null;
  useLogs: boolean;
  onToggleLogs: (on: boolean) => void;
  onQuickLog?: (() => void) | undefined;
  insight: Insight | null;
  prompts: QuickPrompt[];
  messages: Msg[];
  input: string;
  setInput: (value: string) => void;
  ask: (question: string) => Promise<void>;
  answering: boolean;
  error: string | null;
  onClose: () => void;
}

export function AssistantPanel({
  context,
  useLogs,
  onToggleLogs,
  onQuickLog,
  insight,
  prompts,
  messages,
  input,
  setInput,
  ask,
  answering,
  error,
  onClose,
}: AssistantPanelProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  /* Keep the newest message in view as the thread grows. */
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, answering]);

  useEffect(() => {
    if (messages.length === 0) inputRef.current?.focus();
  }, [messages.length]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const question = input.trim();
    if (!question || answering) return;
    void ask(question);
  };

  const showPrompts = messages.length === 0;

  return (
    <div
      role="dialog"
      aria-label="Bloom cycle assistant"
      className="cy-ai-panel fixed inset-x-0 bottom-0 z-[70] flex max-h-[80dvh] flex-col overflow-hidden rounded-t-2xl border border-border bg-surface/95 backdrop-blur-xl sm:inset-auto sm:right-6 sm:bottom-[5.25rem] sm:max-h-[520px] sm:w-[380px] sm:rounded-2xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* header */}
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full border border-border text-primary">
          <BloomMark className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-foreground">Bloom</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {answering ? "Reading your record…" : "Talks about your actual cycle data"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the assistant"
          className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* thread */}
      <div ref={scrollerRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {showPrompts ? (
          <>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {context
                ? "Ask about your estimates, what they rest on, or what would sharpen them."
                : "Log a period start and I can talk you through what it means."}
            </p>
            {insight ? (
              <button
                type="button"
                onClick={() => void ask("What is Bloom noticing about my cycles?")}
                className="block w-full rounded-xl border border-primary/25 bg-surface-2/60 p-3 text-left transition-colors hover:border-primary/45"
              >
                <span className="eyebrow block">What Bloom noticed</span>
                <span className="mt-1.5 block text-[13px] leading-relaxed text-foreground">
                  {insight.text}
                </span>
              </button>
            ) : null}
          </>
        ) : null}

        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "you"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary/15 px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground"
                : "max-w-[90%] whitespace-pre-line rounded-2xl rounded-bl-md border border-border bg-surface-2/60 px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground"
            }
          >
            {m.text}
          </div>
        ))}

        {answering ? (
          <p className="flex items-center gap-2 text-[12px] text-muted-foreground" role="status">
            <Loader2 className="size-3.5 animate-spin" />
            Thinking
          </p>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-rose/30 bg-rose/5 px-3 py-2 text-[12px] text-rose">
            {error}
          </p>
        ) : null}
      </div>

      {/* quick prompts — only while the thread is empty, so they never crowd it */}
      {showPrompts && prompts.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {prompts.slice(0, 4).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => void ask(p.question)}
              disabled={answering}
              className="rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* context switch + composer */}
      <form onSubmit={submit} className="border-t border-border px-3 pb-3 pt-2.5">
        <div className="mb-2 flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={useLogs}
              onChange={(e) => onToggleLogs(e.target.checked)}
              className="size-3.5 accent-primary"
            />
            Use my cycle record
          </label>
          {onQuickLog ? (
            <button
              type="button"
              onClick={onQuickLog}
              className="ml-auto text-[11px] text-primary underline-offset-2 hover:underline"
            >
              Log a day
            </button>
          ) : null}
        </div>
        <div className="flex items-end gap-2 rounded-xl border border-border bg-surface-2/60 px-3 py-2 transition-colors focus-within:border-border-strong">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask about your cycle"
            aria-label="Ask Bloom about your cycle"
            className="max-h-24 min-h-[22px] flex-1 resize-none bg-transparent text-[13px] leading-relaxed text-foreground outline-none placeholder:text-faint"
          />
          <button
            type="submit"
            disabled={!input.trim() || answering}
            aria-label="Send"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
          >
            <Send className="size-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default AssistantPanel;
