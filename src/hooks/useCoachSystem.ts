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
import type { CoachContext, CoachHabitData, CoachMode } from "@/lib/coach/intelligence";

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

export type CoachBlock =
  | {
      type: "metric";
      label: string;
      value: string;
      detail?: string;
      series: number[];
      accent?: "violet" | "sky" | "amber" | "sage" | "rose";
    }
  | {
      type: "plan";
      title: string;
      detail?: string;
      steps: { label: string; time?: string }[];
    }
  | {
      type: "proposal";
      title: string;
      detail?: string;
      changes?: { label: string; from: string; to: string }[];
    };

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

export interface CoachResponse {
  paragraphs: string[];
  sources: string[];
  blocks: CoachBlock[];
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

export function coachErrorMessage(error: unknown, fallback?: string): string {
  const raw =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message ?? "")
      : error instanceof Error
        ? error.message
        : "";
  if (/fetch|network|failed to fetch/i.test(raw)) return "You're offline — this reply stays on the device.";
  if (/relation|does not exist|schema cache|404/i.test(raw)) return "Coach storage isn't set up yet — everything stays on this device.";
  return fallback ?? "Something went wrong on our end. Your words are safe on this device.";
}

/* --------------------------- the grounded responder --------------------------- */

const fmt = (n: number) => `${Math.round(n * 10) / 10}`;

