import {
  REFERRAL_QUALIFICATION,
  type CorrelationId,
  type GuildId,
  type UserId,
} from '@bloom/shared-types';
import type {
  GuardianRepositories,
  ReferralRejection,
  ReferralTrigger,
} from '@bloom/database';
import type { GuildQueryService, InviteQueryService } from '@bloom/discord';
import type { Logger } from '@bloom/logging';
import { attributeJoin, toUsageCache, type InviteUsageCache } from './attribution.js';

/**
 * Guardian's half of the referral feature.
 *
 * Two jobs, and neither of them is paying anyone:
 *
 *   1. At join time, work out who invited the new member and write that down
 *      durably, including when the answer is "we do not know".
 *   2. Later, decide whether that referral has earned a reward, and move the
 *      row to `qualified` so Companion can pay it.
 *
 * Guardian has no access to `point_events` and no way to grant a point. It
 * produces a request; Companion decides what that request is worth. That
 * separation is the whole reason the handoff table exists, and it is why this
 * service imports nothing from the rewards domain except the thresholds.
 */

export interface ReferralServiceOptions {
  /*
   * The two repositories this needs, named individually rather than taking
   * the whole Guardian set. A service that asks for `referrals` and `audit`
   * cannot accidentally grow a dependency on `moderation`, and the test
   * doubles stay small.
   */
  readonly repositories: Pick<GuardianRepositories, 'referrals' | 'audit'>;
  readonly guilds: GuildQueryService;
  readonly invites: InviteQueryService;
  readonly logger: Logger;
  readonly now: () => Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** How many pending referrals one qualification pass will consider. */
const QUALIFICATION_BATCH = 50;

export interface JoinAttributionRequest {
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly isBot: boolean;
  readonly accountCreatedAt: Date;
  readonly correlationId?: CorrelationId | null;
}

export type QualificationOutcome =
  | { readonly kind: 'qualified'; readonly trigger: ReferralTrigger }
  | { readonly kind: 'rejected'; readonly reason: ReferralRejection }
  | { readonly kind: 'waiting' };

export class ReferralService {
  /**
   * The last reading of each guild's invite use counts.
   *
   * In memory on purpose, and the one piece of state here that does not
   * survive a restart. That is not a bug to be fixed with a table: the cache
   * is only ever used to compute a difference, a stale baseline produces
   * *wrong* attributions rather than missing ones, and a wrong attribution
   * pays the wrong member. After a restart the first join in each guild is
   * recorded as `unavailable` and the cache refills. Losing one attribution
   * is the correct price for never inventing one.
   */
  private readonly usageCache = new Map<GuildId, InviteUsageCache>();
  private readonly vanityCache = new Map<GuildId, number | null>();

  public constructor(private readonly options: ReferralServiceOptions) {}

  /**
   * Prime the cache, at startup and after reconnects.
   *
   * Without this the first join after every deploy is unattributable. With
   * it, only a join that lands inside the startup window is.
   */
  public async primeInviteCache(guildId: GuildId): Promise<boolean> {
    const snapshot = await this.options.invites.readUsage(guildId);
    if (!snapshot) {
      this.options.logger.warn(
        'referrals.invite_cache_unavailable',
        'Could not read guild invites, so joins will be recorded as unattributed. Guardian needs the Manage Server permission for referral attribution.',
      );
      return false;
    }

    this.usageCache.set(guildId, toUsageCache(snapshot));
    this.vanityCache.set(guildId, snapshot.vanityUses);
    return true;
  }

