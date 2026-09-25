import {
  bloomError,
  canTransition,
  ONBOARDING_TRANSITIONS,
  type BotName,
  type ChannelId,
  type ChannelKey,
  type GuildId,
  type IdempotencyKey,
  type JsonValue,
  type OnboardingState,
  type RoleId,
  type RoleKey,
  type UserId,
} from '@bloom/shared-types';
import type {
  AuditEventInput,
  AuditEventRepository,
  AuditEventRow,
  CooldownRepository,
  CooldownResult,
  GuildRecord,
  IdempotencyClaim,
  IdempotencyRepository,
  IdentityRepository,
  JobLease,
  JobRunRepository,
  JobRunSummary,
  MemberRecord,
  OnboardingRepository,
  OnboardingTransitionInput,
  OnboardingTransitionRow,
  Repositories,
  SettingsRepository,
  TelemetryRepository,
  TransitionOutcome,
  VerificationAttemptInput,
} from '@bloom/database';

/**
 * In-memory repositories.
 *
 * These exist so a service test runs in milliseconds with no Postgres, and so a
 * failing assertion points at the service rather than at a connection error.
 *
 * They model the behaviours that decide correctness rather than merely
 * returning what the caller wants:
 *
 *   • `transition` enforces the same transition table as production and reports
 *     the same four outcomes, including conflicts.
 *   • `claim` is genuinely single-shot, so an idempotency test can fail.
 *   • `tryAcquire` respects the cooldown window against the injected clock.
 *
 * A fake that always says yes lets a test pass while production refuses, which
 * is worse than having no test.
 */

export class FakeIdentityRepository implements IdentityRepository {
  public readonly guilds = new Map<GuildId, GuildRecord>();
  public readonly members = new Map<string, MemberRecord>();
  public readonly usernames = new Map<UserId, string>();
  public readonly observedRoles = new Map<string, readonly RoleId[]>();

  private key(guildId: GuildId, userId: UserId): string {
    return `${guildId}:${userId}`;
  }

  public upsertGuild(input: {
    guildId: GuildId;
    name: string;
    timezone?: string;
  }): Promise<void> {
    this.guilds.set(input.guildId, {
      guildId: input.guildId,
      name: input.name,
      timezone: input.timezone ?? 'UTC',
      automationEnabled: true,
    });
    return Promise.resolve();
  }

  public findGuild(guildId: GuildId): Promise<GuildRecord | null> {
    return Promise.resolve(this.guilds.get(guildId) ?? null);
  }

  public upsertUser(input: { userId: UserId; username: string }): Promise<void> {
    this.usernames.set(input.userId, input.username);
    return Promise.resolve();
  }

  public ensureMember(input: {
    guildId: GuildId;
    userId: UserId;
    username: string;
    joinedAt?: Date | null;
  }): Promise<MemberRecord> {
    this.usernames.set(input.userId, input.username);
    const key = this.key(input.guildId, input.userId);
    const existing = this.members.get(key);

    if (existing) {
      // A rejoin clears `leftAt` but preserves the lifecycle state, exactly as
      // the real ON CONFLICT clause does.
      const updated: MemberRecord = {
        ...existing,
        leftAt: null,
        joinedAt: existing.joinedAt ?? input.joinedAt ?? null,
      };
      this.members.set(key, updated);
      return Promise.resolve(updated);
    }

    const created: MemberRecord = {
      guildId: input.guildId,
      userId: input.userId,
      onboardingState: 'unverified',
      joinedAt: input.joinedAt ?? null,
      leftAt: null,
      verifiedAt: null,
      onboardingCompletedAt: null,
    };
    this.members.set(key, created);
    return Promise.resolve(created);
  }

  public findMember(guildId: GuildId, userId: UserId): Promise<MemberRecord | null> {
    return Promise.resolve(this.members.get(this.key(guildId, userId)) ?? null);
  }

  public markLeft(guildId: GuildId, userId: UserId, at: Date): Promise<void> {
    const key = this.key(guildId, userId);
    const existing = this.members.get(key);
    if (existing) this.members.set(key, { ...existing, leftAt: at });
    return Promise.resolve();
  }

  public replaceObservedRoles(
    guildId: GuildId,
    userId: UserId,
    roleIds: readonly RoleId[],
  ): Promise<void> {
    this.observedRoles.set(this.key(guildId, userId), [...roleIds]);
    return Promise.resolve();
  }

  public findMembersWithRole(
    guildId: GuildId,
    roleId: RoleId,
  ): Promise<readonly UserId[]> {
    const found: UserId[] = [];
    for (const [key, roles] of this.observedRoles) {
      if (!key.startsWith(`${guildId}:`) || !roles.includes(roleId)) continue;
      const member = this.members.get(key);
      if (member?.leftAt === null) found.push(member.userId);
    }
    return Promise.resolve(found);
  }

