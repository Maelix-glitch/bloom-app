import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MessageSquarePlus, Search } from "lucide-react";

import type { CoachConversation } from "@/hooks/useCoachSystem";
import type { CoachMode } from "@/lib/coach/intelligence";
import { cn } from "@/lib/utils";
import { CoachGlyph } from "./bloom-mark";

const MODE_LABEL: Record<CoachMode, string> = {
  ask: "Ask — a clear read",
  reflect: "Reflect — slow down",
  plan: "Plan — a next step",
};

/**
 * ⌘K — jump to a conversation, start a new one, or change how Bloom responds.
 * A quiet palette, not a command circus.
 */
export function QuickPalette({
  open,
  onClose,
  conversations,
  activeId,
  mode,
  onOpenConversation,
  onNewConversation,
  onModeChange,
}: {
  open: boolean;
  onClose: () => void;
  conversations: CoachConversation[];
  activeId: string | null;
  mode: CoachMode;
  onOpenConversation: (id: string | null) => void;
  onNewConversation: () => void;
  onModeChange: (mode: CoachMode) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const firstRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    firstRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = ref.current?.querySelectorAll<HTMLElement>("button");
      if (!focusable?.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="coach-palette-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) onClose();
          }}
          role="presentation"
        >
          <motion.div
            ref={ref}
            className="coach-palette"
            role="dialog"
            aria-modal="true"
            aria-label="Quick switch"
            initial={{ opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.985 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="coach-palette-search">
              <Search className="coach-palette-search-icon" aria-hidden="true" />
              <span>Go to a conversation</span>
              <kbd>Esc</kbd>
            </div>
            <div className="coach-palette-scroll">
              <button
                ref={firstRef}
                type="button"
                className="coach-palette-row"
                onClick={() => {
                  onNewConversation();
                  onClose();
                }}
              >
                <span className="coach-palette-row-icon">
                  <MessageSquarePlus className="size-4" aria-hidden="true" />
                </span>
                <span>
                  <strong>New conversation</strong>
                  <small>Start fresh with Bloom</small>
                </span>
              </button>
              <div className="coach-palette-label">How Bloom responds</div>
              {(Object.keys(MODE_LABEL) as CoachMode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={cn("coach-palette-row", mode === item && "is-active")}
                  onClick={() => {
                    onModeChange(item);
                    onClose();
                  }}
                >
                  <span className="coach-palette-row-icon">
                    <CoachGlyph size={15} />
                  </span>
                  <span>
                    <strong>{MODE_LABEL[item].split(" — ")[0]}</strong>
                    <small>{MODE_LABEL[item].split(" — ")[1]}</small>
                  </span>
                </button>
              ))}
              {conversations.length > 0 ? (
                <>
                  <div className="coach-palette-label">Conversations</div>
                  {conversations.slice(0, 6).map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      className={cn(
                        "coach-palette-row",
                        conversation.id === activeId && "is-active",
                      )}
                      onClick={() => {
                        onOpenConversation(conversation.id);
                        onClose();
                      }}
                    >
                      <span className="coach-palette-row-dot" aria-hidden="true" />
                      <span className="coach-palette-conv-copy">
                        <strong>{conversation.title}</strong>
                      </span>
                    </button>
                  ))}
                </>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
