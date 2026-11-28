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
import { attributeJoin, toUsageCache } from './attribution.js';

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
   * is only ever used to compute a difference, and a baseline persisted
   * across a restart is a baseline from before an unknown amount of missed
   * activity. It would produce *wrong* attributions rather than missing ones,
   * and a wrong attribution pays the wrong member.
   *
   * Instead the baseline is rebuilt from Discord, which is authoritative,
   * whenever it might have gone stale: at startup, after a resume, and after
   * any failed read. Between those points `inviteCreate` and `inviteDelete`
   * keep it current. The window where a join is unattributable is therefore
   * the startup fetch itself, not the whole first-join-after-deploy.
   */
  private readonly usageCache = new Map<GuildId, Map<string, number>>();
  private readonly vanityCache = new Map<GuildId, number | null>();

  public constructor(private readonly options: ReferralServiceOptions) {}

  /**
   * Prime the cache, at startup and after a resume.
   *
   * Without this the first join after every deploy is unattributable, because
   * a diff needs something to diff against. With it, only a join that lands
   * inside the startup window is.
   *
   * On failure the cache is **cleared**, not left alone. That is the whole
   * safety property of this method: a baseline we could not refresh is a
   * baseline we cannot date, and diffing against an undated baseline is how
   * an invite tracker pays the wrong member. Dropping it costs attributions;
   * keeping it risks inventing them.
   */
  public async primeInviteCache(guildId: GuildId): Promise<boolean> {
    let snapshot;
    try {
      snapshot = await this.options.invites.readUsage(guildId);
    } catch (error) {
      this.invalidateInviteCache(guildId);

      /*
       * The error's *type*, never its message.
       *
       * This call goes to Discord with an Authorization header, and a failed
       * HTTP response can quote the request back. The redaction layer works
       * on field names, not on message text, so an error string is the one
       * route by which a token could reach a log line. The class name and the
       * fact of failure are what an operator needs; the prose is not.
       */
      this.options.logger.warn(
        'referrals.invite_cache_unavailable',
        'Reading guild invites failed, so joins will be recorded as unattributed until the next successful read.',
        {
          context: {
            failure: error instanceof Error ? error.constructor.name : 'unknown',
          },
        },
      );
      return false;
    }

    if (!snapshot) {
      this.invalidateInviteCache(guildId);
      this.options.logger.warn(
        'referrals.invite_cache_unavailable',
        'Could not read guild invites, so joins will be recorded as unattributed. Guardian needs the Manage Server permission for referral attribution.',
      );
      return false;
    }

    this.usageCache.set(guildId, toUsageCache(snapshot));
    this.vanityCache.set(guildId, snapshot.vanityUses);

    this.options.logger.info(
      'referrals.invite_cache_primed',
      `Invite baseline ready: ${String(snapshot.invites.length)} invite(s) tracked.`,
      { context: { invite_count: snapshot.invites.length } },
    );
    return true;
  }

  /**
   * Forget the baseline for a guild.
   *
   * Attribution then reports `unavailable` until the next successful read,
   * which is the fail-closed direction: no baseline produces no inviter, and
   * never a guessed one.
   */
  public invalidateInviteCache(guildId: GuildId): void {
    this.usageCache.delete(guildId);
    this.vanityCache.delete(guildId);
  }

  /** True when this guild has a usable baseline. Diagnostics and tests. */
  public hasInviteBaseline(guildId: GuildId): boolean {
    return (this.usageCache.get(guildId)?.size ?? 0) > 0;
  }

  /**
   * An invite was created: record its baseline.
   *
   * This is the one thing the gateway can tell us that a diff cannot. An
   * invite first seen at join time has no baseline, so `attributeJoin` counts
   * it as uncertainty and refuses the whole join — meaning anyone who creates
   * a fresh link and shares it loses the referral on its first use. Knowing
   * the invite started at zero turns that case into a clean attribution.
   *
   * Ignored when the guild has no baseline at all: adding a single known
   * invite to an empty cache would make the next join look like "exactly one
   * invite advanced, nothing else moved" when in truth we know nothing about
   * the other invites in the guild.
   */
  public rememberInvite(payload: {
    readonly guildId: GuildId;
    readonly code: string;
    readonly uses: number;
  }): void {
    const cache = this.usageCache.get(payload.guildId);
    if (!cache) return;

    cache.set(payload.code, payload.uses);
  }

  /**
   * An invite was deleted: drop it.
   *
   * Mostly hygiene — `attributeJoin` only ever reads codes present in the
   * fresh reading, so a stale entry is inert. It matters for the guild that
   * churns through single-use invites, where never deleting would grow the
   * map for the life of the process.
   */
  public forgetInvite(guildId: GuildId, code: string): void {
    this.usageCache.get(guildId)?.delete(code);
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
