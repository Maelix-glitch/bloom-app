import type { BotName } from '@bloom/shared-types';

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
import { PostgresRetentionRepository, type RetentionRepository } from './retention.js';
import { PostgresOnboardingRepository, type OnboardingRepository } from './onboarding.js';
import { PostgresReferralRepository, type ReferralRepository } from './referrals.js';
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
export * from './retention.js';
export * from './onboarding.js';
export * from './referrals.js';
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
  readonly retention: RetentionRepository;
  readonly onboarding: OnboardingRepository;
  readonly referrals: ReferralRepository;
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
    retention: new PostgresRetentionRepository(database),
    onboarding: new PostgresOnboardingRepository(database),
    referrals: new PostgresReferralRepository(database),
    rewards: new PostgresRewardsRepository(database),
    awards: new PostgresAwardsRepository(database),
    moderation: new PostgresModerationRepository(database),
    cases: new PostgresCaseRepository(database),
    settings: new PostgresSettingsRepository(database),
    telemetry: new PostgresTelemetryRepository(database),
  };
}

/**
 * Which repositories each bot is allowed to reach.
 *
 * This is the capability half of the boundary the platform already draws for
 * services in `packages/shared-types/src/capabilities.ts`: Guardian owns the
 * role lifecycle and the moderation record, Companion owns wellbeing and
 * rewards, Labs owns beta testing. Until now every bot received all fourteen
 * repositories, so nothing but code review stopped Labs from writing a
 * moderation row or Companion from mutating onboarding state.
 *
 * One entry is deliberately shared by exactly two bots. `referrals` is the
 * Guardian → Companion handoff: Guardian attributes a join to an inviter and
 * decides whether it qualifies, Companion is the only process that may turn a
 * qualified referral into points. Each needs the table; neither needs the
 * other's. It is the only cross-domain surface between them, which is the
 * point — one narrow, auditable table instead of Guardian reaching into the
 * ledger or Companion reaching into identity. Labs is not granted it.
 *
 * Four entries are deliberately shared by all three bots:
 *
 * - `jobs` and `audit`, because the shared job admin commands
 *   (`packages/discord/src/jobs/commands.ts`) read job runs and write an audit
 *   event for every operator action, in whichever bot they are mounted.
 * - `settings` and `telemetry`, because the bootstrap builds a
 *   `JobSettingsService` and a heartbeat for every bot.
 *
 * This constant is the single source of truth — the per-bot types below are
 * derived from it, so the manifest and the compiler can never disagree.
 *
 * Note what this is *not*: it is not an authorization check. Nothing is
 * filtered, wrapped, or deleted at runtime, and a bot that already holds a
 * database connection can still issue any SQL its role permits. The enforcement
 * is entirely at compile time, and the residual runtime risk is documented in
 * the audit report.
 */
export const BOT_REPOSITORY_CAPABILITIES = {
  guardian: [
    'audit',
    'cases',
    'cooldowns',
    'idempotency',
    'identity',
    'jobs',
    'moderation',
    'onboarding',
    'referrals',
    'retention',
    'settings',
    'telemetry',
  ],
  companion: [
    'audit',
    'awards',
    'cooldowns',
    'idempotency',
    'jobs',
    'referrals',
    'rewards',
    'settings',
    'telemetry',
  ],
  labs: ['audit', 'jobs', 'labs', 'settings', 'telemetry'],
} as const satisfies Readonly<Record<BotName, readonly (keyof Repositories)[]>>;

/** The repositories a given bot may reach, derived from the manifest above. */
export type RepositoriesFor<TBot extends BotName> = Pick<
  Repositories,
  (typeof BOT_REPOSITORY_CAPABILITIES)[TBot][number]
>;

/**
 * Verification, onboarding, moderation, cases, retention, and the write side
 * of the referral handoff. No rewards, no labs.
 */
export type GuardianRepositories = RepositoriesFor<'guardian'>;

/**
 * Wellbeing, rewards, awards, and the read/pay side of the referral handoff.
 * No onboarding writes, no moderation, no cases.
 */
export type CompanionRepositories = RepositoriesFor<'companion'>;

/** Beta testing only. No identity, no rewards, no moderation. */
export type LabsRepositories = RepositoriesFor<'labs'>;

/**
 * Construct the repository set for one bot.
 *
 * Every repository is still constructed exactly as `createRepositories` builds
 * them — repositories are stateless wrappers around the shared connection, so
 * this costs nothing and keeps a single construction path. The only difference
 * is the declared return type: the caller is handed a view narrowed to that
 * bot's capabilities, and reaching for anything outside it fails to compile.
 *
 * The bot argument is consumed by the type system rather than at runtime, which
 * is the point: no branching, no filtering, no behavioural difference from the
 * code it replaces. It is named `_bot` so that `noUnusedParameters` stays on for
 * the rest of the codebase.
 */
export function createRepositoriesFor<TBot extends BotName>(
  _bot: TBot,
  database: Database,
): RepositoriesFor<TBot> {
  return createRepositories(database);
}
