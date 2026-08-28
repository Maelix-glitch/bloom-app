import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";
import type {
  CoachContext,
  CoachHabitContextInput,
  CoachHabitData,
  CoachHabitLogInput,
} from "@/lib/coach/intelligence";

export type { CoachContext } from "@/lib/coach/intelligence";

type MessageRole = "coach" | "user";
export type CoachMode = "ask" | "reflect" | "plan";

export interface CoachMetricBlock {
  type: "metric";
  label: string;
  value: string;
  detail: string;
  series: number[];
  accent: "violet" | "sky" | "amber" | "sage";
}

export interface CoachPlanBlock {
  type: "plan";
  title: string;
  detail: string;
  steps: { label: string; time?: string }[];
}

export interface CoachProposalBlock {
  type: "proposal";
  title: string;
  detail: string;
  changes?: { label: string; from?: string; to?: string }[];
}

export type CoachBlock = CoachMetricBlock | CoachPlanBlock | CoachProposalBlock;

export interface CoachAttachmentMeta {
  name: string;
  type: string;
  size: number;
}

export interface CoachMessage {
  id: string;
  role: MessageRole;
  time: string;
  paragraphs: string[];
  sources: string[];
  blocks: CoachBlock[];
  attachment: CoachAttachmentMeta | undefined;
  status: "sent" | "error";
}

export interface CoachMemory {
  id: string;
  category: "pattern" | "preference" | "goal" | "context";
  text: string;
  confidence: number;
  learnedAt: string;
  source: string;
  pinned: boolean;
}

export interface CoachResponse {
  paragraphs: string[];
  sources: string[];
  blocks: CoachBlock[];
}

/**
 * Keep technical failures in developer diagnostics and give the UI one safe,
 * consistent consumer message. The Coach never renders the original error.
 */
export function coachErrorMessage(
  error: unknown,
  fallback = "Something interrupted Bloom's response.",
) {
  const details =
    error && typeof error === "object"
      ? (error as { message?: unknown; status?: unknown; code?: unknown; name?: unknown })
      : {};
  const message = typeof details.message === "string" ? details.message.toLowerCase() : "";
  const status = Number(details.status);

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "You're offline right now.";
  }
  if (/network|failed to fetch|fetch failed|connection/.test(message)) {
    return "Bloom lost connection.";
  }
  if (status === 401 || status === 403 || /jwt|session|auth|unauthori/.test(message)) {
    return "Your session needs to be refreshed.";
  }
  if (status === 429 || /rate limit|too many requests/.test(message)) {
    return "Bloom needs a moment before trying again.";
  }
  if (/timeout|timed out|abort/.test(message)) {
    return "Bloom is taking a little longer than expected.";
  }

  return fallback;
}

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberSeries(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map(Number)
    .filter((item) => Number.isFinite(item))
    .slice(0, 60);
}

function consumerSources(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map(textValue)
    .filter(Boolean)
    .map((source) => {
      const normalized = source.toLowerCase().replace(/[_-]+/g, " ");
      if (normalized === "live data") return "Your recent activity";
      if (normalized.includes("mood")) return "Your Mood record";
      if (normalized.includes("memory")) return "Saved context";
      return source;
    })
    .filter(
      (source) =>
        !/(api|supabase|database|endpoint|json|jwt|token|provider|model|function)/i.test(source),
    )
    .slice(0, 6);
}