function respond({ text, mode, context }: CoachRequest): CoachResponse {
  const mood = context.mood;
  const paragraphs: string[] = [];
  const sources: string[] = [];
  const blocks: CoachBlock[] = [];

  const quality = mood.dataQuality;
  const asked = text.trim().toLowerCase();

  if (quality === "none") {
    paragraphs.push(
      "There's no mood history to read you from yet — so I won't pretend otherwise. Two or three check-ins and this conversation starts having something real to say.",
    );
    if (mode === "plan") {
      paragraphs.push(
        "For tonight, keep it small: one thing worth finishing, one thing worth resting. That's a plan that survives a bad day.",
      );
      blocks.push({
        type: "plan",
        title: "A floor, not a ceiling",
        detail: "Built from nothing but a kind default — log a couple of check-ins and the next plan is yours.",
        steps: [
          { label: "Pick one task that matters tomorrow morning", time: "10 min tonight" },
          { label: "Set a soft stop for the evening", time: "before you tire out" },
          { label: "One mood check-in before bed", time: "60 seconds" },
        ],
      });
    }
    return { paragraphs, sources, blocks };
  }

  const dir = mood.change.direction;
  const delta = mood.change.mood;

  if (mode === "reflect") {
    paragraphs.push(
      `You've logged ${mood.entries} check-in${mood.entries === 1 ? "" : "s"}. The seven-day mood sits at ${fmt(mood.recent.mood)} — ${
        dir === "improving"
          ? `up ${fmt(Math.abs(delta ?? 0))} from the week before`
          : dir === "declining"
            ? `down ${fmt(Math.abs(delta ?? 0))} from the week before`
            : "steady against the previous week"
      }. Energy ${fmt(mood.recent.energy)}, stress ${fmt(mood.recent.stress)}, both out of ten.`,
    );
    if (mood.patterns.length > 0) {
      const p = mood.patterns[0]!;
      paragraphs.push(`One thing stands out: ${p.statement.toLowerCase()}`);
    } else {
      paragraphs.push(
        "Nothing repeats clearly yet — that's a reading too, not a failure. Patterns need a few weeks of ordinary logging, not perfect streaks.",
      );
    }
    const series = mood.timeOfDay.map((band) => band.mood ?? mood.recent.mood);
    if (series.length >= 2) {
      blocks.push({
        type: "metric",
        label: "Mood through the day",
        value: `${fmt(mood.recent.mood)} avg · ${mood.entries} entries`,
        detail: "by time band, last 7 days",
        series,
        accent: "violet",
      });
    }
    sources.push("Last 7 days", "Previous 7 days", "Mood record");
  } else if (mode === "plan") {
    const habits = context.habits;
    const bestBand = [...mood.timeOfDay]
      .filter((b) => b.energy !== null)
      .sort((a, b) => (b.energy ?? 0) - (a.energy ?? 0))[0];
    paragraphs.push(
      bestBand
        ? `Your energy logs say ${bestBand.label.toLowerCase()} is your strongest band this week — put the thing that needs a brain there, and keep the rest gentle.`
        : "A plan you can actually keep beats an ambitious one you won't: one hard thing, one kind thing, one done.",
    );
    const steps: { label: string; time?: string }[] = [];
    if (habits.available && habits.activeCount > 0) {
      steps.push({ label: `Move the day with your routine (${habits.activeCount} habit${habits.activeCount === 1 ? "" : "s"} active)`, time: "first" });
    }
    if (bestBand) steps.push({ label: "The one task that needs real focus", time: bestBand.label.toLowerCase() });
    steps.push({ label: "Something small that counts as showing up", time: "afternoon" });
    steps.push({ label: "Stop before you're empty — future you logs the mood", time: "evening" });
    blocks.push({
      type: "plan",
      title: "Tonight's shape",
      detail:
        quality === "sparse"
          ? "Partly from thin data — the more you log, the less generic this gets."
          : "Built from your recent windows, not a template.",
      steps,
    });
    sources.push("Last 7 days", "Time-of-day bands");
    if (habits.available) sources.push("Tracker data");
    paragraphs.push("It's a starting shape, not a contract. Adjust anything.");
  } else {
    // ask
    const mentionsMood = /mood|feel|down|low|flat|good|fine|okay/.test(asked);
    const mentionsSleep = /sleep|rest|tired|energy/.test(asked);
    const mentionsStress = /stress|anxious|overwhelm|tense/.test(asked);
    const mentionsHabits = /habit|routine|track|consisten/.test(asked);

    if (mentionsSleep) {
      paragraphs.push(
        `Energy in the last seven days averages ${fmt(mood.recent.energy)} of 10, against ${fmt(mood.previous.energy)} the week before. ${
          (mood.change.energy ?? 0) > 0.5
            ? "That's a lift worth noticing — whatever changed, it's holding so far."
            : (mood.change.energy ?? 0) < -0.5
              ? "That's a dip. Not an alarm — a nudge to protect the evening a little."
              : "Flat, which is its own kind of data."
        }`,
      );
      sources.push("Energy logs", "Last 7 days", "Previous 7 days");
    } else if (mentionsStress) {
      paragraphs.push(
        `Stress reads ${fmt(mood.recent.stress)} on average over the last week ${
          (mood.change.stress ?? 0) < -0.5
            ? "— down from before, which is the direction most people want."
            : (mood.change.stress ?? 0) > 0.5
              ? "— up against the previous week. The spikes sit on specific days; they aren't your whole week."
              : ", holding roughly steady."
        }`,
      );
      if (mood.anomalies.length > 0) {
        const worst = mood.anomalies[mood.anomalies.length - 1]!;
        paragraphs.push(`The sharpest single day was ${worst.date} — ${worst.kind === "low" ? "a real low, not a blip you imagined" : "an unusual high"}. One hard day doesn't rewrite the trend.`);
      }
      sources.push("Last 7 days", "Mood record");
    } else if (mentionsHabits && context.habits.available) {
      const h = context.habits;
      paragraphs.push(
        `Your routine is ${h.activeCount} habit${h.activeCount === 1 ? "" : "s"} tracked; recent logs show ${h.recentCompleted} completion${h.recentCompleted === 1 ? "" : "s"} this window${
          h.previousCompleted > 0 ? `, ${h.previousCompleted} in the one before` : ""
        }. ${h.recentCompleted >= h.previousCompleted ? "Holding or quietly improving." : "A little lighter than before — worth a glance at what changed."}`,
      );
      sources.push("Tracker data");
    } else {
      paragraphs.push(
        mentionsMood
          ? `Here's what your record actually says: mood around ${fmt(mood.recent.mood)} of 10 across ${mood.entries} check-in${mood.entries === 1 ? "" : "s"}, ${
              dir === "stable" || dir === "insufficient"
                ? "steady week over week"
                : dir === "improving"
                  ? "climbing gently"
                  : "eased off a little"
            }. The month window reads ${fmt(mood.month.mood)}, so one week doesn't get to tell the whole story.`
          : "I read from your logs — mood, energy, stress, routines — and I'd rather say nothing than guess at something I can't see. Ask about your week, your patterns, your routine, or say 'plan tonight'.",
      );
      if (mood.patterns.length > 0) paragraphs.push(`Pattern worth knowing: ${mood.patterns[0]!.statement.toLowerCase()}`);
      sources.push("Last 7 days", "Last 30 days", "Mood record");
    }
    if (mood.entries >= 6) {
      blocks.push({
        type: "metric",
        label: `Mood · last 7 days`,
        value: `${fmt(mood.recent.mood)} / 10`,
        detail: `${mood.entries} entries · month reads ${fmt(mood.month.mood)}`,
        series: [mood.previous.mood, mood.recent.mood, mood.month.mood].filter((v): v is number => Number.isFinite(v)),
        accent: "violet",
      });
    }
  }

  const pinned = context.memory.selected.filter((m) => m.pinned);
  if (pinned.length > 0 && mode !== "plan") {
    paragraphs.push(`Also keeping in view: ${pinned.slice(0, 2).map((m: { text: string }) => `“${m.text}”`).join(" and ")}.`);
    sources.push("Pinned context");
  }

  return { paragraphs, sources: [...new Set(sources)], blocks };
}

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
            supabase.from("coach_messages").select("id, role, content, sources, created_at").eq("profile_id", profileId).order("created_at", { ascending: true }).limit(40),
            supabase.from("coach_memory").select("id, category, fact, pinned, updated_at").eq("profile_id", profileId).order("updated_at", { ascending: false }).limit(30),
          ]);
          if (!mounted) return;
          if (Array.isArray(rows) && rows.length > 0) {
            setMessages(
              (rows as Row[]).map((r) => ({
                id: String(r["id"]),
                role: r["role"] === "user" ? "user" : "coach",
                time: String(r["created_at"] ?? new Date().toISOString()),
                text: typeof r["content"] === "string" ? r["content"] : undefined,
                paragraphs: String(r["content"] ?? "").split("\n\n").filter(Boolean),
                sources: Array.isArray(r["sources"]) ? (r["sources"] as string[]) : [],
                blocks: [],
              })),
            );
          }
          if (Array.isArray(memRows) && memRows.length > 0) {
            setMemories(
              (memRows as Row[]).map((m) => ({
                id: String(m["id"]),
                category: (["pattern", "preference", "goal", "context"].includes(String(m["category"])) ? m["category"] : "context") as CoachMemory["category"],
                text: String(m["fact"] ?? ""),
                pinned: Boolean(m["pinned"]),
                learnedAt: m["updated_at"] ? new Date(String(m["updated_at"])).toLocaleDateString() : null,
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
          content: (message.role === "you" ? message.text : undefined) ?? message.paragraphs.join("\n\n"),
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
        await supabase.from("coach_memory").update({ pinned: Boolean(patch.pinned) }).eq("id", id).eq("profile_id", profileId);
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
    // deterministic + grounded — see module header. A future provider
    // adapter can slot in behind this same signature.
    return respond(request);
  }, []);

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
    [profileId, loading, messages, memories, habitData, storageError, saveMessage, updateMemory, forgetMemory, requestResponse],
  );
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
                target: (h["goal"] as Row)["target"] != null ? Number((h["goal"] as Row)["target"]) : null,
                unit: (h["goal"] as Row)["unit"] != null ? String((h["goal"] as Row)["unit"]) : null,
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
