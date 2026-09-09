/**
 * useCoachSystem — the Coach's data layer.
 *
 * One device-first conversation store per profile: conversations are small,
 * private, ordered threads with a title, a mode and a message list. The same
 * grounded responder (`lib/coach/*`) answers every request; the Supabase edge
 * function answers when it can and the deterministic on-device responder when
 * it can't — the architecture of `engine.ts` is untouched.
 *
 * Conversations persist locally (per profile id), because grouping is a
 * device-side view. The signed-in cloud thread keeps working as it always did:
 * every message is mirrored to `coach_messages` when a profile is connected,
 * and a device with no local store imports that thread as a single
 * conversation — so no existing message is ever stranded.
 *
 * The legacy API (messages / setMessages / saveMessage / memories / …) is
 * preserved unchanged for the Today-page CoachPanel and older surfaces; here
 * `messages` simply means "the active conversation's messages".
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { ask as askCoach, CoachUnavailable } from "@/lib/coach/engine";
import { activeProvider } from "@/lib/coach/providers";
import type { CoachBlock, CoachRecord, CoachResponse } from "@/lib/coach/responder";
import type { CoachContext, CoachHabitData, CoachMode } from "@/lib/coach/intelligence";
import { analyzeCycle, describeNextPeriod } from "@/lib/cycle/predict";
import {
  loadLogs as loadPeriodLogs,
  loadDays as loadCycleDays,
  effectiveMode,
  loadCycleSettings,
} from "@/lib/cycle/periodStore";
import { todayKey } from "@/lib/cycle/predict";

export type { CoachMode };

export interface CoachAttachmentPayload {
  name: string;
  type: string;
  size: number;
  dataUrl?: string | null;
}

/** what the page hands to the responder after readAttachment() */
export interface CoachFilePayload {
  fileType: string;
  base64Data: string;
}

export interface CoachMessage {
  id: string;
  role: "you" | "user" | "coach";
  time: string;
  text?: string | undefined;
  paragraphs: string[];
  sources: string[];
  blocks: CoachBlock[];
  attachment?: CoachAttachmentPayload | undefined;
  status?: "sent" | "local" | "error" | undefined;
  /** Which brain produced this — shown quietly when it matters. */
  source?: "edge" | "local" | undefined;
  /** Why the online brain was skipped, when it was (transient, not stored). */
  fellBackBecause?: string | undefined;
}

export type { CoachBlock, CoachResponse } from "@/lib/coach/responder";

export interface CoachMemory {
  id: string;
  category: "pattern" | "preference" | "goal" | "context";
  text: string;
  pinned: boolean;
  learnedAt: string | null;
}

export interface CoachConversation {
  id: string;
  title: string;
  mode: CoachMode;
  createdAt: string;
  updatedAt: string;
  messages: CoachMessage[];
}

export interface CoachRequest {
  text: string;
  mode: CoachMode;
  context: CoachContext;
  history: CoachMessage[];
  attachment?: CoachFilePayload | undefined;
}

export interface CoachReply extends CoachResponse {
  fellBackBecause?: string | undefined;
}

