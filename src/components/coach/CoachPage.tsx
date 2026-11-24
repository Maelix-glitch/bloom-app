import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Info } from "lucide-react";

import { BloomIcon } from "@/components/icons/BloomIcon";
import { useMoodSystem } from "@/hooks/useMoodSystem";
import { isSignedIn, useSession } from "@/hooks/useSession";
import {
  readCoachRecord,
  useCoachSystem,
  type CoachMemory,
  type CoachMessage,
  type CoachMode,
} from "@/hooks/useCoachSystem";
import { useCoachChat } from "@/hooks/useCoachChat";
import { useAiConsentGate } from "@/hooks/useAiConsentGate";
import { followUpPrompts, starterPrompts, type Starter } from "@/lib/coach/ui-helpers";
import { todayKey } from "@/lib/cycle/predict";
import { phaseScienceLine } from "@/lib/cycle/phaseScience";
import { dayGreeting, readPersonalVoice } from "@/lib/voice/personal";

import { useCoachSystemContext, type CoachSystem } from "./CoachSystemProvider";
import { CoachSidebar, CoachSidebarContent } from "./CoachSidebar";
import { CoachHeader } from "./CoachHeader";
import { CoachThread } from "./CoachThread";
import { Composer, type ComposerAttachment, type ComposerSubmitOutcome } from "./Composer";
import { CoachContextPanel, type CoachPanelTab } from "./ContextPanel";
import { CoachSheet } from "./CoachSheet";
import { QuickPalette } from "./QuickPalette";
import { CoachCamera } from "./CoachCamera";
import { AiConsentSheet } from "./AiConsentSheet";

const DRAFT_MAP_KEY = "bloom.coach.drafts.v2";
const RAIL_KEY = "bloom.coach.rail";

/** How a request ended, so the composer knows what to do with its draft:
 *  "answered" — a reply landed; "failed" — the message is safely in the
 *  thread with a Try again on it; "rejected" — nothing was sent at all. */
type RequestOutcome = ComposerSubmitOutcome;

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

/**
 * The Coach page. The conversation store comes from the app-wide
 * provider when one is mounted (the root layout mounts it, so the page,
 * the Today panel and the orb all share one store); rendered outside
 * the provider — a unit test, an isolated preview — the page falls back
 * to its own store instance, exactly as it behaved before the provider
 * existed.
 */
export function CoachPage() {
  const shared = useCoachSystemContext();
  if (shared) return <CoachPageView coach={shared} />;
  return <CoachPageStandalone />;
}

function CoachPageStandalone() {
  const coach = useCoachSystem();
  return <CoachPageView coach={coach} />;
}

