/**
 * The Coach orb — a floating Bloom mark, bottom-right, that opens a
 * small chat panel. It is a DOOR TO THE SAME COACH, not a second brain:
 *
 *   · the conversation is the shared store (`CoachSystemProvider`) —
 *     the same thread the Coach tab shows, continued seamlessly either
 *     way;
 *   · sends go through the same request pipeline (`useCoachChat`) the
 *     Coach page uses — same grounded responder, same sidecars, same
 *     credit behaviour, no client-side AI anything;
 *   · voice is the device's own: replies can be read aloud with
 *     SpeechSynthesis, and the composer can take dictation with
 *     SpeechRecognition when the platform offers it. Both are offered
 *     only when present, and dictation never auto-sends.
 *
 * Placement: above the phone tab bar (the `--app-bottom-nav` measure,
 * safe-area included), in from the right edge, below every sheet in
 * z-order so an open sheet simply covers it. On /coach itself the orb
 * renders nothing — the full conversation is already on screen — but it
 * stays MOUNTED there, so a reply still in flight from another tab
 * lands in the thread instead of being dropped with the surface that
 * sent it.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowUpRight, Mic, Send, Square, Volume2 } from "lucide-react";

import { BloomIcon } from "@/components/icons/BloomIcon";
import { BloomLogo } from "@/components/BloomLogo";
import { useMoodSystem } from "@/hooks/useMoodSystem";
import {
  readCoachRecord,
  type CoachMessage,
  type CoachMode,
} from "@/hooks/useCoachSystem";
import { useCoachChat } from "@/hooks/useCoachChat";
import { routeShowsAppNav } from "@/lib/appNav";
import { starterPrompts } from "@/lib/coach/ui-helpers";
import { todayKey } from "@/lib/cycle/predict";
import { coachEstimateForMessage } from "@/lib/nutrition/coachLog";
import { dayGreeting, readPersonalVoice } from "@/lib/voice/personal";
import {
  createRecognition,
  speakText,
  speechRecognitionSupported,
  speechSynthesisSupported,
  stopSpeaking,
  type SpeechRecognitionLike,
} from "@/lib/voice/speech";

import { BloomMessage } from "./BloomMessage";
import { CoachGlyph } from "./bloom-mark";
import { useCoachSystemContext, type CoachSystem } from "./CoachSystemProvider";
import { UserMessage } from "./UserMessage";

import "@/styles/coach.css";
import "@/styles/orb.css";

const PLACEHOLDERS: Record<CoachMode, string> = {
  ask: "What are you thinking about?",
  reflect: "What would you like to make sense of?",
  plan: "What are you trying to make happen?",
};

/**
 * The root layout's orb switch: the orb rides the same routes as the
 * app chrome (see `routeShowsAppNav`) and no others — the public pages,
 * the access gate and the 404 stand without it.
 */
export function CoachOrbGate() {
  const { pathname } = useLocation();
  if (!routeShowsAppNav(pathname)) return null;
  return <CoachOrb />;
}

export function CoachOrb() {
  const coach = useCoachSystemContext();
  if (!coach) return null;
  return <CoachOrbInner coach={coach} />;
}

