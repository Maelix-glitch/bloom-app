import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  Copy,
  MessageSquareText,
  MoreHorizontal,
  RefreshCw,
  Target,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

import type { CoachMessage } from "@/hooks/useCoachSystem";
import { useIsMobile } from "@/hooks/use-mobile";
import { copyText, messageTime, noticesFor, TREND_WORD } from "@/lib/coach/ui-helpers";
import { cn } from "@/lib/utils";

import { CoachGlyph, NoticeGlyph } from "./bloom-mark";
import { ResponseBlocks } from "./ResponseBlocks";

/* ------------------------------- rich text --------------------------------- */

function parseInline(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, index) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={index}>{part.slice(2, -2)}</strong>
      ) : (
        <span key={index}>{part}</span>
      ),
    );
}

function RichParagraphs({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="coach-msg-copy">
      {paragraphs.map((paragraph, index) => {
        const lines = paragraph.split("\n");
        return (
          <p key={`${index}-${paragraph.slice(0, 12)}`}>
            {lines.map((line, lineIndex) => (
              <span key={`${line}-${lineIndex}`}>
                {lineIndex ? <br /> : null}
                {parseInline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/* ------------------------------ source footnote ----------------------------- */

function SourceLine({ message }: { message: CoachMessage }) {
  if (message.sources.length === 0 && !message.fellBackBecause) return null;
  return (
    <p className="coach-msg-sources">
      {message.sources.length > 0 ? (
        <span className="coach-msg-sources-text">
          <span className="coach-src-dot" aria-hidden="true" />
          {message.sources.length === 1 && /^(your|Bloom's|my )/.test(message.sources[0] ?? "")
            ? `From ${message.sources[0]}`
            : `From your record — ${message.sources.join(" · ")}`}
        </span>
      ) : null}
      {message.fellBackBecause ? (
        <span className="coach-msg-ondevice" title={message.fellBackBecause}>
          answered on this device
        </span>
      ) : null}
    </p>
  );
}

/* -------------------------------- signature -------------------------------- */

function SignatureNotice({ message }: { message: CoachMessage }) {
  const notices = noticesFor(message);
  const [open, setOpen] = useState(false);
  if (notices.length === 0) return null;
  return (
    <div className="coach-noticed">
      <button
        type="button"
        className="coach-noticed-toggle"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <NoticeGlyph className="coach-noticed-glyph" />
        <span>Something I noticed</span>
        <span className="coach-noticed-caret" aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            className="coach-noticed-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="coach-noticed-inner">
              <p className="coach-noticed-lede">
                This isn&rsquo;t a diagnosis or a verdict — just a quiet read of what your own logs
                show.
              </p>
              <ul className="coach-noticed-list">
                {notices.map((notice, index) => (
                  <li key={`${notice.label}-${index}`} className="coach-noticed-item">
                    <span className="coach-noticed-item-copy">
                      <strong>{notice.label}</strong>
                      <span>
                        {notice.value} on average — {TREND_WORD[notice.trend]} across the window
                        shown
                      </span>
                      {notice.detail ? <em>{notice.detail}</em> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* --------------------------------- actions --------------------------------- */

interface MessageActionsProps {
  onCopy: () => void;
  copied: boolean;
  feedback: "up" | "down" | null;
  onFeedback: (value: "up" | "down") => void;
  canRegenerate: boolean;
  onRegenerate: () => void;
  onTellMeMore: () => void;
  onMakePlan: () => void;
}

function MessageActions({
  onCopy,
  copied,
  feedback,
  onFeedback,
  canRegenerate,
  onRegenerate,
  onTellMeMore,
  onMakePlan,
}: MessageActionsProps) {
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetCloseRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!sheetOpen) return;
    sheetCloseRef.current?.focus();
  }, [sheetOpen]);

  const compact = (
    <>
      <button
        type="button"
        className="coach-action"
        onClick={onCopy}
        aria-label="Copy response"
        title="Copy"
      >
        {copied ? (
          <>
            <Check className="coach-action-icon" aria-hidden="true" />
            <span className="coach-action-label">Copied</span>
          </>
        ) : (
          <>
            <Copy className="coach-action-icon" aria-hidden="true" />
            <span className="coach-action-label">Copy</span>
          </>
        )}
      </button>
      {canRegenerate ? (
        <button
          type="button"
          className="coach-action"
          onClick={onRegenerate}
          aria-label="Regenerate response"
          title="Regenerate"
        >
          <RefreshCw className="coach-action-icon" aria-hidden="true" />
          <span className="coach-action-label">Regenerate</span>
        </button>
      ) : null}
      <button
        type="button"
        className={cn("coach-action coach-action-icon-only", feedback === "up" && "is-on")}
        onClick={() => onFeedback("up")}
        aria-label="Mark response helpful"
        aria-pressed={feedback === "up"}
        title="Helpful"
      >
        <ThumbsUp className="coach-action-icon" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={cn("coach-action coach-action-icon-only", feedback === "down" && "is-on")}
        onClick={() => onFeedback("down")}
        aria-label="Mark response not helpful"
        aria-pressed={feedback === "down"}
        title="Not helpful"
      >
        <ThumbsDown className="coach-action-icon" aria-hidden="true" />
      </button>
    </>
  );

  if (isMobile) {
    return (
      <>
        <div className="coach-actions coach-actions-mobile">
          <button
            type="button"
            className="coach-action coach-action-more"
            onClick={() => setSheetOpen(true)}
            aria-label="More actions for this response"
            aria-expanded={sheetOpen}
          >
            <MoreHorizontal className="coach-action-icon" aria-hidden="true" />
          </button>
        </div>
        {sheetOpen ? (
          <div
            className="coach-sheet-backdrop"
            role="presentation"
            onMouseDown={() => setSheetOpen(false)}
          >
            <div
              className="coach-sheet coach-sheet-actions"
              role="dialog"
              aria-modal="true"
              aria-label="Response actions"
            >
              <div className="coach-sheet-handle" aria-hidden="true" />
              <button
                ref={sheetCloseRef}
                type="button"
                className="coach-sheet-row"
                onClick={() => {
                  setSheetOpen(false);
                  onCopy();
                }}
              >
                <Copy className="coach-sheet-row-icon" aria-hidden="true" />
                {copied ? "Copied" : "Copy response"}
              </button>
              {canRegenerate ? (
                <button
                  type="button"
                  className="coach-sheet-row"
                  onClick={() => {
                    setSheetOpen(false);
                    onRegenerate();
                  }}
                >
                  <RefreshCw className="coach-sheet-row-icon" aria-hidden="true" />
                  Regenerate response
                </button>
              ) : null}
              <button
                type="button"
                className={cn("coach-sheet-row", feedback === "up" && "is-on")}
                onClick={() => {
                  setSheetOpen(false);
                  onFeedback("up");
                }}
              >
                <ThumbsUp className="coach-sheet-row-icon" aria-hidden="true" />
                Good response
              </button>
              <button
                type="button"
                className={cn("coach-sheet-row", feedback === "down" && "is-on")}
                onClick={() => {
                  setSheetOpen(false);
                  onFeedback("down");
                }}
              >
                <ThumbsDown className="coach-sheet-row-icon" aria-hidden="true" />
                Needs improvement
              </button>
              <div className="coach-sheet-divider" />
              <button
                type="button"
                className="coach-sheet-row"
                onClick={() => {
                  setSheetOpen(false);
                  onTellMeMore();
                }}
              >
                <MessageSquareText className="coach-sheet-row-icon" aria-hidden="true" />
                Tell me more
              </button>
              <button
                type="button"
                className="coach-sheet-row"
                onClick={() => {
                  setSheetOpen(false);
                  onMakePlan();
                }}
              >
                <Target className="coach-sheet-row-icon" aria-hidden="true" />
                Turn this into a plan
              </button>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return <div className="coach-actions">{compact}</div>;
}

/* -------------------------------- the message ------------------------------- */

export function BloomMessage({
  message,
  fresh,
  onRetry,
  onRegenerate,
  onTellMeMore,
  onMakePlan,
  onBlockAction,
}: {
  message: CoachMessage;
  fresh: boolean;
  onRetry: (() => void) | undefined;
  onRegenerate: (() => void) | undefined;
  onTellMeMore: () => void;
  onMakePlan: () => void;
  onBlockAction: (action: string) => void;
}) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [copied, setCopied] = useState(false);
  const isError = message.status === "error";
  const time = messageTime(message.time);

  const handleCopy = async () => {
    const text = message.paragraphs.join("\n\n");
    const ok = await copyText(text);
    /* Only claim success when something actually reached the clipboard. */
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (value: "up" | "down") => {
    setFeedback((current) => (current === value ? null : value));
  };

  return (
    <motion.article
      className={cn("coach-msg coach-msg-bloom", fresh && "is-fresh")}
      initial={fresh ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      aria-label={isError ? "Bloom message, needs attention" : "Bloom message"}
    >
      {isError ? (
        <div className="coach-error" role="alert">
          <CoachGlyph size={14} className="coach-error-glyph" />
          <div className="coach-error-copy">
            <p className="coach-error-title">I couldn&rsquo;t reach Bloom right now.</p>
            <p>{message.paragraphs[0]}</p>
          </div>
          {onRetry ? (
            <button type="button" className="coach-error-retry" onClick={onRetry}>
              Try again
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="coach-msg-head">
            <CoachGlyph size={15} />
            <span className="coach-msg-author">Bloom</span>
            {time ? (
              <time className="coach-msg-time" dateTime={message.time}>
                {time}
              </time>
            ) : null}
          </div>
          <div className="coach-msg-main">
            {message.paragraphs.length > 0 ? (
              <RichParagraphs paragraphs={message.paragraphs} />
            ) : null}
            {message.blocks.length > 0 ? (
              <ResponseBlocks blocks={message.blocks} onAction={onBlockAction} />
            ) : null}
            <SourceLine message={message} />
            <SignatureNotice message={message} />
          </div>
          <MessageActions
            onCopy={() => void handleCopy()}
            copied={copied}
            feedback={feedback}
            onFeedback={handleFeedback}
            canRegenerate={Boolean(onRegenerate) && !isError}
            onRegenerate={() => onRegenerate?.()}
            onTellMeMore={onTellMeMore}
            onMakePlan={onMakePlan}
          />
        </>
      )}
    </motion.article>
  );
}
