import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowDown,
  BarChart3,
  BrainCircuit,
  Camera,
  Check,
  ChevronRight,
  Command,
  Compass,
  Copy,
  FileText,
  Image as ImageIcon,
  Lightbulb,
  MessageSquare,
  Mic,
  MoreHorizontal,
  MoonStar,
  Paperclip,
  PanelRight,
  Pin,
  Send,
  ShieldCheck,
  Sparkles,
  StopCircle,
  Target,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserRound,
  Info,
  X,
  type LucideIcon,
} from "lucide-react";

import { BloomHeader } from "@/components/BloomHeader";
import { Atmosphere } from "@/components/mood/Atmosphere";
import { useMoodSystem } from "@/hooks/useMoodSystem";
import {
  coachErrorMessage,
  useCoachSystem,
  type CoachBlock,
  type CoachMemory,
  type CoachMessage,
  type CoachMode,
} from "@/hooks/useCoachSystem";
import { cn } from "@/lib/utils";
import { buildCoachContext, type CoachHabitData } from "@/lib/coach/intelligence";

interface Attachment {
  file: File;
  name: string;
  type: string;
  size: number;
  previewUrl: string | null;
}

interface FailedRequest {
  text: string;
  attachment: Attachment | null;
  userMessageId: string;
  errorMessageId: string;
}

interface CameraDialogProps {
  onClose: () => void;
  onUsePhoto: (file: File) => void;
  onChooseFile: () => void;
}

type Lens = {
  id: CoachMode;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: "violet" | "sky" | "amber";
};

const LENSES: Lens[] = [
  {
    id: "ask",
    label: "Ask",
    description: "Get a clear read on what is in front of you.",
    icon: Compass,
    accent: "sky",
  },
  {
    id: "reflect",
    label: "Reflect",
    description: "Slow down and name what is underneath.",
    icon: BrainCircuit,
    accent: "violet",
  },
  {
    id: "plan",
    label: "Plan",
    description: "Turn insight into one gentle next move.",
    icon: Target,
    accent: "amber",
  },
];

const QUICK_PROMPTS = [
  "What should I protect today?",
  "Help me make sense of this week.",
  "Give me one gentle next step.",
];

const COACH_DRAFT_STORAGE_KEY = "bloom-coach-draft";
const SIGN_IN_NOTICE = "Sign in to send a private Coach message.";
const SESSION_NOTICE = "Your session needs to be refreshed.";