  /**
   * A member joined: decide who invited them and record it.
   *
   * Never throws into the join path. Onboarding is the important thing
   * happening at this moment, and a member must not be left unverified
   * because invite bookkeeping failed.
   */
  public async recordJoin(request: JoinAttributionRequest): Promise<void> {
    if (request.isBot) return;

    try {
      const previous = this.usageCache.get(request.guildId) ?? null;
      const previousVanity = this.vanityCache.get(request.guildId) ?? null;
      const current = await this.options.invites.readUsage(request.guildId);

      // Refresh the baseline before anything else can fail, so one bad join
      // does not poison attribution for the next one.
      if (current) {
        this.usageCache.set(request.guildId, toUsageCache(current));
        this.vanityCache.set(request.guildId, current.vanityUses);
      }

      const attribution = attributeJoin({
        previous,
        current,
        previousVanityUses: previousVanity,
      });

      /*
       * Self-referral is refused here rather than recorded and rejected
       * later. The row has a CHECK that forbids it, so writing one would
       * throw; and an inviter who is the joiner means the diff is wrong, not
       * that someone cheated — nobody can use their own invite to join a
       * guild they are already in.
       */
      const inviterId =
        attribution.inviterId === request.userId ? null : attribution.inviterId;

      const outcome = await this.options.repositories.referrals.record({
        guildId: request.guildId,
        referredUserId: request.userId,
        inviterUserId: inviterId,
        inviteCode: attribution.inviteCode,
        source: inviterId ? attribution.source : nonAttributingSource(attribution.source),
        // Identity of the event, not of the attempt: a rejoin produces the
        // same key and collides with the row from the first join.
        idempotencyKey: `referral:${request.guildId}:${request.userId}`,
        correlationId: request.correlationId ?? null,
      });

      /*
       * A bot's invite brought them.
       *
       * Recorded and then rejected rather than silently dropped: staff
       * looking at a run of unpaid joins should be able to see that an
       * integration is creating the invites, which is a real thing to know
       * about a server. Applications do not earn referral points.
       */
      if (outcome.kind === 'recorded' && attribution.inviterIsBot) {
        await this.options.repositories.referrals.markRejected(
          outcome.trigger.id,
          'inviter_is_bot',
        );
        return;
      }

      if (outcome.kind === 'already_referred') {
        this.options.logger.info(
          'referrals.rejoin_ignored',
          'This member already has a referral record in this guild; the rejoin did not create a second one.',
          { context: { user_id: request.userId, state: outcome.trigger.state } },
        );
        return;
      }

      this.options.logger.info(
        'referrals.recorded',
        inviterId
          ? 'Attributed a join to an inviter.'
          : `Recorded an unattributed join (${attribution.source}).`,
        { context: { user_id: request.userId, source: attribution.source } },
      );
    } catch (error) {
      // Swallowed deliberately, and loudly. See the doc comment.
      this.options.logger.error(
        'referrals.record_failed',
        'Could not record referral attribution for a join. Onboarding was unaffected.',
        { error, context: { user_id: request.userId } },
      );
    }
  }

  /**
   * A member left.
   *
   * Their referral is rejected if it has not been paid. Leaving after payment
   * changes nothing — the points were earned by a real arrival, and clawing
   * them back later would make every balance provisional.
   */
  public async recordLeave(guildId: GuildId, userId: UserId): Promise<void> {
    const pending = await this.options.repositories.referrals.listRecent(guildId, {
      limit: 25,
    });
    const theirs = pending.find(
      (row) =>
        row.referredUserId === userId &&
        (row.state === 'pending' || row.state === 'qualified'),
    );
    if (!theirs) return;

    await this.options.repositories.referrals.markRejected(
      theirs.id,
      'left_before_qualifying',
    );
  }

  /**
   * The qualification pass.
   *
   * Runs on a schedule rather than on a timer per member, because a timer
   * does not survive a restart and a schedule does. Every pending referral
   * old enough to be considered is checked against the rules, and each one
   * either qualifies, is rejected for a named reason, or waits.
   */
  public async runQualificationPass(
    guildId: GuildId,
  ): Promise<{ qualified: number; rejected: number; waiting: number }> {
    const now = this.options.now();
    const cutoff = new Date(
      now.getTime() - REFERRAL_QUALIFICATION.minMembershipDays * DAY_MS,
    );

    const pending = await this.options.repositories.referrals.listPending(
      guildId,
      cutoff,
      QUALIFICATION_BATCH,
    );

    let qualified = 0;
    let rejected = 0;
    let waiting = 0;

    for (const trigger of pending) {
      const outcome = await this.qualify(trigger, now);

      if (outcome.kind === 'qualified') qualified += 1;
      else if (outcome.kind === 'rejected') rejected += 1;
      else waiting += 1;
    }

    return { qualified, rejected, waiting };
  }

