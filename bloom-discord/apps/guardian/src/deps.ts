import type { PlatformConfig } from '@bloom/config';
import type { Repositories } from '@bloom/database';
import type { GuildQueryService, MessagingService, RoleService } from '@bloom/discord';
import type { Logger } from '@bloom/logging';
import type { RateLimiter } from '@bloom/security';
import type { OnboardingService } from './features/onboarding/service.js';

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
export interface GuardianDeps {
  readonly config: PlatformConfig;
  readonly logger: Logger;
  readonly repositories: Repositories;

  readonly guilds: GuildQueryService;
  readonly roles: RoleService;
  readonly messaging: MessagingService;

  readonly onboarding: OnboardingService;

  /** Durable, cross-process limit on verification attempts. */
  readonly verifyLimiter: RateLimiter;
}
