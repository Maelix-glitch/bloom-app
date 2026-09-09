/**
 * Coach UI helpers — formatting, conversation grouping and the *real-data*
 * prompt logic. Nothing here invents facts: every suggestion is either a plain
 * question about a topic the person actually tracks, or a general prompt that
 * asks Bloom to look rather than asserting anything.
 */

import type { CoachConversation, CoachMessage } from "@/hooks/useCoachSystem";
import type { CoachMode } from "@/lib/coach/intelligence";
import type { CoachRecord } from "@/lib/coach/responder";
import { detectTopics } from "@/lib/coach/topics";
import { hashSeed } from "@/lib/voice/messages";

/* ------------------------------- time labels ------------------------------- */

export function messageTime(iso: string | undefined, nowLabel = "just now"): string {
  if (!iso || iso === "now") return nowLabel;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  if (diff >= 0 && diff < 45_000) return nowLabel;
  if (diff >= 0 && diff < 3_600_000) {
    const m = Math.max(1, Math.round(diff / 60_000));
    return m === 1 ? "1m" : `${m}m`;
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function rowTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  if (diff >= 0 && diff < 60_000) return "now";
  if (diff >= 0 && diff < 3_600_000) return `${Math.max(1, Math.round(diff / 60_000))}m`;
  if (diff >= 0 && diff < 86_400_000) return `${Math.max(1, Math.round(diff / 3_600_000))}h`;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const days = Math.round((startOfToday.getTime() - start.getTime()) / 86_400_000);
  if (days === 1) return "yest.";
  if (days < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

/** Latest activity per conversation, used to group the list. */
export type ConversationGroupId = "today" | "yesterday" | "previous7" | "earlier";

export interface ConversationGroup {
  id: ConversationGroupId;
  label: string;
  conversations: CoachConversation[];
}

export function groupConversations(list: CoachConversation[]): ConversationGroup[] {
  const groups: Record<ConversationGroupId, CoachConversation[]> = {
    today: [],
    yesterday: [],
    previous7: [],
    earlier: [],
  };
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  for (const conversation of list) {
    const date = new Date(conversation.updatedAt);
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const days = Math.round((startOfToday.getTime() - start.getTime()) / 86_400_000);
    if (days <= 0) groups.today.push(conversation);
    else if (days === 1) groups.yesterday.push(conversation);
    else if (days < 7) groups.previous7.push(conversation);
    else groups.earlier.push(conversation);
  }
  const label: Record<ConversationGroupId, string> = {
    today: "Today",
    yesterday: "Yesterday",
    previous7: "This week",
    earlier: "Earlier",
  };
  return (Object.keys(groups) as ConversationGroupId[])
    .filter((id) => groups[id].length > 0)
    .map((id) => ({ id, label: label[id], conversations: groups[id] }));
}

/* ------------------------------ prompt pools ------------------------------- */

export interface Starter {
  lens: CoachMode;
  text: string;
}

/** Starters shown in the empty conversation, keyed by what the person tracks. */
const DATA_STARTERS: Record<string, Starter[]> = {
  sleep: [
    { lens: "ask", text: "Help me make sense of my sleep" },
    { lens: "ask", text: "Is my sleep affecting my energy?" },
    { lens: "plan", text: "Help me protect tonight's sleep" },
  ],
  energy: [
    { lens: "ask", text: "Why have I been feeling tired lately?" },
    { lens: "ask", text: "What's my energy actually doing?" },
  ],
  mood: [
    { lens: "ask", text: "How has my mood been this week?" },
    { lens: "reflect", text: "Help me understand how I've been feeling" },
    { lens: "reflect", text: "What changed this week?" },
  ],
  stress: [
    { lens: "ask", text: "What's my stress been like lately?" },
    { lens: "reflect", text: "What's underneath this week?" },
  ],
  screen: [{ lens: "ask", text: "Is my screen time showing up in my sleep?" }],
  water: [{ lens: "ask", text: "How's my hydration holding up?" }],
  study: [{ lens: "ask", text: "Where is my focus actually going?" }],
  movement: [{ lens: "ask", text: "Am I moving enough?" }],
  cycle: [{ lens: "ask", text: "Where am I in my cycle?" }],
  habit: [
    { lens: "ask", text: "Are my habits actually holding?" },
    { lens: "ask", text: "Where am I losing consistency?" },
    { lens: "plan", text: "Make my routine easier" },
  ],
};

const NO_DATA_STARTERS: Starter[] = [
  { lens: "ask", text: "What can you actually help with?" },
  { lens: "reflect", text: "Talk about how I feel" },
  { lens: "plan", text: "What should I do today?" },
  { lens: "ask", text: "How should I get started?" },
];

const NO_DATA_MODE_STARTERS: Record<CoachMode, Starter[]> = {
  ask: NO_DATA_STARTERS,
  reflect: [
    { lens: "reflect", text: "Talk about how I feel" },
    { lens: "reflect", text: "Help me make sense of today" },
    { lens: "reflect", text: "What might I be missing?" },
  ],
  plan: [
    { lens: "plan", text: "Plan my day" },
    { lens: "plan", text: "Help me build a simple routine" },
    { lens: "plan", text: "What should I focus on first?" },
  ],
};

/**
 * Follow-ups shown after Bloom's reply, matched to what was just discussed.
 * These are requests ("look at…", "help me…"), never assertions about data.
 */
const FOLLOW_UPS: Record<string, string[]> = {
  sleep: ["Look at my sleep pattern", "Help me fix tonight", "Is this affecting my energy?"],
  habit: ["Make this easier", "Find the weak point", "Build a tiny version"],
  mood: ["Look for a pattern", "Help me understand it", "Just listen"],
  stress: ["What's underneath it?", "Help me take today down a notch", "Look for a pattern"],
  energy: ["What's draining me?", "Help me plan around my energy", "Look for a pattern"],
  cycle: ["What should I expect next?", "Plan around my cycle", "Explain this phase"],
  general: ["Tell me more about that", "What should I do with this?", "Make it concrete"],
};

/** Topics that are actually present in the person's record, in display order. */
export function recordedTopics(record: CoachRecord, moodEntries: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (id: string) => {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  };
  if (record.cycle && record.cycle.daysLogged > 0) add("cycle");
  const byLogs = [...record.trackers].sort((a, b) => b.daysLogged - a.daysLogged);
  for (const tracker of byLogs) {
    if (tracker.daysLogged > 0) add(tracker.id);
  }
  if (moodEntries > 0) add("mood");
  return out;
}

function rotate<T>(pool: T[], seed: string, count: number): T[] {
  if (pool.length === 0) return [];
  const start = hashSeed(seed) % pool.length;
  const out: T[] = [];
  const seen = new Set<number>();
  let cursor = start;
  while (out.length < count && seen.size < pool.length) {
    if (!seen.has(cursor)) {
      seen.add(cursor);
      out.push(pool[cursor]!);
    }
    cursor = (cursor + 1) % pool.length;
  }
  return out;
}

/** The empty-state tile set — grounded in which topics have data. */
export function starterPrompts(
  mode: CoachMode,
  record: CoachRecord,
  moodEntries: number,
  daySeed: string,
): Starter[] {
  const topics = recordedTopics(record, moodEntries);
  if (topics.length === 0) {
    return rotate(NO_DATA_MODE_STARTERS[mode], `coach-starter-empty-${mode}-${daySeed}`, 3);
  }
  const pool: Starter[] = [];
  for (const topic of topics) {
    for (const starter of DATA_STARTERS[topic] ?? []) pool.push(starter);
  }
  if (mode === "plan") {
    pool.push(
      { lens: "plan", text: "Make tomorrow easier" },
      { lens: "plan", text: "Plan around my current energy" },
    );
  }
  if (mode === "reflect") {
    pool.push(
      { lens: "reflect", text: "What's working lately?" },
      { lens: "reflect", text: "What should I carry forward?" },
    );
  }
  return rotate(pool, `coach-starter-${mode}-${daySeed}`, 4).slice(0, mode === "ask" ? 4 : 3);
}

/** Contextual chips beneath the latest exchange. */
export function followUpPrompts(mode: CoachMode, history: CoachMessage[]): string[] {
  const lastUser = [...history].reverse().find((m) => m.role === "user" || m.role === "you");
  if (!lastUser) return [];
  const text = (lastUser.text ?? lastUser.paragraphs.join(" ")).trim();
  const { primary } = detectTopics(text);
  const topic =
    primary === "general" ||
    primary === "thanks" ||
    primary === "greeting" ||
    primary === "smalltalk"
      ? mode === "plan"
        ? "habit"
        : "general"
      : primary;
  return (FOLLOW_UPS[topic] ?? FOLLOW_UPS["general"]!).slice(0, 3);
}

/* --------------------------- "quietly noticed" ----------------------------- */
/**
 * The signature Bloom interaction. Only ever derived from blocks that the
 * grounded responder actually emitted — the same numbers shown in the
 * response, re-read — so it can't claim anything the message doesn't.
 */
export interface QuietNotice {
  label: string;
  value: string;
  detail?: string | undefined;
  trend: "rising" | "falling" | "steady";
}

export function trendOf(series: number[]): QuietNotice["trend"] {
  const values = series.filter((v): v is number => Number.isFinite(v));
  const window = values.slice(-7);
  if (window.length < 3) return "steady";
  const half = Math.floor(window.length / 2);
  const a = window.slice(0, half);
  const b = window.slice(half);
  const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / Math.max(xs.length, 1);
  const ratio = mean(b) / Math.max(Math.abs(mean(a)), 0.0001);
  if (ratio > 1.06) return "rising";
  if (ratio < 0.94) return "falling";
  return "steady";
}

export function noticesFor(message: CoachMessage): QuietNotice[] {
  const out: QuietNotice[] = [];
  for (const block of message.blocks) {
    if (block.type === "metric") {
      out.push({
        label: block.label.replace(/\s*·\s*.*$/, ""),
        value: block.value,
        detail: block.detail,
        trend: trendOf(block.series),
      });
    }
  }
  return out;
}

export const TREND_WORD: Record<QuietNotice["trend"], string> = {
  rising: "rising",
  falling: "falling",
  steady: "holding steady",
};