  /**
   * One referral, against the rules.
   *
   * Ordered cheapest-first: the two checks that need no network call run
   * before the one that does, so a batch of obviously-ineligible rows costs
   * no API quota.
   */
  public async qualify(
    trigger: ReferralTrigger,
    now: Date,
  ): Promise<QualificationOutcome> {
    if (trigger.state !== 'pending') return { kind: 'waiting' };

    const reject = async (reason: ReferralRejection): Promise<QualificationOutcome> => {
      await this.options.repositories.referrals.markRejected(trigger.id, reason);
      await this.audit(trigger, 'referral.rejected', { reason });
      return { kind: 'rejected', reason };
    };

    if (!trigger.inviterUserId) return await reject('no_inviter');
    if (trigger.inviterUserId === trigger.referredUserId)
      return await reject('self_referral');

    // Membership duration. `created_at` is when Guardian saw them join, which
    // is the conservative reading: a member Discord says joined earlier but
    // whom we only learned about today has not been observed for a week.
    const heldFor = now.getTime() - trigger.createdAt.getTime();
    if (heldFor < REFERRAL_QUALIFICATION.minMembershipDays * DAY_MS) {
      return { kind: 'waiting' };
    }

    /*
     * Account age, measured at qualification rather than at join.
     *
     * Deliberate: an account that was two weeks old when it joined is five
     * weeks old by the time the membership rule is satisfied, and refusing it
     * for a condition it no longer fails would be punishing someone for when
     * they happened to arrive. The rule exists to stop freshly-minted bulk
     * accounts, and a month of real elapsed time is exactly what it asks for.
     */
    const member = await this.options.guilds.getMember(
      trigger.guildId,
      trigger.referredUserId,
    );

    // Still present? Checked against Discord, not against our own records,
    // because a leave event can be missed and a stale `members` row would
    // happily pay for someone who is long gone.
    if (!member) return await reject('not_present');

    const accountAgeMs = now.getTime() - accountCreatedAt(trigger.referredUserId);
    if (accountAgeMs < REFERRAL_QUALIFICATION.minAccountAgeDays * DAY_MS) {
      return await reject('account_too_new');
    }

    /*
     * The inviter is deliberately not checked for presence.
     *
     * They did the thing that earned the reward, and the member they brought
     * is still here. Points land in their balance and wait for them; if they
     * never come back, nothing has been lost that was not already theirs.
     * Cancelling on their departure would also create a perverse incentive —
     * a referral that pays only while you stay is a retention mechanic
     * wearing a referral's clothes.
     *
     * Whether they are a *bot* was settled at join time, where Discord still
     * reported it; by now there may be nothing left to ask.
     */
    const ok = await this.options.repositories.referrals.markQualified(trigger.id, now);
    if (!ok) {
      // Someone else moved it between the read and the write. Not an error:
      // the other pass did the work.
      return { kind: 'waiting' };
    }

    await this.audit(trigger, 'referral.qualified', {
      inviter_id: trigger.inviterUserId,
      source: trigger.source,
    });

    return { kind: 'qualified', trigger };
  }

  private async audit(
    trigger: ReferralTrigger,
    event: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    await this.options.repositories.audit.append({
      guildId: trigger.guildId,
      botName: 'guardian',
      event,
      targetId: trigger.referredUserId,
      // Info, not warn: this is the platform applying a published rule to
      // itself, with no discretion exercised and no staff member involved.
      severity: 'info',
      source: 'referrals',
      correlationId: trigger.correlationId,
      details: { referral_id: trigger.id, ...details },
    });
  }
}

/**
 * The source recorded when no inviter was identified.
 *
 * `invite_diff` means "an invite advanced and we know whose". If the inviter
 * ended up null, the row must not claim otherwise.
 */
function nonAttributingSource(
  source: 'invite_diff' | 'vanity' | 'ambiguous' | 'unavailable',
): 'vanity' | 'ambiguous' | 'unavailable' {
  return source === 'invite_diff' ? 'ambiguous' : source;
}

/** Discord's epoch, for reading an account's age out of its id. */
const DISCORD_EPOCH_MS = 1_420_070_400_000;

function accountCreatedAt(userId: UserId): number {
  return Number((BigInt(userId) >> 22n) + BigInt(DISCORD_EPOCH_MS));
}
