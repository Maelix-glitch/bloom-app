import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Info, X } from "lucide-react";

import { AppNav } from "@/components/home/HomeSidebar";
import { useMoodSystem } from "@/hooks/useMoodSystem";
import {
  coachErrorMessage,
  readCoachRecord,
  useCoachSystem,
  type CoachMemory,
  type CoachMessage,
  type CoachMode,
} from "@/hooks/useCoachSystem";
import { buildCoachContext } from "@/lib/coach/intelligence";
import type { CoachMedia } from "@/lib/coach/edge";
import { isVisionType, fileToCoachMedia } from "@/lib/coach/media";
import { parseSidecars } from "@/lib/coach/sidecar";
import { executeCoachTool } from "@/lib/coach/tools";
import { followUpPrompts, starterPrompts, type Starter } from "@/lib/coach/ui-helpers";
import { todayKey } from "@/lib/cycle/predict";

import { CoachSidebar, CoachSidebarContent } from "./CoachSidebar";
import { CoachHeader } from "./CoachHeader";
import { CoachThread } from "./CoachThread";
import { Composer, type ComposerAttachment } from "./Composer";
import { CoachContextPanel, type CoachPanelTab } from "./ContextPanel";
import { CoachSheet } from "./CoachSheet";
import { QuickPalette } from "./QuickPalette";
import { CoachCamera } from "./CoachCamera";

const SESSION_NOTICE = "Your session needs to be refreshed.";
const DRAFT_MAP_KEY = "bloom.coach.drafts.v2";
const RAIL_KEY = "bloom.coach.rail";

interface AttachmentMeta {
  name: string;
  type: string;
  size: number;
}

interface PendingRequest {
  conversationId: string;
  mode: CoachMode;
  text: string;
  attachment: AttachmentMeta | null;
  userMessageId: string;
  errorMessageId: string;
}

function memoriesToContext(memories: CoachMemory[]) {
  return memories.map((memory) => ({
    id: memory.id,
    category: memory.category,
    text: memory.text,
    pinned: memory.pinned,
    learnedAt: memory.learnedAt ?? "",
  }));
}