/** A compact, human title for a conversation, from its first message. */
export function titleFor(text: string): string {
  const clean = text
    .split("\n")[0]
    ?.replace(/\s+/g, " ")
    .replace(/[?#*_~]+/g, "")
    .trim();
  if (!clean) return "New conversation";
  const max = 52;
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

const CONVOS_KEY = (uid: string | null) => `bloom.coach.conversations.v1.${uid ?? "anon"}`;
const LEGACY_THREAD_KEY = (uid: string | null) => `bloom.coach.thread.${uid ?? "anon"}`;
const MEMORIES_KEY = (uid: string | null) => `bloom.coach.memories.${uid ?? "anon"}`;

const MAX_CONVERSATIONS = 24;
const MAX_MESSAGES_PER_CONVERSATION = 120;

interface StoredConversations {
  v: 1;
  activeId: string | null;
  conversations: CoachConversation[];
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — state stays in memory */
  }
}

function readStored(uid: string | null): StoredConversations {
  const raw = readJson<StoredConversations | null>(CONVOS_KEY(uid), null);
  if (
    raw &&
    typeof raw === "object" &&
    Array.isArray(raw.conversations) &&
    raw.conversations.every((c) => c && Array.isArray(c.messages))
  ) {
    return { v: 1, activeId: raw.activeId ?? null, conversations: raw.conversations };
  }
  return { v: 1, activeId: null, conversations: [] };
}

function trimConversations(store: StoredConversations): StoredConversations {
  const byRecency = [...store.conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  const keep: CoachConversation[] = [];
  for (const conversation of byRecency) {
    if (keep.length >= MAX_CONVERSATIONS && conversation.id !== store.activeId) continue;
    keep.push({
      ...conversation,
      messages: conversation.messages.slice(-MAX_MESSAGES_PER_CONVERSATION),
    });
  }
  return { v: 1, activeId: store.activeId, conversations: keep };
}

/** The first sentence or so of a user message becomes the row's title. */
function maybeRename(messages: CoachMessage[]): string | null {
  const first = messages.find((m) => m.role === "user" || m.role === "you");
  if (!first) return null;
  const text = (first.text ?? first.paragraphs.join(" ")).trim();
  if (!text) return null;
  return titleFor(text);
}

/**
 * Message content as text.
 *
 * The `coach_messages.content` column is written as a string here, but rows can
 * also come back as jsonb — a string, an array of parts, or an object with a
 * `text` field. `String({})` used to render "[object Object]" in the thread, so
 * every shape is unwrapped here instead.
 */
export function contentToText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map(contentToText)
      .map((part) => part.trim())
      .filter(Boolean)
      .join("\n\n");
  }
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    for (const key of ["text", "content", "value", "message", "output", "parts"]) {
      const nested = contentToText(row[key]);
      if (nested.trim()) return nested;
    }
  }
  return "";
}

/** A coach attachment becomes vision input only when the model can read it. */
function attachmentToMedia(
  attachment: CoachFilePayload | undefined,
): { mediaType: string; dataBase64: string } | undefined {
  if (!attachment) return undefined;
  const type = attachment.fileType.toLowerCase();
  if (!/^(image\/(jpeg|png|webp|gif)|application\/pdf)$/.test(type)) return undefined;
  if (!attachment.base64Data) return undefined;
  return { mediaType: type, dataBase64: attachment.base64Data };
}

export function coachErrorMessage(error: unknown, fallback?: string): string {
  /* Strictly online: these are honest "couldn't reach the coach" states with
     a retry — there is no on-device substitute. */
  if (error instanceof CoachUnavailable) {
    if (error.reason === "unconfigured")
      return "Bloom's online coach isn't connected yet — add your keys and deploy the function, then try again.";
    if (error.reason === "timeout")
      return "The online coach took too long this time. Please try again.";
    return "Bloom's online coach couldn't be reached. Check your connection and try again.";
  }
  const raw =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message ?? "")
      : error instanceof Error
        ? error.message
        : "";
  if (/fetch|network|failed to fetch/i.test(raw))
    return "You're offline — Bloom's coach only answers online. Reconnect and try again.";
  if (/relation|does not exist|schema cache|404/i.test(raw))
    return "Coach storage isn't set up yet.";
  return (
    fallback ??
    "Something went wrong reaching Bloom's online coach. Try again — your words are safe."
  );
}

/* --------------------------------- the hook --------------------------------- */

type Row = Record<string, unknown>;

function rowsToMessage(r: Row, index: number): CoachMessage {
  const content = contentToText(r["content"]);
  return {
    id: String(r["id"] ?? `row-${index}`),
    role: r["role"] === "user" ? "user" : "coach",
    time: String(r["created_at"] ?? new Date().toISOString()),
    text: content || undefined,
    paragraphs: content
      .split("\n\n")
      .map((part) => part.trim())
      .filter(Boolean),
    sources: Array.isArray(r["sources"]) ? (r["sources"] as string[]) : [],
    blocks: [],
  };
}