  /** Test helper: force a member into a state without going through a transition. */
  public setState(guildId: GuildId, userId: UserId, state: OnboardingState): void {
    const key = this.key(guildId, userId);
    const existing = this.members.get(key);
    if (!existing) throw new Error(`No fake member ${userId}.`);
    this.members.set(key, {
      ...existing,
      onboardingState: state,
      verifiedAt:
        state === 'early_bloom' || state === 'bloom_member'
          ? (existing.verifiedAt ?? new Date('2026-01-01T00:00:00.000Z'))
          : existing.verifiedAt,
      onboardingCompletedAt:
        state === 'bloom_member'
          ? (existing.onboardingCompletedAt ?? new Date('2026-01-01T00:00:00.000Z'))
          : existing.onboardingCompletedAt,
    });
  }
}

export class FakeOnboardingRepository implements OnboardingRepository {
  public readonly transitions: OnboardingTransitionRow[] = [];
  public readonly attempts: VerificationAttemptInput[] = [];
  private nextId = 1;

  public constructor(
    private readonly identity: FakeIdentityRepository,
    private readonly now: () => Date = () => new Date('2026-01-01T12:00:00.000Z'),
  ) {}

  public async transition(input: OnboardingTransitionInput): Promise<TransitionOutcome> {
    if (!canTransition(input.expectedFrom, input.to)) {
      throw bloomError('INVALID_INPUT', {
        operatorHint: `"${input.expectedFrom}" cannot transition to "${input.to}". Legal targets: ${ONBOARDING_TRANSITIONS[input.expectedFrom].join(', ') || 'none'}.`,
        details: { from: input.expectedFrom, to: input.to },
      });
    }

    const member = await this.identity.findMember(input.guildId, input.userId);
    if (!member) return { kind: 'member_missing' };

    if (member.onboardingState === input.to) {
      return { kind: 'already_in_state', state: input.to };
    }

    if (member.onboardingState !== input.expectedFrom) {
      return {
        kind: 'conflict',
        actual: member.onboardingState,
        expected: input.expectedFrom,
      };
    }

    this.identity.setState(input.guildId, input.userId, input.to);
    this.transitions.push({
      id: String(this.nextId++),
      guildId: input.guildId,
      userId: input.userId,
      fromState: input.expectedFrom,
      toState: input.to,
      trigger: input.trigger,
      actorId: input.actorId ?? null,
      reason: input.reason ?? null,
      source: input.source ?? null,
      createdAt: this.now(),
    });

    return { kind: 'applied', from: input.expectedFrom, to: input.to };
  }

  public listTransitions(
    guildId: GuildId,
    userId: UserId,
    limit = 25,
  ): Promise<readonly OnboardingTransitionRow[]> {
    return Promise.resolve(
      this.transitions
        .filter((row) => row.guildId === guildId && row.userId === userId)
        .reverse()
        .slice(0, limit),
    );
  }

  public recordVerificationAttempt(input: VerificationAttemptInput): Promise<void> {
    this.attempts.push(input);
    return Promise.resolve();
  }

  public countRecentAttempts(guildId: GuildId, userId: UserId): Promise<number> {
    return Promise.resolve(
      this.attempts.filter((a) => a.guildId === guildId && a.userId === userId).length,
    );
  }

  public countByState(
    guildId: GuildId,
  ): Promise<Readonly<Record<OnboardingState, number>>> {
    const counts: Record<OnboardingState, number> = {
      unverified: 0,
      early_bloom: 0,
      bloom_member: 0,
      revoked: 0,
    };
    for (const member of this.identity.members.values()) {
      if (member.guildId !== guildId || member.leftAt !== null) continue;
      counts[member.onboardingState] += 1;
    }
    return Promise.resolve(counts);
  }
}

export class FakeAuditRepository implements AuditEventRepository {
  public readonly events: AuditEventInput[] = [];
  private nextId = 1;

  public append(input: AuditEventInput): Promise<string> {
    this.events.push(input);
    return Promise.resolve(String(this.nextId++));
  }

  public listForTarget(): Promise<readonly AuditEventRow[]> {
    return Promise.resolve([]);
  }

  public listRecent(): Promise<readonly AuditEventRow[]> {
    return Promise.resolve([]);
  }

  /** Assertion helper: did this exact event get recorded? */
  public has(event: string): boolean {
    return this.events.some((entry) => entry.event === event);
  }

  public find(event: string): AuditEventInput | undefined {
    return this.events.find((entry) => entry.event === event);
  }
}

export class FakeIdempotencyRepository implements IdempotencyRepository {
  public readonly claims = new Map<string, unknown>();

  public claim(key: IdempotencyKey): Promise<IdempotencyClaim> {
    if (this.claims.has(key)) {
      return Promise.resolve({
        claimed: false,
        existingResult: (this.claims.get(key) ??
          null) as IdempotencyClaim['existingResult'],
      });
    }
    this.claims.set(key, null);
    return Promise.resolve({ claimed: true, existingResult: null });
  }

  public recordResult(
    key: IdempotencyKey,
    result: Parameters<IdempotencyRepository['recordResult']>[1],
  ): Promise<void> {
    this.claims.set(key, result);
    return Promise.resolve();
  }