function suggestedPromptsFor(
  mode: CoachMode,
  entries: number,
  analytics: ReturnType<typeof useMoodSystem>["analytics"],
  habitData: CoachHabitData,
) {
  const habitActivity = buildCoachContext([], [], habitData, mode, "routine").habits;
  const noHistory =
    entries === 0 &&
    (!habitData.available ||
      habitData.habits.length === 0 ||
      habitActivity.recentCompleted + habitActivity.previousCompleted === 0);
  if (noHistory) {
    return mode === "plan"
      ? [
          "Help me build a simple routine.",
          "What should I focus on first?",
          "How should I get started?",
        ]
      : mode === "reflect"
        ? [
            "What would be useful to notice first?",
            "Help me make sense of today.",
            "What should I pay attention to?",
          ]
        : [
            "How should I get started?",
            "What should I focus on first?",
            "Help me build a simple routine.",
          ];
  }

  const habitDecline =
    habitData.available &&
    habitActivity.previousCompleted > 0 &&
    habitActivity.recentCompleted < habitActivity.previousCompleted;
  const moodDecline = analytics.trend.direction === "declining" || (analytics.changePct ?? 0) < -5;
  const moodImprovement =
    analytics.trend.direction === "improving" || (analytics.changePct ?? 0) > 5;

  if (mode === "plan") {
    return habitDecline
      ? [
          "Should I simplify my routine?",
          "Help me reset this week.",
          "What should I protect first?",
        ]
      : [
          "Help me plan around my current energy.",
          "What should I focus on first?",
          "Help me make one realistic change.",
        ];
  }
  if (mode === "reflect") {
    return habitDecline || moodDecline
      ? ["What changed this week?", "What made this week harder?", "Help me look closer."]
      : moodImprovement
        ? [
            "What's working lately?",
            "What should I carry forward?",
            "Help me understand this change.",
          ]
        : [
            "What changed recently?",
            "Help me make sense of a pattern.",
            "What might I be missing?",
          ];
  }
  if (habitDecline || moodDecline) {
    return [
      "What changed this week?",
      "Where am I losing consistency?",
      "Should I simplify my routine?",
    ];
  }
  if (moodImprovement) {
    return ["What's working?", "How can I keep this going?", "What should I carry into next week?"];
  }
  return QUICK_PROMPTS;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMessageTime(value: string) {
  if (value === "now") return "now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isSupportedAttachment(file: File) {
  const type = file.type.toLowerCase();
  if (type.startsWith("image/") || type.startsWith("audio/") || type.startsWith("text/")) {
    return true;
  }
  if (
    [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ].includes(type)
  ) {
    return true;
  }
  return /\.(csv|docx?|md|pdf|txt|xlsx?)$/i.test(file.name);
}

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

function RichParagraph({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <p>
      {lines.map((line, index) => (
        <span key={`${line}-${index}`}>
          {index ? <br /> : null}
          {parseInline(line)}
        </span>
      ))}
    </p>
  );
}

function Sparkline({ values, accent }: { values: number[]; accent: string | undefined }) {
  const safe = values.length > 1 ? values : [3, 3, 3, 3, 3];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const span = Math.max(1, max - min);
  const points = safe
    .map(
      (value, index) =>
        `${(index / (safe.length - 1)) * 100},${100 - ((value - min) / span) * 75 - 12}`,
    )
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={`coach-sparkline coach-sparkline-${accent ?? "violet"}`}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BlockView({
  block,
  onAction,
}: {
  block: CoachBlock;
  onAction: ((action: string) => void) | undefined;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  if (block.type === "metric") {
    return (
      <div className="coach-structured-card coach-metric-card">
        <div className="coach-structured-head">
          <span className={`coach-structured-icon coach-accent-${block.accent ?? "violet"}`}>
            <BarChart3 className="size-4" />
          </span>
          <div>
            <p className="eyebrow">{block.label}</p>
            <p className="coach-structured-title">{block.value}</p>
          </div>
        </div>
        <div className="coach-metric-chart">
          <Sparkline values={block.series} accent={block.accent} />
          <span>{block.detail}</span>
        </div>
      </div>
    );
  }

  if (block.type === "plan") {
    return (
      <div className="coach-structured-card coach-plan-card">
        <div className="coach-structured-head">
          <span className="coach-structured-icon coach-accent-amber">
            <Target className="size-4" />
          </span>
          <div>
            <p className="eyebrow">Suggested sequence</p>
            <p className="coach-structured-title">{block.title}</p>
          </div>
        </div>
        {block.detail ? <p className="coach-structured-detail">{block.detail}</p> : null}
        <div className="coach-plan-steps">
          {block.steps.map((step, index) => (
            <div key={`${step.label}-${index}`} className="coach-plan-step">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <p>{step.label}</p>
                {step.time ? <small>{step.time}</small> : null}
              </div>
              <Check className="size-3.5 text-sage" />
            </div>
          ))}
        </div>
        <div className="coach-structured-actions">
          <button
            type="button"
            className="coach-card-action-primary"
            onClick={() => onAction?.("plan-start")}
          >
            <Check className="size-3.5" /> Use as a starting point
          </button>
          <button
            type="button"
            className="coach-card-action-secondary"
            onClick={() => onAction?.("plan-adjust")}
          >
            Adjust
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="coach-structured-card coach-proposal-card">
      <div className="coach-structured-head">
        <span className="coach-structured-icon coach-accent-violet">
          <Lightbulb className="size-4" />
        </span>
        <div>
          <p className="eyebrow">Suggested change</p>
          <p className="coach-structured-title">{block.title}</p>
        </div>
      </div>
      {block.detail ? <p className="coach-structured-detail">{block.detail}</p> : null}
      {block.changes?.length ? (
        <div className="coach-proposal-changes">
          {block.changes.map((change, index) => (
            <div key={`${change.label}-${index}`}>
              <span>{change.label}</span>
              <small>
                {change.from || "—"} → {change.to || "—"}
              </small>
            </div>
          ))}
        </div>
      ) : null}
      <div className="coach-structured-actions">
        <button
          type="button"
          className="coach-card-action-primary"
          onClick={() => onAction?.("proposal-explore")}
        >
          <MessageSquare className="size-3.5" /> Explore this change
        </button>
        <button
          type="button"
          className="coach-card-action-secondary"
          onClick={() => {
            setDismissed(true);
            onAction?.("proposal-dismissed");
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}

function MessageCard({
  message,
  previewUrl,
  grouped = false,
  onCopy,
  onRetry,
  onBlockAction,
  onFollowUp,
  onPlan,
}: {
  message: CoachMessage;
  previewUrl: string | null | undefined;
  grouped?: boolean;
  onCopy: () => void;
  onRetry: (() => void) | undefined;
  onBlockAction: ((action: string) => void) | undefined;
  onFollowUp: () => void;
  onPlan: () => void;
}) {
  const isCoach = message.role === "coach";
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!moreOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!moreMenuRef.current?.contains(event.target as Node)) setMoreOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [moreOpen]);

  return (
    <article
      className={cn(
        "coach-message-row",
        isCoach ? "coach-message-coach" : "coach-message-user",
        grouped && "coach-message-grouped",
        message.status === "error" && "coach-message-error",
      )}
      aria-label={`${isCoach ? "Bloom" : "Your"} message`}
    >
      <div
        className={cn("coach-message-avatar", isCoach ? "coach-avatar-coach" : "coach-avatar-user")}
        aria-hidden="true"
      >
        {isCoach ? <Sparkles className="size-4" /> : <UserRound className="size-4" />}
      </div>
      <div className="coach-message-body">
        {!grouped ? (
          <div className="coach-message-meta">
            <span>{isCoach ? "Bloom" : "You"}</span>
            <time dateTime={message.time === "now" ? undefined : message.time}>
              {formatMessageTime(message.time)}
            </time>
          </div>
        ) : null}
        <div
          className={cn(
            "coach-message-card",
            isCoach ? "coach-message-card-coach" : "coach-message-card-user",
          )}
        >
          {message.status !== "error"
            ? message.paragraphs.map((paragraph, index) => (
                <RichParagraph key={`${paragraph}-${index}`} text={paragraph} />
              ))
            : null}
          {message.attachment ? (
            <div className="coach-message-attachment">
              {previewUrl && message.attachment.type.startsWith("image/") ? (
                <img src={previewUrl} alt={message.attachment.name} />
              ) : previewUrl && message.attachment.type.startsWith("audio/") ? (
                <audio
                  controls
                  preload="metadata"
                  src={previewUrl}
                  aria-label={`Preview ${message.attachment.name}`}
                />
              ) : (
                <span className="coach-attachment-file-icon" aria-hidden="true">
                  <FileText className="size-4" />
                </span>
              )}
              <span>
                <strong>{message.attachment.name}</strong>
                <small>{formatBytes(message.attachment.size)}</small>
              </span>
            </div>
          ) : null}
          {message.sources.length ? (
            <div className="coach-source-row" aria-label="Response sources">
              {message.sources.map((source) => (
                <span key={source}>
                  <span className="coach-source-dot" aria-hidden="true" />
                  {source}
                </span>
              ))}
            </div>
          ) : null}
          {message.blocks.length ? (
            <div className="coach-block-stack">
              {message.blocks.map((block, index) => (
                <BlockView key={`${block.type}-${index}`} block={block} onAction={onBlockAction} />
              ))}
            </div>
          ) : null}
          {message.status === "error" ? (
            <div className="coach-inline-error" role="alert">
              <AlertCircle className="size-3.5" aria-hidden="true" />
              <span>{message.paragraphs[0] || "Something interrupted Bloom's response."}</span>
              <button type="button" onClick={onRetry} disabled={!onRetry}>
                Try again
              </button>
            </div>
          ) : null}
        </div>
        {isCoach && message.status !== "error" ? (
          <div className="coach-message-actions">
            <button type="button" onClick={onCopy} title="Copy response">
              <Copy className="size-3" aria-hidden="true" /> Copy
            </button>
            <button
              type="button"
              onClick={() => setFeedback(feedback === "up" ? null : "up")}
              className={feedback === "up" ? "selected" : ""}
              aria-label="Mark response helpful"
              aria-pressed={feedback === "up"}
              title="Helpful"
            >
              <ThumbsUp className="size-3" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setFeedback(feedback === "down" ? null : "down")}
              className={feedback === "down" ? "selected" : ""}
              aria-label="Mark response not helpful"
              aria-pressed={feedback === "down"}
              title="Not helpful"
            >
              <ThumbsDown className="size-3" aria-hidden="true" />
            </button>
            <div ref={moreMenuRef} className="coach-message-more">
              <button
                type="button"
                aria-label="More message actions"
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                title="More actions"
                onClick={() => setMoreOpen((open) => !open)}
              >
                <MoreHorizontal className="size-3" aria-hidden="true" />
              </button>
              {moreOpen ? (
                <div className="coach-message-more-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMoreOpen(false);
                      onFollowUp();
                    }}
                  >
                    <MessageSquare className="size-3.5" /> Tell me more
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMoreOpen(false);
                      onPlan();
                    }}
                  >
                    <Target className="size-3.5" /> Make a plan
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function LensButton({
  lens,
  active,
  onSelect,
}: {
  lens: Lens;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = lens.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn("coach-lens-button", active && "coach-lens-button-active")}
      aria-pressed={active}
    >
      <span className={`coach-lens-icon coach-accent-${lens.accent}`}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="coach-lens-label">{lens.label}</span>
        <span className="coach-lens-description">{lens.description}</span>
      </span>
      {active ? (
        <span className="coach-lens-current" />
      ) : (
        <ChevronRight className="size-3.5 text-faint" />
      )}
    </button>
  );
}

type CoachDrawer = "context" | "memory";

function ContextDrawer({
  id,
  mode,
  onModeChange,
  onClose,
  entries,
  analytics,
  habitData,
  memories,
  memoryFilter,
  onMemoryFilter,
  onToggleMemory,
  onForgetMemory,
  profileConnected,
}: {
  id: string;
  mode: CoachDrawer;
  onModeChange: (mode: CoachDrawer) => void;
  onClose: () => void;
  entries: number;
  analytics: ReturnType<typeof useMoodSystem>["analytics"];
  habitData: CoachHabitData;
  memories: CoachMemory[];
  memoryFilter: CoachMemory["category"] | "all";
  onMemoryFilter: (filter: CoachMemory["category"] | "all") => void;
  onToggleMemory: (memory: CoachMemory) => void;
  onForgetMemory: (memory: CoachMemory) => void;
  profileConnected: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const titleId = "coach-drawer-title";
  const hasData = entries > 0;
  const signals = [
    { label: "Mood", value: hasData ? `${analytics.avg.toFixed(1)}/10` : "Not available" },
    { label: "Energy", value: hasData ? `${analytics.avgEnergy.toFixed(1)}/10` : "Not available" },
    { label: "Stress", value: hasData ? `${analytics.avgStress.toFixed(1)}/10` : "Not available" },
    ...(habitData.available
      ? [{ label: "Active habits", value: String(habitData.habits.length) }]
      : []),
  ];
  const filteredMemories = memories.filter(
    (memory) => memoryFilter === "all" || memory.category === memoryFilter,
  );

  useEffect(() => {
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="coach-drawer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <aside
        ref={drawerRef}
        id={id}
        className="coach-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="coach-drawer-header">
          <div>
            <p className="eyebrow">Private</p>
            <h2 id={titleId} className="display">
              {mode === "context" ? "Context" : "Memory"}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="coach-icon-button"
            onClick={onClose}
            aria-label="Close context drawer"
            title="Close"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="coach-drawer-tabs" role="tablist" aria-label="Coach details">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "context"}
            className={mode === "context" ? "selected" : ""}
            onClick={() => onModeChange("context")}
          >
            <PanelRight className="size-3.5" aria-hidden="true" /> Context
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "memory"}
            className={mode === "memory" ? "selected" : ""}
            onClick={() => onModeChange("memory")}
          >
            <MoonStar className="size-3.5" aria-hidden="true" /> Memory
          </button>
        </div>

        {mode === "context" ? (
          <div className="coach-drawer-content">
            <p className="coach-drawer-lede">
              Bloom uses only the signals and saved context available to your account.
            </p>
            <section className="coach-drawer-section" aria-labelledby="coach-available-title">
              <div className="coach-drawer-section-head">
                <h3 id="coach-available-title">Currently available</h3>
                <span>{profileConnected ? "Connected" : "Not connected"}</span>
              </div>
              <div className="coach-drawer-signal-list">
                {signals.map((signal) => (
                  <div key={signal.label} className="coach-drawer-signal">
                    <span>{signal.label}</span>
                    <strong>{signal.value}</strong>
                  </div>
                ))}
              </div>
              <p className="coach-drawer-caption">
                {hasData
                  ? `From ${entries} Mood ${entries === 1 ? "entry" : "entries"}.`
                  : "Add a Mood entry to give Bloom something real to work with."}
              </p>
            </section>
            <section className="coach-drawer-section" aria-labelledby="coach-saved-title">
              <div className="coach-drawer-section-head">
                <h3 id="coach-saved-title">Saved context</h3>
                <span>{memories.length ? `${memories.length} saved` : "Quiet"}</span>
              </div>
              {memories.length ? (
                <div className="coach-drawer-memory-preview">
                  {memories.slice(0, 3).map((memory) => (
                    <p key={memory.id}>{memory.text}</p>
                  ))}
                  {memories.length > 3 ? (
                    <button type="button" onClick={() => onModeChange("memory")}>
                      View all saved context
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="coach-drawer-caption">Nothing has been saved yet.</p>
              )}
            </section>
            <div className="coach-drawer-note">
              <ShieldCheck className="size-4 text-sage" aria-hidden="true" />
              <span>
                {profileConnected
                  ? "Only approved personal context is available to Bloom."
                  : "Sign in to connect your private record."}
              </span>
            </div>
          </div>
        ) : (
          <div className="coach-drawer-content">
            <p className="coach-drawer-lede">
              Things Bloom remembers stay under your control. Nothing is added here without your
              say-so.
            </p>
            <div className="coach-drawer-memory-filters" role="tablist" aria-label="Memory filters">
              {(["all", "pattern", "preference", "goal", "context"] as const).map((filter) => (
                <button
                  type="button"
                  role="tab"
                  key={filter}
                  className={memoryFilter === filter ? "selected" : ""}
                  aria-selected={memoryFilter === filter}
                  onClick={() => onMemoryFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
            {filteredMemories.length ? (
              <div className="coach-drawer-memory-list">
                {filteredMemories.map((memory) => (
                  <div key={memory.id} className="coach-drawer-memory-item">
                    <p>{memory.text}</p>
                    <div>
                      <span>
                        {memory.learnedAt ? `Saved ${memory.learnedAt}` : "Saved context"}
                      </span>
                      <button
                        type="button"
                        onClick={() => onToggleMemory(memory)}
                        className={memory.pinned ? "selected" : ""}
                        aria-label={memory.pinned ? "Unpin memory" : "Pin memory"}
                        title={memory.pinned ? "Unpin memory" : "Pin memory"}
                      >
                        <Pin className="size-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onForgetMemory(memory)}
                        aria-label="Forget memory"
                        title="Forget memory"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="coach-drawer-empty">
                <MoonStar className="size-5" aria-hidden="true" />
                <p>
                  {profileConnected
                    ? "Nothing saved in this view."
                    : "Sign in to use saved context."}
                </p>
              </div>
            )}
            <div className="coach-drawer-note">
              <ShieldCheck className="size-4 text-sage" aria-hidden="true" />
              <span>Review, pin, or forget saved context whenever you want.</span>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function CameraDialog({ onClose, onUsePhoto, onChooseFile }: CameraDialogProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<{ file: File; url: string } | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const requestCamera = useCallback(async () => {
    stopStream();
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera isn't available here. You can choose a photo instead.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setError(null);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch (cameraError) {
      stopStream();
      if (!mountedRef.current) return;
      const name = cameraError instanceof DOMException ? cameraError.name : "";
      setError(
        name === "NotAllowedError" || name === "SecurityError"
          ? "Camera permission was denied. You can choose a photo instead."
          : name === "NotFoundError"
            ? "No camera was found here. You can choose a photo instead."
            : "Camera isn't available here. You can choose a photo instead.",
      );
    }
  }, [stopStream]);

  useEffect(() => {
    mountedRef.current = true;
    void requestCamera();
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      mountedRef.current = false;
      document.removeEventListener("keydown", handleKeyDown);
      stopStream();
    };
  }, [onClose, requestCamera, stopStream]);

  useEffect(() => {
    return () => {
      if (captured) URL.revokeObjectURL(captured.url);
    };
  }, [captured]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError("The camera is still getting ready. Try again in a moment.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("This browser could not capture the image. Choose a photo instead.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("This browser could not capture the image. Try again.");
          return;
        }
        if (captured) URL.revokeObjectURL(captured.url);
        const file = new File([blob], `bloom-camera-${Date.now()}.jpg`, { type: "image/jpeg" });
        setCaptured({ file, url: URL.createObjectURL(blob) });
        stopStream();
      },
      "image/jpeg",
      0.88,
    );
  };

  const retake = () => {
    if (captured) URL.revokeObjectURL(captured.url);
    setCaptured(null);
    setError(null);
    void requestCamera();
  };

  return (
    <div
      className="coach-camera-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="coach-camera-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="camera-title"
      >
        <div className="coach-camera-head">
          <div>
            <p className="eyebrow">Camera input</p>
            <h2 id="camera-title" className="display text-[23px]">
              Bring a moment into focus.
            </h2>
            <p className="coach-camera-subtitle">Nothing is captured until you press Capture.</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="coach-icon-button"
            aria-label="Close camera"
            title="Close camera"
          >
            <X className="size-4" />
          </button>
        </div>
        {error ? (
          <div className="coach-camera-error" role="alert">
            <AlertCircle className="size-4" aria-hidden="true" />
            <div>
              <p>{error}</p>
              <button type="button" onClick={onChooseFile} className="coach-camera-fallback">
                <ImageIcon className="size-3.5" /> Choose a photo instead
              </button>
            </div>
          </div>
        ) : captured ? (
          <img
            src={captured.url}
            alt="Captured attachment preview"
            className="coach-camera-capture"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="coach-camera-video"
            aria-label="Live camera preview"
          />
        )}
        {captured ? (
          <div className="coach-camera-actions">
            <button type="button" onClick={retake} className="coach-button-secondary">
              Retake
            </button>
            <button
              type="button"
              onClick={() => onUsePhoto(captured.file)}
              className="coach-button-primary"
            >
              <Check className="size-4" /> Use photo
            </button>
          </div>
        ) : (
          <div className="coach-camera-actions">
            <button type="button" onClick={onClose} className="coach-button-secondary">
              Cancel
            </button>
            <button
              type="button"
              onClick={capture}
              disabled={Boolean(error)}
              className="coach-button-primary"
            >
              <Camera className="size-4" /> Capture
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AttachmentPreview({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: () => void;
}) {
  const isImage = attachment.type.startsWith("image/");
  const isAudio = attachment.type.startsWith("audio/");
  return (
    <div className="coach-attachment-preview">
      <span className={cn("coach-attachment-preview-media", isAudio && "is-audio")}>
        {isImage && attachment.previewUrl ? (
          <img src={attachment.previewUrl} alt="" />
        ) : isAudio && attachment.previewUrl ? (
          <audio
            controls
            preload="metadata"
            src={attachment.previewUrl}
            aria-label={`Preview ${attachment.name}`}
          />
        ) : (
          <FileText className="size-4 text-sky" aria-hidden="true" />
        )}
      </span>
      <span className="coach-attachment-preview-copy">
        <strong>{attachment.name}</strong>
        <small>{formatBytes(attachment.size)}</small>
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${attachment.name}`}
        title="Remove attachment"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function EmptyConversation({
  onPrompt,
  onLens,
  disabled = false,
}: {
  onPrompt: (prompt: string) => void;
  onLens: (lens: CoachMode) => void;
  disabled?: boolean;
}) {
  return (
    <div className="coach-empty-conversation">
      <div className="coach-empty-mark">
        <span className="coach-empty-mark-pulse" />
        <Sparkles className="size-5" />
      </div>
      <p className="eyebrow">Bloom Coach</p>
      <h2 className="display">Tell me what is on your mind.</h2>
      <p className="coach-empty-copy">
        Bloom can help you ask a question, make space to reflect, or shape a plan from the life you
        are actually living.
      </p>
      <div className="coach-empty-modes" aria-label="Choose how to approach this">
        {LENSES.map((lens) => (
          <div key={lens.id} className="coach-empty-mode-item">
            <button
              type="button"
              tabIndex={disabled ? -1 : 0}
              onClick={() => {
                onLens(lens.id);
                onPrompt(
                  lens.id === "ask"
                    ? "What should I understand today?"
                    : lens.id === "reflect"
                      ? "Help me make sense of today."
                      : "Help me shape a realistic next step.",
                );
              }}
              aria-label={`Use ${lens.label} mode`}
            >
              <span className={`coach-lens-icon coach-accent-${lens.accent}`}>
                <lens.icon className="size-4" aria-hidden="true" />
              </span>
              <strong>{lens.label}</strong>
              <ChevronRight className="size-3.5 text-faint" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      <p className="coach-empty-private">
        <ShieldCheck className="size-3.5 text-sage" /> Only the context you choose to keep can shape
        a future response.
      </p>
    </div>
  );
}

export function CoachPage() {
  const moodSystem = useMoodSystem();
  const coach = useCoachSystem();
  const { entries, analytics } = moodSystem;
  const [lens, setLens] = useState<CoachMode>("ask");
  const [draft, setDraft] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [signInRequired, setSignInRequired] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [responseSlow, setResponseSlow] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const commandModalRef = useRef<HTMLDivElement | null>(null);
  const commandCloseRef = useRef<HTMLButtonElement | null>(null);
  const [drawer, setDrawer] = useState<CoachDrawer | null>(null);
  const [memoryFilter, setMemoryFilter] = useState<CoachMemory["category"] | "all">("all");
  const [composerNotice, setComposerNotice] = useState<string | null>(null);
  const [lastFailed, setLastFailed] = useState<FailedRequest | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [showNewResponse, setShowNewResponse] = useState(false);
  const previewUrlsRef = useRef<Record<string, string>>({});
  const pendingPreviewRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const attachmentMenuRef = useRef<HTMLDivElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const closeAttachmentMenu = () => setAttachmentMenuOpen(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderStreamRef = useRef<MediaStream | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const recorderTimerRef = useRef<number | null>(null);
  const responseTimerRef = useRef<number | null>(null);
  const requestInFlightRef = useRef(false);
  const profileIdRef = useRef<string | null>(coach.profileId);
  const activeLens = LENSES.find((item) => item.id === lens)!;
  const ActiveLensIcon = activeLens.icon;
  const suggestedPrompts = useMemo(
    () => suggestedPromptsFor(lens, entries.length, analytics, coach.habitData),
    [analytics, coach.habitData, entries.length, lens],
  );
  const drawerTriggerRef = useRef<HTMLElement | null>(null);

  const closeDrawer = useCallback(() => {
    setDrawer(null);
    window.requestAnimationFrame(() => drawerTriggerRef.current?.focus());
  }, []);

  const toggleDrawer = useCallback(
    (nextMode: CoachDrawer) => {
      if (drawer === nextMode) {
        closeDrawer();
        return;
      }
      drawerTriggerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setDrawer(nextMode);
    },
    [closeDrawer, drawer],
  );

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    profileIdRef.current = coach.profileId;
  }, [coach.profileId]);

  useEffect(() => {
    try {
      const savedDraft = window.sessionStorage.getItem(COACH_DRAFT_STORAGE_KEY);
      if (savedDraft) {
        setDraft(savedDraft);
        window.sessionStorage.removeItem(COACH_DRAFT_STORAGE_KEY);
      }
    } catch {
      // Session storage can be unavailable in private browsing; the composer still works.
    }
  }, []);

  useEffect(() => {
    if (!coach.profileId) return;
    setSignInRequired(false);
    setComposerNotice((current) => (current === SIGN_IN_NOTICE ? null : current));
    try {
      window.sessionStorage.removeItem(COACH_DRAFT_STORAGE_KEY);
    } catch {
      // Session storage can be unavailable in private browsing.
    }
  }, [coach.profileId]);

  useEffect(
    () => () => {
      mountedRef.current = false;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        try {
          recorder.stop();
        } catch {
          // The browser may already have closed the recorder during teardown.
        }
      }
      recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (recorderTimerRef.current) window.clearInterval(recorderTimerRef.current);
      if (responseTimerRef.current) window.clearTimeout(responseTimerRef.current);
      if (pendingPreviewRef.current) URL.revokeObjectURL(pendingPreviewRef.current);
      Object.values(previewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    const maxHeight = Number.parseFloat(window.getComputedStyle(element).maxHeight);
    const nextHeight = Math.min(
      element.scrollHeight,
      Number.isFinite(maxHeight) ? maxHeight : element.scrollHeight,
    );
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > nextHeight ? "auto" : "hidden";
  }, [draft]);

  useEffect(() => {
    if (!attachmentMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!attachmentMenuRef.current?.contains(event.target as Node)) closeAttachmentMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAttachmentMenu();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [attachmentMenuOpen]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!commandOpen) return;
    commandCloseRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCommandOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = commandModalRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [commandOpen]);

  useEffect(() => {
    if (!drawer) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawer]);

  useEffect(() => {
    const element = threadRef.current;
    if (!element) return;
    if (shouldStickToBottomRef.current) {
      window.requestAnimationFrame(() => {
        element.scrollTo({ top: element.scrollHeight, behavior: thinking ? "auto" : "smooth" });
      });
      setShowNewResponse(false);
    } else if (!thinking && coach.messages.length) {
      setShowNewResponse(true);
    }
  }, [coach.messages.length, thinking]);

  const handleThreadScroll = () => {
    const element = threadRef.current;
    if (!element) return;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    const atBottom = distanceFromBottom < 56;
    shouldStickToBottomRef.current = atBottom;
    if (atBottom) setShowNewResponse(false);
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const element = threadRef.current;
    if (!element) return;
    shouldStickToBottomRef.current = true;
    setShowNewResponse(false);
    element.scrollTo({ top: element.scrollHeight, behavior });
  };

  const clearAttachment = () => {
    if (pendingPreviewRef.current) URL.revokeObjectURL(pendingPreviewRef.current);
    pendingPreviewRef.current = null;
    setAttachment(null);
  };

  const addFile = (file: File) => {
    if (!file.size) {
      setComposerNotice("That file is empty. Choose another attachment.");
      return;
    }
    if (!isSupportedAttachment(file)) {
      setComposerNotice(
        "That file type is not supported here. Choose an image, audio, text, or PDF file.",
      );
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setComposerNotice("That file is larger than 12 MB. Choose a smaller attachment.");
      return;
    }
    if (pendingPreviewRef.current) URL.revokeObjectURL(pendingPreviewRef.current);
    const type = file.type || "application/octet-stream";
    const previewUrl =
      type.startsWith("image/") || type.startsWith("audio/") ? URL.createObjectURL(file) : null;
    pendingPreviewRef.current = previewUrl;
    setAttachment({
      file,
      name: file.name,
      type,
      size: file.size,
      previewUrl,
    });
    closeAttachmentMenu();
    setComposerNotice(null);
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const stopRecording = (discard = false) => {
    const recorder = recorderRef.current;
    if (!recorder) return;

    const finalize = () => {
      const stream = recorderStreamRef.current;
      stream?.getTracks().forEach((track) => track.stop());
      recorderStreamRef.current = null;
      const chunks = recorderChunksRef.current;
      const mimeType = recorder.mimeType || "audio/webm";
      recorderRef.current = null;
      recorderChunksRef.current = [];
      if (!discard && mountedRef.current && chunks.length) {
        const blob = new Blob(chunks, { type: mimeType });
        const extension = mimeType.includes("mp4") ? "m4a" : "webm";
        addFile(new File([blob], `bloom-voice-${Date.now()}.${extension}`, { type: mimeType }));
      }
      if (mountedRef.current) {
        setRecording(false);
        setRecordingSeconds(0);
      }
    };

    recorder.onstop = finalize;
    if (recorderTimerRef.current) {
      window.clearInterval(recorderTimerRef.current);
      recorderTimerRef.current = null;
    }
    if (recorder.state === "inactive") {
      finalize();
      return;
    }
    try {
      recorder.stop();
    } catch {
      finalize();
    }
  };

  const startRecording = async () => {
    if (recording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setComposerNotice("Microphone access isn't available in this browser.");
      return;
    }

    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const supportedMimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(
        (mimeType) =>
          typeof MediaRecorder.isTypeSupported !== "function" ||
          MediaRecorder.isTypeSupported(mimeType),
      );
      const recorder = supportedMimeType
        ? new MediaRecorder(stream, { mimeType: supportedMimeType })
        : new MediaRecorder(stream);
      recorderStreamRef.current = stream;
      recorderRef.current = recorder;
      recorderChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) recorderChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setComposerNotice("Recording stopped because the microphone reported an error.");
        stopRecording(true);
      };
      recorder.start();
      setRecording(true);
      setRecordingSeconds(0);
      setComposerNotice(null);
      recorderTimerRef.current = window.setInterval(
        () => setRecordingSeconds((seconds) => seconds + 1),
        1000,
      );
    } catch {
      stream?.getTracks().forEach((track) => track.stop());
      recorderStreamRef.current = null;
      recorderRef.current = null;
      setComposerNotice(
        "Microphone access was denied or unavailable. Check permissions and try again.",
      );
    }
  };

  const readAttachment = async (file: File) => {
    const result = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        typeof reader.result === "string"
          ? resolve(reader.result)
          : reject(new Error("Could not read attachment."));
      reader.onerror = () => reject(new Error("Could not read attachment."));
      reader.readAsDataURL(file);
    });
    const [header, data] = result.split(",");
    return {
      fileType: header?.match(/data:(.*);base64/)?.[1] || file.type,
      base64Data: data || "",
    };
  };

  const send = async (event?: FormEvent, retry?: FailedRequest) => {
    event?.preventDefault();
    const retryText = retry?.text ?? draft;
    if (!coach.profileId) {
      try {
        if (retryText.trim()) window.sessionStorage.setItem(COACH_DRAFT_STORAGE_KEY, retryText);
      } catch {
        // Keep the in-memory draft even when session storage is unavailable.
      }
      setSignInRequired(true);
      setComposerNotice(SIGN_IN_NOTICE);
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setComposerNotice("You're offline right now.");
      return;
    }

    const requestProfileId = coach.profileId;
    const currentAttachment = retry ? retry.attachment : attachment;
    const text =
      retryText.trim() ||
      (currentAttachment
        ? currentAttachment.type.startsWith("image/")
          ? "Analyze this image."
          : "Please review this attachment."
        : "");
    if ((!text && !currentAttachment) || thinking || requestInFlightRef.current) return;
    requestInFlightRef.current = true;

    const existingUserMessage = retry?.userMessageId
      ? coach.messages.find((message) => message.id === retry.userMessageId)
      : undefined;
    const userMessage: CoachMessage = existingUserMessage ?? {
      id: retry?.userMessageId ?? `user-${Date.now()}`,
      role: "user",
      time: new Date().toISOString(),
      paragraphs: [text],
      sources: [],
      blocks: [],
      attachment: currentAttachment
        ? {
            name: currentAttachment.name,
            type: currentAttachment.type,
            size: currentAttachment.size,
          }
        : undefined,
      status: "sent",
    };
    const history = retry?.errorMessageId
      ? [
          ...coach.messages.filter((message) => message.id !== retry.errorMessageId),
          ...(existingUserMessage ? [] : [userMessage]),
        ]
      : [...coach.messages, userMessage];

    shouldStickToBottomRef.current = true;
    setShowNewResponse(false);
    if (!retry) setSelectedPrompt(null);
    coach.setMessages((current) => {
      const withoutError = retry?.errorMessageId
        ? current.filter((message) => message.id !== retry.errorMessageId)
        : current;
      return withoutError.some((message) => message.id === userMessage.id)
        ? withoutError
        : [...withoutError, userMessage];
    });
    if (currentAttachment?.previewUrl && !previewUrlsRef.current[userMessage.id]) {
      previewUrlsRef.current[userMessage.id] = currentAttachment.previewUrl;
      setPreviews((current) => ({ ...current, [userMessage.id]: currentAttachment.previewUrl! }));
      pendingPreviewRef.current = null;
    }
    if (!retry) {
      setDraft("");
      setAttachment(null);
      setAttachmentMenuOpen(false);
    }
    setThinking(true);
    setResponseSlow(false);
    setLastFailed(null);
    setComposerNotice(null);
    responseTimerRef.current = window.setTimeout(() => {
      if (mountedRef.current) setResponseSlow(true);
    }, 12000);
    try {
      const filePayload = currentAttachment
        ? await readAttachment(currentAttachment.file)
        : undefined;
      const response = await coach.requestResponse({
        text,
        mode: lens,
        context: buildCoachContext(
          entries,
          coach.memories,
          coach.habitData,
          lens,
          text,
          currentAttachment?.type,
        ),
        history,
        attachment: filePayload,
      });
      if (!mountedRef.current || profileIdRef.current !== requestProfileId) return;
      const coachMessage: CoachMessage = {
        id: `coach-${Date.now()}`,
        role: "coach",
        time: new Date().toISOString(),
        paragraphs: response.paragraphs,
        sources: response.sources,
        blocks: response.blocks,
        attachment: undefined,
        status: "sent",
      };
      coach.setMessages((current) => [...current, coachMessage]);
      if (retry) {
        setDraft((current) => (current.trim() === text ? "" : current));
      }
      try {
        const saved = await Promise.all([
          coach.saveMessage(userMessage),
          coach.saveMessage(coachMessage),
        ]);
        if (saved.some((result) => !result)) {
          setComposerNotice("Your conversation couldn't be saved right now.");
        }
      } catch (error) {
        console.error("Coach conversation save failed:", error);
        setComposerNotice("Your conversation couldn't be saved right now.");
      }
    } catch (error) {
      console.error("Coach response failed:", error);
      const userFacingError = coachErrorMessage(
        error,
        currentAttachment?.type.startsWith("image/")
          ? "I couldn't analyze that image."
          : currentAttachment?.type.startsWith("audio/")
            ? "I couldn't process that recording."
            : "Something interrupted Bloom's response.",
      );
      const errorMessage: CoachMessage = {
        id: `coach-error-${Date.now()}`,
        role: "coach",
        time: new Date().toISOString(),
        paragraphs: [userFacingError],
        sources: [],
        blocks: [],
        attachment: undefined,
        status: "error",
      };
      coach.setMessages((current) => [...current, errorMessage]);
      if (userFacingError === SESSION_NOTICE) {
        setSignInRequired(true);
        setComposerNotice(SESSION_NOTICE);
      }
      setDraft((current) => (current.trim() ? current : text));
      setLastFailed({
        text,
        attachment: currentAttachment,
        userMessageId: userMessage.id,
        errorMessageId: errorMessage.id,
      });
    } finally {
      requestInFlightRef.current = false;
      if (responseTimerRef.current) {
        window.clearTimeout(responseTimerRef.current);
        responseTimerRef.current = null;
      }
      if (mountedRef.current) {
        setResponseSlow(false);
        setThinking(false);
      }
    }
  };

  const copyMessage = async (message: CoachMessage) => {
    const text = message.paragraphs.join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setComposerNotice("Response copied to clipboard.");
    } catch {
      setComposerNotice("Copy is unavailable in this browser.");
    }
  };

  const choosePrompt = (prompt: string) => {
    setDraft(prompt);
    setSelectedPrompt(prompt);
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleBlockAction = (action: string) => {
    if (action === "plan-start") {
      setLens("plan");
      choosePrompt("Help me turn that into a plan I can actually follow.");
      setComposerNotice("A follow-up is ready in Plan.");
      return;
    }
    if (action === "plan-adjust") {
      setLens("plan");
      choosePrompt("Adjust that plan for the energy I have today.");
      setComposerNotice("A plan adjustment is ready to send.");
      return;
    }
    if (action === "proposal-explore") {
      choosePrompt("Tell me more about that suggested change.");
      setComposerNotice("A follow-up is ready to send.");
      return;
    }
    setComposerNotice("Kept out of view for now.");
  };

  const toggleMemory = async (memory: CoachMemory) => {
    try {
      await coach.updateMemory(memory.id, { pinned: !memory.pinned });
    } catch {
      setComposerNotice("That memory could not be updated right now.");
    }
  };

  const forgetMemory = async (memory: CoachMemory) => {
    try {
      await coach.forgetMemory(memory.id);
    } catch {
      setComposerNotice("That memory could not be removed right now.");
    }
  };

  const closeCamera = useCallback(() => {
    setCameraOpen(false);
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  const handleCameraPhoto = (file: File) => {
    addFile(file);
    setCameraOpen(false);
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const choosePhotoInstead = () => {
    setCameraOpen(false);
    window.setTimeout(() => photoInputRef.current?.click(), 0);
  };

  const preserveDraftForSignIn = () => {
    try {
      if (draft.trim()) window.sessionStorage.setItem(COACH_DRAFT_STORAGE_KEY, draft);
    } catch {
      // Keep the in-memory draft even when session storage is unavailable.
    }
  };

  return (
    <div className="coach-page relative min-h-screen bg-background text-foreground">
      <BloomHeader />
      <div className="coach-atmosphere">
        <Atmosphere />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[1360px] px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        <header className="coach-page-header">
          <div>
            <p className="eyebrow flex items-center gap-2">
              <span className="coach-live-dot">
                <span />
              </span>{" "}
              Bloom Coach
            </p>
            <h1 className="display mt-4 text-[34px] leading-[1] sm:text-[48px]">
              A second mind
              <br />
              <span className="coach-gradient-text">for your day.</span>
            </h1>
            <p className="mt-4 max-w-[54ch] text-[14px] leading-relaxed text-muted-foreground">
              A place to ask, reflect, and decide what comes next — grounded in the signals you
              choose to bring.
            </p>
          </div>
          <div className="coach-header-actions">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="coach-command-button"
              title="Open Coach shortcuts"
            >
              <Command className="size-3.5" aria-hidden="true" /> <span>Cmd K</span>
            </button>
          </div>
        </header>

        <div className="coach-workspace">
          <aside className="coach-left-rail">
            <div className="coach-mode-selector" aria-label="Coach modes">
              <div className="coach-mode-list">
                {LENSES.map((item) => (
                  <div key={item.id} className="coach-mode-item">
                    <LensButton
                      lens={item}
                      active={lens === item.id}
                      onSelect={() => setLens(item.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="coach-secondary-nav" aria-label="Coach details">
              <button
                type="button"
                className={cn("coach-secondary-nav-button", drawer === "context" && "selected")}
                onClick={() => toggleDrawer("context")}
                aria-expanded={drawer === "context"}
              >
                <span className="coach-secondary-nav-icon">
                  <PanelRight className="size-3.5" aria-hidden="true" />
                </span>
                <span>
                  <strong>Context</strong>
                  <small>{coach.profileId ? "Connected" : "Not connected"}</small>
                </span>
              </button>
              <button
                type="button"
                className={cn("coach-secondary-nav-button", drawer === "memory" && "selected")}
                onClick={() => toggleDrawer("memory")}
                aria-expanded={drawer === "memory"}
              >
                <span className="coach-secondary-nav-icon coach-secondary-nav-icon-memory">
                  <MoonStar className="size-3.5" aria-hidden="true" />
                </span>
                <span>
                  <strong>Memory</strong>
                  <small>
                    {coach.memories.length ? `${coach.memories.length} saved` : "Quiet"}
                  </small>
                </span>
              </button>
            </div>
          </aside>

          <section className="coach-chat-shell">
            <div className="coach-chat-header">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={cn("coach-chat-agent-icon", thinking && "is-thinking")}
                  aria-hidden="true"
                >
                  <Sparkles className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="display truncate text-[20px]">Bloom Coach</h2>
                    <span className={cn("coach-online-pill", thinking && "is-thinking")}>
                      <span /> {thinking ? "thinking" : "ready"}
                    </span>
                  </div>
                  <p className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                    <ActiveLensIcon className="size-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      {activeLens.label} · {activeLens.description}
                    </span>
                  </p>
                </div>
              </div>
            </div>
            <div className="coach-chat-rule" />
            {coach.storageError ? (
              <div className="coach-storage-notice" role="status">
                <Info className="size-3.5" aria-hidden="true" />
                <span>{coach.storageError}</span>
              </div>
            ) : null}
            <div
              ref={threadRef}
              className="coach-thread"
              role="log"
              aria-live="polite"
              aria-busy={thinking}
              onScroll={handleThreadScroll}
            >
              {coach.loading ? (
                <div className="coach-thread-loading">
                  <div className="coach-loading-orb">
                    <span />
                  </div>
                  <p className="eyebrow">Opening your private conversation…</p>
                </div>
              ) : (
                <>
                  <div
                    className={cn("coach-empty-wrap", coach.messages.length > 0 && "is-exiting")}
                    aria-hidden={coach.messages.length > 0}
                  >
                    <EmptyConversation
                      onPrompt={choosePrompt}
                      onLens={setLens}
                      disabled={coach.messages.length > 0}
                    />
                  </div>
                  <div
                    className={cn("coach-message-list", coach.messages.length > 0 && "is-active")}
                    aria-label="Coach conversation"
                  >
                    {coach.messages.map((message, index) => (
                      <MessageCard
                        key={message.id}
                        message={message}
                        grouped={index > 0 && coach.messages[index - 1]?.role === message.role}
                        previewUrl={message.attachment ? previews[message.id] : undefined}
                        onCopy={() => void copyMessage(message)}
                        onRetry={
                          message.status === "error" && lastFailed
                            ? () => void send(undefined, lastFailed)
                            : undefined
                        }
                        onBlockAction={handleBlockAction}
                        onFollowUp={() => choosePrompt("Tell me more about that.")}
                        onPlan={() => {
                          setLens("plan");
                          choosePrompt("Help me turn that into a plan I can actually follow.");
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
              {thinking ? (
                <div className="coach-thinking" aria-label="Bloom is thinking">
                  <span
                    className="coach-message-avatar coach-avatar-coach is-thinking"
                    aria-hidden="true"
                  >
                    <Sparkles className="size-4" />
                  </span>
                  <div>
                    <p className="coach-thinking-label">
                      <span>
                        <Sparkles className="size-3" aria-hidden="true" /> Bloom
                      </span>
                      <em>{responseSlow ? "taking a little longer…" : "thinking…"}</em>
                    </p>
                    <div className="coach-thinking-dots" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              ) : null}
              {showNewResponse ? (
                <button
                  type="button"
                  className="coach-new-response"
                  onClick={() => scrollToBottom()}
                >
                  New response <ArrowDown className="size-3.5" aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <div className="coach-chat-bottom">
              {attachment ? (
                <AttachmentPreview attachment={attachment} onRemove={clearAttachment} />
              ) : null}
              {composerNotice ? (
                <div
                  className={cn("coach-composer-notice", signInRequired && "is-sign-in-required")}
                  role="status"
                >
                  <Info className="size-3.5 text-sky" aria-hidden="true" />
                  <span>{composerNotice}</span>
                  {signInRequired ? (
                    <a
                      href="/bloom/index.html?return=/coach"
                      className="coach-notice-action"
                      onClick={preserveDraftForSignIn}
                    >
                      Sign in
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setComposerNotice(null);
                      setSignInRequired(false);
                    }}
                    aria-label="Dismiss notice"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                </div>
              ) : null}
              <div
                className={cn("coach-quick-prompts", coach.messages.length > 0 && "is-dismissed")}
                aria-label="Suggested prompts"
                aria-hidden={coach.messages.length > 0}
              >
                {suggestedPrompts.map((prompt) => (
                  <button
                    type="button"
                    key={prompt}
                    className={selectedPrompt === prompt ? "selected" : ""}
                    aria-pressed={selectedPrompt === prompt}
                    tabIndex={coach.messages.length > 0 ? -1 : 0}
                    onClick={() => choosePrompt(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              {recording ? (
                <div className="coach-recording-bar">
                  <span className="coach-recording-live">
                    <span /> Recording
                  </span>
                  <span className="coach-recording-time">
                    00:{String(recordingSeconds).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    onClick={() => stopRecording(true)}
                    className="coach-recording-cancel"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => stopRecording()}
                    className="coach-recording-stop"
                  >
                    <StopCircle className="size-4" /> Stop
                  </button>
                </div>
              ) : (
                <form
                  className={cn(
                    "coach-composer",
                    draft.trim() && "has-draft",
                    thinking && "is-responding",
                  )}
                  onSubmit={send}
                  aria-busy={thinking}
                >
                  <div className="coach-composer-top">
                    <div ref={attachmentMenuRef} className="coach-attachment-wrap">
                      <button
                        type="button"
                        className="coach-composer-icon coach-composer-plus"
                        onClick={() => setAttachmentMenuOpen((open) => !open)}
                        aria-label="Attach file"
                        aria-expanded={attachmentMenuOpen}
                        aria-controls="coach-attachment-menu"
                        title="Attach file"
                      >
                        <Paperclip className="size-4" aria-hidden="true" />
                      </button>
                      {attachmentMenuOpen ? (
                        <div
                          id="coach-attachment-menu"
                          className="coach-attachment-menu"
                          role="menu"
                          aria-label="Attachment options"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              closeAttachmentMenu();
                              photoInputRef.current?.click();
                            }}
                          >
                            <ImageIcon className="size-3.5" aria-hidden="true" /> Photo
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              closeAttachmentMenu();
                              fileInputRef.current?.click();
                            }}
                          >
                            <FileText className="size-3.5" aria-hidden="true" /> File
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              closeAttachmentMenu();
                              setCameraOpen(true);
                            }}
                          >
                            <Camera className="size-3.5" aria-hidden="true" /> Camera
                          </button>
                        </div>
                      ) : null}
                      <input
                        ref={photoInputRef}
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) addFile(file);
                          event.currentTarget.value = "";
                        }}
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        hidden
                        accept="audio/*,.pdf,.txt,.md,.csv,.doc,.docx,.xls,.xlsx"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) addFile(file);
                          event.currentTarget.value = "";
                        }}
                      />
                    </div>
                    <textarea
                      ref={textareaRef}
                      id="coach-composer"
                      value={draft}
                      onChange={(event) => {
                        setDraft(event.target.value);
                        setSelectedPrompt(null);
                      }}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          !event.shiftKey &&
                          !event.nativeEvent.isComposing
                        ) {
                          event.preventDefault();
                          void send();
                        }
                      }}
                      placeholder={
                        lens === "ask"
                          ? "What would you like to understand?"
                          : lens === "reflect"
                            ? "What would you like to make sense of?"
                            : "What are you trying to make happen?"
                      }
                      rows={1}
                      aria-label="Message Bloom Coach"
                    />
                    <button
                      type="button"
                      className="coach-composer-icon coach-camera-inline"
                      onClick={() => setCameraOpen(true)}
                      aria-label="Open camera"
                      title="Open camera"
                    >
                      <Camera className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="coach-composer-icon"
                      onClick={() => void startRecording()}
                      aria-label="Record voice"
                      title="Record voice"
                      disabled={thinking}
                    >
                      <Mic className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="submit"
                      disabled={(!draft.trim() && !attachment) || thinking}
                      className="coach-send-button"
                      aria-label="Send message"
                      title="Send message"
                    >
                      <Send className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="coach-composer-footer">
                    <div className="flex min-w-0 items-center gap-2">
                      <button
                        type="button"
                        className={cn("coach-context-toggle", drawer === "context" && "selected")}
                        onClick={() => toggleDrawer("context")}
                        aria-expanded={drawer === "context"}
                        aria-controls="coach-details-drawer"
                      >
                        <ShieldCheck className="size-3" aria-hidden="true" />
                        <span className="truncate">
                          {entries.length ? `Using ${entries} recorded signals` : "Private context"}
                        </span>
                      </button>
                    </div>
                    <span className="coach-composer-hint" aria-live="polite">
                      {responseSlow
                        ? "Bloom is taking a little longer…"
                        : thinking
                          ? "Bloom is responding…"
                          : "Enter to send · Shift + Enter for a new line"}
                    </span>
                  </div>
                </form>
              )}
            </div>
          </section>
        </div>
      </main>

      {drawer ? (
        <ContextDrawer
          id="coach-details-drawer"
          mode={drawer}
          onModeChange={(nextMode) => setDrawer(nextMode)}
          onClose={closeDrawer}
          entries={entries.length}
          analytics={analytics}
          habitData={coach.habitData}
          memories={coach.memories}
          memoryFilter={memoryFilter}
          onMemoryFilter={setMemoryFilter}
          onToggleMemory={toggleMemory}
          onForgetMemory={forgetMemory}
          profileConnected={Boolean(coach.profileId)}
        />
      ) : null}

      {commandOpen ? (
        <div
          className="coach-command-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setCommandOpen(false);
          }}
        >
          <div
            ref={commandModalRef}
            className="coach-command-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="coach-command-title"
          >
            <div className="coach-command-top">
              <p id="coach-command-title" className="eyebrow">
                Coach shortcuts
              </p>
              <button
                type="button"
                ref={commandCloseRef}
                onClick={() => setCommandOpen(false)}
                className="coach-icon-button"
                aria-label="Close command palette"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="coach-command-search">
              <Command className="size-4 text-violet" />
              <span>Switch lens or focus the conversation</span>
              <kbd>Esc</kbd>
            </div>
            <div className="coach-command-list">
              {LENSES.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      setLens(item.id);
                      setCommandOpen(false);
                      document.getElementById("coach-composer")?.focus();
                    }}
                  >
                    <span className={`coach-lens-icon coach-accent-${item.accent}`}>
                      <Icon className="size-4" />
                    </span>
                    <span>
                      <strong>Switch to {item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                    <ChevronRight className="size-3.5 text-faint" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
      {cameraOpen ? (
        <CameraDialog
          onClose={closeCamera}
          onUsePhoto={handleCameraPhoto}
          onChooseFile={choosePhotoInstead}
        />
      ) : null}
    </div>
  );
}
