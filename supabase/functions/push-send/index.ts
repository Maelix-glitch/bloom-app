/**
 * Bloom push-send — delivers due reminders while the app is CLOSED.
 *
 * The browser halves already exist: the copy engine + scheduler decide what
 * is due and what it says (imported here, same code the app runs), and sw.js
 * shows whatever this function pushes. This is the missing sender: a cron
 * calls it every ~15 minutes; it rebuilds each subscriber's ReminderInput
 * from their synced rows, runs the shared `dueReminders`, and Web-Pushes the
 * result to every stored subscription.
 *
 * SECURITY
 *   · callable only with the `x-cron-secret` header (or Bearer token) equal
 *     to the PUSH_CRON_SECRET secret — it must never be public-callable;
 *   · runs on the service role, so every query is explicitly scoped by
 *     user_id; nothing here trusts RLS.
 *
 * HONEST LIMITS (v1)
 *   · "today" is the UTC day — per-user timezones aren't stored yet, so a
 *     20:30 evening nudge means 20:30 UTC;
 *   · weekly habits honour their weekday list; pauses and start dates are
 *     honoured; anything the client considers due that this server model
 *     doesn't simply waits for the in-app scheduler.
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

import {
  dueReminders,
  parseReminderSettings,
  DEFAULT_REMINDERS,
  type ReminderInput,
  type ReminderSettings,
} from "../../../src/lib/reminders/schedule.ts";
import { dayBefore, habitStreak } from "../../../src/lib/reminders/streak.ts";
import { analyzeCycle, type PeriodLog } from "../../../src/lib/cycle/predict.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const utcToday = (): string => new Date().toISOString().slice(0, 10);
const nowHM = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};
const weekdayOf = (date: string): number => new Date(`${date}T12:00:00Z`).getUTCDay();

interface SubRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  sent_keys: string[];
}

interface HabitRow {
  id: string;
  name: string;
  frequency: string | null;
  days: number[] | null;
  reminder_time: string | null;
  start_date: string | null;
  paused_from: string | null;
  paused_until: string | null;
  is_archived: boolean | null;
}

/** Mirrors the client's isDueOn for the cases push covers. */
function habitDueToday(h: HabitRow, today: string): boolean {
  if (h.is_archived) return false;
  if (h.start_date && h.start_date > today) return false;
  if (h.paused_from && today >= h.paused_from && (!h.paused_until || today <= h.paused_until)) {
    return false;
  }
  if (h.frequency === "weekly" && Array.isArray(h.days) && h.days.length > 0) {
    return h.days.includes(weekdayOf(today));
  }
  return true;
}

/** The client stores prefs as `{ [key]: { value, updatedAt } }`. */
function settingsFromPrefs(prefs: unknown): ReminderSettings {
  if (!prefs || typeof prefs !== "object") return DEFAULT_REMINDERS;
  const entry = (prefs as Record<string, { value?: unknown }>)[
    "reminders.settings"
  ];
  return parseReminderSettings(entry?.value) ?? DEFAULT_REMINDERS;
}

/** The client's paused-until rule, mirrored. */
function effectiveCycleMode(settings: unknown, today: string): "tracking" | "paused" | "off" {
  const s = (settings ?? {}) as {
    mode?: string;
    pause?: { until?: string | null };
  };
  const mode = s.mode === "paused" || s.mode === "off" ? s.mode : "tracking";
  if (mode === "paused" && s.pause?.until && today > s.pause.until) return "tracking";
  return mode;
}

