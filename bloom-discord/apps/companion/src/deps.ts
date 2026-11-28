import type { PlatformConfig } from '@bloom/config';
import type { CompanionRepositories } from '@bloom/database';
import type {
  GuildQueryService,
  JobAdminDeps,
  JobSettingsService,
  MessagingService,
} from '@bloom/discord';
import type { Scheduler } from '@bloom/events';
import type { Logger } from '@bloom/logging';
import type { AwardsService } from './features/awards/service.js';
import type { CommunityService } from './features/community/service.js';
import type { HighlightsService } from './features/highlights/service.js';
import type { ReferralConsumer } from './features/rewards/referral-consumer.js';
import type { RewardsService } from './features/rewards/service.js';

/**
 * Everything Companion's commands and jobs are given.
 *
 * Notice what is absent: no role service, no moderation service, no channel
 * moderation. That is not an oversight and it is not enforced by convention —
 * Companion's capability manifest excludes `role:write`, `moderation:execute`
 * and `message:manage`, so the bootstrap never builds those services for this
 * process. Adding one here would fail to compile, which is the point.
 *
 * Companion reads onboarding state that Guardian writes and never modifies it.
 */
export interface CompanionDeps extends JobAdminDeps {
  readonly config: PlatformConfig;
  readonly logger: Logger;
  /**
   * Narrowed to Companion's capabilities: rewards, awards, cooldowns,
   * idempotency, plus the universal audit, jobs, settings and telemetry. The
   * onboarding repository is deliberately absent — Companion reads onboarding
   * state through Guardian's published surface and can no longer write it even
   * by accident. Moderation, cases, identity and retention are absent too.
   */
  readonly repositories: CompanionRepositories;

  readonly guilds: GuildQueryService;
  readonly messaging: MessagingService;

  /** The process's one scheduler, so `/companion jobs` reports what is real. */
  readonly scheduler: Scheduler;
  /** Reads and writes the per-guild off switch for each job. */
  readonly jobSettings: JobSettingsService;

  /** Check-ins, small wins, points, ranks — the whole rewards economy. */
  readonly rewards: RewardsService;

  /** Milestones and achievements, derived from the same records. */
  readonly awards: AwardsService;

  /**
   * Claims qualified referrals from the shared trigger table and pays them.
   *
   * The only consumer of Guardian's handoff, and the reason Companion needs
   * no access to identity or onboarding: everything it must know about the
   * referral is already on the row.
   */
  readonly referralConsumer: ReferralConsumer;

  /**
   * Challenges and events, on one participation model.
   *
   * One service for both, because the only thing that differs between them
   * is how completion is decided. It never writes to the ledger itself —
   * every reward goes through `rewards` above.
   */
  readonly community: CommunityService;

  /**
   * The read side: boards, the two member views, the recap and the staff
   * overview.
   *
   * Separate from `community` because it is the half with no write path. It
   * holds no reference to `rewards` or `awards` and cannot reach the ledger,
   * so no amount of future feature pressure can turn a view into something
   * that pays.
   */
  readonly highlights: HighlightsService;
}
