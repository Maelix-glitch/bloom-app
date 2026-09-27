import {
  BOT_NAMES,
  CHANNEL_DISPLAY_NAMES,
  CHANNEL_ENV_KEYS,
  CHANNEL_KEYS,
  ROLE_DISPLAY_NAMES,
  ROLE_ENV_KEYS,
  ROLE_KEYS,
  type BotName,
} from '@bloom/shared-types';
import { maskIdentifier } from '@bloom/utils';
import { BOT_REQUIREMENTS } from './requirements.js';
import type { PlatformConfig } from './types.js';

export interface ConfigEntrySummary {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly configured: boolean;
  readonly requiredBy: readonly BotName[];
}

export interface ConfigSummary {
  readonly runtime: Readonly<Record<string, string>>;
  readonly bots: readonly {
    readonly bot: BotName;
    readonly configured: boolean;
    readonly clientId: string;
    readonly token: string;
  }[];
  readonly roles: readonly ConfigEntrySummary[];
  readonly channels: readonly ConfigEntrySummary[];
  readonly features: Readonly<Record<string, boolean>>;
}

/**
 * A human-readable view of resolved configuration, safe to print.
 *
 * This backs `pnpm diagnostics`. The whole point is that an operator can paste
 * the output into a support conversation without leaking anything: tokens are
 * reported only as present/absent, client ids are masked, and the database URL
 * is reduced to host and database name with credentials stripped.
 */
export function summariseConfig(config: PlatformConfig): ConfigSummary {
  return {
    runtime: {
      node_env: config.runtime.nodeEnv,
      environment: config.runtime.environment,
      version: config.runtime.version,
      log_level: config.logging.level,
      log_pretty: String(config.logging.pretty),
      guild_id: config.discord.guildId,
      command_registration_scope: config.discord.registrationScope,
      database: describeDatabaseUrl(config.database.url),
      database_schema: config.database.schema,
      database_max_connections: String(config.database.maxConnections),
    },

    bots: BOT_NAMES.map((bot) => {
      const credentials = config.bots[bot];
      return {
        bot,
        configured: credentials !== null,
        clientId: credentials ? maskIdentifier(credentials.clientId) : 'not set',
        // Never the value, not even masked. Presence is all anyone needs.
        token: credentials ? 'set' : 'not set',
      };
    }),

    roles: ROLE_KEYS.map((key) => ({
      key: ROLE_ENV_KEYS[key],
      label: ROLE_DISPLAY_NAMES[key],
      value: config.roles[key] ?? '—',
      configured: config.roles[key] !== null,
      requiredBy: BOT_NAMES.filter((bot) => BOT_REQUIREMENTS[bot].roles.includes(key)),
    })),

    channels: CHANNEL_KEYS.map((key) => ({
      key: CHANNEL_ENV_KEYS[key],
      label: CHANNEL_DISPLAY_NAMES[key],
      value: config.channels[key] ?? '—',
      configured: config.channels[key] !== null,
      requiredBy: BOT_NAMES.filter((bot) => BOT_REQUIREMENTS[bot].channels.includes(key)),
    })),

    features: {
      scheduled_messages: config.features.scheduledMessages,
      rewards: config.features.rewards,
      github_integration: config.features.githubIntegration,
      ai_integration: config.features.aiIntegration,
    },
  };
}

/**
 * `postgresql://user:pass@host:6543/postgres` → `host:6543/postgres`.
 *
 * Enough to tell whether you are pointed at the right project and the pooler
 * port, with no credentials.
 */
export function describeDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const port = parsed.port ? `:${parsed.port}` : '';
    return `${parsed.hostname}${port}${parsed.pathname}`;
  } catch {
    return '(unparseable connection string)';
  }
}
