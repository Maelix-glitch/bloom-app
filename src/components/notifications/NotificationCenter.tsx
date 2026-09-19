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

import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlarmClock, Bell, BellRing, Sparkles, Trash2 } from "lucide-react";

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

/** The bell itself — a quiet dot when something is unread. */
export function NotificationBell({ className }: { className?: string | undefined }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const sync = () => setUnread(unreadCount());
    sync();
    window.addEventListener(CENTER_CHANGED, sync);
    return () => window.removeEventListener(CENTER_CHANGED, sync);
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label="Notifications"
        title="Notifications"
        onClick={() => setOpen(true)}
        className={cn(
          "relative grid size-9 place-items-center rounded-full border border-border bg-surface-2/50 text-muted-foreground transition-colors hover:text-foreground",
          className,
        )}
      >
        {unread > 0 ? <BellRing className="size-4" /> : <Bell className="size-4" />}
        {unread > 0 ? (
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#E8B75E]" />
        ) : null}
      </button>
      <NotificationCenter open={open} onClose={() => setOpen(false)} />
    </>
  );
}