export function useCoachSystem() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<StoredConversations>({
    v: 1,
    activeId: null,
    conversations: [],
  });
  const [memories, setMemories] = useState<CoachMemory[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [habitData] = useState<CoachHabitData>(() => readHabitData());
  const loadedFor = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    const apply = (uid: string | null) => {
      if (!mounted) return;
      setProfileId(uid);
    };
    if (!hasSupabaseConfig) {
      apply(null);
      return () => {
        mounted = false;
      };
    }
    void supabase.auth.getSession().then(({ data }) => apply(data.session?.user.id ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => apply(session?.user.id ?? null));
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loadedFor.current === profileId) return;
    loadedFor.current = profileId;
    let mounted = true;
    setLoading(true);

    /* Local conversations are the source of truth on this device. */
    const local = readStored(profileId);
    setMemories(readJson<CoachMemory[]>(MEMORIES_KEY(profileId), []));
    if (local.conversations.length > 0) {
      setStore(local);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    /* Nothing local yet: migrate the legacy single thread, then the cloud
       thread — in that order of preference, both without altering rows. */
    const legacy = readJson<CoachMessage[]>(LEGACY_THREAD_KEY(profileId), []);
    const fromLegacy = (): StoredConversations => {
      if (legacy.length === 0) return { v: 1, activeId: null, conversations: [] };
      try {
        window.localStorage.removeItem(LEGACY_THREAD_KEY(profileId));
      } catch {
        /* keep going with the copy we already read */
      }
      const firstTime = legacy.find((m) => m.time && m.time !== "now")?.time;
      const opened = firstTime ? new Date(firstTime).toISOString() : new Date().toISOString();
      const conversation: CoachConversation = {
        id: `legacy-${profileId ?? "anon"}`,
        title: maybeRename(legacy) ?? "Earlier with Bloom",
        mode: "ask",
        createdAt: opened,
        updatedAt: new Date().toISOString(),
        messages: legacy,
      };
      return { v: 1, activeId: conversation.id, conversations: [conversation] };
    };

    if (!profileId) {
      setStore(fromLegacy());
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    void (async () => {
      try {
        const [{ data: rows }, { data: memRows }] = await Promise.all([
          supabase
            .from("coach_messages")
            .select("id, role, content, sources, created_at")
            .eq("profile_id", profileId)
            .order("created_at", { ascending: true })
            .limit(40),
          supabase
            .from("coach_memory")
            .select("id, category, fact, pinned, updated_at")
            .eq("profile_id", profileId)
            .order("updated_at", { ascending: false })
            .limit(30),
        ]);
        if (!mounted) return;
        if (Array.isArray(memRows) && memRows.length > 0) {
          setMemories(
            (memRows as Row[]).map((m) => ({
              id: String(m["id"]),
              category: (["pattern", "preference", "goal", "context"].includes(
                String(m["category"]),
              )
                ? m["category"]
                : "context") as CoachMemory["category"],
              text: String(m["fact"] ?? ""),
              pinned: Boolean(m["pinned"]),
              learnedAt: m["updated_at"]
                ? new Date(String(m["updated_at"])).toLocaleDateString()
                : null,
            })),
          );
        }
        if (Array.isArray(rows) && rows.length > 0) {
          const messages = (rows as Row[]).map(rowsToMessage);
          const firstTime = messages[0]?.time ?? new Date().toISOString();
          const conversation: CoachConversation = {
            id: `cloud-${profileId}`,
            title: maybeRename(messages) ?? "Earlier with Bloom",
            mode: "ask",
            createdAt: firstTime,
            updatedAt: new Date().toISOString(),
            messages,
          };
          setStore({ v: 1, activeId: conversation.id, conversations: [conversation] });
        } else {
          setStore(fromLegacy());
        }
      } catch (error) {
        if (!mounted) return;
        console.warn("[bloom:coach] storage unavailable, using device:", error);
        setStorageError(coachErrorMessage(error));
        setStore(fromLegacy());
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [profileId]);

  /* Persist whenever the store changes — a small object, written on change. */
  useEffect(() => {
    writeJson(CONVOS_KEY(profileId), trimConversations(store));
  }, [profileId, store]);
  useEffect(() => writeJson(MEMORIES_KEY(profileId), memories), [memories, profileId]);

  const activeConversation = useMemo(
    () => store.conversations.find((c) => c.id === store.activeId) ?? null,
    [store],
  );

  /* Sorted by recency for lists; never mutates the stored arrays. */
  const conversations = useMemo(
    () => [...store.conversations].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [store.conversations],
  );

  const messages = useMemo(() => activeConversation?.messages ?? [], [activeConversation]);

  const setMessages = useCallback(
    (next: CoachMessage[] | ((current: CoachMessage[]) => CoachMessage[])) => {
      setStore((current) => {
        const base = current.conversations.find((c) => c.id === current.activeId);
        const applied = typeof next === "function" ? next(base?.messages ?? []) : next;
        if (!base && applied.length === 0) return current;
        if (!base) {
          const now = new Date().toISOString();
          const title = maybeRename(applied) ?? "New conversation";
          const conversation: CoachConversation = {
            id: `conv-${Date.now()}`,
            title,
            mode: "ask",
            createdAt: now,
            updatedAt: now,
            messages: applied,
          };
          return {
            v: 1,
            activeId: conversation.id,
            conversations: [...current.conversations, conversation],
          };
        }
        const title =
          !base.title || base.title === "New conversation"
            ? (maybeRename(applied) ?? base.title)
            : base.title;
        const conversation: CoachConversation = {
          ...base,
          title,
          updatedAt: new Date().toISOString(),
          messages: applied,
        };
        return {
          v: 1,
          activeId: current.activeId,
          conversations: current.conversations.map((c) =>
            c.id === conversation.id ? conversation : c,
          ),
        };
      });
    },
    [],
  );

  const openConversation = useCallback((id: string | null) => {
    setStore((current) => {
      if (id !== null && !current.conversations.some((c) => c.id === id)) return current;
      return { v: 1, activeId: id, conversations: current.conversations };
    });
  }, []);

  const removeConversation = useCallback((id: string) => {
    setStore((current) => {
      const conversations = current.conversations.filter((c) => c.id !== id);
      const activeId = current.activeId === id ? null : current.activeId;
      return { v: 1, activeId, conversations };
    });
  }, []);

  const renameConversation = useCallback((id: string, title: string) => {
    setStore((current) => ({
      v: 1,
      activeId: current.activeId,
      conversations: current.conversations.map((c) =>
        c.id === id ? { ...c, title: title.trim() || "New conversation" } : c,
      ),
    }));
  }, []);

  const setConversationMode = useCallback((id: string, mode: CoachMode) => {
    setStore((current) => ({
      v: 1,
      activeId: current.activeId,
      conversations: current.conversations.map((c) => (c.id === id ? { ...c, mode } : c)),
    }));
  }, []);

  const saveMessage = useCallback(
    async (message: CoachMessage): Promise<boolean> => {
      if (!profileId) return false;
      try {
        const { error } = await supabase.from("coach_messages").insert({
          profile_id: profileId,
          role: message.role === "coach" ? "coach" : "user",
          content:
            (message.role === "you" ? message.text : undefined) ?? message.paragraphs.join("\n\n"),
          sources: message.sources,
        });
        return !error;
      } catch (error) {
        console.warn("[bloom:coach] saveMessage:", error);
        setStorageError((prev) => prev ?? coachErrorMessage(error));
        return false;
      }
    },
    [profileId],
  );

  const updateMemory = useCallback(
    async (id: string, patch: Partial<Pick<CoachMemory, "pinned">>) => {
      setMemories((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
      if (!profileId) return;
      try {
        await supabase
          .from("coach_memory")
          .update({ pinned: Boolean(patch.pinned) })
          .eq("id", id)
          .eq("profile_id", profileId);
      } catch {
        /* local-only */
      }
    },
    [profileId],
  );

  const forgetMemory = useCallback(
    async (id: string) => {
      setMemories((prev) => prev.filter((m) => m.id !== id));
      if (!profileId) return;
      try {
        await supabase.from("coach_memory").delete().eq("id", id).eq("profile_id", profileId);
      } catch {
        /* local-only */
      }
    },
    [profileId],
  );

  /**
   * Learn a fact about the person, from conversation. Local first, mirrored
   * to the account when one is connected; identical facts collapse into one.
   */
  const rememberMemory = useCallback(
    async (text: string, category: CoachMemory["category"] = "context") => {
      const clean = text.trim().slice(0, 400);
      if (!clean) return;
      const already = memories.some((m) => m.text.toLowerCase() === clean.toLowerCase());
      const max = 48;
      const next: CoachMemory[] = [
        {
          id: `mem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
          category,
          text: clean,
          pinned: false,
          learnedAt: new Date().toISOString(),
        },
        ...(already ? memories : memories),
      ].slice(0, max);
      if (!already) {
        setMemories(next);
        if (profileId) {
          try {
            await supabase.from("coach_memory").insert({
              profile_id: profileId,
              category,
              fact: clean,
              pinned: false,
              source: "coach",
            });
          } catch {
            /* local-only — the device copy above is the record of truth */
          }
        }
      }
    },
    [memories, profileId],
  );

  /** Drop every memory whose text mentions `needle`. */
  const forgetMemoryText = useCallback(
    async (needle: string) => {
      const target = needle.trim().toLowerCase();
      if (!target) return;
      const gone = memories.filter((m) => m.text.toLowerCase().includes(target));
      if (gone.length === 0) return;
      setMemories((prev) => prev.filter((m) => !gone.some((g) => g.id === m.id)));
      if (!profileId) return;
      for (const memory of gone) {
        try {
          await supabase
            .from("coach_memory")
            .delete()
            .eq("id", memory.id)
            .eq("profile_id", profileId);
        } catch {
          /* local-only */
        }
      }
    },
    [memories, profileId],
  );

  /**
   * One request in flight at a time. Sending a second question abandons the
   * first — the answer to a question you've moved on from is just noise, and
   * an edge function on a cold start can easily still be thinking.
   */
  const inFlight = useRef<AbortController | null>(null);

  const requestResponse = useCallback(
    async (request: CoachRequest): Promise<CoachReply> => {
      /*
       * Supersede any request still running. The controller is cleared when its
       * own request finishes, so this only ever aborts a genuinely in-flight
       * call (see the history in git for why that ordering matters).
       */
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;

      /*
       * The coach speaks from everything it has learned, pinned memories
       * first — capped so a long history never crowds out the question.
       */
      const remembered = [...memories]
        .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
        .slice(0, 12)
        .map((m) => m.text);
      const record = readCoachRecord(remembered);
      const context = request.context;
      record.habitsActive = context.habits.available ? context.habits.activeCount : 0;

      let result;
      try {
        result = await askCoach({
          text: request.text,
          mode: request.mode,
          record,
          context,
          history: request.history
            .filter((m) => m.paragraphs.length > 0 || m.text)
            .slice(-8)
            .map((m) => ({
              role: m.role === "coach" ? ("assistant" as const) : ("user" as const),
              content: m.text ?? m.paragraphs.join("\n\n"),
            })),
          /* The picker's choice is honoured; "Best available" (auto) walks
             the best-first chain on the function. */
          provider: activeProvider().id,
          /* Photos and PDFs ride along for the vision model. */
          ...(() => {
            const media = attachmentToMedia(request.attachment);
            return media ? { image: media } : {};
          })(),
          signal: controller.signal,
        });
      } finally {
        /* Let go of our own controller so a later send can't abort a request
           that already finished. */
        if (inFlight.current === controller) inFlight.current = null;
      }

      if (result.paragraphs.length === 0) {
        return {
          paragraphs: ["Sorry — I lost my train of thought there. Ask me again?"],
          sources: [],
          blocks: [],
          source: result.source,
        };
      }

      return {
        paragraphs: result.paragraphs,
        sources: result.sources,
        blocks: result.blocks,
        /* Which brain answered, so the UI can be honest about a fallback. */
        source: result.source,
        fellBackBecause: result.fellBackBecause,
      };
    },
    [memories],
  );

  /* Abandon anything still in flight when the page goes away. */
  useEffect(() => () => inFlight.current?.abort(), []);

  return useMemo(
    () => ({
      profileId,
      loading,
      messages,
      setMessages,
      conversations,
      activeConversation,
      openConversation,
      removeConversation,
      renameConversation,
      setConversationMode,
      memories,
      habitData,
      storageError,
      saveMessage,
      updateMemory,
      forgetMemory,
      rememberMemory,
      forgetMemoryText,
      requestResponse,
    }),
    [
      profileId,
      loading,
      messages,
      activeConversation,
      conversations,
      memories,
      habitData,
      storageError,
      saveMessage,
      updateMemory,
      forgetMemory,
      rememberMemory,
      forgetMemoryText,
      requestResponse,
      openConversation,
      removeConversation,
      renameConversation,
      setConversationMode,
      setMessages,
    ],
  );
}

/* -------------------------------- the record ------------------------------- */
/* The trackers page is optional — some installs run the coach without it — so
 * this reads the same localStorage keys directly rather than importing
 * `lib/trackers/*`. A missing folder then costs the coach a topic, not the
 * page. The formatting below mirrors core.ts so both pages quote a day the
 * same way.                                                                   */

const TRACKER_DAYS_KEY = "bloom.trackers.days.v1";
const TRACKER_GOALS_KEY = "bloom.trackers.goals.v1";

const hours = (m: number) => `${Math.floor(m / 60)}h${m % 60 === 0 ? "" : ` ${m % 60}m`}`;

const TRACKER_SHAPE: {
  id: "sleep" | "water" | "study" | "movement" | "energy" | "screen";
  name: string;
  goalKey: string;
  fallback: number;
  format: (v: number) => string;
}[] = [
  { id: "sleep", name: "Sleep", goalKey: "sleepMinutes", fallback: 480, format: hours },
  {
    id: "water",
    name: "Water",
    goalKey: "waterMl",
    fallback: 2200,
    format: (v) => (v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}L` : `${v}ml`),
  },
  { id: "study", name: "Study", goalKey: "studyMinutes", fallback: 120, format: hours },
  {
    id: "movement",
    name: "Movement",
    goalKey: "movementMinutes",
    fallback: 30,
    format: (v) => (v < 60 ? `${v}m` : hours(v)),
  },
  { id: "energy", name: "Energy", goalKey: "energy", fallback: 3, format: (v) => `${v}/5` },
  { id: "screen", name: "Screen", goalKey: "screenMinutes", fallback: 180, format: hours },
];

function valueFor(day: Row, id: string): number | null {
  if (id === "study") {
    const sessions = Array.isArray(day["sessions"]) ? (day["sessions"] as Row[]) : [];
    const total = sessions.reduce(
      (sum, s) => sum + (typeof s["minutes"] === "number" ? Math.max(s["minutes"], 0) : 0),
      0,
    );
    return total > 0 ? total : null;
  }
  const v = day[`${id}Minutes`] ?? day[id];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

const dateKey = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
};

function readTrackerFacts(): CoachRecord["trackers"] {
  const days = readJson<Row[]>(TRACKER_DAYS_KEY, []);
  if (!Array.isArray(days) || days.length === 0) return [];
  const goals = readJson<Row>(TRACKER_GOALS_KEY, {});

  const byDate = new Map<string, Row>();
  for (const day of days) {
    const date = day?.["date"];
    if (typeof date === "string") byDate.set(date, day);
  }

  const window: string[] = [];
  for (let i = 13; i >= 0; i -= 1) window.push(dateKey(-i));

  return TRACKER_SHAPE.map((shape) => {
    const goal =
      typeof goals[shape.goalKey] === "number" && Number.isFinite(goals[shape.goalKey])
        ? (goals[shape.goalKey] as number)
        : shape.fallback;
    const series = window.map((date) => {
      const day = byDate.get(date);
      return day ? valueFor(day, shape.id) : null;
    });
    const known = series.filter((v): v is number => v !== null);
    const logsCount = [...byDate.values()].filter((d) => valueFor(d, shape.id) !== null).length;
    const last7 = known.slice(-7);
    const avg7 = last7.length ? last7.reduce((sum, v) => sum + v, 0) / last7.length : null;

    /* streak: consecutive days back from today that met the target */
    let streak = 0;
    for (let i = series.length - 1; i >= 0; i -= 1) {
      const v = series[i];
      if (typeof v !== "number") break;
      const met = shape.id === "screen" ? v <= goal : v >= goal;
      if (!met) break;
      streak += 1;
    }

    return {
      id: shape.id,
      name: shape.name,
      today: series[series.length - 1] ?? null,
      goal,
      avg7,
      streak,
      daysLogged: logsCount,
      series,
      format: shape.format,
    };
  });
}

/**
 * Everything the coach is allowed to speak from, read fresh on every request so
 * the answer always reflects the record as it stands this second.
 */
export function readCoachRecord(memories: string[] = []): CoachRecord {
  const today = todayKey();

  let trackers: CoachRecord["trackers"] = [];
  try {
    trackers = readTrackerFacts();
  } catch {
    trackers = [];
  }

  let cycle: CoachRecord["cycle"] = null;
  try {
    const logs = loadPeriodLogs();
    const settings = loadCycleSettings();
    const mode = effectiveMode(settings, today);
    /* same options as the Cycle page, so the coach never contradicts it */
    const analysis = analyzeCycle(logs, today, {
      personalMaxPlausible: settings.personalMaxPlausible,
      expecting: mode === "tracking",
    });
    /* cycle tracking turned off → not a topic; the coach neither mentions nor prompts it */
    cycle =
      mode === "off"
        ? null
        : {
            paused: mode === "paused",
            daysLogged: loadCycleDays().length + logs.length,
            cycleDay: analysis.cycleDay,
            phaseLabel: analysis.phaseLabel || null,
            nextStart: analysis.nextStart,
            daysUntilNext: analysis.daysUntilNext,
            averageLength: analysis.isGeneric ? null : analysis.averageLength,
            confidence: analysis.confidence === "none" ? null : String(analysis.confidence),
            confidenceReason: analysis.confidenceReason || null,
            nextPeriod: describeNextPeriod(analysis),
          };
  } catch {
    cycle = null;
  }

  return { today, trackers, cycle, memories, habitsActive: 0 };
}

function readHabitData(): CoachHabitData {
  const empty: CoachHabitData = { available: false, habits: [], logs: [] };
  if (typeof window === "undefined") return empty;
  const today = todayKey();
  const habits = readJson<Row[] | null>("bloom.habits", null);
  const logs = readJson<Row[] | null>("bloom.habit_logs", null);
  if (!Array.isArray(habits) || habits.length === 0) return empty;
  return {
    available: true,
    habits: habits
      .filter((h) => !h["archived"] && !h["completed"])
      // a paused habit is off the table today — the coach shouldn't nag about it
      .filter((h) => {
        const until = typeof h["pausedUntil"] === "string" ? h["pausedUntil"] : null;
        if (!until) return true;
        const from = typeof h["pausedFrom"] === "string" ? h["pausedFrom"] : until;
        return !(today >= from && today <= until);
      })
      .map((h) => ({
        id: String(h["id"] ?? h["name"]),
        name: String(h["name"] ?? "Habit"),
        frequency: String(h["frequency"] ?? "daily"),
        days: Array.isArray(h["days"]) ? (h["days"] as number[]) : [],
        timesPerWeek: typeof h["timesPerWeek"] === "number" ? h["timesPerWeek"] : null,
        reminderTime: typeof h["reminderTime"] === "string" ? h["reminderTime"] : null,
        priority: typeof h["priority"] === "string" ? h["priority"] : null,
        tags: Array.isArray(h["tags"]) ? (h["tags"] as string[]) : [],
        goal:
          h["goal"] && typeof h["goal"] === "object"
            ? {
                target:
                  (h["goal"] as Row)["target"] != null
                    ? Number((h["goal"] as Row)["target"])
                    : null,
                unit:
                  (h["goal"] as Row)["unit"] != null ? String((h["goal"] as Row)["unit"]) : null,
              }
            : null,
        startDate: typeof h["startDate"] === "string" ? h["startDate"] : null,
      })),
    logs: Array.isArray(logs)
      ? logs
          .filter((l) => l && typeof l === "object" && typeof l["date"] === "string")
          .map((l) => ({ habitId: String(l["habitId"] ?? ""), date: String(l["date"]) }))
      : [],
  };
}
