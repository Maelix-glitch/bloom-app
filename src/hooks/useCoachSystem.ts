/**
 * useCoachSystem — the Coach page's data layer.
 *
 * Reconstructed (the original never made it into git): session + thread +
 * approved memories persist to Supabase when the coach tables exist and fall
 * back to this device's storage otherwise, surfacing at most one calm notice.
 * `requestResponse` is a deterministic, context-grounded responder built on
 * `buildCoachContext`'s real numbers — it reads what actually happened and
 * never invents facts, diagnoses, or moods. A model provider can be slotted
 * behind the same signature later without touching the page.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";
import { answer as groundedAnswer } from "@/lib/coach/responder";
import type { CoachBlock, CoachRecord, CoachResponse } from "@/lib/coach/responder";
import type { CoachContext, CoachHabitData, CoachMode } from "@/lib/coach/intelligence";
import { analyzeCycle } from "@/lib/cycle/predict";
import { loadLogs as loadPeriodLogs, loadDays as loadCycleDays } from "@/lib/cycle/periodStore";
import { analyzeTrackers, TRACKERS } from "@/lib/trackers/core";
import { loadDays as loadTrackerDays, loadGoals as loadTrackerGoals } from "@/lib/trackers/store";
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
}

export type { CoachBlock, CoachResponse } from "@/lib/coach/responder";

export interface CoachMemory {
  id: string;
  category: "pattern" | "preference" | "goal" | "context";
  text: string;
  pinned: boolean;
  learnedAt: string | null;
}

export interface CoachRequest {
  text: string;
  mode: CoachMode;
  context: CoachContext;
  history: CoachMessage[];
  attachment?: CoachFilePayload | undefined;
}


const THREAD_KEY = (uid: string | null) => `bloom.coach.thread.${uid ?? "anon"}`;
const MEMORIES_KEY = (uid: string | null) => `bloom.coach.memories.${uid ?? "anon"}`;

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

export function coachErrorMessage(error: unknown, fallback?: string): string {
  const raw =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message ?? "")
      : error instanceof Error
        ? error.message
        : "";
  if (/fetch|network|failed to fetch/i.test(raw))
    return "You're offline — this reply stays on the device.";
  if (/relation|does not exist|schema cache|404/i.test(raw))
    return "Coach storage isn't set up yet — everything stays on this device.";
  return fallback ?? "Something went wrong on our end. Your words are safe on this device.";
}

/* --------------------------- the grounded responder --------------------------- */

const fmt = (n: number) => `${Math.round(n * 10) / 10}`;

/* --------------------------------- the hook --------------------------------- */

type Row = Record<string, unknown>;

export function useCoachSystem() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
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

    setMessages(readJson<CoachMessage[]>(THREAD_KEY(profileId), []));
    setMemories(readJson<CoachMemory[]>(MEMORIES_KEY(profileId), []));

    if (profileId) {
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
          if (Array.isArray(rows) && rows.length > 0) {
            setMessages(
              (rows as Row[]).map((r) => ({
                id: String(r["id"]),
                role: r["role"] === "user" ? "user" : "coach",
                time: String(r["created_at"] ?? new Date().toISOString()),
                text: contentToText(r["content"]) || undefined,
                paragraphs: contentToText(r["content"])
                  .split("\n\n")
                  .map((part) => part.trim())
                  .filter(Boolean),
                sources: Array.isArray(r["sources"]) ? (r["sources"] as string[]) : [],
                blocks: [],
              })),
            );
          }
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
        } catch (error) {
          if (!mounted) return;
          console.warn("[bloom:coach] storage unavailable, using device:", error);
          setStorageError(coachErrorMessage(error));
        }
      })().finally(() => mounted && setLoading(false));
    } else {
      setLoading(false);
    }
    return () => {
      mounted = false;
    };
  }, [profileId]);

  // local cache always mirrors the live state
  useEffect(() => writeJson(THREAD_KEY(profileId), messages.slice(-40)), [messages, profileId]);
  useEffect(() => writeJson(MEMORIES_KEY(profileId), memories), [memories, profileId]);

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

  const requestResponse = useCallback(async (request: CoachRequest): Promise<CoachResponse> => {
    // deterministic + grounded — see the responder's module header. A model
    // provider can slot in behind this same signature later.
    const record = readCoachRecord(
      memories.filter((m) => m.pinned).map((m) => m.text),
    );
    const context = request.context;
    record.habitsActive = context.habits.available ? context.habits.activeCount : 0;
    return groundedAnswer({ text: request.text, mode: request.mode }, context, record);
  }, [memories]);

  return useMemo(
    () => ({
      profileId,
      loading,
      messages,
      setMessages,
      memories,
      habitData,
      storageError,
      saveMessage,
      updateMemory,
      forgetMemory,
      requestResponse,
    }),
    [
      profileId,
      loading,
      messages,
      memories,
      habitData,
      storageError,
      saveMessage,
      updateMemory,
      forgetMemory,
      requestResponse,
    ],
  );
}

/**
 * Everything the coach is allowed to speak from, read fresh on every request so
 * the answer always reflects the record as it stands this second.
 */
export function readCoachRecord(memories: string[] = []): CoachRecord {
  const today = todayKey();

  let trackers: CoachRecord["trackers"] = [];
  try {
    const goals = loadTrackerGoals();
    const analysis = analyzeTrackers(loadTrackerDays(), goals, today);
    trackers = TRACKERS.map((def) => {
      const stat = analysis.trackers[def.id];
      return {
        id: def.id,
        name: def.name,
        today: stat.today,
        goal: stat.goal,
        avg7: stat.avg7,
        streak: stat.streak,
        daysLogged: stat.daysLogged,
        series: stat.series.map((point) => point.value),
        format: def.format,
      };
    });
  } catch {
    trackers = [];
  }

  let cycle: CoachRecord["cycle"] = null;
  try {
    const logs = loadPeriodLogs();
    const analysis = analyzeCycle(logs, today);
    cycle = {
      daysLogged: loadCycleDays().length + logs.length,
      cycleDay: analysis.cycleDay,
      phaseLabel: analysis.phaseLabel || null,
      nextStart: analysis.nextStart,
      daysUntilNext: analysis.daysUntilNext,
      averageLength: analysis.isGeneric ? null : analysis.averageLength,
      confidence: analysis.confidence === "none" ? null : String(analysis.confidence),
      confidenceReason: analysis.confidenceReason || null,
    };
  } catch {
    cycle = null;
  }

  return { today, trackers, cycle, memories, habitsActive: 0 };
}

function readHabitData(): CoachHabitData {
  const empty: CoachHabitData = { available: false, habits: [], logs: [] };
  if (typeof window === "undefined") return empty;
  const habits = readJson<Row[] | null>("bloom.habits", null);
  const logs = readJson<Row[] | null>("bloom.habit_logs", null);
  if (!Array.isArray(habits) || habits.length === 0) return empty;
  return {
    available: true,
    habits: habits
      .filter((h) => !h["archived"] && !h["completed"])
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
