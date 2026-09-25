import {
  BOT_NAMES,
  CHANNEL_ENV_KEYS,
  CHANNEL_KEYS,
  LOG_SEVERITIES,
  ROLE_ENV_KEYS,
  ROLE_KEYS,
  bloomError,
  type BotName,
  type ChannelId,
  type ChannelKey,
  type GuildId,
  type LogSeverity,
  type RoleId,
  type RoleKey,
} from '@bloom/shared-types';
import {
  discordTokenSchema,
  envBooleanSchema,
  envIntSchema,
  postgresSchemaNameSchema,
  postgresUrlSchema,
  snowflakeSchema,
  z,
} from '@bloom/validation';
import { BOT_REQUIREMENTS } from './requirements.js';
import type {
  BloomEnvironment,
  BotConfig,
  BotCredentials,
  ChannelIdMap,
  CommandRegistrationScope,
  PlatformConfig,
  RoleIdMap,
} from './types.js';

export type EnvSource = Readonly<Record<string, string | undefined>>;

/**
 * One validation failure, tied to the exact key that caused it.
 *
 * Collected rather than thrown one at a time: an operator setting this up for
 * the first time should get the full list of what is wrong, not fix one
 * variable, restart, and discover the next.
 */
interface ConfigIssue {
  readonly key: string;
  readonly problem: string;
}

class ConfigCollector {
  private readonly issues: ConfigIssue[] = [];

  public add(key: string, problem: string): void {
    this.issues.push({ key, problem });
  }

  /**
   * Read a required value, validate it, and record a precise issue on failure.
   * Returns `undefined` on failure so parsing can continue and gather the rest.
   */
  public required<T>(
    env: EnvSource,
    key: string,
    schema: z.ZodType<T>,
    hint?: string,
  ): T | undefined {
    const raw = env[key];
    if (raw === undefined || raw.trim() === '') {
      this.add(key, hint ? `is required. ${hint}` : 'is required but was not set.');
      return undefined;
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      this.add(key, parsed.error.issues[0]?.message ?? 'is not valid.');
      return undefined;
    }
    return parsed.data;
  }

  /** Read an optional value. A blank string is treated as absent, not as invalid. */
  public optional<T>(env: EnvSource, key: string, schema: z.ZodType<T>): T | undefined {
    const raw = env[key];
    if (raw === undefined || raw.trim() === '') return undefined;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      this.add(key, parsed.error.issues[0]?.message ?? 'is not valid.');
      return undefined;
    }
    return parsed.data;
  }

  /** Read an optional value with a default, validating only if it was supplied. */
  public withDefault<T>(
    env: EnvSource,
    key: string,
    schema: z.ZodType<T>,
    fallback: T,
  ): T {
    return this.optional(env, key, schema) ?? fallback;
  }

  public get failed(): boolean {
    return this.issues.length > 0;
  }

  public get list(): readonly ConfigIssue[] {
    return this.issues;
  }

  /**
   * Fail fast with every problem at once.
   *
   * The brief requires naming the exact missing key and refusing to boot
   * partially. The message is formatted for a terminal, because that is where
   * it will be read.
   */
  public throwIfFailed(context: string): void {
    if (!this.failed) return;

    const lines = this.issues.map((issue) => `  • ${issue.key} — ${issue.problem}`);
    throw bloomError('CONFIGURATION_ERROR', {
      operatorHint: [
        `${context} failed validation. ${String(this.issues.length)} problem(s):`,
        ...lines,
        '',
        'Copy .env.example to .env and fill in the values, then run `pnpm diagnostics`.',
      ].join('\n'),
      details: { issues: this.issues.map((issue) => `${issue.key}: ${issue.problem}`) },
    });
  }
}

const nodeEnvSchema = z.enum(['development', 'test', 'production']);
const environmentSchema = z.enum(['development', 'staging', 'production']);
const logLevelSchema = z.enum(LOG_SEVERITIES);
const registrationScopeSchema = z.enum(['guild', 'global']);

/**
 * Load and validate everything.
 *
 * Pure with respect to `env` — it reads the object it is given rather than
 * `process.env` directly, which is what makes the whole thing testable without
 * mutating global state.
 */
