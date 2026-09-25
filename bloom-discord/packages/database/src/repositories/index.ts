import type { Database } from '../client.js';
import { PostgresAuditEventRepository, type AuditEventRepository } from './audit.js';
import { PostgresAwardsRepository, type AwardsRepository } from './awards.js';
import { PostgresCooldownRepository, type CooldownRepository } from './cooldowns.js';
import { PostgresIdentityRepository, type IdentityRepository } from './identity.js';
import {
  PostgresIdempotencyRepository,
  type IdempotencyRepository,
} from './idempotency.js';
import { PostgresJobRunRepository, type JobRunRepository } from './jobs.js';
import { PostgresLabsRepository, type LabsRepository } from './labs.js';
import { PostgresOnboardingRepository, type OnboardingRepository } from './onboarding.js';
import { PostgresRewardsRepository, type RewardsRepository } from './rewards.js';
import { PostgresModerationRepository, type ModerationRepository } from './moderation.js';
import { PostgresCaseRepository, type CaseRepository } from './cases.js';
import { PostgresSettingsRepository, type SettingsRepository } from './settings.js';
import { PostgresTelemetryRepository, type TelemetryRepository } from './telemetry.js';

export * from './audit.js';
export * from './awards.js';
export * from './cooldowns.js';
export * from './identity.js';
export * from './idempotency.js';
export * from './jobs.js';
export * from './labs.js';
export * from './onboarding.js';
export * from './rewards.js';
export * from './moderation.js';
export * from './cases.js';
export * from './settings.js';
export * from './telemetry.js';

/**
 * The repository set handed to services via dependency injection.
 *
 * Services depend on this interface, never on `Database`. That is what allows a
 * service test to pass fakes and run in milliseconds with no Postgres — and it
 * keeps every SQL statement in one layer that can be reviewed as a unit.
 */
export interface Repositories {
  readonly audit: AuditEventRepository;
  readonly cooldowns: CooldownRepository;
  readonly identity: IdentityRepository;
  readonly idempotency: IdempotencyRepository;
  readonly jobs: JobRunRepository;
  readonly labs: LabsRepository;
  readonly onboarding: OnboardingRepository;
  readonly rewards: RewardsRepository;
  readonly awards: AwardsRepository;
  readonly moderation: ModerationRepository;
  readonly cases: CaseRepository;
  readonly settings: SettingsRepository;
  readonly telemetry: TelemetryRepository;
}

export function createRepositories(database: Database): Repositories {
  return {
    audit: new PostgresAuditEventRepository(database),
    cooldowns: new PostgresCooldownRepository(database),
    identity: new PostgresIdentityRepository(database),
    idempotency: new PostgresIdempotencyRepository(database),
    jobs: new PostgresJobRunRepository(database),
    labs: new PostgresLabsRepository(database),
    onboarding: new PostgresOnboardingRepository(database),
    rewards: new PostgresRewardsRepository(database),
    awards: new PostgresAwardsRepository(database),
    moderation: new PostgresModerationRepository(database),
    cases: new PostgresCaseRepository(database),
    settings: new PostgresSettingsRepository(database),
    telemetry: new PostgresTelemetryRepository(database),
  };
}
