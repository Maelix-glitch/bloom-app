import type {
  BotName,
  ChannelId,
  ChannelKey,
  GuildId,
  LogSeverity,
  RoleId,
  RoleKey,
} from '@bloom/shared-types';

export type BloomEnvironment = 'development' | 'staging' | 'production';

export type CommandRegistrationScope = 'guild' | 'global';

export interface RuntimeConfig {
  readonly nodeEnv: 'development' | 'test' | 'production';
  readonly environment: BloomEnvironment;
  /** Reported by /health and stamped on every log line. */
  readonly version: string;
  /**
   * IANA zone every schedule is evaluated in.
   *
   * A single community-wide zone rather than per-member: "the check-in prompt
   * appears at 09:00" has to mean one time, or it is not a shared moment. It
   * must be a named zone, not an offset, so that 09:00 stays 09:00 across
   * daylight saving rather than drifting by an hour twice a year.
   */
  readonly timezone: string;
}

export interface LoggingConfig {
  readonly level: LogSeverity;
  readonly pretty: boolean;
}

export interface DatabaseConfig {
  /** Contains credentials. Never log this field — the redactor catches it, but do not rely on that. */
  readonly url: string;
  readonly schema: string;
  readonly maxConnections: number;
  readonly idleTimeoutSeconds: number;
  readonly connectTimeoutSeconds: number;
}

export interface DiscordConfig {
  readonly guildId: GuildId;
  readonly registrationScope: CommandRegistrationScope;
}

export interface BotCredentials {
  readonly token: string;
  readonly clientId: string;
}

/** Role key → id. `null` means "not configured", which is fatal only if a bot requires it. */
export type RoleIdMap = Readonly<Record<RoleKey, RoleId | null>>;

export type ChannelIdMap = Readonly<Record<ChannelKey, ChannelId | null>>;

export interface FeatureFlags {
  readonly scheduledMessages: boolean;
  readonly rewards: boolean;
  readonly githubIntegration: boolean;
  readonly aiIntegration: boolean;
}

/**
 * Everything the platform knows, validated.
 *
 * Bot credentials are `null` when that bot's token is absent. That is not an
 * error at platform level — running only Guardian locally is a legitimate thing
 * to do — it becomes an error when that specific bot tries to boot.
 */
export interface PlatformConfig {
  readonly runtime: RuntimeConfig;
  readonly logging: LoggingConfig;
  readonly database: DatabaseConfig;
  readonly discord: DiscordConfig;
  readonly roles: RoleIdMap;
  readonly channels: ChannelIdMap;
  readonly features: FeatureFlags;
  readonly bots: Readonly<Record<BotName, BotCredentials | null>>;
}

/** Platform config narrowed to one bot, with that bot's credentials guaranteed present. */
export interface BotConfig {
  readonly botName: BotName;
  readonly credentials: BotCredentials;
  readonly platform: PlatformConfig;
}