export function loadPlatformConfig(
  env: EnvSource = process.env,
  options: { readonly version?: string } = {},
): PlatformConfig {
  const collector = new ConfigCollector();

  const nodeEnv = collector.withDefault(env, 'NODE_ENV', nodeEnvSchema, 'development');
  const environment: BloomEnvironment = collector.withDefault(
    env,
    'BLOOM_ENVIRONMENT',
    environmentSchema,
    nodeEnv === 'production' ? 'production' : 'development',
  );

  const level: LogSeverity = collector.withDefault(
    env,
    'LOG_LEVEL',
    logLevelSchema,
    'info',
  );
  const pretty = collector.withDefault(env, 'LOG_PRETTY', envBooleanSchema, false);

  // Pretty output in production means the log aggregator cannot parse anything.
  // Refusing is friendlier than silently producing unsearchable logs.
  if (pretty && environment === 'production') {
    collector.add(
      'LOG_PRETTY',
      'must be false when BLOOM_ENVIRONMENT=production — production logs must stay machine-parseable JSON.',
    );
  }

  const databaseUrl = collector.required(
    env,
    'DATABASE_URL',
    postgresUrlSchema,
    'Use the Supabase transaction pooler URI, not the direct connection.',
  );
  const databaseSchema = collector.withDefault(
    env,
    'DATABASE_SCHEMA',
    postgresSchemaNameSchema,
    'bloom_discord',
  );
  const maxConnections = collector.withDefault(
    env,
    'DATABASE_MAX_CONNECTIONS',
    envIntSchema(1, 50),
    5,
  );
  const idleTimeoutSeconds = collector.withDefault(
    env,
    'DATABASE_IDLE_TIMEOUT',
    envIntSchema(0, 3600),
    30,
  );
  const connectTimeoutSeconds = collector.withDefault(
    env,
    'DATABASE_CONNECT_TIMEOUT',
    envIntSchema(1, 120),
    10,
  );

  const guildId = collector.required(
    env,
    'DISCORD_GUILD_ID',
    snowflakeSchema,
    'Enable Developer Mode in Discord, then right-click the server and Copy Server ID.',
  );
  const registrationScope: CommandRegistrationScope = collector.withDefault(
    env,
    'COMMAND_REGISTRATION_SCOPE',
    registrationScopeSchema,
    environment === 'production' ? 'global' : 'guild',
  );

  const roles = readRoles(env, collector);
  const channels = readChannels(env, collector);
  const bots = readBots(env, collector);

  const features = {
    scheduledMessages: collector.withDefault(
      env,
      'FEATURE_SCHEDULED_MESSAGES',
      envBooleanSchema,
      false,
    ),
    rewards: collector.withDefault(env, 'FEATURE_REWARDS', envBooleanSchema, false),
    githubIntegration: collector.withDefault(
      env,
      'FEATURE_GITHUB_INTEGRATION',
      envBooleanSchema,
      false,
    ),
    aiIntegration: collector.withDefault(
      env,
      'FEATURE_AI_INTEGRATION',
      envBooleanSchema,
      false,
    ),
  } as const;

  assertDistinctRoleIds(roles, collector);

  collector.throwIfFailed('Bloom platform configuration');

  // Every `required` above succeeded, or `throwIfFailed` would have thrown.
  return {
    runtime: {
      nodeEnv,
      environment,
      version: options.version ?? env['BLOOM_VERSION'] ?? '0.1.0',
    },
    logging: { level, pretty },
    database: {
      url: databaseUrl!,
      schema: databaseSchema,
      maxConnections,
      idleTimeoutSeconds,
      connectTimeoutSeconds,
    },
    discord: {
      guildId: guildId! as GuildId,
      registrationScope,
    },
    roles,
    channels,
    features,
    bots,
  };
}

function readRoles(env: EnvSource, collector: ConfigCollector): RoleIdMap {
  const entries = ROLE_KEYS.map((key: RoleKey): [RoleKey, RoleId | null] => {
    const value = collector.optional(env, ROLE_ENV_KEYS[key], snowflakeSchema);
    // `.env.example` ships placeholder zeros so the file reads clearly; treat
    // them as unset rather than letting a bot boot pointed at role id 0.
    const isPlaceholder = value !== undefined && /^0+$/.test(value);
    return [key, isPlaceholder || value === undefined ? null : (value as RoleId)];
  });
  return Object.fromEntries(entries) as RoleIdMap;
}

function readChannels(env: EnvSource, collector: ConfigCollector): ChannelIdMap {
  const entries = CHANNEL_KEYS.map((key: ChannelKey): [ChannelKey, ChannelId | null] => {
    const value = collector.optional(env, CHANNEL_ENV_KEYS[key], snowflakeSchema);
    const isPlaceholder = value !== undefined && /^0+$/.test(value);
    return [key, isPlaceholder || value === undefined ? null : (value as ChannelId)];
  });
  return Object.fromEntries(entries) as ChannelIdMap;
}

const BOT_ENV_KEYS: Readonly<Record<BotName, { token: string; clientId: string }>> = {
  guardian: { token: 'DISCORD_GUARDIAN_TOKEN', clientId: 'DISCORD_GUARDIAN_CLIENT_ID' },
  companion: {
    token: 'DISCORD_COMPANION_TOKEN',
    clientId: 'DISCORD_COMPANION_CLIENT_ID',
  },
  labs: { token: 'DISCORD_LABS_TOKEN', clientId: 'DISCORD_LABS_CLIENT_ID' },
};