  public pruneExpired(): Promise<number> {
    return Promise.resolve(0);
  }
}

export class FakeCooldownRepository implements CooldownRepository {
  private readonly held = new Map<string, { expiresAtMs: number; hits: number }>();

  public constructor(private readonly now: () => number = () => Date.now()) {}

  public tryAcquire(
    guildId: GuildId,
    scope: string,
    subject: string,
    ttlSeconds: number,
  ): Promise<CooldownResult> {
    const key = `${guildId}:${scope}:${subject}`;
    const existing = this.held.get(key);
    const now = this.now();

    if (existing && existing.expiresAtMs > now) {
      // Counting refused attempts is the point of `hits` — it is the signal a
      // later anti-spam feature reads, so the fake has to maintain it.
      existing.hits += 1;
      return Promise.resolve({
        allowed: false,
        expiresAt: new Date(existing.expiresAtMs),
        hits: existing.hits,
      });
    }

    const expiresAtMs = now + ttlSeconds * 1000;
    this.held.set(key, { expiresAtMs, hits: 0 });
    return Promise.resolve({ allowed: true, expiresAt: new Date(expiresAtMs), hits: 0 });
  }

  public clear(guildId: GuildId, scope: string, subject: string): Promise<void> {
    this.held.delete(`${guildId}:${scope}:${subject}`);
    return Promise.resolve();
  }

  public pruneExpired(): Promise<number> {
    return Promise.resolve(0);
  }
}

export class FakeTelemetryRepository implements TelemetryRepository {
  public readonly commands: Parameters<TelemetryRepository['recordCommand']>[0][] = [];

  public recordCommand(
    input: Parameters<TelemetryRepository['recordCommand']>[0],
  ): Promise<void> {
    this.commands.push(input);
    return Promise.resolve();
  }

  public errorStats(): Promise<{
    total: number;
    errors: number;
    lastErrorAt: Date | null;
  }> {
    return Promise.resolve({ total: this.commands.length, errors: 0, lastErrorAt: null });
  }

  public writeHealth(): Promise<void> {
    return Promise.resolve();
  }

  public readHealth(): Promise<null> {
    return Promise.resolve(null);
  }

  public readAllHealth(): Promise<readonly never[]> {
    return Promise.resolve([]);
  }
}

class FakeJobRunRepository implements JobRunRepository {
  public acquire(): Promise<JobLease | null> {
    return Promise.resolve(null);
  }
  public renew(): Promise<boolean> {
    return Promise.resolve(true);
  }
  public complete(): Promise<void> {
    return Promise.resolve();
  }
  public reclaimExpired(): Promise<number> {
    return Promise.resolve(0);
  }
  public lastRun(): Promise<JobRunSummary | null> {
    return Promise.resolve(null);
  }
}

class FakeSettingsRepository implements SettingsRepository {
  public getChannelOverrides(): Promise<ReadonlyMap<ChannelKey, ChannelId>> {
    return Promise.resolve(new Map());
  }
  public setChannelOverride(): Promise<void> {
    return Promise.resolve();
  }
  public clearChannelOverride(): Promise<void> {
    return Promise.resolve();
  }
  public getRoleOverrides(): Promise<ReadonlyMap<RoleKey, RoleId>> {
    return Promise.resolve(new Map());
  }
  public setRoleOverride(): Promise<void> {
    return Promise.resolve();
  }
  public clearRoleOverride(): Promise<void> {
    return Promise.resolve();
  }
  public getBotSetting(): Promise<JsonValue | null> {
    return Promise.resolve(null);
  }
  public setBotSetting(): Promise<void> {
    return Promise.resolve();
  }
  public getAllBotSettings(): Promise<ReadonlyMap<string, JsonValue>> {
    return Promise.resolve(new Map());
  }
}

export interface FakeRepositories extends Repositories {
  readonly identity: FakeIdentityRepository;
  readonly onboarding: FakeOnboardingRepository;
  readonly audit: FakeAuditRepository;
  readonly idempotency: FakeIdempotencyRepository;
  readonly cooldowns: FakeCooldownRepository;
  readonly telemetry: FakeTelemetryRepository;
}

/**
 * A complete in-memory repository set.
 *
 * The identity and onboarding fakes share state, because the real ones share a
 * table — a test that verifies someone must see the change through either one.
 */
export function fakeRepositories(
  options: { readonly now?: () => Date } = {},
): FakeRepositories {
  const now = options.now ?? (() => new Date('2026-01-01T12:00:00.000Z'));
  const identity = new FakeIdentityRepository();

  return {
    identity,
    onboarding: new FakeOnboardingRepository(identity, now),
    audit: new FakeAuditRepository(),
    idempotency: new FakeIdempotencyRepository(),
    cooldowns: new FakeCooldownRepository(() => now().getTime()),
    telemetry: new FakeTelemetryRepository(),
    jobs: new FakeJobRunRepository(),
    settings: new FakeSettingsRepository(),
  };
}

export type { BotName };