function CoachOrbInner({ coach }: { coach: CoachSystem }) {
  const { pathname } = useLocation();
  const moodSystem = useMoodSystem();
  const entries = moodSystem.entries;

  const [record, setRecord] = useState(() => readCoachRecord([]));
  /* Who the panel is talking to — read once per mount, like the page. */
  const [personalVoice] = useState(() => readPersonalVoice());
  useEffect(() => {
    const pinned = coach.memories.filter((m) => m.pinned).map((m) => m.text);
    setRecord(readCoachRecord(pinned));
  }, [coach.memories]);

  const chat = useCoachChat({ coach, entries, record });

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const orbRef = useRef<HTMLButtonElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const draftRef = useRef("");
  draftRef.current = draft;
  const dictationBaseRef = useRef("");

  const onCoachPage = pathname === "/coach" || pathname.startsWith("/coach/");
  const activeConversation = coach.activeConversation;
  const lens: CoachMode = activeConversation?.mode ?? "ask";
  const messages = coach.messages;

  const canSpeak = speechSynthesisSupported();
  const micAvailable = speechRecognitionSupported();

  /* ------------------------------ lifecycle ------------------------------ */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const stopDictation = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
      try {
        recognition.stop();
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    stopSpeaking();
    setSpeakingId(null);
    stopDictation();
  }, [stopDictation]);

  /* Navigation closes the panel (and its voice) — the conversation
     itself is untouched in the shared store. */
  useEffect(() => {
    close();
  }, [pathname, close]);

  /* Leaving the app surface entirely: no orphan playback or dictation. */
  useEffect(
    () => () => {
      stopSpeaking();
      stopDictation();
    },
    [stopDictation],
  );

  /* Keep the newest message in view while the panel is open. */
  useEffect(() => {
    if (!open) return;
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [open, messages.length, chat.thinking]);

  /* Auto-grow the composer, capped — the same recipe as the page's. */
  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
  }, [draft, open]);

  /* -------------------------------- voice -------------------------------- */
  const toggleSpeak = useCallback(
    (message: CoachMessage) => {
      if (speakingId === message.id) {
        stopSpeaking();
        setSpeakingId(null);
        return;
      }
      const text = message.text ?? message.paragraphs.join("\n\n");
      const started = speakText(text, () => setSpeakingId(null));
      if (started) setSpeakingId(message.id);
    },
    [speakingId],
  );

  const toggleDictation = useCallback(() => {
    if (listening) {
      stopDictation();
      return;
    }
    const recognition = createRecognition();
    if (!recognition) return;
    const base = draftRef.current.trim();
    dictationBaseRef.current = base ? `${base} ` : "";
    recognition.lang =
      typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const alternative = event.results[i]?.[0];
        if (alternative) transcript += alternative.transcript;
      }
      setDraft(dictationBaseRef.current + transcript);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };
    recognition.onerror = () => {
      recognitionRef.current = null;
      setListening(false);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
    }
  }, [listening, stopDictation]);

  /* -------------------------------- sending ------------------------------- */
  const submit = useCallback(() => {
    const text = draftRef.current.trim();
    if (!text || chat.thinking) return;
    stopDictation();
    /* The draft clears the moment the message is appended (onAccepted)
       — the same contract as the Coach page's composer. A rejected send
       never fires it, and the words stay put. */
    void chat.sendMessage(text, lens, null, () => setDraft(""));
  }, [chat, lens, stopDictation]);

  const starters = useMemo(
    () => starterPrompts(lens, record, entries.length, todayKey(), personalVoice.focus),
    [lens, record, entries.length, personalVoice.focus],
  );
  const welcomeGreeting = useMemo(() => dayGreeting(personalVoice), [personalVoice]);

  const tellMeMore = useCallback(() => {
    setDraft("Tell me more about that.");
    textareaRef.current?.focus();
  }, []);

  const makePlan = useCallback(() => {
    /* The page's gesture, in panel form: switch the conversation's lens
       to Plan and stage the ask in the composer — nothing sends itself. */
    if (activeConversation) coach.setConversationMode(activeConversation.id, "plan");
    setDraft("Help me turn that into a plan I can actually follow.");
    textareaRef.current?.focus();
  }, [activeConversation, coach]);

  const handleBlockAction = useCallback(
    (action: string) => {
      if (action === "plan-start") {
        void chat.sendMessage("Help me turn that into a plan I can actually follow.", "plan");
      } else if (action === "plan-adjust") {
        void chat.sendMessage("Adjust that plan for the energy I have today.", "plan");
      } else if (action === "proposal-explore") {
        void chat.sendMessage("Tell me more about that suggested change.", lens);
      }
    },
    [chat, lens],
  );

  /* --------------------------------- view --------------------------------- */
  if (onCoachPage) return null;

  const lastCoachIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "coach") return i;
    }
    return -1;
  })();

  return (
    <>
      <button
        ref={orbRef}
        type="button"
        className="coach-orb"
        data-reduced-motion={reducedMotion ? "true" : undefined}
        aria-label="Ask Bloom"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="coach-orb-halo" aria-hidden="true" />
        <BloomLogo size={26} />
      </button>

      <DialogPrimitive.Root
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="coach-orb-backdrop" onClick={close} />
          <DialogPrimitive.Content
            className="coach-orb-panel coach-overlay-scope"
            data-reduced-motion={reducedMotion ? "true" : undefined}
            aria-label="Ask Bloom"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              textareaRef.current?.focus();
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              orbRef.current?.focus();
            }}
          >
            <DialogPrimitive.Title className="sr-only">Ask Bloom</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Chat with Bloom — the same conversation as the Coach tab.
            </DialogPrimitive.Description>

            <div className="coach-orb-head">
              <CoachGlyph size={18} />
              <div className="coach-orb-head-copy">
                <p className="coach-orb-title">Bloom</p>
                <p className="coach-orb-sub">The same conversation as your Coach tab</p>
              </div>
              <Link
                to="/coach"
                className="coach-orb-icon-btn"
                aria-label="Open the Coach tab"
                title="Open the Coach tab"
              >
                <ArrowUpRight className="size-[18px]" aria-hidden="true" />
              </Link>
              <button
                type="button"
                className="coach-orb-icon-btn"
                onClick={close}
                aria-label="Close chat"
                title="Close"
              >
                <BloomIcon name="close" size={15} />
              </button>
            </div>

            <div
              ref={scrollRef}
              className="coach-orb-thread"
              role="log"
              aria-live="polite"
              aria-busy={chat.thinking}
            >
              {coach.loading ? (
                <div className="coach-orb-center" role="status">
                  <CoachGlyph size={26} active />
                  <p>Opening your conversations…</p>
                </div>
              ) : messages.length === 0 && !chat.thinking ? (
                <div className="coach-orb-welcome">
                  <CoachGlyph size={30} />
                  <p className="coach-orb-welcome-greeting">{welcomeGreeting}</p>
                  <p className="coach-orb-welcome-line">
                    Ask me anything — I answer from what you&rsquo;ve actually logged.
                  </p>
                  {starters.length > 0 ? (
                    <div className="coach-orb-starters">
                      {starters.map((starter) => (
                        <button
                          key={starter.text}
                          type="button"
                          className="coach-orb-starter"
                          onClick={() => void chat.sendMessage(starter.text, starter.lens)}
                        >
                          {starter.text}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="coach-orb-list">
                  {messages.map((message, index) => {
                    const isCoach = message.role === "coach";
                    const fresh = message.id === chat.freshId;
                    const speaking = speakingId === message.id;
                    if (!isCoach) {
                      return (
                        <UserMessage
                          key={message.id}
                          message={message}
                          previewUrl={
                            message.attachment ? chat.previews[message.id] : undefined
                          }
                          fresh={fresh}
                        />
                      );
                    }
                    return (
                      <div key={message.id} className="coach-orb-turn">
                        <BloomMessage
                          message={message}
                          fresh={fresh}
                          onRetry={
                            message.status === "error"
                              ? () => void chat.retryFailed(message)
                              : undefined
                          }
                          onOfflineAnswer={
                            message.status === "error"
                              ? () => chat.answerFromKnowledge(message)
                              : undefined
                          }
                          onRegenerate={
                            index === lastCoachIndex && message.status !== "error"
                              ? () => void chat.regenerateLast(message)
                              : undefined
                          }
                          onTellMeMore={tellMeMore}
                          onMakePlan={makePlan}
                          onBlockAction={handleBlockAction}
                          logEstimate={coachEstimateForMessage(messages, index)}
                        />
                        {canSpeak && message.status !== "error" ? (
                          <div className="coach-orb-listen-row">
                            <button
                              type="button"
                              className="coach-orb-listen"
                              onClick={() => toggleSpeak(message)}
                              aria-label={speaking ? "Stop listening" : "Listen to this reply"}
                              aria-pressed={speaking}
                            >
                              {speaking ? (
                                <Square className="size-3.5" aria-hidden="true" />
                              ) : (
                                <Volume2 className="size-4" aria-hidden="true" />
                              )}
                              <span>{speaking ? "Stop" : "Listen"}</span>
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {chat.thinking ? (
                    <div className="coach-orb-thinking" role="status">
                      <CoachGlyph size={15} active />
                      <span>
                        {chat.responseSlow
                          ? "Bloom is taking a little longer…"
                          : "Bloom is thinking…"}
                      </span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {chat.notice ? (
              <p className="coach-orb-notice" role="status">
                <span className="coach-orb-notice-text">{chat.notice}</span>
                {chat.signInRequired ? (
                  <Link to="/profile" className="coach-orb-notice-link">
                    Sign in
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="coach-orb-notice-dismiss"
                  onClick={() => chat.dismissNotice()}
                  aria-label="Dismiss notice"
                >
                  <BloomIcon name="close" size={11} />
                </button>
              </p>
            ) : null}

            <form
              className="coach-orb-composer"
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <label className="sr-only" htmlFor="coach-orb-input">
                Message Bloom
              </label>
              <textarea
                id="coach-orb-input"
                ref={textareaRef}
                rows={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    submit();
                  }
                }}
                placeholder={PLACEHOLDERS[lens]}
                className="coach-orb-input"
              />
              {micAvailable ? (
                <button
                  type="button"
                  className="coach-orb-icon-btn coach-orb-mic"
                  data-listening={listening ? "true" : undefined}
                  onClick={toggleDictation}
                  aria-label={listening ? "Stop dictating" : "Dictate your message"}
                  aria-pressed={listening}
                  title={listening ? "Stop dictating" : "Dictate your message"}
                >
                  <Mic className="size-[18px]" aria-hidden="true" />
                </button>
              ) : null}
              <button
                type="submit"
                className="coach-orb-send"
                disabled={!draft.trim() || chat.thinking}
                aria-label="Send message"
                title="Send message"
              >
                {chat.thinking ? (
                  <CoachGlyph size={15} active />
                ) : (
                  <Send className="size-4" aria-hidden="true" />
                )}
              </button>
            </form>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
