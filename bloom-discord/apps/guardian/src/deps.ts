import type { PlatformConfig } from '@bloom/config';
import type { Repositories } from '@bloom/database';
import type {
  ChannelModerationService,
  JobAdminDeps,
  GuildQueryService,
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
  readonly repositories: Repositories;

  readonly guilds: GuildQueryService;
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

  /** Durable, cross-process limit on verification attempts. */
  readonly verifyLimiter: RateLimiter;
  /** Budget for destructive staff commands. Guards a compromised staff account. */
  readonly moderationLimiter: RateLimiter;
  /** Budget for `/report`, which any member can reach. */
  readonly reportLimiter: RateLimiter;
}
