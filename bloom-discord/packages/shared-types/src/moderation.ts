/**
 * Moderation and report vocabulary.
 *
 * Types only — the behaviour lands in Phase 2. They live here in Phase 0 so
 * that `audit_events` and the authorization layer can reference a single
 * canonical spelling of every action from the start.
 */
export const MODERATION_ACTIONS = [
  'warn',
  'clear_warnings',
  'timeout',
  'untimeout',
  'kick',
  'ban',
  'unban',
  'purge',
  'slowmode',
  'lock',
  'unlock',
  'note',
] as const;

export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

/** Actions that remove or restrict a member. Held to the strictest authorization. */
export const DESTRUCTIVE_ACTIONS: readonly ModerationAction[] = ['kick', 'ban', 'purge'];

export const CASE_STATUSES = [
  'OPEN',
  'IN_REVIEW',
  'ESCALATED',
  'RESOLVED',
  'CLOSED',
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];

/**
 * A case may move on, be escalated, or be reopened from RESOLVED — but CLOSED
 * is terminal. Evidence is never deleted; closing a case archives it.
 */
export const CASE_TRANSITIONS: Readonly<Record<CaseStatus, readonly CaseStatus[]>> = {
  OPEN: ['IN_REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED'],
  IN_REVIEW: ['ESCALATED', 'RESOLVED', 'CLOSED'],
  ESCALATED: ['IN_REVIEW', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'IN_REVIEW'],
  CLOSED: [],
};

export function canTransitionCase(from: CaseStatus, to: CaseStatus): boolean {
  return CASE_TRANSITIONS[from].includes(to);
}

export const REPORT_CATEGORIES = [
  'member_conduct',
  'user_safety',
  'moderation_review',
  'technical',
  'support_escalation',
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export function isModerationAction(value: unknown): value is ModerationAction {
  return (
    typeof value === 'string' && (MODERATION_ACTIONS as readonly string[]).includes(value)
  );
}

export function isCaseStatus(value: unknown): value is CaseStatus {
  return (
    typeof value === 'string' && (CASE_STATUSES as readonly string[]).includes(value)
  );
}
