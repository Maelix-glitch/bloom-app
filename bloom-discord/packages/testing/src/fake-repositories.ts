import {
  bloomError,
  canTransition,
  canTransitionCase,
  CASE_TRANSITIONS,
  ONBOARDING_TRANSITIONS,
  requiresResolution,
  type BotName,
  type CaseEventType,
  type CaseStatus,
  type ModerationAction,
  type ChannelId,
  type ChannelKey,
  type GuildId,
  type IdempotencyKey,
  type JsonValue,
  type OnboardingState,
  type PointKind,
  type RoleId,
  type RoleKey,
  type UserId,
} from '@bloom/shared-types';
import { localDateIn, localDaysBetween, type LocalDate } from '@bloom/utils';
import type {
  AuditEventInput,
  AwardInput,
  AwardOutcome,
  AwardKind,
  AwardsRepository,
  CheckInInput,
  CheckInOutcome,
  GrantAwardInput,
  GrantOutcome,
  MemberAward,
  ParticipationSummary,
  LeaderboardEntry,
  PointEvent,
  RewardsRepository,
  AuditEventRepository,
  AuditEventRow,
  CaseEventRow,
  CaseListFilter,
  CaseRepository,
  CaseRow,
  CaseTransitionOutcome,
  CooldownRepository,
  MemberRecordSummary,
  ModerationActionRow,
  ModerationRepository,
  OpenCaseInput,
  RecordActionInput,
  ReportInput,
  ReportRow,
  TransitionCaseInput,
  CooldownResult,
  GuildRecord,
  IdempotencyClaim,
  IdempotencyRepository,
  IdentityRepository,
  JobLease,
  JobRunRepository,
  JobRunSummary,
  JobStatus,
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
  private readonly rows: AuditEventRow[] = [];
  private nextId = 1;

  public append(input: AuditEventInput): Promise<string> {
    const id = String(this.nextId++);
    this.events.push(input);
    this.rows.push({
      id,
      guildId: input.guildId,
      botName: input.botName,
      event: input.event,
      severity: input.severity ?? 'info',
      actorId: input.actorId ?? null,
      targetId: input.targetId ?? null,
      channelId: input.channelId ?? null,
      source: input.source ?? null,
      correlationId: input.correlationId ?? null,
      details: input.details ?? {},
      createdAt: new Date(),
    });
    return Promise.resolve(id);
  }

  /*
   * These read back what was appended rather than returning an empty array.
   *
   * A stub returning `[]` makes every "this must never appear in the audit
   * trail" assertion vacuously true — the test passes, the guarantee is
   * untested, and the leak ships.
   */
  public listForTarget(
    guildId: GuildId,
    targetId: UserId,
    limit = 50,
  ): Promise<readonly AuditEventRow[]> {
    return Promise.resolve(
      this.rows
        .filter((row) => row.guildId === guildId && row.targetId === targetId)
        .reverse()
        .slice(0, limit),
    );
  }

  public listRecent(guildId: GuildId, limit = 50): Promise<readonly AuditEventRow[]> {
    return Promise.resolve(
      this.rows
        .filter((row) => row.guildId === guildId)
        .reverse()
        .slice(0, limit),
    );
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

interface StoredJobRun {
  runId: string;
  jobKey: string;
  guildId: GuildId | null;
  status: JobStatus;
  runnerId: string;
  attempt: number;
  startedAt: Date;
  finishedAt: Date | null;
  leaseExpiresAt: Date;
  errorCode: string | null;
  errorMessage: string | null;
}

/**
 * In-memory `job_runs`.
 *
 * A real implementation rather than a set of stubs returning `null`: a fake
 * whose `lastRun` always answers "nothing" makes every test of job history pass
 * without asserting anything. This one enforces the property the real table
 * enforces with a partial unique index — one live run per (jobKey, guildId) —
 * so tests of the lock are testing the same rule production is.
 */
export class FakeJobRunRepository implements JobRunRepository {
  public readonly runs: StoredJobRun[] = [];
  private nextId = 1;

  public constructor(private readonly now: () => Date = () => new Date()) {}

  public acquire(input: {
    readonly jobKey: string;
    readonly botName: BotName;
    readonly guildId?: GuildId | null;
    readonly runnerId: string;
    readonly leaseSeconds: number;
  }): Promise<JobLease | null> {
    const guildId = input.guildId ?? null;
    const at = this.now();

    // Mirrors the repository, which reclaims lapsed leases before trying.
    this.reclaim(at);

    const live = this.runs.find(
      (run) =>
        run.status === 'running' &&
        run.jobKey === input.jobKey &&
        run.guildId === guildId,
    );
    if (live) return Promise.resolve(null);

    const previous = this.runs.filter(
      (run) => run.jobKey === input.jobKey && run.guildId === guildId,
    ).length;

    const lease = Math.min(Math.max(input.leaseSeconds, 5), 3600);
    const run: StoredJobRun = {
      runId: `run-${String(this.nextId++)}`,
      jobKey: input.jobKey,
      guildId,
      status: 'running',
      runnerId: input.runnerId,
      attempt: previous + 1,
      startedAt: at,
      finishedAt: null,
      leaseExpiresAt: new Date(at.getTime() + lease * 1000),
      errorCode: null,
      errorMessage: null,
    };
    this.runs.push(run);

    return Promise.resolve({
      runId: run.runId,
      jobKey: run.jobKey,
      attempt: run.attempt,
      leaseExpiresAt: run.leaseExpiresAt,
    });
  }

  public renew(runId: string, leaseSeconds: number): Promise<boolean> {
    const run = this.runs.find((entry) => entry.runId === runId);
    if (run?.status !== 'running') return Promise.resolve(false);
    run.leaseExpiresAt = new Date(this.now().getTime() + leaseSeconds * 1000);
    return Promise.resolve(true);
  }

  public complete(
    runId: string,
    status: Exclude<JobStatus, 'running'>,
    outcome?: {
      readonly errorCode?: string | null;
      readonly errorMessage?: string | null;
    },
  ): Promise<void> {
    const run = this.runs.find((entry) => entry.runId === runId);
    if (run) {
      run.status = status;
      run.finishedAt = this.now();
      run.errorCode = outcome?.errorCode ?? null;
      run.errorMessage = outcome?.errorMessage ?? null;
    }
    return Promise.resolve();
  }

  public reclaimExpired(): Promise<number> {
    return Promise.resolve(this.reclaim(this.now()));
  }

  /**
   * A lapsed lease becomes `timed_out`, not `failed`.
   *
   * The distinction is the one the real schema draws and it carries real
   * information: `failed` means the job ran and raised, `timed_out` means
   * nobody ever heard back. They point at different problems.
   */
  private reclaim(at: Date): number {
    let reclaimed = 0;
    for (const run of this.runs) {
      if (run.status === 'running' && run.leaseExpiresAt <= at) {
        run.status = 'timed_out';
        run.finishedAt = at;
        run.errorCode = 'INTERNAL_ERROR';
        run.errorMessage = 'Lease expired before the run reported back.';
        reclaimed += 1;
      }
    }
    return reclaimed;
  }

  public lastRun(
    jobKey: string,
    guildId?: GuildId | null,
  ): Promise<JobRunSummary | null> {
    const wanted = guildId ?? null;
    const run = [...this.runs]
      .reverse()
      .find((entry) => entry.jobKey === jobKey && entry.guildId === wanted);
    if (!run) return Promise.resolve(null);

    return Promise.resolve({
      runId: run.runId,
      jobKey: run.jobKey,
      status: run.status,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      durationMs:
        run.finishedAt === null
          ? null
          : run.finishedAt.getTime() - run.startedAt.getTime(),
      errorCode: run.errorCode,
      errorMessage: run.errorMessage,
      runnerId: run.runnerId,
      attempt: run.attempt,
    });
  }
}

/**
 * In-memory runtime overrides.
 *
 * A real store rather than a set of no-ops. The previous version accepted every
 * write and returned `null` for every read, which meant any test of "disable
 * this, then confirm it is disabled" passed while asserting nothing — the same
 * vacuous-fake trap this codebase has hit before. Writes are now observable,
 * which is the entire point of a settings repository.
 */
export class FakeSettingsRepository implements SettingsRepository {
  public readonly channels = new Map<ChannelKey, ChannelId>();
  public readonly roles = new Map<RoleKey, RoleId>();
  /** Keyed `guildId:bot:key`, mirroring the real primary key. */
  public readonly botSettings = new Map<string, JsonValue>();
  /** Every write, so a test can assert who changed a setting. */
  public readonly writes: { key: string; value: JsonValue; updatedBy: UserId }[] = [];

  public getChannelOverrides(): Promise<ReadonlyMap<ChannelKey, ChannelId>> {
    return Promise.resolve(new Map(this.channels));
  }

  public setChannelOverride(
    _guildId: GuildId,
    key: ChannelKey,
    channelId: ChannelId,
  ): Promise<void> {
    this.channels.set(key, channelId);
    return Promise.resolve();
  }

  public clearChannelOverride(_guildId: GuildId, key: ChannelKey): Promise<void> {
    this.channels.delete(key);
    return Promise.resolve();
  }

  public getRoleOverrides(): Promise<ReadonlyMap<RoleKey, RoleId>> {
    return Promise.resolve(new Map(this.roles));
  }

  public setRoleOverride(_guildId: GuildId, key: RoleKey, roleId: RoleId): Promise<void> {
    this.roles.set(key, roleId);
    return Promise.resolve();
  }

  public clearRoleOverride(_guildId: GuildId, key: RoleKey): Promise<void> {
    this.roles.delete(key);
    return Promise.resolve();
  }

  public getBotSetting(
    guildId: GuildId,
    bot: BotName,
    key: string,
  ): Promise<JsonValue | null> {
    return Promise.resolve(this.botSettings.get(`${guildId}:${bot}:${key}`) ?? null);
  }

  public setBotSetting(
    guildId: GuildId,
    bot: BotName,
    key: string,
    value: JsonValue,
    updatedBy: UserId,
  ): Promise<void> {
    this.botSettings.set(`${guildId}:${bot}:${key}`, value);
    this.writes.push({ key, value, updatedBy });
    return Promise.resolve();
  }

  public getAllBotSettings(
    guildId: GuildId,
    bot: BotName,
  ): Promise<ReadonlyMap<string, JsonValue>> {
    const prefix = `${guildId}:${bot}:`;
    return Promise.resolve(
      new Map(
        [...this.botSettings.entries()]
          .filter(([storedKey]) => storedKey.startsWith(prefix))
          .map(([storedKey, value]) => [storedKey.slice(prefix.length), value]),
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// Moderation
// -----------------------------------------------------------------------------

/**
 * In-memory moderation log.
 *
 * Models the two behaviours that decide correctness: revocation is an update
 * rather than a delete, and `revokeActiveWarnings` only touches rows that are
 * still active. A fake that removed rows would let a test pass while production
 * kept the history — the opposite of the property the schema exists to provide.
 */
export class FakeModerationRepository implements ModerationRepository {
  public readonly actions: ModerationActionRow[] = [];
  private nextId = 1;

  public constructor(private readonly now: () => Date) {}

  public record(input: RecordActionInput): Promise<ModerationActionRow> {
    const row: ModerationActionRow = {
      id: String(this.nextId++),
      guildId: input.guildId,
      caseId: input.caseId ?? null,
      action: input.action,
      subjectId: input.subjectId ?? null,
      channelId: input.channelId ?? null,
      actorId: input.actorId,
      reason: input.reason,
      durationSeconds: input.durationSeconds ?? null,
      expiresAt: input.expiresAt ?? null,
      revokedAt: null,
      revokedBy: null,
      revokedReason: null,
      metadata: input.metadata ?? {},
      createdAt: this.now(),
    };
    this.actions.push(row);
    return Promise.resolve(row);
  }

  public listForSubject(
    guildId: GuildId,
    subjectId: UserId,
    options?: { readonly limit?: number; readonly actions?: readonly ModerationAction[] },
  ): Promise<readonly ModerationActionRow[]> {
    const filtered = this.actions
      .filter((row) => row.guildId === guildId && row.subjectId === subjectId)
      .filter((row) => !options?.actions || options.actions.includes(row.action))
      .reverse()
      .slice(0, options?.limit ?? 25);
    return Promise.resolve(filtered);
  }

  public listForChannel(
    guildId: GuildId,
    channelId: ChannelId,
    options?: { readonly limit?: number; readonly actions?: readonly ModerationAction[] },
  ): Promise<readonly ModerationActionRow[]> {
    const filtered = this.actions
      .filter((row) => row.guildId === guildId && row.channelId === channelId)
      .filter((row) => !options?.actions || options.actions.includes(row.action))
      .reverse()
      .slice(0, options?.limit ?? 25);
    return Promise.resolve(filtered);
  }

  public listForCase(caseId: string): Promise<readonly ModerationActionRow[]> {
    return Promise.resolve(this.actions.filter((row) => row.caseId === caseId));
  }

  public countActiveWarnings(guildId: GuildId, subjectId: UserId): Promise<number> {
    return Promise.resolve(
      this.actions.filter(
        (row) =>
          row.guildId === guildId &&
          row.subjectId === subjectId &&
          row.action === 'warn' &&
          row.revokedAt === null,
      ).length,
    );
  }

  public revokeActiveWarnings(input: {
    readonly guildId: GuildId;
    readonly subjectId: UserId;
    readonly revokedBy: UserId;
    readonly reason: string;
  }): Promise<number> {
    let cleared = 0;
    for (let i = 0; i < this.actions.length; i += 1) {
      const row = this.actions[i];
      if (
        row?.guildId === input.guildId &&
        row.subjectId === input.subjectId &&
        row.action === 'warn' &&
        row.revokedAt === null
      ) {
        this.actions[i] = {
          ...row,
          revokedAt: this.now(),
          revokedBy: input.revokedBy,
          revokedReason: input.reason,
        };
        cleared += 1;
      }
    }
    return Promise.resolve(cleared);
  }

  public revokeAction(input: {
    readonly id: string;
    readonly guildId: GuildId;
    readonly revokedBy: UserId;
    readonly reason: string;
  }): Promise<boolean> {
    const index = this.actions.findIndex(
      (row) =>
        row.id === input.id && row.guildId === input.guildId && row.revokedAt === null,
    );
    const row = this.actions[index];
    if (!row) return Promise.resolve(false);
    this.actions[index] = {
      ...row,
      revokedAt: this.now(),
      revokedBy: input.revokedBy,
      revokedReason: input.reason,
    };
    return Promise.resolve(true);
  }

  public summarise(guildId: GuildId, subjectId: UserId): Promise<MemberRecordSummary> {
    const mine = this.actions.filter(
      (row) => row.guildId === guildId && row.subjectId === subjectId,
    );
    const count = (action: ModerationAction): number =>
      mine.filter((row) => row.action === action).length;
    const times = mine.map((row) => row.createdAt.getTime());

    return Promise.resolve({
      activeWarnings: mine.filter((r) => r.action === 'warn' && r.revokedAt === null)
        .length,
      totalWarnings: count('warn'),
      timeouts: count('timeout'),
      kicks: count('kick'),
      bans: count('ban'),
      notes: count('note'),
      lastActionAt: times.length > 0 ? new Date(Math.max(...times)) : null,
    });
  }
}

// -----------------------------------------------------------------------------
// Cases
// -----------------------------------------------------------------------------

/**
 * In-memory case file.
 *
 * Enforces the real transition table, the terminal-CLOSED rule and the
 * "RESOLVED needs a resolution" constraint that Postgres enforces with a CHECK.
 * Case numbers increment per guild, so a test can assert on "#1" meaningfully.
 */
export class FakeCaseRepository implements CaseRepository {
  public readonly cases: CaseRow[] = [];
  public readonly events: CaseEventRow[] = [];
  public readonly reports: ReportRow[] = [];
  private nextId = 1;
  private nextEventId = 1;
  private readonly counters = new Map<GuildId, number>();

  public constructor(private readonly now: () => Date) {}

  public open(
    input: OpenCaseInput,
    report?: ReportInput,
  ): Promise<{ readonly case: CaseRow; readonly report: ReportRow | null }> {
    const status = input.status ?? 'OPEN';
    if (status === 'RESOLVED' || status === 'CLOSED') {
      throw bloomError('INVALID_INPUT', {
        operatorHint: `A case cannot be opened directly into "${status}".`,
      });
    }

    const caseNumber = (this.counters.get(input.guildId) ?? 0) + 1;
    this.counters.set(input.guildId, caseNumber);

    const row: CaseRow = {
      id: String(this.nextId++),
      guildId: input.guildId,
      caseNumber,
      status,
      origin: input.origin,
      category: input.category ?? null,
      subjectId: input.subjectId ?? null,
      openedBy: input.openedBy,
      assignedTo: null,
      summary: input.summary,
      resolution: null,
      openedAt: this.now(),
      updatedAt: this.now(),
      resolvedAt: null,
      closedAt: null,
    };
    this.cases.push(row);
    this.pushEvent(row.id, 'opened', input.openedBy, input.summary);

    let reportRow: ReportRow | null = null;
    if (report) {
      reportRow = {
        id: String(this.reports.length + 1),
        caseId: row.id,
        reporterId: report.reporterId,
        category: report.category,
        targetUserId: report.targetUserId ?? null,
        targetChannelId: report.targetChannelId ?? null,
        targetMessageId: report.targetMessageId ?? null,
        description: report.description,
        createdAt: this.now(),
      };
      this.reports.push(reportRow);
    }

    return Promise.resolve({ case: row, report: reportRow });
  }

  private pushEvent(
    caseId: string,
    eventType: CaseEventType,
    actorId: UserId | null,
    body: string | null,
    fromStatus: CaseStatus | null = null,
    toStatus: CaseStatus | null = null,
  ): void {
    this.events.push({
      id: String(this.nextEventId++),
      caseId,
      eventType,
      fromStatus,
      toStatus,
      actorId,
      body,
      createdAt: this.now(),
    });
  }

  public findByNumber(guildId: GuildId, caseNumber: number): Promise<CaseRow | null> {
    return Promise.resolve(
      this.cases.find((c) => c.guildId === guildId && c.caseNumber === caseNumber) ??
        null,
    );
  }

  public list(guildId: GuildId, filter?: CaseListFilter): Promise<readonly CaseRow[]> {
    const order: Readonly<Record<CaseStatus, number>> = {
      ESCALATED: 0,
      OPEN: 1,
      IN_REVIEW: 2,
      RESOLVED: 3,
      CLOSED: 4,
    };
    const rows = this.cases
      .filter((c) => c.guildId === guildId)
      .filter((c) => !filter?.status || c.status === filter.status)
      .filter((c) => !filter?.assignedTo || c.assignedTo === filter.assignedTo)
      .filter((c) => !filter?.subjectId || c.subjectId === filter.subjectId)
      .sort(
        (a, b) =>
          order[a.status] - order[b.status] ||
          a.openedAt.getTime() - b.openedAt.getTime(),
      )
      .slice(0, filter?.limit ?? 20);
    return Promise.resolve(rows);
  }

  public listEvents(caseId: string, limit = 50): Promise<readonly CaseEventRow[]> {
    return Promise.resolve(
      this.events.filter((e) => e.caseId === caseId).slice(0, limit),
    );
  }

  public findReport(caseId: string): Promise<ReportRow | null> {
    return Promise.resolve(this.reports.find((r) => r.caseId === caseId) ?? null);
  }

  public transitionStatus(input: TransitionCaseInput): Promise<CaseTransitionOutcome> {
    if (requiresResolution(input.to) && !input.resolution) {
      throw bloomError('INVALID_INPUT', {
        userMessage: 'Resolving a case needs a short note on what was decided.',
      });
    }

    const index = this.cases.findIndex(
      (c) => c.guildId === input.guildId && c.caseNumber === input.caseNumber,
    );
    const row = this.cases[index];
    if (!row) return Promise.resolve({ kind: 'not_found' });

    if (row.status === input.to) {
      return Promise.resolve({ kind: 'already_in_state', status: row.status });
    }
    if (CASE_TRANSITIONS[row.status].length === 0) {
      return Promise.resolve({ kind: 'terminal', status: row.status });
    }
    if (!canTransitionCase(row.status, input.to)) {
      return Promise.resolve({
        kind: 'conflict',
        actual: row.status,
        expected: input.to,
      });
    }

    const from = row.status;
    this.cases[index] = {
      ...row,
      status: input.to,
      resolution: input.resolution ?? row.resolution,
      resolvedAt:
        input.to === 'RESOLVED' ? (row.resolvedAt ?? this.now()) : row.resolvedAt,
      closedAt: input.to === 'CLOSED' ? (row.closedAt ?? this.now()) : row.closedAt,
      updatedAt: this.now(),
    };
    this.pushEvent(
      row.id,
      'status_changed',
      input.actorId,
      input.note ?? input.resolution ?? null,
      from,
      input.to,
    );

    return Promise.resolve({ kind: 'applied', from, to: input.to });
  }

  public assign(input: {
    readonly guildId: GuildId;
    readonly caseNumber: number;
    readonly assignee: UserId | null;
    readonly actorId: UserId;
  }): Promise<CaseRow | null> {
    const index = this.cases.findIndex(
      (c) => c.guildId === input.guildId && c.caseNumber === input.caseNumber,
    );
    const row = this.cases[index];
    if (!row) return Promise.resolve(null);

    const updated: CaseRow = {
      ...row,
      assignedTo: input.assignee,
      updatedAt: this.now(),
    };
    this.cases[index] = updated;
    this.pushEvent(
      row.id,
      input.assignee === null ? 'unassigned' : 'assigned',
      input.actorId,
      input.assignee,
    );
    return Promise.resolve(updated);
  }

  public appendEvent(input: {
    readonly caseId: string;
    readonly eventType: CaseEventType;
    readonly actorId?: UserId | null;
    readonly body?: string | null;
  }): Promise<void> {
    if (input.eventType === 'status_changed') {
      throw bloomError('INVALID_INPUT', {
        operatorHint: 'Status changes must go through transitionStatus().',
      });
    }
    this.pushEvent(
      input.caseId,
      input.eventType,
      input.actorId ?? null,
      input.body ?? null,
    );
    return Promise.resolve();
  }

  public countByStatus(guildId: GuildId): Promise<Readonly<Record<CaseStatus, number>>> {
    const counts: Record<CaseStatus, number> = {
      OPEN: 0,
      IN_REVIEW: 0,
      ESCALATED: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };
    for (const row of this.cases) {
      if (row.guildId === guildId) counts[row.status] += 1;
    }
    return Promise.resolve(counts);
  }
}

/**
 * The Bloom Rewards ledger, in memory.
 *
 * Every constraint migration 0006 enforces is enforced here too: the
 * idempotency key is unique per guild, a check-in is unique per member per
 * local day, an automatic award may not name an actor, a manual one must, a
 * zero-point entry is rejected, and a correction cannot overdraw.
 *
 * That duplication is the point. A fake that accepts what the table would
 * reject makes its tests agree with each other and disagree with production —
 * this project has already shipped two fakes that did exactly that.
 */
export class FakeRewardsRepository implements RewardsRepository {
  public readonly events: FakePointEvent[] = [];
  /** Keyed `guildId:userId:localDate`, mirroring the real primary key. */
  public readonly checkIns = new Map<string, { event: PointEvent | null; at: Date }>();

  private sequence = 0;

  public constructor(private readonly now: () => Date = () => new Date()) {}

  public award(input: AwardInput): Promise<AwardOutcome> {
    if (input.points === 0) {
      throw new Error('point_events.points CHECK: a ledger entry cannot be zero.');
    }

    const manual = input.kind === 'manual_award' || input.kind === 'adjustment';
    const hasActor = (input.awardedBy ?? null) !== null;
    if (manual !== hasActor) {
      throw new Error(
        'point_events_actor_matches_kind: manual entries require awarded_by, ' +
          'automatic entries forbid it.',
      );
    }
    if (manual && (input.reason ?? '').trim() === '') {
      throw new Error(
        'point_events_manual_needs_reason: manual entries require a reason.',
      );
    }

    const existing = this.events.find(
      (event) =>
        event.guildId === input.guildId && event.idempotencyKey === input.idempotencyKey,
    );
    if (existing) {
      return Promise.resolve({
        kind: 'duplicate',
        event: existing,
        balance: this.sumFor(input.guildId, input.userId),
      });
    }

    const balance = this.sumFor(input.guildId, input.userId);
    if (input.points < 0 && balance + input.points < 0) {
      return Promise.resolve({ kind: 'insufficient', balance });
    }

    this.sequence += 1;
    const event: FakePointEvent = {
      id: `evt-${String(this.sequence)}`,
      guildId: input.guildId,
      userId: input.userId,
      kind: input.kind,
      points: input.points,
      reason: input.reason ?? null,
      awardedBy: input.awardedBy ?? null,
      createdAt: this.now(),
      idempotencyKey: input.idempotencyKey,
    };
    this.events.push(event);

    return Promise.resolve({
      kind: 'recorded',
      event,
      balance: balance + input.points,
    });
  }

  public balance(guildId: GuildId, userId: UserId): Promise<number> {
    return Promise.resolve(this.sumFor(guildId, userId));
  }

  public async recordCheckIn(input: CheckInInput): Promise<CheckInOutcome> {
    const key = `${input.guildId}:${input.userId}:${input.localDate}`;
    if (this.checkIns.has(key)) {
      return { kind: 'already_today', localDate: input.localDate };
    }

    const points = input.points ?? 0;
    if (points === 0) {
      this.checkIns.set(key, { event: null, at: this.now() });
      return {
        kind: 'recorded',
        localDate: input.localDate,
        event: null,
        balance: this.sumFor(input.guildId, input.userId),
      };
    }

    const outcome = await this.award({
      guildId: input.guildId,
      userId: input.userId,
      kind: 'check_in',
      points,
      idempotencyKey: `check_in:${input.guildId}:${input.userId}:${input.localDate}`,
      ...(input.correlationId ? { correlationId: input.correlationId } : {}),
    });

    if (outcome.kind === 'insufficient') {
      throw new Error('A check-in award must be positive.');
    }

    this.checkIns.set(key, { event: outcome.event, at: this.now() });
    return {
      kind: 'recorded',
      localDate: input.localDate,
      event: outcome.event,
      balance: outcome.balance,
    };
  }

  public checkInDates(
    guildId: GuildId,
    userId: UserId,
    since: LocalDate,
  ): Promise<readonly LocalDate[]> {
    const prefix = `${guildId}:${userId}:`;
    const dates = [...this.checkIns.keys()]
      .filter((key) => key.startsWith(prefix))
      .map((key) => key.slice(prefix.length) as LocalDate)
      .filter((date) => date >= since)
      .sort()
      .reverse();
    return Promise.resolve(dates);
  }

  public countKindSince(
    guildId: GuildId,
    userId: UserId,
    kind: PointKind,
    since: Date,
  ): Promise<number> {
    const count = this.events.filter(
      (event) =>
        event.guildId === guildId &&
        event.userId === userId &&
        event.kind === kind &&
        event.createdAt.getTime() >= since.getTime(),
    ).length;
    return Promise.resolve(count);
  }

  public leaderboard(
    guildId: GuildId,
    options: { readonly since?: Date; readonly limit?: number } = {},
  ): Promise<readonly LeaderboardEntry[]> {
    const limit = Math.min(Math.max(options.limit ?? 10, 1), 25);
    const totals = new Map<UserId, { points: number; events: number; first: number }>();

    for (const event of this.events) {
      if (event.guildId !== guildId) continue;
      if (options.since && event.createdAt.getTime() < options.since.getTime()) continue;
      const current = totals.get(event.userId) ?? {
        points: 0,
        events: 0,
        first: event.createdAt.getTime(),
      };
      totals.set(event.userId, {
        points: current.points + event.points,
        events: current.events + 1,
        first: Math.min(current.first, event.createdAt.getTime()),
      });
    }

    const entries = [...totals.entries()]
      .filter(([, value]) => value.points > 0)
      .sort((a, b) => b[1].points - a[1].points || a[1].first - b[1].first)
      .slice(0, limit)
      .map(([userId, value]) => ({
        userId,
        points: value.points,
        events: value.events,
      }));

    return Promise.resolve(entries);
  }

  public recentEvents(
    guildId: GuildId,
    userId: UserId,
    limit = 10,
  ): Promise<readonly PointEvent[]> {
    const rows = this.events
      .filter((event) => event.guildId === guildId && event.userId === userId)
      .slice()
      .reverse()
      .slice(0, Math.min(Math.max(limit, 1), 50));
    return Promise.resolve(rows);
  }

  public participation(
    guildId: GuildId,
    userId: UserId,
    timeZone: string,
  ): Promise<ParticipationSummary> {
    const prefix = `${guildId}:${userId}:`;
    const dates = [...this.checkIns.keys()]
      .filter((key) => key.startsWith(prefix))
      .map((key) => key.slice(prefix.length))
      .sort();

    const winDays = new Set(
      this.events
        .filter(
          (event) =>
            event.guildId === guildId &&
            event.userId === userId &&
            event.kind === 'small_win',
        )
        // Same conversion the SQL does: a win's instant becomes the calendar
        // day it happened on in the community's zone.
        .map((event) => localDateIn(event.createdAt, timeZone) as string),
    );

    let longestGapDays = 0;
    for (let index = 1; index < dates.length; index += 1) {
      const previous = dates[index - 1];
      const current = dates[index];
      if (!previous || !current) continue;
      longestGapDays = Math.max(
        longestGapDays,
        localDaysBetween(previous as LocalDate, current as LocalDate),
      );
    }

    return Promise.resolve({
      checkIns: dates.length,
      wins: this.events.filter(
        (event) =>
          event.guildId === guildId &&
          event.userId === userId &&
          event.kind === 'small_win',
      ).length,
      months: new Set(dates.map((date) => date.slice(0, 7))).size,
      daysWithBoth: dates.filter((date) => winDays.has(date)).length,
      longestGapDays,
    });
  }

  private sumFor(guildId: GuildId, userId: UserId): number {
    return this.events
      .filter((event) => event.guildId === guildId && event.userId === userId)
      .reduce((total, event) => total + event.points, 0);
  }
}

interface FakePointEvent extends PointEvent {
  readonly idempotencyKey: string;
}

/**
 * Milestones and achievements, in memory.
 *
 * Enforces the one invariant that matters: an award is granted once. A fake
 * that happily granted twice would make the announcement tests pass while
 * production posted "you reached 50 check-ins" every morning.
 */
export class FakeAwardsRepository implements AwardsRepository {
  /** Keyed `guildId:userId:awardKey`, mirroring the real primary key. */
  public readonly awards = new Map<string, MemberAward>();

  public constructor(private readonly now: () => Date = () => new Date()) {}

  public grant(input: GrantAwardInput): Promise<GrantOutcome> {
    const key = `${input.guildId}:${input.userId}:${input.awardKey}`;
    const existing = this.awards.get(key);
    if (existing) return Promise.resolve({ kind: 'already_held', award: existing });

    const award: MemberAward = {
      guildId: input.guildId,
      userId: input.userId,
      awardKey: input.awardKey,
      kind: input.kind,
      evidence: input.evidence ?? {},
      earnedAt: this.now(),
      announced: false,
    };
    this.awards.set(key, award);
    return Promise.resolve({ kind: 'granted', award });
  }

  public list(guildId: GuildId, userId: UserId): Promise<readonly MemberAward[]> {
    return Promise.resolve(
      [...this.awards.values()]
        .filter((award) => award.guildId === guildId && award.userId === userId)
        .sort((a, b) => b.earnedAt.getTime() - a.earnedAt.getTime()),
    );
  }

  public heldKeys(guildId: GuildId, userId: UserId): Promise<ReadonlySet<string>> {
    return Promise.resolve(
      new Set(
        [...this.awards.values()]
          .filter((award) => award.guildId === guildId && award.userId === userId)
          .map((award) => award.awardKey),
      ),
    );
  }

  public markAnnounced(
    guildId: GuildId,
    userId: UserId,
    awardKey: string,
  ): Promise<void> {
    const key = `${guildId}:${userId}:${awardKey}`;
    const award = this.awards.get(key);
    if (award) this.awards.set(key, { ...award, announced: true });
    return Promise.resolve();
  }
}

export type { AwardKind };

export interface FakeRepositories extends Repositories {
  readonly identity: FakeIdentityRepository;
  readonly moderation: FakeModerationRepository;
  readonly cases: FakeCaseRepository;
  readonly onboarding: FakeOnboardingRepository;
  readonly audit: FakeAuditRepository;
  readonly idempotency: FakeIdempotencyRepository;
  readonly cooldowns: FakeCooldownRepository;
  readonly telemetry: FakeTelemetryRepository;
  readonly jobs: FakeJobRunRepository;
  readonly settings: FakeSettingsRepository;
  readonly rewards: FakeRewardsRepository;
  readonly awards: FakeAwardsRepository;
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
    jobs: new FakeJobRunRepository(now),
    settings: new FakeSettingsRepository(),
    moderation: new FakeModerationRepository(now),
    cases: new FakeCaseRepository(now),
    rewards: new FakeRewardsRepository(now),
    awards: new FakeAwardsRepository(now),
  };
}

export type { BotName };
