import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import type { CoachConversation } from "@/hooks/useCoachSystem";
import type { CoachMode } from "@/lib/coach/intelligence";
import { groupConversations, rowTime, type ConversationGroup } from "@/lib/coach/ui-helpers";
import { CoachGlyph } from "./bloom-mark";
import { cn } from "@/lib/utils";

/* --------------------------- one conversation row --------------------------- */

const MODES: { id: CoachMode; label: string }[] = [
  { id: "ask", label: "Ask" },
  { id: "reflect", label: "Reflect" },
  { id: "plan", label: "Plan" },
];

function RowMenu({
  onRename,
  onDelete,
  onRequestClose,
}: {
  onRename: () => void;
  onDelete: () => void;
  onRequestClose: () => void;
}) {
  const [stage, setStage] = useState<"menu" | "confirm">("menu");
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onRequestClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onRequestClose();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [onRequestClose]);

  return (
    <div ref={ref} className="coach-row-menu" role="menu" aria-label="Conversation actions">
      {stage === "menu" ? (
        <>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setStage("menu");
              onRename();
            }}
          >
            <Pencil className="coach-row-menu-icon" /> Rename
          </button>
          <button
            type="button"
            role="menuitem"
            className="coach-row-menu-danger"
            onClick={() => setStage("confirm")}
          >
            <Trash2 className="coach-row-menu-icon" /> Delete
          </button>
        </>
      ) : (
        <div className="coach-row-confirm" role="alert">
          <span>Delete this conversation?</span>
          <span className="coach-row-confirm-actions">
            <button
              type="button"
              onClick={() => setStage("menu")}
              className="coach-row-confirm-keep"
            >
              Keep
            </button>
            <button type="button" onClick={onDelete} className="coach-row-confirm-delete">
              Delete
            </button>
          </span>
        </div>
      )}
    </div>
  );
}

function ConversationRow({
  conversation,
  active,
  onOpen,
  onDelete,
  onRename,
}: {
  conversation: CoachConversation;
  active: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const commitRename = () => {
    setEditing(false);
    const next = draftTitle.trim();
    if (next && next !== conversation.title) onRename(next);
    else setDraftTitle(conversation.title);
  };

  return (
    <div className={cn("coach-conv-row", active && "is-active")}>
      <button
        type="button"
        className="coach-conv-row-main"
        onClick={() => {
          setMenuOpen(false);
          onOpen();
        }}
        aria-current={active ? "true" : undefined}
      >
        {active ? <span className="coach-conv-active-dot" aria-hidden="true" /> : null}
        {editing ? (
          <input
            ref={inputRef}
            value={draftTitle}
            className="coach-conv-rename"
            aria-label="Conversation title"
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitRename();
              }
              if (event.key === "Escape") {
                setDraftTitle(conversation.title);
                setEditing(false);
              }
            }}
            onClick={(event) => event.stopPropagation()}
          />
        ) : (
          <span className="coach-conv-title">{conversation.title}</span>
        )}
        <time className="coach-conv-time" dateTime={conversation.updatedAt}>
          {rowTime(conversation.updatedAt)}
        </time>
      </button>
      <span className="coach-conv-row-actions">
        <button
          type="button"
          className="coach-conv-more"
          aria-label={`Actions for ${conversation.title}`}
          aria-expanded={menuOpen}
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen((open) => !open);
          }}
        >
          {menuOpen ? (
            <X className="coach-conv-more-icon" />
          ) : (
            <MoreHorizontal className="coach-conv-more-icon" />
          )}
        </button>
        {menuOpen ? (
          <RowMenu
            onRequestClose={() => setMenuOpen(false)}
            onRename={() => {
              setMenuOpen(false);
              setDraftTitle(conversation.title);
              setEditing(true);
            }}
            onDelete={() => {
              setMenuOpen(false);
              onDelete();
            }}
          />
        ) : null}
      </span>
    </div>
  );
}

