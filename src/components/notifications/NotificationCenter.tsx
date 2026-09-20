/**
 * The Notification Center — the bell's memory.
 *
 * Three honest sections, nothing manufactured:
 *   · **Due today** — what the reminder engine considers due right now, live;
 *   · **Insights** — the cycle intelligence's current read of the record;
 *   · **History** — every notification this device actually delivered.
 *
 * Opens as the same BloomSheet the profile dialogs use, so it feels native to
 * the app on phone and desktop alike.
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlarmClock, BellRing, Sparkles, Trash2 } from "lucide-react";

import { BloomSheet, SheetBody } from "@/components/ui/bloom-sheet";
import { useCycleSystem } from "@/hooks/useCycleSystem";
import { useReminders } from "@/hooks/useReminders";
import { cn } from "@/lib/utils";
import { buildObservations, buildPersonalInsight } from "@/lib/cycle/intelligence";
import {
  CENTER_CHANGED,
  clearNotices,
  listNotices,
  markAllRead,
  unreadCount,
  type Notice,
} from "@/lib/notifications/center";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

const KIND_LABEL: Record<Notice["kind"], string> = {
  habit: "Habit",
  period: "Cycle",
  fertile: "Cycle",
  evening: "Evening",
  insight: "Insight",
  system: "Bloom",
};

function SectionTitle({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
      {icon}
      {children}
    </h3>
  );
}

export function NotificationCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reminders = useReminders();
  const cycle = useCycleSystem();
  const [notices, setNotices] = useState<Notice[]>(() => listNotices());

  useEffect(() => {
    const sync = () => setNotices(listNotices());
    window.addEventListener(CENTER_CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CENTER_CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  /* seeing them counts as reading them */
  useEffect(() => {
    if (open) markAllRead();
  }, [open]);

  const insights = useMemo(() => {
    if (cycle.loading || !cycle.model || !cycle.context) {
      return [] as { id: string; text: string; why?: string }[];
    }
    const out: { id: string; text: string; why?: string }[] = [];
    const personal = buildPersonalInsight(cycle.model, cycle.context);
    if (personal) out.push(personal);
    for (const o of buildObservations(cycle.model, cycle.entries).slice(0, 3)) {
      out.push({ id: o.id, text: o.text });
    }
    return out;
  }, [cycle.loading, cycle.model, cycle.context, cycle.entries]);

  const due = reminders.preview;

  return (
    <BloomSheet open={open} onClose={onClose} title="Notifications" size="md">
      <SheetBody className="space-y-7 pb-6">
        {/* ------------------------------------------------ due today */}
        <section className="space-y-3">
          <SectionTitle icon={<AlarmClock className="size-3.5" />}>Due today</SectionTitle>
          {due.length === 0 ? (
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Nothing is due right now. Reminders appear here — and nudge you — at their time.
            </p>
          ) : (
            <ul className="space-y-2">
              {due.map((r) => (
                <li key={r.key}>
                  <Link
                    to={r.url}
                    onClick={onClose}
                    className="block rounded-xl border border-border bg-surface-2/40 px-4 py-3 transition-colors hover:bg-surface-2/70"
                  >
                    <span className="block text-[13.5px] text-foreground">{r.title}</span>
                    <span className="mt-0.5 block text-[12.5px] text-muted-foreground">
                      {r.body}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ------------------------------------------------ insights */}
        <section className="space-y-3">
          <SectionTitle icon={<Sparkles className="size-3.5" />}>Insights</SectionTitle>
          {insights.length === 0 ? (
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Insights appear once there's a little cycle history to read.
            </p>
          ) : (
            <ul className="space-y-2">
              {insights.map((i) => (
                <li key={i.id}>
                  <Link
                    to="/cycle"
                    onClick={onClose}
                    className="block rounded-xl border border-border bg-surface-2/40 px-4 py-3 transition-colors hover:bg-surface-2/70"
                  >
                    <span className="block text-[13px] leading-relaxed text-foreground">
                      {i.text}
                    </span>
                    {i.why ? (
                      <span className="mt-1 block text-[11.5px] text-muted-foreground">
                        {i.why}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ------------------------------------------------ history */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionTitle icon={<BellRing className="size-3.5" />}>History</SectionTitle>
            {notices.length > 0 ? (
              <button
                type="button"
                onClick={clearNotices}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                <Trash2 className="size-3" /> Clear
              </button>
            ) : null}
          </div>
          {notices.length === 0 ? (
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Quiet so far. Every notification Bloom delivers on this device keeps a copy here, so a
              missed nudge is never a lost one.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {notices.slice(0, 30).map((n) => (
                <li key={n.id} className="flex gap-3 py-3">
                  <span className="mt-0.5 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {KIND_LABEL[n.kind]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-foreground">{n.title}</span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
                      {n.body}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {timeAgo(n.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </SheetBody>
    </BloomSheet>
  );
}

/**
 * The bell itself — a frosted glass disc with a custom-drawn bell, a glossy
 * gold count pill while something waits, and a single soft ring each time a
 * new notification arrives. The one bell every header shares, so it looks
 * identical on the phone bar, the Today toolbar and the Mood top bar.
 *
 * `className` carries layout utilities only (`hidden lg:grid`) — the bell's
 * own visuals live in src/styles/bell.css and never vary by page.
 */
export function NotificationBell({ className }: { className?: string | undefined }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  /** Bumped on every new arrival so the swing replays exactly once. */
  const [ringKey, setRingKey] = useState(0);
  const prevUnread = useRef(0);
  /* The dome's gold gradient is per-instance — two bells share a page. */
  const goldId = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  useEffect(() => {
    const sync = () => {
      const next = unreadCount();
      setUnread(next);
      if (next > prevUnread.current) setRingKey((k) => k + 1);
      prevUnread.current = next;
    };
    sync();
    window.addEventListener(CENTER_CHANGED, sync);
    return () => window.removeEventListener(CENTER_CHANGED, sync);
  }, []);

  const hasUnread = unread > 0;

  return (
    <>
      <span className={cn("bloom-bell-wrap", className)} data-unread={hasUnread}>
        <button
          type="button"
          aria-label={hasUnread ? `Notifications, ${unread} unread` : "Notifications"}
          title="Notifications"
          onClick={() => setOpen(true)}
          data-unread={hasUnread}
          className="bloom-icon-btn bloom-bell"
        >
          <span key={ringKey} data-ring={hasUnread} className="bloom-bell__swing">
            <svg
              viewBox="0 0 24 24"
              className="bloom-bell__glyph"
              aria-hidden="true"
              focusable="false"
            >
              <defs>
                <linearGradient id={goldId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#F8E0A4" />
                  <stop offset="0.45" stopColor="#EFBE60" />
                  <stop offset="1" stopColor="#D6932B" />
                </linearGradient>
              </defs>
              <g>
                <circle cx="12" cy="4" r="1.1" className="bloom-bell__knob" />
                <path
                  d="M12 5.1c-3.6 0-5.9 2.5-5.9 6.1 0 3.3-1.15 5-2.05 6-.32.36-.02.9.45.9h15c.47 0 .77-.54.45-.9-.9-1-2.05-2.7-2.05-6 0-3.6-2.3-6.1-5.9-6.1Z"
                  className="bloom-bell__shell"
                  fill={hasUnread ? `url(#${goldId})` : undefined}
                />
              </g>
              <g className="bloom-bell__clapper">
                <path d="M12 18.1v.9" className="bloom-bell__stem" />
                <circle cx="12" cy="20.4" r="1.4" className="bloom-bell__ball" />
              </g>
            </svg>
          </span>
        </button>
        {hasUnread ? (
          <span key={unread} aria-hidden="true" className="bloom-bell__badge">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </span>
      <NotificationCenter open={open} onClose={() => setOpen(false)} />
    </>
  );
}