async function buildInput(
  admin: ReturnType<typeof createClient>,
  userId: string,
  today: string,
): Promise<ReminderInput | null> {
  const [prefsRes, habitsRes, logsRes, trackersRes, periodsRes, stateRes] = await Promise.all([
    admin.from("user_prefs").select("prefs").eq("profile_id", userId).maybeSingle(),
    admin
      .from("habits")
      .select(
        "id,name,frequency,days,reminder_time,start_date,paused_from,paused_until,is_archived",
      )
      .eq("profile_id", userId)
      .not("reminder_time", "is", null),
    admin
      .from("habit_logs")
      .select("habit_id,date")
      .eq("profile_id", userId)
      .gte("date", dayBefore(today, 120)),
    admin.from("tracker_days").select("date").eq("profile_id", userId).eq("date", today),
    admin
      .from("cycle_periods")
      .select("id,start_date,end_date,flow")
      .eq("profile_id", userId)
      .is("deleted_at", null),
    admin.from("cycle_state").select("settings").eq("profile_id", userId).maybeSingle(),
  ]);
  if (habitsRes.error || logsRes.error) return null;

  const settings = settingsFromPrefs(prefsRes.data?.prefs);
  if (!settings.enabled) return null;

  const loggedDates = new Map<string, Set<string>>();
  let habitLogsToday = 0;
  for (const l of logsRes.data ?? []) {
    let set = loggedDates.get(l.habit_id as string);
    if (!set) {
      set = new Set();
      loggedDates.set(l.habit_id as string, set);
    }
    set.add(l.date as string);
    if (l.date === today) habitLogsToday += 1;
  }
  const empty = new Set<string>();

  const habits = (habitsRes.data ?? []) as unknown as HabitRow[];
  const habitEntries = habits
    .filter((h) => habitDueToday(h, today))
    .map((h) => ({
      habit: { id: h.id, name: h.name, reminderTime: (h.reminder_time ?? "").slice(0, 5) },
      done: (loggedDates.get(h.id) ?? empty).has(today),
      streak: habitStreak(loggedDates.get(h.id) ?? empty, today),
    }));

  const trackerToday = (trackersRes.data ?? []).length;
  const cycleToday = ((periodsRes.data ?? []).filter((p) => p.start_date === today)).length;

  const cycleSettings = stateRes.data?.settings;
  const mode = effectiveCycleMode(cycleSettings, today);
  const logs: PeriodLog[] = (periodsRes.data ?? []).map((p) => ({
    id: String(p.id),
    start: p.start_date,
    end: p.end_date ?? null,
    flow: p.flow ?? null,
  }));
  const analysis = analyzeCycle(logs, today, {
    expecting: mode === "tracking",
  });

  return {
    today,
    now: nowHM(),
    settings,
    /* the scheduler only reads id / name / reminderTime off a habit */
    habits: habitEntries as unknown as ReminderInput["habits"],
    cycle: {
      mode,
      nextStart: analysis.nextStart,
      daysLate: analysis.isLate ? analysis.lateBy : null,
      fertileStart: analysis.fertileStart,
      cycleDay: analysis.cycleDay,
    },
    loggedToday: habitLogsToday + trackerToday + cycleToday,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const secret = Deno.env.get("PUSH_CRON_SECRET") ?? "";
  if (!secret) return json({ error: "PUSH_CRON_SECRET is not set" }, 503);
  const given =
    req.headers.get("x-cron-secret") ??
    (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (given !== secret) return json({ error: "unauthorised" }, 401);

  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
  if (!vapidPublic || !vapidPrivate) {
    return json({ error: "VAPID keys are not set — run: npx web-push generate-vapid-keys" }, 503);
  }
  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT") ?? "mailto:push@bloom.app",
    vapidPublic,
    vapidPrivate,
  );

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const today = utcToday();
  const { data: subs, error: subsError } = await admin
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth,sent_keys")
    .limit(500);
  if (subsError || !subs) return json({ error: subsError?.message ?? "no subscriptions" }, 500);
  if (subs.length === 0) return json({ subscriptions: 0, sent: 0 });

  const byUser = new Map<string, SubRow[]>();
  for (const s of subs as unknown as SubRow[]) {
    const list = byUser.get(s.user_id) ?? [];
    list.push(s);
    byUser.set(s.user_id, list);
  }

  let sent = 0;
  let cleaned = 0;
  const perUser: Record<string, number> = {};

  for (const [userId, userSubs] of byUser) {
    const input = await buildInput(admin, userId, today);
    for (const sub of userSubs) {
      if (!input) continue;
      const seen = new Set(Array.isArray(sub.sent_keys) ? sub.sent_keys : []);
      const due = dueReminders(input).filter((r) => !seen.has(r.key));
      const newKeys: string[] = [];
      for (const reminder of due) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({
              title: reminder.title,
              body: reminder.body,
              tag: reminder.key,
              url: reminder.url,
            }),
          );
          sent += 1;
          newKeys.push(reminder.key);
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            /* the browser threw this subscription away — drop the row */
            await admin.from("push_subscriptions").delete().eq("id", sub.id);
            cleaned += 1;
          }
        }
      }
      if (newKeys.length > 0) {
        const kept = [...seen, ...newKeys].filter((k) => k.endsWith(today));
        await admin
          .from("push_subscriptions")
          .update({ sent_keys: kept, updated_at: new Date().toISOString() })
          .eq("id", sub.id);
      }
      perUser[userId] = (perUser[userId] ?? 0) + newKeys.length;
    }
  }

  return json({ subscriptions: subs.length, users: byUser.size, sent, cleaned });
});
