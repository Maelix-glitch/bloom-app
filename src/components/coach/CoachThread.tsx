import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";

import type { CoachMessage } from "@/hooks/useCoachSystem";
import type { Starter } from "@/lib/coach/ui-helpers";
import { coachEstimateForMessage } from "@/lib/nutrition/coachLog";
import { CoachGlyph } from "./bloom-mark";
import { BloomMessage } from "./BloomMessage";
import { UserMessage } from "./UserMessage";
import { EmptyWelcome } from "./EmptyWelcome";

function ThinkingRow({ slow }: { slow: boolean }) {
  return (
    <div className="coach-thinking" aria-label="Bloom is thinking" role="status">
      <div className="coach-thinking-head">
        <CoachGlyph size={15} active />
        <span className="coach-thinking-name">Bloom</span>
        <span className="coach-thinking-word">
          {slow ? "taking a little longer…" : "thinking…"}
        </span>
      </div>
      <div className="coach-thinking-line" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}

/* M-207 (F-13, live shape): a resumed thread — above all the imported
   cloud thread, which lands as ONE conversation — can span many local
   days, and the thread showed no date anywhere (message stamps are
   clock times only). The once-per-day attribution then read as the same
   caption repeating inside "one day": live, the identical caption at
   12:40 AM, 6:00 PM and 8:55 PM is in fact the first reply of three
   different days (24 / 26 / 28 Aug). A quiet divider names each day as
   it starts, so the day's single attribution visibly belongs to a new
   day. Day keys and labels both read the message's own local day. */
function localDayKey(time: string): string {
  const d = new Date(time);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayDividerLabel(time: string): string | null {
  const d = new Date(time);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" as const } : {}),
  });
}

function ThreadLoading() {
  return (
    <div className="coach-thread-center" role="status">
      <div className="coach-thread-center-mark">
        <CoachGlyph size={26} active />
      </div>
      <p>Opening your private conversations…</p>
    </div>
  );
}

/**
 * The scrolling conversation. Owns stick-to-bottom behaviour — never yanks the
 * reader away from older messages; a quiet jump control appears instead.
 */
