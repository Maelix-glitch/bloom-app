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
import {
  AlarmClock,
  BellRing,
  Check,
  ChevronRight,
  Droplet,
  MoonStar,
  Sparkles,
  Sprout,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";

import candle from "@/assets/mood/candle.jpg";
import { BloomSheet, SheetBody, SheetItem } from "@/components/ui/bloom-sheet";
import { useCycleSystem } from "@/hooks/useCycleSystem";
import { useReminders } from "@/hooks/useReminders";
import { longDate } from "@/lib/home/today";
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
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));
}

/** "18:30" → "6:30 PM" for the due rows. */
function fmtTime(hhmm: string): string {
  const [h = Number.NaN, m = Number.NaN] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "";
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

/** Today / Yesterday / Monday / March 4 — history groups by local day. */
function dayLabel(iso: string, now = new Date()): string {
  const days = Math.round(
    (startOfDay(now).getTime() - startOfDay(new Date(iso)).getTime()) / 86_400_000,
  );
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date(iso));
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(new Date(iso));
}

/** Consecutive same-day buckets — the record arrives newest-first. */
function groupNotices(notices: Notice[]): { label: string; items: Notice[] }[] {
  const groups: { label: string; items: Notice[] }[] = [];
  for (const n of notices) {
    const label = dayLabel(n.at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  }
  return groups;
}

type Tint = "gold" | "violet" | "sage" | "rose" | "amber" | "sky";

const KIND_META: Record<Notice["kind"], { label: string; icon: LucideIcon; tint: Tint }> = {
  habit: { label: "Habit", icon: Sprout, tint: "sage" },
  period: { label: "Cycle", icon: Droplet, tint: "rose" },
  fertile: { label: "Cycle", icon: Droplet, tint: "amber" },
  evening: { label: "Evening", icon: MoonStar, tint: "sky" },
  insight: { label: "Insight", icon: Sparkles, tint: "violet" },
  system: { label: "Bloom", icon: BellRing, tint: "gold" },
};

function SectionHead({
  id,
  icon: Icon,
  tint,
  title,
  count,
  action,
}: {
  id: string;
  icon: LucideIcon;
  tint: Tint;
  title: string;
  count?: number | undefined;
  action?: React.ReactNode;
}) {
  return (
    <div className="ncenter-head">
      <span className="ncenter-head-orb" data-tint={tint} aria-hidden="true">
        <Icon />
      </span>
      <h3 id={id} className="ncenter-head-title">
        {title}
        {count !== undefined && count > 0 ? (
          <span className="ncenter-count" aria-label={`${count} items`}>
            {count}
          </span>
        ) : null}
      </h3>
      {action}
    </div>
  );
}

function Empty({
  icon: Icon,
  tint,
  title,
  sub,
}: {
  icon: LucideIcon;
  tint: Tint;
  title: string;
  sub: string;
}) {
  return (
    <div className="ncenter-empty">
      <span className="ncenter-empty-orb" data-tint={tint} aria-hidden="true">
        <Icon />
      </span>
      <p className="ncenter-empty-title">{title}</p>
      <p className="ncenter-empty-sub">{sub}</p>
    </div>
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

  /*
   * Seeing them counts as reading them — but only once the sheet closes.
   * Clearing on open would erase the unread dots before the eye lands, and
   * arrivals that land mid-read stay visibly new until they're actually seen.
   * Every exit (links, the X, the backdrop, Escape) funnels through here.
   */
  const close = () => {
    markAllRead();
    onClose();
  };

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
  const waiting = notices.filter((n) => !n.read).length;
  const groups = useMemo(() => groupNotices(notices.slice(0, 30)), [notices]);

  return (
    <BloomSheet open={open} onClose={close} title="Notifications" size="md">
      <div className="bsheet-scroll">
        <SheetBody className="ncenter">
          {/* ---------------------------------------------------------- hero */}
          <SheetItem className="ncenter-hero">
            <div className="ncenter-art" aria-hidden="true">
              <img src={candle} alt="" width={1376} height={768} />
            </div>
            <div className="ncenter-topbar">
              <span
                className="bloom-icon-btn bloom-bell ncenter-orb"
                data-unread={waiting > 0}
                aria-hidden="true"
              >
                <BellGlyph unread={waiting > 0} />
              </span>
              <button
                type="button"
                onClick={close}
                aria-label="Close notifications"
                className="bsheet-icon"
              >
                <X className="size-[18px]" strokeWidth={1.75} />
              </button>
            </div>
            <p className="bsheet-eyebrow ncenter-eyebrow">{longDate(new Date())}</p>
            <h2 className="bsheet-h1 ncenter-title">Notifications</h2>
            <p className="ncenter-sub" data-waiting={waiting > 0}>
              {waiting === 0
                ? "All caught up."
                : waiting === 1
                  ? "1 waiting for you."
                  : `${waiting} waiting for you.`}
            </p>
          </SheetItem>

          {/* ------------------------------------------------------ due now */}
          <SheetItem>
            <section aria-labelledby="nc-due" className="ncenter-section">
              <SectionHead
                id="nc-due"
                icon={AlarmClock}
                tint="gold"
                title="Due now"
                count={due.length}
              />
              {due.length === 0 ? (
                <Empty
                  icon={Check}
                  tint="sage"
                  title="Nothing due"
                  sub="Reminders appear here — and nudge you — at their time."
                />
              ) : (
                <ul className="ncenter-group">
                  {due.map((r) => {
                    const meta = KIND_META[r.kind];
                    const RowIcon = meta.icon;
                    return (
                      <li key={r.key}>
                        <Link to={r.url} onClick={close} className="ncenter-row">
                          <span
                            className="ncenter-row-orb"
                            data-tint={meta.tint}
                            aria-hidden="true"
                          >
                            <RowIcon />
                          </span>
                          <span className="ncenter-row-text">
                            <span className="ncenter-row-title">{r.title}</span>
                            <span className="ncenter-row-body">{r.body}</span>
                          </span>
                          <span className="ncenter-row-aside">
                            {fmtTime(r.at) ? (
                              <span className="ncenter-time">{fmtTime(r.at)}</span>
                            ) : null}
                            <ChevronRight className="ncenter-go" aria-hidden="true" />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </SheetItem>

          {/* ------------------------------------------------------ insights */}
          <SheetItem>
            <section aria-labelledby="nc-insights" className="ncenter-section">
              <SectionHead
                id="nc-insights"
                icon={Sparkles}
                tint="violet"
                title="Insights"
                count={insights.length}
              />
              {insights.length === 0 ? (
                <Empty
                  icon={Sparkles}
                  tint="violet"
                  title="No insights yet"
                  sub="They appear once there's a little cycle history to read."
                />
              ) : (
                <ul className="ncenter-group">
                  {insights.map((i) => (
                    <li key={i.id}>
                      <Link to="/cycle" onClick={close} className="ncenter-row">
                        <span className="ncenter-row-orb" data-tint="violet" aria-hidden="true">
                          <Sparkles />
                        </span>
                        <span className="ncenter-row-text">
                          <span className="ncenter-row-title">{i.text}</span>
                          {i.why ? <span className="ncenter-row-why">{i.why}</span> : null}
                        </span>
                        <span className="ncenter-row-aside">
                          <ChevronRight className="ncenter-go" aria-hidden="true" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </SheetItem>

          {/* ------------------------------------------------------- history */}
          <SheetItem>
            <section aria-labelledby="nc-history" className="ncenter-section">
              <SectionHead
                id="nc-history"
                icon={BellRing}
                tint="sky"
                title="History"
                count={notices.length}
                action={
                  notices.length > 0 ? (
                    <button
                      type="button"
                      onClick={clearNotices}
                      className="bsheet-ghost ncenter-clear"
                    >
                      <Trash2 className="size-3.5" /> Clear
                    </button>
                  ) : undefined
                }
              />
              {notices.length === 0 ? (
                <Empty
                  icon={BellRing}
                  tint="sky"
                  title="Quiet so far"
                  sub="Every notification Bloom delivers keeps a copy here, so a missed nudge is never a lost one."
                />
              ) : (
                <div className="ncenter-days">
                  {groups.map((g) => (
                    <div key={g.label}>
                      <p className="ncenter-day">{g.label}</p>
                      <ul className="ncenter-group">
                        {g.items.map((n) => {
                          const meta = KIND_META[n.kind];
                          const RowIcon = meta.icon;
                          return (
                            <li key={n.id}>
                              <Link
                                to={n.url}
                                onClick={close}
                                className="ncenter-row"
                                data-unread={!n.read}
                              >
                                <span
                                  className="ncenter-row-orb"
                                  data-tint={meta.tint}
                                  aria-hidden="true"
                                >
                                  <RowIcon />
                                </span>
                                <span className="ncenter-row-text">
                                  <span className="ncenter-row-title">{n.title}</span>
                                  <span className="ncenter-row-body">{n.body}</span>
                                </span>
                                <span className="ncenter-row-aside">
                                  <time className="ncenter-time" dateTime={n.at}>
                                    {timeAgo(n.at)}
                                  </time>
                                  <ChevronRight className="ncenter-go" aria-hidden="true" />
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </SheetItem>

          {/* -------------------------------------------------------- footer */}
          <SheetItem>
            <p className="ncenter-foot">
              Delivered on this device · a missed nudge waits here, never lost.
            </p>
          </SheetItem>
        </SheetBody>
      </div>
    </BloomSheet>
  );
}

/**
 * The custom-drawn bell glyph — one drawing shared by the header bell and the
 * sheet hero, so the mark never drifts. The dome's gold gradient is
 * per-instance (several bells share a page) and its idle/gold dress comes
 * from src/styles/bell.css via the surrounding `.bloom-bell[data-unread]`.
 */
export function BellGlyph({ unread }: { unread: boolean }) {
  const goldId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg viewBox="0 0 24 24" className="bloom-bell__glyph" aria-hidden="true" focusable="false">
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
          fill={unread ? `url(#${goldId})` : undefined}
        />
      </g>
      <g className="bloom-bell__clapper">
        <path d="M12 18.1v.9" className="bloom-bell__stem" />
        <circle cx="12" cy="20.4" r="1.4" className="bloom-bell__ball" />
      </g>
    </svg>
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
            <BellGlyph unread={hasUnread} />
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