function parseBlocks(value: unknown): CoachBlock[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw): CoachBlock[] => {
    if (!raw || typeof raw !== "object" || !("type" in raw)) return [];
    const block = raw as Record<string, unknown>;
    const type = textValue(block["type"]);
    if (type === "metric") {
      const series = numberSeries(block["series"]);
      if (series.length < 2) return [];
      return [
        {
          type: "metric",
          label: textValue(block["label"]).slice(0, 80) || "Observed signal",
          value: textValue(block["value"]).slice(0, 80) || "—",
          detail: (textValue(block["detail"]) || textValue(block["unit"])).slice(0, 120),
          series,
          accent: ["violet", "sky", "amber", "sage"].includes(textValue(block["accent"]))
            ? (block["accent"] as CoachMetricBlock["accent"])
            : "violet",
        } satisfies CoachMetricBlock,
      ];
    }
    if (type === "plan") {
      const rawSteps = Array.isArray(block["steps"]) ? block["steps"] : [];
      return [
        {
          type: "plan",
          title: textValue(block["title"]).slice(0, 100) || "Suggested next steps",
          detail: textValue(block["detail"]).slice(0, 180),
          steps: rawSteps
            .slice(0, 8)
            .flatMap((step) => {
              if (!step || typeof step !== "object") return [];
              const item = step as Record<string, unknown>;
              return [
                {
                  label: textValue(item["text"]) || textValue(item["label"]),
                  time: textValue(item["when"]) || textValue(item["time"]),
                },
              ];
            })
            .filter((step) => step.label),
        } satisfies CoachPlanBlock,
      ];
    }
    if (type === "proposal") {
      const rawChanges = Array.isArray(block["changes"]) ? block["changes"] : [];
      return [
        {
          type: "proposal",
          title: textValue(block["title"]).slice(0, 100) || "Suggested change",
          detail: textValue(block["detail"]).slice(0, 180),
          changes: rawChanges.slice(0, 8).flatMap((change) => {
            if (!change || typeof change !== "object") return [];
            const item = change as Record<string, unknown>;
            return [
              {
                label: textValue(item["label"]) || textValue(item["field"]),
                from: textValue(item["from"]),
                to: textValue(item["to"]),
              },
            ];
          }),
        } satisfies CoachProposalBlock,
      ];
    }
    return [];
  });
}

function parseMessage(row: Record<string, unknown>): CoachMessage {
  const content =
    typeof row["content"] === "string"
      ? (() => {
          try {
            return JSON.parse(row["content"]) as Record<string, unknown>;
          } catch {
            return { paragraphs: [row["content"]] };
          }
        })()
      : row["content"] && typeof row["content"] === "object"
        ? (row["content"] as Record<string, unknown>)
        : {};
  const paragraphs = Array.isArray(content["paragraphs"])
    ? content["paragraphs"].map(textValue).filter(Boolean)
    : [textValue(content["text"])].filter(Boolean);
  return {
    id: textValue(row["id"]) || crypto.randomUUID(),
    role: row["role"] === "user" ? "user" : "coach",
    time: textValue(row["created_at"]) || new Date().toISOString(),
    paragraphs,
    sources: consumerSources(row["sources"]),
    blocks: parseBlocks(content["blocks"]),
    attachment:
      content["attachment"] && typeof content["attachment"] === "object"
        ? {
            name: textValue((content["attachment"] as Record<string, unknown>)["name"]),
            type: textValue((content["attachment"] as Record<string, unknown>)["type"]),
            size: Number((content["attachment"] as Record<string, unknown>)["size"]) || 0,
          }
        : undefined,
    status: "sent",
  };
}

function parseMemory(row: Record<string, unknown>): CoachMemory {
  const category = textValue(row["category"]);
  return {
    id: textValue(row["id"]),
    category: ["pattern", "preference", "goal", "context"].includes(category)
      ? (category as CoachMemory["category"])
      : "context",
    text: textValue(row["fact"]) || textValue(row["text"]),
    confidence: Math.max(0, Math.min(1, Number(row["confidence"]) || 0)),
    learnedAt: row["created_at"]
      ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
          new Date(String(row["created_at"])),
        )
      : "",
    source: textValue(row["source"]) || "chat",
    pinned: Boolean(row["pinned"]),
  };
}