export function CoachThread({
  conversationKey,
  loading,
  messages,
  previews,
  freshId,
  thinking,
  responseSlow,
  showWelcome,
  starters,
  welcomeGreeting,
  welcomePhaseLine,
  welcomeMemory,
  onStart,
  onRetry,
  onOfflineAnswer,
  onRegenerate,
  onTellMeMore,
  onMakePlan,
  onBlockAction,
}: {
  conversationKey: string;
  loading: boolean;
  messages: CoachMessage[];
  previews: Record<string, string>;
  freshId: string | null;
  thinking: boolean;
  responseSlow: boolean;
  showWelcome: boolean;
  starters: Starter[];
  /** Personal opener from the page — name + hour, when onboarding knows them. */
  welcomeGreeting?: string | null | undefined;
  /** One hedged science line about the current cycle phase, when tracked. */
  welcomePhaseLine?: string | null | undefined;
  /** The newest remembered fact, so a returning conversation picks up. */
  welcomeMemory?: string | null | undefined;
  onStart: (starter: Starter) => void;
  onRetry: (message: CoachMessage) => void;
  /** Offered on failed sends: answer the question from the on-device engine. */
  onOfflineAnswer?: ((message: CoachMessage) => void) | undefined;
  onRegenerate: (message: CoachMessage) => void;
  onTellMeMore: () => void;
  onMakePlan: () => void;
  onBlockAction: (action: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stickRef = useRef(true);
  const [showLatest, setShowLatest] = useState(false);
  const lastConversation = useRef<string>(conversationKey);

  /* Opening (or switching to) a conversation lands at its newest message. */
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
    stickRef.current = true;
    setShowLatest(false);
    lastConversation.current = conversationKey;
  }, [conversationKey]);

  const onScroll = () => {
    const element = containerRef.current;
    if (!element) return;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    const atBottom = distance < 72;
    stickRef.current = atBottom;
    setShowLatest(!atBottom && !thinking && messages.length > 0);
  };

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    if (stickRef.current) {
      const behavior: ScrollBehavior =
        thinking || lastConversation.current !== conversationKey ? "auto" : "smooth";
      window.requestAnimationFrame(() => {
        element.scrollTo({ top: element.scrollHeight, behavior });
      });
      lastConversation.current = conversationKey;
      setShowLatest(false);
    } else if (!thinking) {
      setShowLatest(true);
    }
  }, [messages.length, thinking, loading, conversationKey]);

  const lastCoachIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "coach") return i;
    }
    return -1;
  })();

  /* M-205 (F-13): the "From your record" attribution stands once per
     conversation day — on the first coach reply of each local day.
     Under every one of 18 replies it read as a metronome, not as
     provenance. */
  const attributionIndexes = (() => {
    const seenDays = new Set<string>();
    const indexes = new Set<number>();
    messages.forEach((message, index) => {
      if (message.role !== "coach") return;
      const dayKey = localDayKey(message.time);
      if (seenDays.has(dayKey)) return;
      seenDays.add(dayKey);
      indexes.add(index);
    });
    return indexes;
  })();

  return (
    <div
      ref={containerRef}
      className="coach-thread"
      role="log"
      aria-live="polite"
      aria-busy={thinking}
      onScroll={onScroll}
    >
      {loading ? (
        <ThreadLoading />
      ) : showWelcome ? (
        thinking ? (
          <div className="coach-thread-list coach-thread-centerize">
            <ThinkingRow slow={responseSlow} />
          </div>
        ) : (
          <EmptyWelcome
            starters={starters}
            thinking={false}
            onStart={onStart}
            greeting={welcomeGreeting}
            phaseLine={welcomePhaseLine}
            lastMemory={welcomeMemory}
          />
        )
      ) : (
        <div className="coach-thread-list">
          {messages.map((message, index) => {
            const isCoach = message.role === "coach";
            const fresh = message.id === freshId;
            const isLastCoachMessage = isCoach && index === lastCoachIndex;
            /* The photo-estimate this reply carries, if any (N5): the
               nutrition lib decides from the thread itself — a recorded
               photo identification behind the reply plus a parseable
               ≈ totals line in it. Null for every other message. */
            const logEstimate = isCoach ? coachEstimateForMessage(messages, index) : null;
            /* M-207: the day divider stands before the first message of
               each local day (and opens the thread), so a resumed
               multi-day thread shows where each day begins. */
            const dividerLabel =
              index === 0 ||
              localDayKey(message.time) !== localDayKey(messages[index - 1]!.time)
                ? dayDividerLabel(message.time)
                : null;
            const node = !isCoach ? (
              <UserMessage
                message={message}
                previewUrl={message.attachment ? previews[message.id] : undefined}
                fresh={fresh}
              />
            ) : (
              <BloomMessage
                message={message}
                fresh={fresh}
                onRetry={message.status === "error" ? () => onRetry(message) : undefined}
                onOfflineAnswer={
                  message.status === "error" && onOfflineAnswer
                    ? () => onOfflineAnswer(message)
                    : undefined
                }
                onRegenerate={
                  isLastCoachMessage && message.status !== "error"
                    ? () => onRegenerate(message)
                    : undefined
                }
                onTellMeMore={onTellMeMore}
                onMakePlan={onMakePlan}
                onBlockAction={onBlockAction}
                logEstimate={logEstimate}
                showAttribution={attributionIndexes.has(index)}
                latest={isLastCoachMessage}
              />
            );
            return (
              <Fragment key={message.id}>
                {dividerLabel ? (
                  <div className="coach-day-divider" role="separator">
                    <span>{dividerLabel}</span>
                  </div>
                ) : null}
                {node}
              </Fragment>
            );
          })}
          {thinking ? <ThinkingRow slow={responseSlow} /> : null}
          <div className="coach-thread-end" aria-hidden="true" />
        </div>
      )}
      {showLatest ? (
        <button
          type="button"
          className="coach-jump-latest"
          onClick={() => {
            const element = containerRef.current;
            if (!element) return;
            stickRef.current = true;
            setShowLatest(false);
            element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
          }}
          aria-label="Jump to latest messages"
        >
          <ArrowDown className="size-4" aria-hidden="true" />
          <span>Latest</span>
        </button>
      ) : null}
    </div>
  );
}
