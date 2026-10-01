import type { PlatformConfig } from '@bloom/config';
import type { GuardianRepositories } from '@bloom/database';
import type {
  ChannelModerationService,
  JobAdminDeps,
  GuildQueryService,
  InviteQueryService,
  MessagingService,
  ModerationService,
  JobSettingsService,
  RoleService,
} from '@bloom/discord';
import type { Scheduler } from '@bloom/events';
import type { Logger } from '@bloom/logging';
import type { RateLimiter } from '@bloom/security';
import type { OnboardingService } from './features/onboarding/service.js';
import type { ModerationActionService } from './features/moderation/service.js';
import type { CaseService } from './features/moderation/case-service.js';
import type { ReferralService } from './features/referrals/service.js';

/**
 * Everything Guardian's commands and handlers are given.
 *
 * One explicit container rather than a service locator or module-level
 * singletons. The brief rules out global mutable state, and this is the
 * alternative: dependencies arrive as an argument, so a test constructs the
 * whole bot's world as a literal and nothing reaches around the injection to
 * find a real database.
 *
 * It stays small on purpose. When it stops being small, that is the signal to
 * split Guardian's features rather than to grow this type.
 */
export interface GuardianDeps extends JobAdminDeps {
  readonly config: PlatformConfig;
  readonly logger: Logger;
  /**
   * Narrowed to Guardian's capabilities: identity, onboarding, moderation,
   * cases, retention, cooldowns, idempotency, plus the universal audit, jobs,
   * settings and telemetry. Rewards, awards and labs are absent — Guardian
   * enforces the rules, it does not run the economy or the beta programme.
   */
  readonly repositories: GuardianRepositories;

  readonly guilds: GuildQueryService;
  /**
   * Reads invite use counts, which is the only way Discord reveals who
   * invited a member. Requires Manage Server; degrades to unattributed joins
   * without it rather than failing.
   */
  readonly invites: InviteQueryService;
  readonly roles: RoleService;
  readonly messaging: MessagingService;
  readonly discordModeration: ModerationService;
  readonly channelModeration: ChannelModerationService;

  /**
   * The process's one scheduler, so `/guardian jobs` can report what is
   * actually registered rather than a hard-coded list that drifts.
   */
  readonly scheduler: Scheduler;
  /** Reads and writes the per-guild off switch for each job. */
  readonly jobSettings: JobSettingsService;

  readonly onboarding: OnboardingService;
  readonly moderation: ModerationActionService;
  readonly cases: CaseService;
  /**
   * Attributes joins to inviters and decides whether a referral qualifies.
   * Guardian never pays one — it writes a durable trigger that Companion
   * consumes, because only Companion may touch the points ledger.
   */
  readonly referrals: ReferralService;

  /** Durable, cross-process limit on verification attempts. */
  readonly verifyLimiter: RateLimiter;
  /** Budget for destructive staff commands. Guards a compromised staff account. */
  readonly moderationLimiter: RateLimiter;
  /** Budget for `/report`, which any member can reach. */
  readonly reportLimiter: RateLimiter;
}
