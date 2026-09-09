import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";

import type { CoachMessage } from "@/hooks/useCoachSystem";
import type { Starter } from "@/lib/coach/ui-helpers";
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
  onStart,
  onRetry,
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
  onStart: (starter: Starter) => void;
  onRetry: (message: CoachMessage) => void;
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
          <EmptyWelcome starters={starters} thinking={false} onStart={onStart} />
        )
      ) : (
        <div className="coach-thread-list">
          {messages.map((message, index) => {
            const isCoach = message.role === "coach";
            const fresh = message.id === freshId;
            const isLastCoachMessage = isCoach && index === lastCoachIndex;
            if (!isCoach) {
              return (
                <UserMessage
                  key={message.id}
                  message={message}
                  previewUrl={message.attachment ? previews[message.id] : undefined}
                  fresh={fresh}
                />
              );
            }
            return (
              <BloomMessage
                key={message.id}
                message={message}
                fresh={fresh}
                onRetry={message.status === "error" ? () => onRetry(message) : undefined}
                onRegenerate={
                  isLastCoachMessage && message.status !== "error"
                    ? () => onRegenerate(message)
                    : undefined
                }
                onTellMeMore={onTellMeMore}
                onMakePlan={onMakePlan}
                onBlockAction={onBlockAction}
              />
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
