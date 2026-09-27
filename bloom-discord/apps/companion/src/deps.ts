import type { PlatformConfig } from '@bloom/config';
import type { Repositories } from '@bloom/database';
import type {
  GuildQueryService,
  JobAdminDeps,
  JobSettingsService,
  MessagingService,
} from '@bloom/discord';
import type { Scheduler } from '@bloom/events';
import type { Logger } from '@bloom/logging';
import type { AwardsService } from './features/awards/service.js';
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
  readonly repositories: Repositories;

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
}