function parseHabit(row: Record<string, unknown>): CoachHabitContextInput | null {
  const id = textValue(row["id"]);
  const name = textValue(row["name"]).trim();
  if (!id || !name || row["archived"] === true || row["is_archived"] === true) return null;
  const daysValue = row["days"] ?? row["days_of_week"];
  const days = Array.isArray(daysValue)
    ? daysValue.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : [];
  const timesPerWeekValue = Number(row["times_per_week"] ?? row["timesPerWeek"]);
  const goalValue = row["goal"];
  const goalRecord =
    goalValue && typeof goalValue === "object" ? (goalValue as Record<string, unknown>) : undefined;
  const goalTargetValue = Number(row["goal_target"] ?? goalRecord?.["target"]);
  const goalUnit = textValue(row["goal_unit"] ?? goalRecord?.["unit"]);
  const goalEnabled = Boolean(row["goal_enabled"] ?? goalRecord?.["enabled"]);
  return {
    id,
    name,
    frequency: textValue(row["frequency"]) || "daily",
    days: [...new Set(days)],
    timesPerWeek:
      Number.isFinite(timesPerWeekValue) && timesPerWeekValue > 0 ? timesPerWeekValue : null,
    reminderTime: textValue(row["reminder_time"]) || null,
    priority: textValue(row["priority"]) || null,
    tags: Array.isArray(row["tags"]) ? row["tags"].map(textValue).filter(Boolean).slice(0, 12) : [],
    goal:
      goalEnabled || Number.isFinite(goalTargetValue)
        ? {
            target: Number.isFinite(goalTargetValue) ? goalTargetValue : null,
            unit: goalUnit || null,
          }
        : null,
    startDate: textValue(row["start_date"]) || null,
  };
}