function readBots(
  env: EnvSource,
  collector: ConfigCollector,
): Readonly<Record<BotName, BotCredentials | null>> {
  const result: Partial<Record<BotName, BotCredentials | null>> = {};
  const seenTokens = new Map<string, BotName>();
  const seenClientIds = new Map<string, BotName>();

  for (const bot of BOT_NAMES) {
    const keys = BOT_ENV_KEYS[bot];
    const rawToken = env[keys.token]?.trim();
    const rawClientId = env[keys.clientId]?.trim();

    // A bot whose credentials are entirely absent is simply not deployed here.
    if (!rawToken && !rawClientId) {
      result[bot] = null;
      continue;
    }

    // Placeholders straight out of .env.example. Say so plainly.
    if (rawToken?.startsWith('your-')) {
      collector.add(keys.token, 'still holds the .env.example placeholder.');
      result[bot] = null;
      continue;
    }

    const token = collector.optional(env, keys.token, discordTokenSchema);
    const clientId = collector.optional(env, keys.clientId, snowflakeSchema);

    if (!token) {
      collector.add(keys.token, `is required because ${keys.clientId} is set.`);
    }
    if (!clientId || /^0+$/.test(clientId)) {
      collector.add(
        keys.clientId,
        'is required. Copy it from Developer Portal -> your app -> General Information -> Application ID.',
      );
    }

    if (!token || !clientId || /^0+$/.test(clientId)) {
      result[bot] = null;
      continue;
    }

    // Reusing one token across two bots means two processes logging in as the
    // same application. Discord allows it; the resulting behaviour is chaos.
    const tokenOwner = seenTokens.get(token);
    if (tokenOwner) {
      collector.add(
        keys.token,
        `is identical to ${BOT_ENV_KEYS[tokenOwner].token}. Each bot must be a separate Discord application with its own token.`,
      );
    }
    seenTokens.set(token, bot);

    const clientOwner = seenClientIds.get(clientId);
    if (clientOwner) {
      collector.add(
        keys.clientId,
        `is identical to ${BOT_ENV_KEYS[clientOwner].clientId}. Each bot must be a separate Discord application.`,
      );
    }
    seenClientIds.set(clientId, bot);

    result[bot] = { token, clientId };
  }

  return result as Readonly<Record<BotName, BotCredentials | null>>;
}

/**
 * Two role keys pointing at the same id is always a copy-paste error, and a
 * dangerous one: if `ROLE_MODERATOR` and `ROLE_EARLY_BLOOM` were the same id,
 * every onboarding member would pass the moderator authorization check.
 */
function assertDistinctRoleIds(roles: RoleIdMap, collector: ConfigCollector): void {
  const seen = new Map<string, RoleKey>();
  for (const key of ROLE_KEYS) {
    const id = roles[key];
    if (!id) continue;
    const owner = seen.get(id);
    if (owner) {
      collector.add(
        ROLE_ENV_KEYS[key],
        `has the same id as ${ROLE_ENV_KEYS[owner]}. Each role must be distinct — sharing ids between a staff role and a member role would grant staff authorization to members.`,
      );
    }
    seen.set(id, key);
  }
}

/**
 * Narrow platform config to one bot, enforcing that bot's own requirements.
 *
 * Called at the very start of a bot's boot sequence. If it throws, nothing has
 * connected to Discord and nothing has touched the database.
 */
export function resolveBotConfig(botName: BotName, platform: PlatformConfig): BotConfig {
  const collector = new ConfigCollector();
  const credentials = platform.bots[botName];

  if (!credentials) {
    collector.add(
      BOT_ENV_KEYS[botName].token,
      `is required to run ${botName}. Set it together with ${BOT_ENV_KEYS[botName].clientId}.`,
    );
  }

  const requirements = BOT_REQUIREMENTS[botName];
  for (const role of requirements.roles) {
    if (!platform.roles[role]) {
      collector.add(
        ROLE_ENV_KEYS[role],
        `is required by ${botName}. Right-click the role in Server Settings -> Roles -> Copy Role ID.`,
      );
    }
  }
  for (const channel of requirements.channels) {
    if (!platform.channels[channel]) {
      collector.add(
        CHANNEL_ENV_KEYS[channel],
        `is required by ${botName}. Right-click the channel -> Copy Channel ID.`,
      );
    }
  }

  collector.throwIfFailed(`Bloom ${botName} configuration`);

  return { botName, credentials: credentials!, platform };
}
