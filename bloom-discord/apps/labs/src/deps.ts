import type { PlatformConfig } from '@bloom/config';
import type { LabsRepositories } from '@bloom/database';
import type { GuildQueryService, MessagingService } from '@bloom/discord';
import type { Logger } from '@bloom/logging';
import type { IntakeService } from './features/intake/service.js';

/**
 * Everything Labs' commands and handlers are given.
 *
 * Absent, and absent on purpose: no role service, no moderation service, no
 * scheduler. Labs' capability manifest is `role:read`, `message:send`,
 * `beta:manage` and `audit:write`, so the bootstrap never constructs the
 * privileged services for this process — wiring one in here would not compile.
 *
 * That includes ◌ Beta Tester. Labs decides who is *in a cohort*; it does not
 * decide who holds the role, because only Guardian assigns roles and cohort
 * membership is a database fact rather than a Discord permission.
 */
export interface LabsDeps {
  readonly bot: 'labs';
  readonly config: PlatformConfig;
  readonly logger: Logger;
  /**
   * Narrowed to Labs' capabilities: the labs repository, plus the universal
   * audit, jobs, settings and telemetry. Identity, rewards, awards, moderation,
   * cases, onboarding and retention are absent — Labs runs the beta programme
   * and nothing else.
   */
  readonly repositories: LabsRepositories;

  readonly guilds: GuildQueryService;
  readonly messaging: MessagingService;

  /** Feedback and bug intake, and the triage lifecycle. */
  readonly intake: IntakeService;
}