function readDraftMap(): Record<string, string> {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_MAP_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeDraftMap(map: Record<string, string>) {
  try {
    window.sessionStorage.setItem(DRAFT_MAP_KEY, JSON.stringify(map));
  } catch {
    /* private browsing */
  }
}

function newMessageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function CoachPage() {
  const moodSystem = useMoodSystem();
  const coach = useCoachSystem();
  const { entries, analytics } = moodSystem;

  const [fallbackLens, setFallbackLens] = useState<CoachMode>("ask");
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [responseSlow, setResponseSlow] = useState(false);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<CoachPanelTab>("context");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [signInRequired, setSignInRequired] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [record, setRecord] = useState(() => readCoachRecord([]));
  const [railExpanded, setRailExpanded] = useState(true);

  const mountedRef = useRef(true);
  const slowTimerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const lastFailedRef = useRef<PendingRequest | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const activeDraftKeyRef = useRef<string>("new");
  const draftRef = useRef("");
  draftRef.current = draft;

  const activeConversation = coach.activeConversation;
  const activeId = activeConversation?.id ?? null;
  const lens = activeConversation?.mode ?? fallbackLens;

  /* --------------------------------- rail --------------------------------- */
  useEffect(() => {
    mountedRef.current = true;
    try {
      const saved = window.localStorage.getItem(RAIL_KEY);
      if (saved !== null) setRailExpanded(saved === "1");
      else if (window.innerWidth < 1240) setRailExpanded(false);
    } catch {
      /* storage blocked */
    }
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const toggleRail = useCallback(() => {
    setRailExpanded((current) => {
      try {
        window.localStorage.setItem(RAIL_KEY, current ? "0" : "1");
      } catch {
        /* storage blocked */
      }
      return !current;
    });
  }, []);

  /* ------------------------------ the record ------------------------------ */
  useEffect(() => {
    const pinned = coach.memories.filter((m) => m.pinned).map((m) => m.text);
    setRecord(readCoachRecord(pinned));
  }, [coach.memories]);

  /* ------------------------- per-thread drafts ---------------------------- */
  /* Key the thread's draft follows at any moment (kept in a ref so the write
     effect below can never mislabel a draft when the thread just switched). */
  useEffect(() => {
    activeDraftKeyRef.current = activeId ?? "new";
  }, [activeId]);

  useEffect(() => {
    if (draft.trim() === "") return;
    const map = readDraftMap();
    const key = activeDraftKeyRef.current;
    if (map[key] !== draft) writeDraftMap({ ...map, [key]: draft });
  }, [draft]);

  const clearDraftFor = useCallback((id: string | null) => {
    try {
      const map = readDraftMap();
      delete map[id ?? "new"];
      writeDraftMap(map);
    } catch {
      /* ignore */
    }
    setDraft("");
  }, []);

  useEffect(
    () => () => {
      try {
        if (draftRef.current.trim() !== "") {
          const map = readDraftMap();
          writeDraftMap({ ...map, [activeDraftKeyRef.current]: draftRef.current });
        }
      } catch {
        /* ignore */
      }
      if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current);
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    },
    [],
  );

  /* stale blockers clear once a profile is present */
  useEffect(() => {
    if (!coach.profileId) return;
    setSignInRequired(false);
    setNotice((current) => (current === SESSION_NOTICE ? null : current));
  }, [coach.profileId]);

  /* ⌘K — quick palette */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* a newly arrived reply is fresh only inside its own thread */
  useEffect(() => {
    setFreshId(null);
  }, [activeId]);

  /* --------------------------- derived context ---------------------------- */
  const contextLive = useMemo(() => {
    if (entries.length > 0) return true;
    if (coach.habitData.available && coach.habitData.habits.length > 0) return true;
    if (record.trackers.some((tracker) => tracker.daysLogged > 0)) return true;
    if (record.cycle && record.cycle.daysLogged > 0) return true;
    return coach.memories.some((memory) => memory.pinned);
  }, [entries.length, coach.habitData, coach.memories, record]);

  const contextLabel = contextLive ? "Personal context · On" : "Personal context";

  const panelStats = useMemo(
    () => ({
      entries: entries.length,
      avg: analytics.avg ?? 0,
      avgEnergy: analytics.avgEnergy ?? 0,
      avgStress: analytics.avgStress ?? 0,
    }),
    [entries.length, analytics.avg, analytics.avgEnergy, analytics.avgStress],
  );

  const starters = useMemo(
    () => starterPrompts(lens, record, entries.length, todayKey()),
    [lens, record, entries.length],
  );

  const followUps = useMemo(
    () => (activeConversation ? followUpPrompts(lens, activeConversation.messages) : []),
    [activeConversation, lens],
  );

  const placeholder =
    lens === "reflect"
      ? "What would you like to make sense of?"
      : lens === "plan"
        ? "What are you trying to make happen?"
        : "What are you thinking about?";

  /* ------------------------------ small controls -------------------------- */
  const focusComposer = useCallback(() => {
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  const fillDraft = useCallback(
    (text: string) => {
      setDraft(text);
      setNotice(null);
      focusComposer();
    },
    [focusComposer],
  );

  const openPanel = useCallback((tab: CoachPanelTab) => {
    setPanelTab(tab);
    setPanelOpen(true);
  }, []);

  const chooseLens = useCallback(
    (next: CoachMode) => {
      if (activeConversation) {
        coach.setConversationMode(activeConversation.id, next);
      } else {
        setFallbackLens(next);
      }
    },
    [activeConversation, coach],
  );

  /* ---------------------------- request pipeline --------------------------- */
  /**
   * One answer at a time. `history` is the conversation as it stands; when a
   * previous reply is being replaced (retry / regenerate) pass its id and the
   * matching user message stays exactly where it is.
   */
  const requestAnswer = useCallback(
    async (params: {
      text: string;
      mode: CoachMode;
      history: CoachMessage[];
      conversationId: string;
      attachment?: AttachmentMeta | null;
      media?: CoachMedia | null;
      userMessage?: CoachMessage | null;
      replaceMessageId?: string | null;
    }): Promise<boolean> => {
      const {
        text,
        mode,
        history,
        conversationId,
        attachment,
        media,
        userMessage,
        replaceMessageId,
      } = params;
      if (inFlightRef.current) {
        if (thinking) setNotice("Bloom is still finishing the last reply — one moment.");
        return false;
      }
      if (thinking) return false;
      inFlightRef.current = true;
      setThinking(true);
      setResponseSlow(false);
      setNotice(null);
      slowTimerRef.current = window.setTimeout(() => {
        if (mountedRef.current) setResponseSlow(true);
      }, 12_000);

      const profileAtStart = coach.profileId;
      const baseHistory = replaceMessageId
        ? history.filter((m) => m.id !== replaceMessageId)
        : history;

      /* find the user message this answer belongs to — never duplicate it */
      let answerTo: CoachMessage | undefined = userMessage ?? undefined;
      if (!answerTo && replaceMessageId) {
        const at = history.findIndex((m) => m.id === replaceMessageId);
        const previous = at > 0 ? history[at - 1] : undefined;
        if (previous && (previous.role === "user" || previous.role === "you")) answerTo = previous;
      }
      if (!answerTo) {
        answerTo = {
          id: newMessageId("user"),
          role: "user",
          time: new Date().toISOString(),
          paragraphs: [text],
          sources: [],
          blocks: [],
          attachment: attachment
            ? { name: attachment.name, type: attachment.type, size: attachment.size }
            : undefined,
          status: "sent",
        };
      }
      if (!answerTo) return false;
      const pendingHistory = baseHistory.some((m) => m.id === answerTo.id)
        ? baseHistory
        : [...baseHistory, answerTo];

      coach.setMessages(() => pendingHistory);

      try {
        const response = await coach.requestResponse({
          text,
          mode,
          context: buildCoachContext(
            entries,
            memoriesToContext(coach.memories),
            coach.habitData,
            mode,
            text,
            attachment?.type,
          ),
          history: pendingHistory,
          attachment: media
            ? { fileType: media.mediaType, base64Data: media.dataBase64 }
            : undefined,
        });
        if (!mountedRef.current || profileAtStart !== coach.profileId) return true;

        /*
         * Model replies may carry structured sidecars: things to remember,
         * things to forget, and app actions to run. They are executed here —
         * after the reply is in hand — and stripped from the text, so the
         * thread only ever shows prose plus one honest outcome line.
         */
        const parsed = parseSidecars(response.paragraphs.join("\n\n"));
        let paragraphs = parsed.text
          ? parsed.text
              .split(/\n{2,}/)
              .map((part) => part.trim())
              .filter(Boolean)
          : [];
        if (paragraphs.length === 0) {
          paragraphs = response.paragraphs.length > 0 ? [...response.paragraphs] : [];
        }
        for (const memory of parsed.memories.slice(0, 3)) {
          void coach.rememberMemory(memory.text, memory.category);
        }
        for (const forget of parsed.forgets.slice(0, 3)) {
          void coach.forgetMemoryText(forget.text);
        }
        const tool = parsed.tools[0];
        if (tool) {
          const outcome = await executeCoachTool(tool, coach.profileId);
          paragraphs = [...paragraphs, outcome.outcome];
        }
        if (paragraphs.length === 0) {
          paragraphs = ["Sorry — I lost my train of thought there. Ask me again?"];
        }

        const coachMessage: CoachMessage = {
          id: newMessageId("coach"),
          role: "coach",
          time: new Date().toISOString(),
          paragraphs,
          sources: response.sources,
          blocks: response.blocks,
          status: "sent",
          source: response.source,
          fellBackBecause: response.fellBackBecause,
        };

        coach.setMessages((current) => {
          const cleaned = replaceMessageId
            ? current.filter((m) => m.id !== replaceMessageId)
            : current;
          return [...cleaned, coachMessage];
        });
        setFreshId(coachMessage.id);

        if (coach.profileId) {
          try {
            const saved = await Promise.all([
              coach.saveMessage(answerTo),
              coach.saveMessage(coachMessage),
            ]);
            if (saved.some((result) => !result)) {
              setNotice("Your conversation couldn't be saved to your account right now.");
            }
          } catch (error) {
            console.error("Coach conversation save failed:", error);
          }
        }
        lastFailedRef.current = null;
        return true;
      } catch (error) {
        if (error instanceof Error && error.name === "CoachCancelled") return true;
        console.error("Coach response failed:", error);
        if (!mountedRef.current || profileAtStart !== coach.profileId) return true;
        const userFacingError = coachErrorMessage(
          error,
          "Something interrupted Bloom's reply — your words are safe.",
        );
        const errorMessage: CoachMessage = {
          id: newMessageId("coach-error"),
          role: "coach",
          time: new Date().toISOString(),
          paragraphs: [userFacingError],
          sources: [],
          blocks: [],
          status: "error",
        };
        coach.setMessages((current) => {
          const cleaned = replaceMessageId
            ? current.filter((m) => m.id !== replaceMessageId)
            : current;
          return [...cleaned, errorMessage];
        });
        if (userFacingError === SESSION_NOTICE) {
          setSignInRequired(true);
          setNotice(SESSION_NOTICE);
        } else {
          lastFailedRef.current = {
            conversationId,
            mode,
            text,
            attachment: attachment ?? null,
            userMessageId: answerTo.id,
            errorMessageId: errorMessage.id,
          };
        }
        return false;
      } finally {
        if (slowTimerRef.current) {
          window.clearTimeout(slowTimerRef.current);
          slowTimerRef.current = null;
        }
        inFlightRef.current = false;
        if (mountedRef.current) {
          setThinking(false);
          setResponseSlow(false);
        }
      }
    },
    [coach, entries, thinking],
  );

  /* ------------------------------- send paths ------------------------------ */
  const sendMessage = useCallback(
    async (
      text: string,
      mode: CoachMode,
      attachment?: ComposerAttachment | null,
    ): Promise<boolean> => {
      if (!text.trim() && !attachment) return false;
      const conversation = coach.activeConversation;
      const history = conversation?.messages ?? [];
      const meta: AttachmentMeta | null = attachment
        ? { name: attachment.name, type: attachment.type, size: attachment.size }
        : null;

      /* Photos (and readable PDFs) become vision input for the online coach. */
      let media: CoachMedia | null = null;
      if (attachment?.file && isVisionType(attachment.file.type)) {
        try {
          media = await fileToCoachMedia(attachment.file);
        } catch {
          media = null;
        }
      }

      let userMessage: CoachMessage | null = null;
      if (attachment) {
        userMessage = {
          id: newMessageId("user"),
          role: "user",
          time: new Date().toISOString(),
          paragraphs: [text.trim() || "Please review this attachment."],
          sources: [],
          blocks: [],
          attachment: meta ?? undefined,
          status: "sent",
        };
        if (attachment.previewUrl) {
          const url = attachment.previewUrl;
          objectUrlsRef.current.push(url);
          setPreviews((current) => ({ ...current, [userMessage!.id]: url }));
        }
      }

      const ok = await requestAnswer({
        text: text.trim(),
        mode,
        history,
        conversationId: conversation?.id ?? "",
        attachment: meta,
        media,
        userMessage,
      });
      if (ok) {
        clearDraftFor(conversation?.id ?? null);
      }
      return ok;
    },
    [coach, requestAnswer, clearDraftFor],
  );

  const retryFailed = useCallback(
    async (message: CoachMessage) => {
      const pending = lastFailedRef.current;
      const conversation = coach.activeConversation;
      if (!conversation || !pending || pending.conversationId !== conversation.id) return;
      if (pending.errorMessageId !== message.id) return;
      await requestAnswer({
        text: pending.text,
        mode: pending.mode,
        history: conversation.messages,
        conversationId: conversation.id,
        attachment: pending.attachment,
        replaceMessageId: pending.errorMessageId,
      });
    },
    [coach, requestAnswer],
  );

  const regenerateLast = useCallback(
    async (message: CoachMessage) => {
      const conversation = coach.activeConversation;
      if (!conversation || thinking) return;
      const index = conversation.messages.findIndex((m) => m.id === message.id);
      if (index < 0 || conversation.messages[index]?.role !== "coach") return;
      const user = conversation.messages[index - 1];
      const text =
        user && (user.role === "user" || user.role === "you")
          ? (user.text ?? user.paragraphs.join(" ")).trim()
          : "";
      if (!text) return;
      await requestAnswer({
        text,
        mode: conversation.mode,
        history: conversation.messages,
        conversationId: conversation.id,
        replaceMessageId: message.id,
      });
    },
    [coach, requestAnswer, thinking],
  );

  const startStarter = useCallback(
    (starter: Starter) => {
      void sendMessage(starter.text, starter.lens);
    },
    [sendMessage],
  );

  const handleBlockAction = useCallback(
    (action: string) => {
      if (action === "plan-start") {
        void sendMessage("Help me turn that into a plan I can actually follow.", "plan");
      } else if (action === "plan-adjust") {
        void sendMessage("Adjust that plan for the energy I have today.", "plan");
      } else if (action === "proposal-explore") {
        void sendMessage("Tell me more about that suggested change.", lens);
      }
    },
    [lens, sendMessage],
  );

  const handleFollowUp = useCallback(
    (prompt: string) => {
      fillDraft(prompt);
    },
    [fillDraft],
  );

  const tellMeMore = useCallback(() => {
    fillDraft("Tell me more about that.");
  }, [fillDraft]);

  const makePlan = useCallback(() => {
    chooseLens("plan");
    fillDraft("Help me turn that into a plan I can actually follow.");
  }, [chooseLens, fillDraft]);

  /* --------------------------- conversation control ------------------------ */
  /** Switch threads, carrying each thread's draft with it. */
  const openConversation = useCallback(
    (id: string | null) => {
      const previousKey = activeDraftKeyRef.current;
      try {
        if (draftRef.current.trim() !== "") {
          const map = readDraftMap();
          writeDraftMap({ ...map, [previousKey]: draftRef.current });
        }
      } catch {
        /* ignore */
      }
      const nextKey = id ?? "new";
      activeDraftKeyRef.current = nextKey;
      setDraft(readDraftMap()[nextKey] ?? "");
      setFreshId(null);
      coach.openConversation(id);
      if (id === null) setFallbackLens("ask");
    },
    [coach],
  );

  const newConversation = useCallback(() => {
    openConversation(null);
    focusComposer();
  }, [openConversation, focusComposer]);

  const deleteConversation = useCallback(
    (id: string) => {
      const wasActive = coach.activeConversation?.id === id;
      coach.removeConversation(id);
      clearDraftFor(id);
      if (wasActive) {
        const next = coach.conversations.find((c) => c.id !== id)?.id ?? null;
        openConversation(next);
        if (next === null) setFallbackLens("ask");
      }
    },
    [coach, clearDraftFor, openConversation],
  );

  const renameConversation = useCallback(
    (id: string, title: string) => coach.renameConversation(id, title),
    [coach],
  );

  const toggleMemory = useCallback(
    async (memory: CoachMemory) => {
      try {
        await coach.updateMemory(memory.id, { pinned: !memory.pinned });
      } catch {
        setNotice("That memory couldn't be updated right now.");
      }
    },
    [coach],
  );

  const forgetMemory = useCallback(
    async (memory: CoachMemory) => {
      try {
        await coach.forgetMemory(memory.id);
      } catch {
        setNotice("That memory couldn't be removed right now.");
      }
    },
    [coach],
  );

  const preserveDraftForSignIn = useCallback(() => {
    try {
      const key = activeId ?? "new";
      if (draft.trim() !== "") {
        const map = readDraftMap();
        writeDraftMap({ ...map, [key]: draft });
      }
    } catch {
      /* ignore */
    }
  }, [activeId, draft]);

  /* -------------------------------- camera --------------------------------- */
  const useCameraPhoto = useCallback(
    (file: File) => {
      setCameraOpen(false);
      window.dispatchEvent(new CustomEvent<File>("coach:attach", { detail: file }));
      focusComposer();
    },
    [focusComposer],
  );

  const choosePhotoInstead = useCallback(() => {
    setCameraOpen(false);
    window.dispatchEvent(new CustomEvent("coach:pick-photo"));
  }, []);

  /* --------------------------------- view ---------------------------------- */
  const thread = {
    conversationKey: activeId ?? "new",
    loading: coach.loading,
    messages: coach.messages,
    previews,
    freshId,
    thinking,
    responseSlow,
    showWelcome: coach.messages.length === 0 && !coach.loading,
    starters,
    onStart: startStarter,
    onRetry: (message: CoachMessage) => void retryFailed(message),
    onRegenerate: (message: CoachMessage) => void regenerateLast(message),
    onTellMeMore: tellMeMore,
    onMakePlan: makePlan,
    onBlockAction: handleBlockAction,
  };

  return (
    <div className="coach-page app-shell">
      <AppNav />
      <main className="coach-canvas">
        <CoachSidebar
          expanded={railExpanded}
          onToggle={toggleRail}
          conversations={coach.conversations}
          activeId={activeId}
          mode={lens}
          onModeChange={chooseLens}
          onOpen={openConversation}
          onDelete={deleteConversation}
          onRename={renameConversation}
          onContext={openPanel}
        />
        <div className="coach-workspace">
          <CoachHeader
            ready={thinking}
            contextLabel={contextLabel}
            contextLive={contextLive}
            onOpenContext={() => openPanel("context")}
            onOpenNav={() => setNavOpen(true)}
            onOpenPalette={() => setPaletteOpen(true)}
          />

          {coach.storageError ? (
            <div className="coach-storage-note" role="status">
              <Info className="size-3.5" aria-hidden="true" />
              <span>{coach.storageError}</span>
            </div>
          ) : null}

          <CoachThread {...thread} />

          <div className="coach-dock">
            {notice ? (
              <div className={`coach-notice ${signInRequired ? "is-signin" : ""}`} role="status">
                <Info className="coach-notice-icon" aria-hidden="true" />
                <span className="coach-notice-text">{notice}</span>
                {signInRequired ? (
                  <a href="/profile" className="coach-notice-link" onClick={preserveDraftForSignIn}>
                    Sign in
                  </a>
                ) : null}
                <button
                  type="button"
                  className="coach-notice-dismiss"
                  onClick={() => {
                    setNotice(null);
                    setSignInRequired(false);
                  }}
                  aria-label="Dismiss notice"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </div>
            ) : null}
            <Composer
              draft={draft}
              onDraftChange={setDraft}
              placeholder={placeholder}
              thinking={thinking}
              inputRef={textareaRef}
              onSubmit={(text, attachment) => sendMessage(text, lens, attachment)}
              onOpenCamera={() => setCameraOpen(true)}
              onNotice={setNotice}
              onOpenContext={() => openPanel("context")}
              contextLabel={contextLabel}
              contextLive={contextLive}
              followUps={followUps}
              onFollowUp={handleFollowUp}
            />
          </div>
        </div>
      </main>

      <CoachSheet open={navOpen} onClose={() => setNavOpen(false)} title="Bloom Coach">
        <CoachSidebarContent
          conversations={coach.conversations}
          activeId={activeId}
          mode={lens}
          onModeChange={chooseLens}
          onOpen={(id) => {
            setNavOpen(false);
            openConversation(id);
          }}
          onDelete={deleteConversation}
          onRename={renameConversation}
          onContext={(tab) => {
            setNavOpen(false);
            openPanel(tab);
          }}
        />
      </CoachSheet>

      <CoachContextPanel
        open={panelOpen}
        tab={panelTab}
        onTab={setPanelTab}
        onClose={() => setPanelOpen(false)}
        record={record}
        stats={panelStats}
        memories={coach.memories}
        profileConnected={Boolean(coach.profileId)}
        onToggleMemory={(memory) => void toggleMemory(memory)}
        onForgetMemory={(memory) => void forgetMemory(memory)}
      />

      <QuickPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        conversations={coach.conversations}
        activeId={activeId}
        mode={lens}
        onOpenConversation={openConversation}
        onNewConversation={newConversation}
        onModeChange={chooseLens}
      />

      {cameraOpen ? (
        <CoachCamera
          onClose={() => setCameraOpen(false)}
          onUsePhoto={useCameraPhoto}
          onChooseFile={choosePhotoInstead}
        />
      ) : null}
    </div>
  );
}
