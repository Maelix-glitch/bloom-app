import { describe, expect, it } from 'vitest';
import { BloomError } from '@bloom/shared-types';
import { loadPlatformConfig, resolveBotConfig } from './load.js';
import { summariseConfig, describeDatabaseUrl } from './summary.js';

/** The minimum environment that should produce a valid config. */
function baseEnv(
  overrides: Record<string, string | undefined> = {},
): Record<string, string> {
  const env: Record<string, string | undefined> = {
    NODE_ENV: 'test',
    BLOOM_ENVIRONMENT: 'development',
    DATABASE_URL: 'postgresql://bloom:secret@db.example.com:6543/postgres',
    DISCORD_GUILD_ID: '900000000000000001',
    DISCORD_GUARDIAN_TOKEN: 'MTIzNDU2Nzg5MDEyMzQ1Njc4.GaBcDe.guardian-token-value-here',
    DISCORD_GUARDIAN_CLIENT_ID: '900000000000009001',
    ...overrides,
  };

  return Object.fromEntries(
    Object.entries(env).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
}

describe('loadPlatformConfig', () => {
  it('loads a minimal valid environment', () => {
    const config = loadPlatformConfig(baseEnv());

    expect(config.discord.guildId).toBe('900000000000000001');
    expect(config.database.schema).toBe('bloom_discord');
    expect(config.bots.guardian).not.toBeNull();
    expect(config.bots.companion).toBeNull();
  });

  /*
   * The brief asks for fail-fast configuration. The subtle part is failing with
   * *all* the problems at once: reporting them one at a time turns a five-minute
   * setup into five restarts.
   */
  it('reports every missing key in a single error', () => {
    let caught: BloomError | null = null;
    try {
      loadPlatformConfig({ NODE_ENV: 'test' });
    } catch (error) {
      caught = BloomError.from(error);
    }

    expect(caught).not.toBeNull();
    expect(caught?.code).toBe('CONFIGURATION_ERROR');
    expect(caught?.operatorHint).toContain('DATABASE_URL');
    expect(caught?.operatorHint).toContain('DISCORD_GUILD_ID');
  });

  it('rejects a malformed guild id', () => {
    expect(() =>
      loadPlatformConfig(baseEnv({ DISCORD_GUILD_ID: 'not-a-snowflake' })),
    ).toThrow(/DISCORD_GUILD_ID/);
  });

  it('rejects a non-postgres database url', () => {
    expect(() =>
      loadPlatformConfig(baseEnv({ DATABASE_URL: 'mysql://user:pw@host/db' })),
    ).toThrow(/DATABASE_URL/);
  });

  /*
   * Copying .env.example and forgetting to fill it in is the single most common
   * setup mistake. Placeholder values pass a naive format check, so they are
   * rejected by name.
   */
  it('rejects placeholder values left over from .env.example', () => {
    expect(() =>
      loadPlatformConfig(baseEnv({ DISCORD_GUARDIAN_TOKEN: 'your-guardian-token-here' })),
    ).toThrow();
  });

  it('refuses two bots sharing a token', () => {
    const token = 'MTIzNDU2Nzg5MDEyMzQ1Njc4.GaBcDe.shared-token-value-here-x';
    expect(() =>
      loadPlatformConfig(
        baseEnv({
          DISCORD_GUARDIAN_TOKEN: token,
          DISCORD_COMPANION_TOKEN: token,
          DISCORD_COMPANION_CLIENT_ID: '900000000000009002',
        }),
      ),
    ).toThrow(/token/i);
  });

  it('refuses two bots sharing a client id', () => {
    expect(() =>
      loadPlatformConfig(
        baseEnv({
          DISCORD_COMPANION_TOKEN:
            'MTIzNDU2Nzg5MDEyMzQ1Njc4.GaBcDe.companion-token-value',
          DISCORD_COMPANION_CLIENT_ID: '900000000000009001',
        }),
      ),
    ).toThrow(/client/i);
  });

  it('refuses two roles configured to the same id', () => {
    expect(() =>
      loadPlatformConfig(
        baseEnv({
          ROLE_EARLY_BLOOM: '900000000000020001',
          ROLE_BLOOM_MEMBER: '900000000000020001',
        }),
      ),
    ).toThrow();
  });

  /*
   * Human-readable logs in production means the aggregator cannot parse
   * anything, which is only discovered during the incident that needs them.
   */
  it('refuses pretty logging in production', () => {
    expect(() =>
      loadPlatformConfig(
        baseEnv({
          BLOOM_ENVIRONMENT: 'production',
          NODE_ENV: 'production',
          LOG_PRETTY: 'true',
        }),
      ),
    ).toThrow(/LOG_PRETTY/);
  });

  it('applies documented defaults', () => {
    const config = loadPlatformConfig(baseEnv());

    expect(config.logging.level).toBe('info');
    expect(config.database.maxConnections).toBe(5);
    expect(config.discord.registrationScope).toBe('guild');
  });

  it('never mutates process.env', () => {
    const before = { ...process.env };
    loadPlatformConfig(baseEnv());
    expect(Object.keys(process.env).sort()).toEqual(Object.keys(before).sort());
  });
});

/** Guardian additionally requires every role id, so its tests need them. */
const GUARDIAN_ROLES = {
  ROLE_FOUNDER: '900000000000020001',
  ROLE_ADMINISTRATOR: '900000000000020002',
  ROLE_MODERATOR: '900000000000020003',
  ROLE_BLOOM_BOT: '900000000000020004',
  ROLE_BETA_TESTER: '900000000000020005',
  ROLE_EARLY_BLOOM: '900000000000020006',
  ROLE_BLOOM_MEMBER: '900000000000020007',
};

describe('resolveBotConfig', () => {
  it('returns credentials for a configured bot', () => {
    const config = loadPlatformConfig(baseEnv(GUARDIAN_ROLES));
    const guardian = resolveBotConfig('guardian', config);

    expect(guardian.botName).toBe('guardian');
    expect(guardian.credentials.clientId).toBe('900000000000009001');
  });

  it('fails clearly for a bot with no token', () => {
    const config = loadPlatformConfig(baseEnv(GUARDIAN_ROLES));
    expect(() => resolveBotConfig('companion', config)).toThrow(
      /DISCORD_COMPANION_TOKEN/,
    );
  });

  /*
   * Guardian cannot function without the roles it manages. A missing role id
   * would otherwise surface as a failed role assignment for the first member
   * who joins, long after anyone is watching the startup logs.
   */
  it('fails when a bot is missing a role it requires', () => {
    const config = loadPlatformConfig(
      baseEnv({
        ...GUARDIAN_ROLES,
        ROLE_EARLY_BLOOM: undefined,
        ROLE_BLOOM_MEMBER: undefined,
      }),
    );

    expect(() => resolveBotConfig('guardian', config)).toThrow(
      /ROLE_EARLY_BLOOM|ROLE_BLOOM_MEMBER/,
    );
  });
});

describe('summaries never leak secrets', () => {
  it('describeDatabaseUrl keeps the host but drops the password', () => {
    const described = describeDatabaseUrl(
      'postgresql://bloom:hunter2@db.example.com:6543/postgres',
    );

    expect(described).not.toContain('hunter2');
    expect(described).toContain('db.example.com');
  });

  it('summariseConfig contains no token material', () => {
    const summary = JSON.stringify(summariseConfig(loadPlatformConfig(baseEnv())));

    expect(summary).not.toContain('GaBcDe');
    expect(summary).not.toContain('secret');
  });
});
