import { bloomError, type BotName, type GuildId, type UserId } from '@bloom/shared-types';
import type { SettingsRepository } from '@bloom/database';
import type { JobGate, JobGateDecision } from '@bloom/events';

/**
 * Per-guild job enablement, stored in `bot_settings`.
 *
 * No new table: `bot_settings(guild_id, bot_name, key, value)` already exists
 * for exactly this — runtime overrides an administrator can change through a
 * command instead of a deployment — and it already records `updated_by`, which
 * answers "who turned the check-in prompt off" three weeks later.
 *
 * The stored value is `{ "enabled": false }` rather than a bare boolean. A row
 * that exists means "an administrator made a decision here"; its absence means
 * "nobody has said otherwise", and those are genuinely different states. An
 * object also leaves room for per-guild scheduling overrides later without a
 * migration or a second key.
 */

/** Longest key `bot_settings` accepts: `key ~ '^[a-z][a-z0-9_.]{0,62}$'`. */
const MAX_SETTING_KEY_LENGTH = 63;

const PREFIX = 'job.';

/**
 * The `bot_settings` key for a job's enablement.
 *
 * Throws rather than truncating. A silently shortened key would collide with
 * another job's setting, and two jobs sharing one off switch is the kind of bug
 * that is only discovered by disabling one and watching the other stop.
 */
export function jobSettingKey(jobKey: string): string {
  const key = `${PREFIX}${jobKey}`;
  if (key.length > MAX_SETTING_KEY_LENGTH) {
    throw bloomError('CONFIGURATION_ERROR', {
      operatorHint:
        `Job key "${jobKey}" is too long to store a per-guild setting: "${key}" is ${String(key.length)} characters and bot_settings allows ${String(MAX_SETTING_KEY_LENGTH)}. ` +
        `Shorten the job key to at most ${String(MAX_SETTING_KEY_LENGTH - PREFIX.length)} characters.`,
      details: { job_key: jobKey },
    });
  }
  return key;
}

export interface JobEnablement {
  /** `null` when no administrator has made a decision for this guild. */
  readonly enabled: boolean | null;
}

/**
 * Reads and writes the per-guild switch.
 *
 * Kept separate from the gate so that the commands which *display* and *change*
 * the setting do not go through an interface designed for a hot path.
 */
export class JobSettingsService {
  public constructor(
    private readonly settings: SettingsRepository,
    private readonly bot: BotName,
  ) {}

  public async read(guildId: GuildId, jobKey: string): Promise<JobEnablement> {
    const value = await this.settings.getBotSetting(
      guildId,
      this.bot,
      jobSettingKey(jobKey),
    );

    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      // Absent, or something hand-edited into a shape we do not recognise.
      // Treated as "no decision recorded" rather than as an error: a malformed
      // row must not stop a job from running, only fail to disable it.
      return { enabled: null };
    }

    const enabled = value['enabled'];
    return { enabled: typeof enabled === 'boolean' ? enabled : null };
  }

  public async write(
    guildId: GuildId,
    jobKey: string,
    enabled: boolean,
    updatedBy: UserId,
  ): Promise<void> {
    await this.settings.setBotSetting(
      guildId,
      this.bot,
      jobSettingKey(jobKey),
      { enabled },
      updatedBy,
    );
  }
}

/**
 * The scheduler's view of the same setting.
 *
 * Absence means enabled: a job nobody has explicitly switched off runs under
 * whatever static configuration allows. The gate can only take a job away, not
 * grant one that configuration has already disabled — `ScheduledJob.enabled` is
 * checked first, at registration, and a paused cron never reaches here.
 */
export class DatabaseJobGate implements JobGate {
  /**
   * @param homeGuildId Where a *global* job's switch is recorded.
   *
   * Platform-wide jobs carry no guild — `platform.retention.prune` deletes
   * rows that belong to no guild at all, so pretending it is guild-scoped
   * would make `job_runs` lie about what it touched. But `bot_settings` is
   * keyed `(guild_id, bot_name, key)` with a non-null guild, so a global job
   * with nowhere to record a decision had no off switch whatsoever: the only
   * way to stop it was a redeployment.
   *
   * That is not acceptable for the one job that destroys data. An operator who
   * suspects a retention window is wrong needs to stop the deletes in seconds,
   * not at the next release. So a global job's switch lives under the
   * platform's home guild — Bloom runs one guild, and the alternative is a
   * nullable column in a primary key, which makes every other lookup ambiguous
   * to save one row.
   */
  public constructor(
    private readonly settings: JobSettingsService,
    private readonly homeGuildId: GuildId | null = null,
  ) {}

  public async isEnabled(job: {
    readonly key: string;
    readonly guildId: GuildId | null;
  }): Promise<JobGateDecision> {
    const scope = job.guildId ?? this.homeGuildId;

    if (scope === null) {
      // No guild, and no home guild configured: nowhere a decision could have
      // been recorded, so there is none to honour.
      return { enabled: true };
    }

    const { enabled } = await this.settings.read(scope, job.key);
    if (enabled === false) {
      return {
        enabled: false,
        reason: 'An administrator disabled this job for this guild.',
      };
    }
    return { enabled: true };
  }
}