function CoachPageView({ coach }: { coach: CoachSystem }) {
  const moodSystem = useMoodSystem();
  const session = useSession();
  const { entries, analytics } = moodSystem;

  const [fallbackLens, setFallbackLens] = useState<CoachMode>("ask");
  const [draft, setDraft] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<CoachPanelTab>("context");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [record, setRecord] = useState(() => readCoachRecord([]));
  /* Who the page is talking to — read once per mount; refreshes on reload. */
  const [personalVoice] = useState(() => readPersonalVoice());
  const [railExpanded, setRailExpanded] = useState(true);

  /* AI consent (M-232): the just-in-time ai_assistance ask for this
     surface. The pipeline consults it before every send; when it
     refuses, the reason lands in the thread's notice line — the setter
     comes from the chat hook itself, so it is handed over by ref. */
  const aiGate = useAiConsentGate("coach");
  const noticeRef = useRef<(message: string | null) => void>(() => {});
  const gateEnsure = aiGate.ensure;
  const ensureAiConsent = useCallback(async (): Promise<boolean> => {
    const allowed = await gateEnsure();
    if (!allowed) {
      noticeRef.current(
        "Nothing was sent — AI replies need your permission first. You can turn them on any time in Profile → Privacy → Your consent.",
      );
    }
    return allowed;
  }, [gateEnsure]);

  /* The request pipeline — shared with the orb, so both surfaces send
     through the same path into the same store (see useCoachChat). The
     page keeps only its chrome state: drafts, rail, panels, camera. */
  const chat = useCoachChat({ coach, entries, record, ensureAiConsent });
  noticeRef.current = chat.setNotice;
  const { thinking, responseSlow, freshId, notice, signInRequired, previews } = chat;
  const setFreshId = chat.setFreshId;
  const setNotice = chat.setNotice;

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const activeDraftKeyRef = useRef<string>("new");
  const draftRef = useRef("");
  draftRef.current = draft;

  const activeConversation = coach.activeConversation;
  const activeId = activeConversation?.id ?? null;
  const lens = activeConversation?.mode ?? fallbackLens;

  /* --------------------------------- rail --------------------------------- */
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(RAIL_KEY);
      if (saved !== null) setRailExpanded(saved === "1");
      else if (window.innerWidth < 1240) setRailExpanded(false);
    } catch {
      /* storage blocked */
    }
  }, []);

  /* Keep the composer above the phone keyboard. iOS doesn't shrink dvh when
     the keyboard opens, so the dock would sit behind it: mirror the covered
     height into --coach-kb (the stylesheet lifts the dock) and flag is-kb so
     the tab bar ducks out of the way. Android resizes the layout viewport,
     which makes the delta ~0 there — no double lift. */
  const pageRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = pageRef.current;
    const vv = window.visualViewport;
    if (!root || !vv) return;
    const sync = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty("--coach-kb", `${Math.round(kb)}px`);
      root.classList.toggle("is-kb", kb > 40);
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
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
    },
    [],
  );

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

  /* The averages are the mood system's selected-window values (30 days by
     default), so the panel carries the window and the in-window check-in
     count alongside them — pairing a 30-day average with the all-time
     check-in count made Coach quote a different "average mood" than the
     Mood page over the same record. */
  const panelStats = useMemo(
    () => ({
      entries: entries.length,
      periodEntries: analytics.periodEntries.length,
      windowLabel: moodSystem.range.label.toLowerCase(),
      avg: analytics.avg ?? 0,
      avgEnergy: analytics.avgEnergy ?? 0,
      avgStress: analytics.avgStress ?? 0,
    }),
    [
      entries.length,
      analytics.periodEntries.length,
      moodSystem.range.label,
      analytics.avg,
      analytics.avgEnergy,
      analytics.avgStress,
    ],
  );

  const starters = useMemo(
    () => starterPrompts(lens, record, entries.length, todayKey(), personalVoice.focus),
    [lens, record, entries.length, personalVoice.focus],
  );

  /* The welcome speaks to the person before any data exists: their name and
     the hour from onboarding, and — when a cycle is tracked with a known
     phase — one hedged science line for right now. Computed once per mount:
     pick() remembers what it showed, so re-reading it per render would flicker. */
  const welcomeGreeting = useMemo(() => dayGreeting(personalVoice), [personalVoice]);
  const welcomePhaseLine = useMemo(() => {
    if (!record.cycle || record.cycle.daysLogged === 0 || record.cycle.paused) return null;
    return phaseScienceLine(record.cycle.phaseLabel, record.cycle.confidence, record.today);
  }, [record]);

  /* The newest thing they told Bloom to keep — pinned first, then recency.
     One line, only on the empty conversation: a returning thread should
     feel picked up, not restarted. */
  const welcomeMemory = useMemo(() => {
    const pickable = coach.memories.filter((m) => m.text.trim().length > 0);
    if (pickable.length === 0) return null;
    const sorted = [...pickable].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (b.learnedAt ?? "").localeCompare(a.learnedAt ?? "");
    });
    return sorted[0]?.text ?? null;
  }, [coach.memories]);

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

  /* ------------------------------- send paths ------------------------------ */
  /* The pipeline itself lives in useCoachChat (shared with the orb);
     the page's half is only the draft bookkeeping: once a send is
     accepted — answered OR failed with a Try again on it — the
     composer's copy has done its job, and keeping it invited an
     accidental duplicate send. Only a rejected send keeps the draft. */
  const sendMessage = useCallback(
    async (
      text: string,
      mode: CoachMode,
      attachment?: ComposerAttachment | null,
      onAccepted?: () => void,
    ): Promise<RequestOutcome> => {
      const conversationId = coach.activeConversation?.id ?? null;
      const outcome = await chat.sendMessage(text, mode, attachment, onAccepted);
      if (outcome !== "rejected") {
        clearDraftFor(conversationId);
      }
      return outcome;
    },
    [chat, coach.activeConversation, clearDraftFor],
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
    welcomeGreeting,
    welcomePhaseLine,
    welcomeMemory,
    onStart: startStarter,
    onRetry: (message: CoachMessage) => void chat.retryFailed(message),
    onOfflineAnswer: chat.answerFromKnowledge,
    onRegenerate: (message: CoachMessage) => void chat.regenerateLast(message),
    onTellMeMore: tellMeMore,
    onMakePlan: makePlan,
    onBlockAction: handleBlockAction,
  };

  return (
    <div ref={pageRef} className="coach-page app-shell">
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
                  onClick={() => chat.dismissNotice()}
                  aria-label="Dismiss notice"
                >
                  <BloomIcon name="close" size={12} />
                </button>
              </div>
            ) : null}
            <div>
              <Composer
                draft={draft}
                onDraftChange={setDraft}
                placeholder={placeholder}
                thinking={thinking}
                inputRef={textareaRef}
                onSubmit={(text, attachment, onAccepted) =>
                  sendMessage(text, lens, attachment, onAccepted)
                }
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
        /* The panel's copy branches on this: signed-out wording ("Sign in to
           sync your Coach…") must never be shown to a signed-in person. The
           coach hook's profileId resolves on its own auth watch and can lag
           the shared session, so the session is the authority here — either
           one saying "signed in" is enough. */
        profileConnected={isSignedIn(session) || Boolean(coach.profileId)}
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

      <AiConsentSheet open={aiGate.askOpen} onAllow={aiGate.allow} onNotNow={aiGate.notNow} />
    </div>
  );
}
