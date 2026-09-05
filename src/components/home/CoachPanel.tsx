import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, LifeBuoy, Loader2, SendHorizontal } from "lucide-react";

import { useCoachSystem, type CoachMessage } from "@/hooks/useCoachSystem";
import { buildCoachContext, type CoachHabitData } from "@/lib/coach/intelligence";
import type { MoodEntry } from "@/lib/mood/types";
import type { HabitsStore } from "@/hooks/useHabits";

const DRAFT_KEY = "bloom-coach-draft";

/**
 * A short read from the real Coach: the same grounded responder that powers
 * /coach, fed today's record. One question here continues on the Coach page
 * with the same thread (messages are saved through the same hook).
 */
export function CoachPanel({
  entries,
  habitsStore,
}: {
  entries: MoodEntry[];
  habitsStore: HabitsStore;
}) {
  const coach = useCoachSystem();
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [reply, setReply] = useState<CoachMessage | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requested = useRef(false);

  /* the coach reads habits from the localStorage mirror at mount; hand it
     the live set instead so the read is never stale */
  const habitData = useMemo<CoachHabitData>(
    () =>
      habitsStore.habits.length === 0
        ? coach.habitData
        : {
            available: true,
            habits: habitsStore.habits.map((h) => ({
              id: h.id,
              name: h.name,
              frequency: h.frequency,
              days: h.days,
              timesPerWeek: h.timesPerWeek,
              reminderTime: h.reminderTime,
              priority: h.priority,
              tags: h.tags,
              goal: h.goal,
              startDate: h.startDate,
            })),
            logs: habitsStore.logs.map((l) => ({ habitId: l.habitId, date: l.date })),
          },
    [coach.habitData, habitsStore.habits, habitsStore.logs],
  );

  const memories = useMemo(
    () =>
      coach.memories.map((m) => ({
        id: m.id,
        category: m.category,
        text: m.text,
        pinned: m.pinned,
        learnedAt: m.learnedAt ?? "",
      })),
    [coach.memories],
  );

  /* the opening read: a plan-mode answer built only from the record */
  useEffect(() => {
    if (coach.loading || requested.current) return;
    if (habitsStore.loading) return;
    requested.current = true;
    let alive = true;
    void (async () => {
      try {
        const text = "";
        const response = await coach.requestResponse({
          text,
          mode: "plan",
          context: buildCoachContext(entries, memories, habitData, "plan", text),
          history: coach.messages,
        });
        if (!alive) return;
        setReply({
          id: "home-coach-read",
          role: "coach",
          time: new Date().toISOString(),
          paragraphs: response.paragraphs,
          sources: response.sources,
          blocks: response.blocks,
        });
      } catch (e) {
        console.warn("[bloom:home] coach read:", e);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach.loading, habitsStore.loading]);

  const lastCoach = [...coach.messages].reverse().find((m) => m.role === "coach") ?? null;
  const shown = reply ?? lastCoach;
  const plan = shown?.blocks.find((b) => b.type === "plan");

  const ask = async () => {
    const text = draft.trim();
    if (!text || thinking) return;
    if (!coach.profileId) {
      try {
        window.sessionStorage.setItem(DRAFT_KEY, text);
      } catch {
        /* private mode */
      }
      setNotice("Sign in on the Coach page to send a private message — your draft is kept.");
      return;
    }
    setThinking(true);
    setNotice(null);
    const userMessage: CoachMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      time: new Date().toISOString(),
      paragraphs: [text],
      sources: [],
      blocks: [],
      status: "sent",
    };
    try {
      const response = await coach.requestResponse({
        text,
        mode: "ask",
        context: buildCoachContext(entries, memories, habitData, "ask", text),
        history: [...coach.messages, userMessage],
      });
      const coachMessage: CoachMessage = {
        id: `coach-${Date.now()}`,
        role: "coach",
        time: new Date().toISOString(),
        paragraphs: response.paragraphs,
        sources: response.sources,
        blocks: response.blocks,
        status: "sent",
      };
      coach.setMessages((current) => [...current, userMessage, coachMessage]);
      setReply(coachMessage);
      setDraft("");
      const saved = await Promise.all([
        coach.saveMessage(userMessage),
        coach.saveMessage(coachMessage),
      ]);
      if (saved.some((ok) => !ok))
        setNotice("Answered — but the thread couldn't be saved to your account just now.");
    } catch (e) {
      console.warn("[bloom:home] coach ask:", e);
      setNotice("Bloom couldn't answer that just now.");
    } finally {
      setThinking(false);
    }
  };

  return (
    <section className="home-panel p-5" aria-labelledby="home-coach-title">
      <header className="flex items-center justify-between">
        <h2 id="home-coach-title" className="flex items-center gap-2 font-display text-xl">
          <LifeBuoy className="size-4 text-primary" /> Coach
        </h2>
        <Link
          to="/coach"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Open <ArrowUpRight className="size-3.5" />
        </Link>
      </header>

      <div className="mt-4 space-y-2 text-[13px] leading-relaxed">
        {shown ? (
          <>
            {shown.paragraphs.slice(0, 2).map((p, i) => (
              <p key={i} className={i === 0 ? "" : "text-muted-foreground"}>
                {p}
              </p>
            ))}
            {plan && plan.type === "plan" ? (
              <ul className="mt-2 space-y-1.5 rounded-xl border border-border bg-surface-2/40 p-3">
                {plan.steps.slice(0, 4).map((s, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 text-[12px]">
                    <span>{s.label}</span>
                    {s.time ? (
                      <span className="shrink-0 text-[10.5px] text-muted-foreground">{s.time}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {shown.sources.length ? (
              <p className="text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground/80">
                From {shown.sources.slice(0, 3).join(" · ")}
              </p>
            ) : null}
          </>
        ) : (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Reading your record…
          </p>
        )}
      </div>

      <form
        className="mt-4 flex items-center gap-2 rounded-full border border-border bg-surface-2/50 p-1 pl-3"
        onSubmit={(e) => {
          e.preventDefault();
          void ask();
        }}
      >
        <label htmlFor="home-coach-draft" className="sr-only">
          Ask the coach
        </label>
        <input
          id="home-coach-draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about your sleep, mood, cycle…"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-[13px] outline-none placeholder:text-muted-foreground/70"
        />
        <button
          type="submit"
          disabled={thinking || !draft.trim()}
          aria-label="Send"
          className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-surface transition-colors enabled:hover:border-primary/60 disabled:opacity-50"
        >
          {thinking ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <SendHorizontal className="size-3.5" />
          )}
        </button>
      </form>
      {notice ? (
        <p className="mt-2 text-[11.5px] text-muted-foreground" role="status">
          {notice}{" "}
          {!coach.profileId ? (
            <Link to="/coach" className="underline underline-offset-2 hover:text-foreground">
              Go to Coach
            </Link>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}
