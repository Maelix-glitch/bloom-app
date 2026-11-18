/**
 * useCoachChat — the Coach's request pipeline, lifted out of the Coach
 * page so the page and the floating orb drive the very same send path.
 *
 * Everything that turns words into an answer lives here: appending the
 * user message to the shared store (`useCoachSystem`), the grounded
 * `requestResponse` call, sidecar execution (memories, forgets, app
 * tools), the photo note, the cloud save, and the honest failure state
 * with its retry / regenerate / on-device-knowledge exits. Surfaces own
 * only their chrome — drafts, panels, composers — never a second copy
 * of this logic, so a conversation started anywhere continues everywhere.
 *
 * One pipeline instance per surface: `thinking`, the in-flight guard and
 * the retry memory are per-instance UI state, while the conversation
 * itself lives in the shared store — and the store's `requestResponse`
 * already enforces one network request at a time across instances.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  coachErrorMessage,
  photoNoteFromReply,
  useCoachSystem,
  type CoachMessage,
  type CoachMode,
} from "@/hooks/useCoachSystem";
import { buildCoachContext } from "@/lib/coach/intelligence";
import { answerLocally, CoachUnavailable } from "@/lib/coach/engine";
import { requestPaywall } from "@/lib/billing/paywall";
import type { CoachMedia } from "@/lib/coach/edge";
import { isVisionType, fileToCoachMedia } from "@/lib/coach/media";
import type { CoachRecord } from "@/lib/coach/responder";
import { parseSidecars } from "@/lib/coach/sidecar";
import { executeCoachTool } from "@/lib/coach/tools";
import type { MoodEntry } from "@/lib/mood/types";
import type {
  ComposerAttachment,
  ComposerSubmitOutcome,
} from "@/components/coach/Composer";

const SESSION_NOTICE = "Your session needs to be refreshed.";

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
  /* The actual vision bytes, held in memory only (photos are never
     stored). Without this, "Try again" resent the words alone and the
     coach answered as if no photo had ever been attached. */
  media: CoachMedia | null;
  userMessageId: string;
  errorMessageId: string;
}

type CoachSystem = ReturnType<typeof useCoachSystem>;

function memoriesToContext(memories: CoachSystem["memories"]) {
  return memories.map((memory) => ({
    id: memory.id,
    category: memory.category,
    text: memory.text,
    pinned: memory.pinned,
    learnedAt: memory.learnedAt ?? "",
  }));
}

function newMessageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useCoachChat({
  coach,
  entries,
  record,
}: {
  coach: CoachSystem;
  /** The mood record, for the grounded context every request carries. */
  entries: MoodEntry[];
  /** The assembled record — read by the on-device knowledge path only. */
  record: CoachRecord;
}) {
  const [thinking, setThinking] = useState(false);
  const [responseSlow, setResponseSlow] = useState(false);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [signInRequired, setSignInRequired] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const mountedRef = useRef(true);
  const slowTimerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const lastFailedRef = useRef<PendingRequest | null>(null);
  /* Vision bytes by user-message id, this session only — lets a retry or
     a regenerate re-send the photo the person attached instead of quietly
     dropping it. Capped so a long session can't grow it without bound. */
  const mediaByMessageRef = useRef(new Map<string, CoachMedia>());
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current);
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, []);

  /* stale blockers clear once a profile is present */
  useEffect(() => {
    if (!coach.profileId) return;
    setSignInRequired(false);
    setNotice((current) => (current === SESSION_NOTICE ? null : current));
  }, [coach.profileId]);

  const dismissNotice = useCallback(() => {
    setNotice(null);
    setSignInRequired(false);
  }, []);

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
      /* Called the moment the user message has been appended to the
         thread — the send is accepted from there, whatever the reply
         does. Lets the composer clear while the answer is still in
         flight. Never called for a rejected send. */
      onAccepted?: (() => void) | undefined;
    }): Promise<ComposerSubmitOutcome> => {
      const {
        text,
        mode,
        history,
        conversationId,
        attachment,
        media,
        userMessage,
        replaceMessageId,
        onAccepted,
      } = params;
      if (inFlightRef.current) {
        if (thinking) setNotice("Bloom is still finishing the last reply — one moment.");
        return "rejected";
      }
      if (thinking) return "rejected";
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
      if (!answerTo) return "rejected";
      /* Remember the photo against its message for this session, so a
         retry or regenerate can send it again (see mediaByMessageRef). */
      if (media) {
        mediaByMessageRef.current.set(answerTo.id, media);
        while (mediaByMessageRef.current.size > 12) {
          const oldest = mediaByMessageRef.current.keys().next().value;
          if (oldest === undefined) break;
          mediaByMessageRef.current.delete(oldest);
        }
      }
      const pendingHistory = baseHistory.some((m) => m.id === answerTo.id)
        ? baseHistory
        : [...baseHistory, answerTo];

      coach.setMessages(() => pendingHistory);
      /* The message is in the thread now. Answered or failed, it stays
         there — so the send is accepted, and the composer can let go of
         its copy instead of holding the draft until the reply lands. */
      onAccepted?.();

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
        if (!mountedRef.current || profileAtStart !== coach.profileId) return "answered";

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
        /* A reply that is ONLY directives (a native tool call or memory
           write) has no prose — never let a raw [BLOOM_…] tag render. */
        const hasDirectives =
          parsed.tools.length + parsed.memories.length + parsed.forgets.length > 0;
        if (paragraphs.length === 0 && !hasDirectives) {
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

        /* The photo's memory: when this answer read a photo, record what
           the reply identified against the message that carried it, so
           the thread keeps the identification after the image itself is
           gone from the payload (see photoNoteFromReply). A regenerated
           answer refreshes the note to the newest identification. */
        const photoNote = media ? photoNoteFromReply(paragraphs) : undefined;

        coach.setMessages((current) => {
          const cleaned = replaceMessageId
            ? current.filter((m) => m.id !== replaceMessageId)
            : current;
          const noted = photoNote
            ? cleaned.map((m) => (m.id === answerTo.id ? { ...m, photoNote } : m))
            : cleaned;
          return [...noted, coachMessage];
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
        return "answered";
      } catch (error) {
        if (error instanceof Error && error.name === "CoachCancelled") return "answered";
        console.error("Coach response failed:", error);
        if (!mountedRef.current || profileAtStart !== coach.profileId) return "answered";
        const userFacingError = coachErrorMessage(error);
        /* Money System: a billing refusal is a state, not a failure —
           open the Premium sheet, and never arm the retry (sending
           the same words again cannot change a balance). */
        const billingRefusal =
          error instanceof CoachUnavailable &&
          (error.reason === "insufficient_credits" || error.reason === "premium_required")
            ? error.reason
            : null;
        if (billingRefusal) {
          requestPaywall(billingRefusal === "premium_required" ? "coach_photo" : "coach_credits");
        }
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
        } else if (billingRefusal) {
          /* The paywall sheet is up; no retry is armed. */
        } else {
          lastFailedRef.current = {
            conversationId,
            mode,
            text,
            attachment: attachment ?? null,
            media: media ?? null,
            userMessageId: answerTo.id,
            errorMessageId: errorMessage.id,
          };
        }
        return "failed";
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

  /* The offline knowledge path. When a send fails, the person can ask the
     deterministic engine on this device instead — clearly labelled as such
     in the thread, never dressed up as the online coach. No network, no
     invented numbers: the engine answers from Bloom's built-in topics and
     the record that lives in this browser. */
  const answerFromKnowledge = useCallback(
    (message: CoachMessage) => {
      const pending = lastFailedRef.current;
      if (!pending || pending.errorMessageId !== message.id) return;
      const context = buildCoachContext(
        entries,
        memoriesToContext(coach.memories),
        coach.habitData,
        pending.mode,
        pending.text,
      );
      const result = answerLocally({
        text: pending.text,
        mode: pending.mode,
        record,
        context,
        history: [],
        provider: "local",
      });
      coach.setMessages((current) =>
        current.map((m) =>
          m.id === pending.errorMessageId
            ? {
                ...m,
                paragraphs: result.paragraphs.length > 0 ? result.paragraphs : m.paragraphs,
                sources: result.sources,
                blocks: result.blocks,
                status: "sent" as const,
                source: "local" as const,
                fellBackBecause: "offline",
              }
            : m,
        ),
      );
      lastFailedRef.current = null;
    },
    [coach, entries, record],
  );

  /* ------------------------------- send paths ------------------------------ */
  const sendMessage = useCallback(
    async (
      text: string,
      mode: CoachMode,
      attachment?: ComposerAttachment | null,
      onAccepted?: () => void,
    ): Promise<ComposerSubmitOutcome> => {
      if (!text.trim() && !attachment) return "rejected";
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

      return requestAnswer({
        text: text.trim(),
        mode,
        history,
        conversationId: conversation?.id ?? "",
        attachment: meta,
        media,
        userMessage,
        onAccepted,
      });
    },
    [coach, requestAnswer],
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
        /* The fix for the blind retry: the photo rides along again,
           exactly as it did on the first send. */
        media: pending.media,
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
        /* If the original message carried a photo and its bytes are
           still held this session, the regenerated answer sees it too. */
        media: user ? (mediaByMessageRef.current.get(user.id) ?? null) : null,
        replaceMessageId: message.id,
      });
    },
    [coach, requestAnswer, thinking],
  );

  return {
    thinking,
    responseSlow,
    freshId,
    setFreshId,
    notice,
    setNotice,
    dismissNotice,
    signInRequired,
    previews,
    sendMessage,
    retryFailed,
    regenerateLast,
    answerFromKnowledge,
  };
}
