/**
 * CheckIns — the questions the record is asking right now.
 *
 * One card per question, at most two on screen, each with its own answers.
 * Nothing here blocks anything: every question has a "Not now", and every
 * one disappears by itself once the record no longer needs it.
 */

import {
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  CalendarSearch,
  CalendarX2,
  Droplets,
  HeartPulse,
  MessageCircleQuestion,
  type LucideIcon,
} from "lucide-react";

import type { CheckIn, CheckInKind } from "@/lib/cycle/reconcile";

const ICON: Record<CheckInKind, LucideIcon> = {
  "future-start": CalendarX2,
  "start-day": CalendarSearch,
  "ended-early": CalendarCheck,
  continued: Droplets,
  "same-period": Droplets,
  "new-period": CalendarPlus,
  "still-open": CalendarCheck,
  "long-bleed": HeartPulse,
  late: CalendarClock,
  "missed-log": CalendarSearch,
};

export function CheckIns({
  checkIns,
  onAnswer,
  limit = 2,
  disabled = false,
}: {
  checkIns: CheckIn[];
  onAnswer: (checkIn: CheckIn, actionId: string) => void;
  limit?: number;
  disabled?: boolean;
}) {
  if (checkIns.length === 0) return null;
  const shown = checkIns.slice(0, limit);
  const rest = checkIns.length - shown.length;

  return (
    <section aria-label="Check-ins about your record" data-testid="cycle-checkins">
      <div className="mb-3 flex items-center gap-2">
        <MessageCircleQuestion size={14} aria-hidden style={{ color: "var(--ci-follicular)" }} />
        <p className="ci-eyebrow">
          {checkIns.length === 1 ? "One quick check-in" : "Quick check-ins"}
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {shown.map((c) => {
          const Icon = ICON[c.kind] ?? MessageCircleQuestion;
          return (
            <article
              key={c.id}
              className="ci-checkin"
              data-tone={c.tone}
              data-kind={c.kind}
              data-testid={`cycle-checkin-${c.kind}`}
            >
              <Icon size={18} className="ci-checkin__icon" aria-hidden />
              <div className="min-w-0">
                <h3 className="ci-checkin__title">{c.title}</h3>
                <p className="ci-checkin__body">{c.body}</p>
                <div className="ci-checkin__actions">
                  {c.actions.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      disabled={disabled}
                      className={`ci-btn ci-btn--sm${a.primary ? " ci-btn--primary" : ""}`}
                      data-testid={`cycle-checkin-action-${a.id}`}
                      onClick={() => onAnswer(c, a.id)}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {rest > 0 ? (
        <p className="ci-checkin__more">
          {rest === 1 ? "One more question" : `${rest} more questions`} once these are answered.
        </p>
      ) : null}
    </section>
  );
}