function parseHabitLog(row: Record<string, unknown>): CoachHabitLogInput | null {
  const habitId = textValue(row["habit_id"]);
  const rawDate = textValue(row["date"]) || textValue(row["completed_at"]);
  const date = rawDate.slice(0, 10);
  if (!habitId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return { habitId, date };
}

function emptyHabitData(): CoachHabitData {
  return { available: false, habits: [], logs: [] };
}

export function useCoachSystem() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [memories, setMemories] = useState<CoachMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [habitData, setHabitData] = useState<CoachHabitData>(emptyHabitData);
  const loadVersionRef = useRef(0);

  const load = useCallback(async (userId: string | null) => {
    const loadVersion = ++loadVersionRef.current;
    const isCurrentLoad = () => loadVersion === loadVersionRef.current;
    setLoading(true);
    setStorageError(null);
    setProfileId(userId);
    if (!userId) {
      if (isCurrentLoad()) {
        setMessages([]);
        setMemories([]);
        setHabitData(emptyHabitData());
        setLoading(false);
      }
      return;
    }

    try {
      const [messageResult, memoryResult, habitResult, habitLogResult] = await Promise.all([
        supabase
          .from("coach_messages")
          .select("id, profile_id, role, content, sources, created_at")
          .eq("profile_id", userId)
          .order("created_at", { ascending: true })
          .limit(80),
        supabase
          .from("coach_memory")
          .select("id, profile_id, category, fact, text, confidence, source, pinned, created_at")
          .eq("profile_id", userId)
          .order("pinned", { ascending: false })
          .order("confidence", { ascending: false })
          .limit(30),
        supabase.from("habits").select("*").eq("profile_id", userId).limit(120),
        supabase.from("habit_logs").select("*").eq("profile_id", userId).limit(1000),
      ]);
      if (!isCurrentLoad()) return;
      if (messageResult.error) throw messageResult.error;
      setMessages(
        (messageResult.data ?? []).map((row) => parseMessage(row as Record<string, unknown>)),
      );
      if (memoryResult.error) {
        console.error("Could not load saved Coach context:", memoryResult.error);
        setStorageError("Some saved context is unavailable right now.");
        setMemories([]);
      } else {
        setMemories(
          (memoryResult.data ?? [])
            .map((row) => parseMemory(row as Record<string, unknown>))
            .filter((memory) => memory.text),
        );
      }
      if (habitResult.error) {
        console.error("Could not load Coach habits:", habitResult.error);
        setHabitData(emptyHabitData());
      } else {
        if (habitLogResult.error) {
          console.error("Could not load Coach habit history:", habitLogResult.error);
          setStorageError("Some recent activity is unavailable right now.");
        }
        setHabitData({
          available: true,
          habits: (habitResult.data ?? [])
            .map((row) => parseHabit(row as Record<string, unknown>))
            .filter((habit): habit is CoachHabitContextInput => Boolean(habit)),
          logs: (habitLogResult.data ?? [])
            .map((row) => parseHabitLog(row as Record<string, unknown>))
            .filter((log): log is CoachHabitLogInput => Boolean(log)),
        });
      }
    } catch (error) {
      if (!isCurrentLoad()) return;
      console.error("Could not load Coach conversation:", error);
      setStorageError("Your saved Coach conversation is unavailable right now.");
      setMessages([]);
      setMemories([]);
      setHabitData(emptyHabitData());
    } finally {
      if (isCurrentLoad()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (active) void load(session?.user?.id ?? null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error("Could not open Coach session:", error);
        setStorageError("Your saved Coach conversation is unavailable right now.");
        setMessages([]);
        setMemories([]);
        setHabitData(emptyHabitData());
        setLoading(false);
      });
    const listener = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) void load(session?.user?.id ?? null);
    });
    return () => {
      active = false;
      loadVersionRef.current += 1;
      listener.data.subscription.unsubscribe();
    };
  }, [load]);

  const saveMessage = useCallback(
    async (message: CoachMessage) => {
      if (!profileId) return false;
      try {
        const { error } = await supabase.from("coach_messages").insert({
          profile_id: profileId,
          role: message.role === "user" ? "user" : "coach",
          content: {
            paragraphs: message.paragraphs,
            blocks: message.blocks,
            attachment: message.attachment ?? null,
          },
          sources: message.sources,
        });
        if (error) {
          console.error("Could not persist Coach message:", error);
          setStorageError("Your saved Coach context is unavailable right now.");
          return false;
        }
        return true;
      } catch (error) {
        console.error("Could not persist Coach message:", error);
        setStorageError("Your saved Coach context is unavailable right now.");
        return false;
      }
    },
    [profileId],
  );

  const requestResponse = useCallback(
    async ({
      text,
      mode,
      context,
      history,
      attachment,
    }: {
      text: string;
      mode: CoachMode;
      context: CoachContext;
      history: CoachMessage[];
      attachment: { fileType: string; base64Data: string } | undefined;
    }) => {
      const { data, error } = await supabase.functions.invoke("bloom-dual-ai-router", {
        body: {
          message: text,
          mode,
          context,
          fileType: attachment?.fileType ?? null,
          base64Data: attachment?.base64Data ?? null,
          history: history.slice(-8).map((message) => ({
            role: message.role === "user" ? "user" : "assistant",
            content: message.paragraphs.join("\n\n"),
          })),
        },
      });
      if (error) throw error;
      const response = (data ?? {}) as Record<string, unknown>;
      if (response["error"] || response["error_code"] || response["status"] === "error") {
        throw new Error("Coach response was not completed.");
      }
      const paragraphs = Array.isArray(response["paragraphs"])
        ? response["paragraphs"].map(textValue).filter(Boolean)
        : [textValue(response["text"])].filter(Boolean);
      if (!paragraphs.length)
        throw new Error(
          textValue(response["message"]) || "The AI router returned an empty response.",
        );
      return {
        paragraphs,
        sources: consumerSources(response["sources"]),
        blocks: parseBlocks(response["blocks"]),
      } satisfies CoachResponse;
    },
    [],
  );

  const updateMemory = useCallback(
    async (id: string, patch: Partial<Pick<CoachMemory, "text" | "pinned">>) => {
      if (!profileId) return;
      const { error } = await supabase
        .from("coach_memory")
        .update(patch)
        .eq("id", id)
        .eq("profile_id", profileId);
      if (error) throw error;
      setMemories((current) =>
        current.map((memory) => (memory.id === id ? { ...memory, ...patch } : memory)),
      );
    },
    [profileId],
  );

  const forgetMemory = useCallback(
    async (id: string) => {
      if (!profileId) return;
      const { error } = await supabase
        .from("coach_memory")
        .delete()
        .eq("id", id)
        .eq("profile_id", profileId);
      if (error) throw error;
      setMemories((current) => current.filter((memory) => memory.id !== id));
    },
    [profileId],
  );

  return {
    profileId,
    messages,
    memories,
    habitData,
    loading,
    storageError,
    load,
    setMessages,
    saveMessage,
    requestResponse,
    updateMemory,
    forgetMemory,
  };
}