function ConversationGroups({
  conversations,
  activeId,
  onOpen,
  onDelete,
  onRename,
}: {
  conversations: CoachConversation[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}) {
  const groups = groupConversations(conversations);
  if (groups.length === 0) {
    return (
      <div className="coach-side-empty" aria-hidden="true">
        <span>Conversations appear here once you talk to Bloom.</span>
      </div>
    );
  }
  return (
    <div className="coach-conv-groups">
      {groups.map((group: ConversationGroup) => (
        <section key={group.id} className="coach-conv-group" aria-label={group.label}>
          <h3 className="coach-conv-group-label">{group.label}</h3>
          <div className="coach-conv-list">
            {group.conversations.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                active={conversation.id === activeId}
                onOpen={() => onOpen(conversation.id)}
                onDelete={() => onDelete(conversation.id)}
                onRename={(title) => onRename(conversation.id, title)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* --------------------- content, shared by rail and sheet --------------------- */

export function CoachSidebarContent({
  conversations,
  activeId,
  mode,
  onModeChange,
  onOpen,
  onDelete,
  onRename,
  onContext,
}: {
  conversations: CoachConversation[];
  activeId: string | null;
  mode: CoachMode;
  onModeChange: (mode: CoachMode) => void;
  onOpen: (id: string | null) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onContext: (tab: "context" | "memory") => void;
}) {
  return (
    <div className="coach-side-content">
      <button type="button" className="coach-new-chat" onClick={() => onOpen(null)}>
        <MessageSquarePlus className="coach-new-chat-icon" aria-hidden="true" />
        <span>New conversation</span>
      </button>

      <div className="coach-side-modes" role="group" aria-label="How Bloom should respond">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn("coach-mode-chip", mode === item.id && "is-active")}
            aria-pressed={mode === item.id}
            onClick={() => onModeChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="coach-side-heading">
        <span>Conversations</span>
        {conversations.length > 0 ? <em>{conversations.length}</em> : null}
      </div>
      <div className="coach-conv-scroll">
        <ConversationGroups
          conversations={conversations}
          activeId={activeId}
          onOpen={onOpen}
          onDelete={onDelete}
          onRename={onRename}
        />
      </div>

      <div className="coach-side-foot">
        <button type="button" className="coach-side-foot-item" onClick={() => onContext("context")}>
          <CoachGlyph size={14} className="coach-side-foot-glyph" />
          <span className="min-w-0">
            <strong>Personal context</strong>
            <small>What Bloom can see</small>
          </span>
        </button>
        <button type="button" className="coach-side-foot-item" onClick={() => onContext("memory")}>
          <span className="coach-side-foot-glyph coach-side-foot-glyph-memory" aria-hidden="true" />
          <span className="min-w-0">
            <strong>Memory</strong>
            <small>Saved things you said</small>
          </span>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ the desktop rail ----------------------------- */

export function CoachSidebar({
  expanded,
  onToggle,
  ...contentProps
}: {
  expanded: boolean;
  onToggle: () => void;
  conversations: CoachConversation[];
  activeId: string | null;
  mode: CoachMode;
  onModeChange: (mode: CoachMode) => void;
  onOpen: (id: string | null) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onContext: (tab: "context" | "memory") => void;
}) {
  const ToggleIcon = expanded ? PanelLeftClose : PanelLeftOpen;
  return (
    <motion.aside
      className={cn("coach-sidebar", !expanded && "is-collapsed")}
      initial={false}
      animate={{ width: expanded ? 268 : 58 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Coach conversations"
    >
      <div className="coach-sidebar-inner">
        <button
          type="button"
          className="coach-sidebar-toggle"
          onClick={onToggle}
          aria-label={expanded ? "Collapse conversation list" : "Expand conversation list"}
          title={expanded ? "Collapse list" : "Expand list"}
        >
          <ToggleIcon className="size-4" aria-hidden="true" />
        </button>
        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              key="content"
              className="coach-sidebar-content-wrap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <CoachSidebarContent {...contentProps} />
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              className="coach-sidebar-collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <button
                type="button"
                className="coach-rail-fab"
                onClick={() => contentProps.onOpen(null)}
                aria-label="New conversation"
                title="New conversation"
              >
                <Plus className="size-4" aria-hidden="true" />
              </button>
              <div
                className="coach-rail-fab-stack"
                role="group"
                aria-label="How Bloom should respond"
              >
                {MODES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={cn("coach-rail-mode", contentProps.mode === item.id && "is-active")}
                    aria-pressed={contentProps.mode === item.id}
                    onClick={() => contentProps.onModeChange(item.id)}
                    title={item.label}
                  >
                    {item.label.charAt(0)}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}
