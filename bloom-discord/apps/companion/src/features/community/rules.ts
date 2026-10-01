import type { ActivityKind } from '@bloom/database';
import type { PointKind, UserId } from '@bloom/shared-types';

/**
 * The numbers and strings the community system is not allowed to invent.
 *
 * Kept in one small module rather than inline in the service, because every
 * one of them is either an economic limit or an identity used for
 * exactly-once payment, and both are the kind of thing that should be read
 * in a single screen during review.
 */

/**
 * The most a single completion may pay.
 *
 * Mirrored by a CHECK on `community_activities.reward_points`, so a staff
 * member who found a way past the command options still cannot create a
 * thousand-point activity. Chosen to sit above a meaningful reward and well
 * below anything that would distort a ladder built on check-ins worth a few
 * points each — a cap is what stops one mistyped field becoming a week of
 * inflation.
 */
export const ACTIVITY_REWARD_LIMIT = 500;

/** The longest window staff may schedule, in days. */
export const ACTIVITY_MAX_DAYS = 180;

/**
 * Which ledger kind a completion is recorded under.
 *
 * Both kinds already existed in `POINT_KINDS`, reserved ahead of this
 * feature. Nothing new is added to the vocabulary here, which is the point of
 * having reserved them.
 */
export function activityPointKind(
  kind: ActivityKind,
): Extract<PointKind, 'challenge_completion' | 'event_completion'> {
  return kind === 'challenge' ? 'challenge_completion' : 'event_completion';
}

/**
 * The identity of a payment.
 *
 * Derived from the activity and the member, never from the interaction or the
 * attempt. That is what makes a retry after a crash safe: the second attempt
 * computes the same key, collides with the ledger's unique index, and is
 * reported as a duplicate instead of paying again.
 *
 * The activity id is a uuid, so the key is unique across guilds without
 * needing the guild in it — but the guild is included anyway, because a key
 * that can be read and understood in a ledger row is worth more than sixteen
 * saved characters.
 */
export function completionIdempotencyKey(
  kind: ActivityKind,
  activityId: string,
  userId: UserId,
): string {
  return `${kind}:${activityId}:${userId}`;
}
