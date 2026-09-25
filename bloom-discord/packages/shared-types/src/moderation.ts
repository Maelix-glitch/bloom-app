/**
 * Moderation and report vocabulary.
 *
 * Declared in Phase 0 so `audit_events` and the authorization layer could
 * reference a single canonical spelling of every action from the start;
 * implemented in Phase 2. Every value here has a matching Postgres enum in
 * migration 0005, and `moderation.integration.test.ts` asserts the two agree —
 * a value added on one side only is a runtime failure otherwise.
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

export function isReportCategory(value: unknown): value is ReportCategory {
  return (
    typeof value === 'string' && (REPORT_CATEGORIES as readonly string[]).includes(value)
  );
}

/** How a case came into being. */
export const CASE_ORIGINS = ['report', 'moderator', 'automation'] as const;
export type CaseOrigin = (typeof CASE_ORIGINS)[number];

/** Entries in a case's append-only history. */
export const CASE_EVENT_TYPES = [
  'opened',
  'status_changed',
  'assigned',
  'unassigned',
  'note',
  'action_recorded',
] as const;
export type CaseEventType = (typeof CASE_EVENT_TYPES)[number];

/**
 * Statuses a case can no longer be worked from.
 *
 * `CLOSED` is terminal by the transition table. `RESOLVED` is not — a resolved
 * case can be reopened into `IN_REVIEW` when new information arrives, which is
 * a real thing that happens and a worse experience if staff have to open a
 * second case and cross-reference it by hand.
 */
export const TERMINAL_CASE_STATUSES: readonly CaseStatus[] = ['CLOSED'];

export function isCaseTerminal(status: CaseStatus): boolean {
  return TERMINAL_CASE_STATUSES.includes(status);
}

/** Statuses that require a recorded outcome before the case may enter them. */
export function requiresResolution(status: CaseStatus): boolean {
  return status === 'RESOLVED';
}

/**
 * Actions that reverse an earlier one.
 *
 * Kept as a map rather than a naming convention (`un` + action) because
 * `clear_warnings` reverses `warn` and does not follow it, and a convention
 * with one exception is a convention that will be got wrong.
 */
export const REVERSING_ACTIONS: Readonly<
  Partial<Record<ModerationAction, ModerationAction>>
> = {
  untimeout: 'timeout',
  unban: 'ban',
  unlock: 'lock',
  clear_warnings: 'warn',
};

/**
 * Actions that need the target to currently be in the guild.
 *
 * `ban` is absent on purpose: Discord supports banning a user id that never
 * joined, which is how a raid is pre-empted. `unban` likewise operates on
 * someone who is by definition not present.
 */
export const REQUIRES_PRESENT_MEMBER: readonly ModerationAction[] = [
  'warn',
  'timeout',
  'untimeout',
  'kick',
  'note',
];

/** Actions that operate on a channel rather than a member. */
export const CHANNEL_ACTIONS: readonly ModerationAction[] = [
  'purge',
  'slowmode',
  'lock',
  'unlock',
];

export function isChannelAction(action: ModerationAction): boolean {
  return CHANNEL_ACTIONS.includes(action);
}

/**
 * Human labels. One spelling, used by embeds, audit output and case history
 * alike — three call sites inventing their own capitalisation is how "Timed
 * out", "timeout" and "TIMEOUT" end up in the same staff channel.
 */
export const MODERATION_ACTION_LABELS: Readonly<Record<ModerationAction, string>> = {
  warn: 'Warning',
  clear_warnings: 'Warnings cleared',
  timeout: 'Timeout',
  untimeout: 'Timeout lifted',
  kick: 'Kick',
  ban: 'Ban',
  unban: 'Unban',
  purge: 'Purge',
  slowmode: 'Slowmode',
  lock: 'Channel locked',
  unlock: 'Channel unlocked',
  note: 'Moderator note',
};

export const CASE_STATUS_LABELS: Readonly<Record<CaseStatus, string>> = {
  OPEN: 'Open',
  IN_REVIEW: 'In review',
  ESCALATED: 'Escalated',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const REPORT_CATEGORY_LABELS: Readonly<Record<ReportCategory, string>> = {
  member_conduct: 'Member conduct',
  user_safety: 'User safety',
  moderation_review: 'Moderation review',
  technical: 'Technical problem',
  support_escalation: 'Support escalation',
};

/**
 * Categories that should skip the queue.
 *
 * `user_safety` covers self-harm, threats and harassment. A case that may
 * involve someone's safety does not sit in a list behind a bug report, so it is
 * opened `ESCALATED` rather than `OPEN`.
 */
export const URGENT_REPORT_CATEGORIES: readonly ReportCategory[] = ['user_safety'];

export function initialStatusForReport(category: ReportCategory): CaseStatus {
  return URGENT_REPORT_CATEGORIES.includes(category) ? 'ESCALATED' : 'OPEN';
}
