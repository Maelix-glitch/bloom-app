import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres, { type Sql } from 'postgres';

/**
 * Database-level isolation, proved against a real PostgreSQL.
 *
 * `BOT_REPOSITORY_CAPABILITIES` is a TypeScript claim: it decides which
 * repository objects each bot is handed, and the architecture tests prove the
 * wiring. None of that survives one raw query written by someone in a hurry.
 * This file tests the other half — the half PostgreSQL enforces, where
 * Guardian asking for the rewards ledger is refused by the database no matter
 * what the application believes.
 *
 * Both directions matter and both are here. A privilege suite that only
 * asserts denials passes beautifully on a role that cannot do anything at
 * all, and the first sign of trouble is production. So every bot's real work
 * is exercised too.
 *
 * Opt-in: `BLOOM_INTEGRATION_TESTS=1`, schema already migrated.
 */

const SCHEMA = process.env['DATABASE_SCHEMA'] ?? 'bloom_discord';
const PASSWORD = 'privilege-test-password';

const SCRIPT = fileURLToPath(
  new URL('../../../database/security/0001_runtime_roles.sql', import.meta.url),
);

const ROLES = ['bloom_guardian', 'bloom_companion', 'bloom_labs'] as const;
type Role = (typeof ROLES)[number];

/** Guild and member ids used by the allowed-path checks. */
const GUILD = '100000000000097001';
const MEMBER = '100000000000097002';

/**
 * PostgreSQL's refusal, whatever the object.
 *
 * Matched as a pattern rather than a string because the message names the
 * object, and pinning the whole sentence would make the suite fail when a
 * table is renamed rather than when isolation breaks.
 */
const DENIED = /permission denied|must be owner/i;

describe('database privileges (integration)', () => {
  let admin: Sql;
  const pools = new Map<string, Sql>();
  let baseUrl: URL;

  const as = (role: Role | 'migrator'): Sql => {
    const sql = pools.get(role);
    if (!sql) throw new Error(`no pool for ${role}`);
    return sql;
  };

  beforeAll(async () => {
    const url = process.env['DATABASE_URL'];
    if (!url) throw new Error('DATABASE_URL is required for integration tests.');
    baseUrl = new URL(url);

    admin = postgres(url, { max: 4, onnotice: () => undefined });

    /*
     * The script is one transaction, and postgres.js refuses a raw BEGIN on a
     * pooled connection — reasonably, since the rest of the pool would not be
     * inside it. A single-connection client is the supported way to run a
     * script that manages its own transaction.
     */
    const setup = postgres(url, { max: 1, onnotice: () => undefined });

    /*
     * Apply the real script, not a copy of it.
     *
     * A test that reimplemented the grants would prove the test's idea of the
     * matrix rather than the file an operator actually runs, and the two
     * would drift the first time someone edited one of them.
     *
     * `\set` is a psql client directive, not server SQL, so it is stripped —
     * everything else is executed exactly as written.
     */
    const script = readFileSync(SCRIPT, 'utf8')
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('\\set'))
      .join('\n');

    await setup.unsafe(script);
    await setup.end();

    // Passwords are the operator's step 10, deliberately not in the script.
    for (const role of [...ROLES, 'bloom_migrator']) {
      await admin.unsafe(`ALTER ROLE ${role} WITH PASSWORD '${PASSWORD}'`);
    }

    const connect = (user: string): Sql => {
      const target = new URL(baseUrl.toString());
      target.username = user;
      target.password = PASSWORD;
      return postgres(target.toString(), { max: 2, onnotice: () => undefined });
    };

    for (const role of ROLES) pools.set(role, connect(role));
    pools.set('migrator', connect('bloom_migrator'));

    // A guild row the allowed-path checks can hang off. Written as superuser:
    // this is fixture setup, not part of what is being tested.
    await admin.unsafe(
      `INSERT INTO ${SCHEMA}.guilds (guild_id, name)
       VALUES ('${GUILD}', 'privilege test')
       ON CONFLICT (guild_id) DO NOTHING`,
    );
  }, 60_000);

  afterAll(async () => {
    await Promise.all([...pools.values()].map((sql) => sql.end()));
    await admin.end();
  });

  // ---------------------------------------------------------------------------
  // The matrix itself
  // ---------------------------------------------------------------------------

  /**
   * Every table, and which bots may touch it.
   *
   * This is the assertion, not documentation of one. The drift test below
   * compares it against the live schema, so a migration that adds a table
   * without a decision here fails the suite rather than shipping a table
   * whose access nobody chose.
   */
  const MATRIX: Readonly<Record<string, readonly Role[]>> = {
    // Shared platform surface.
    audit_events: ['bloom_guardian', 'bloom_companion', 'bloom_labs'],
    job_runs: ['bloom_guardian', 'bloom_companion', 'bloom_labs'],
    bot_settings: ['bloom_guardian', 'bloom_companion', 'bloom_labs'],
    channel_settings: ['bloom_guardian', 'bloom_companion', 'bloom_labs'],
    role_settings: ['bloom_guardian', 'bloom_companion', 'bloom_labs'],
    command_usage: ['bloom_guardian', 'bloom_companion', 'bloom_labs'],
    system_health: ['bloom_guardian', 'bloom_companion', 'bloom_labs'],
    idempotency_keys: ['bloom_guardian', 'bloom_companion'],
    message_cooldowns: ['bloom_guardian', 'bloom_companion'],

    // Guardian.
    guilds: ['bloom_guardian'],
    users: ['bloom_guardian'],
    guild_members: ['bloom_guardian'],
    member_roles: ['bloom_guardian'],
    onboarding_transitions: ['bloom_guardian'],
    verification_attempts: ['bloom_guardian'],
    moderation_actions: ['bloom_guardian'],
    moderation_cases: ['bloom_guardian'],
    case_events: ['bloom_guardian'],
    case_counters: ['bloom_guardian'],
    reports: ['bloom_guardian'],
    referral_triggers: ['bloom_guardian', 'bloom_companion'],

    // Companion.
    point_events: ['bloom_companion', 'bloom_guardian'], // guardian: erasure column only
    check_ins: ['bloom_companion'],
    member_awards: ['bloom_companion'],
    community_activities: ['bloom_companion'],
    community_participants: ['bloom_companion'],

    // Labs.
    bug_reports: ['bloom_labs', 'bloom_guardian'], // guardian: erasure columns only
    bug_events: ['bloom_labs'],
    bug_counters: ['bloom_labs'],
    feedback: ['bloom_labs', 'bloom_guardian'], // guardian: erasure columns only

    // Nobody at runtime.
    schema_migrations: [],
  };

  it('has a decision recorded for every table in the schema', async () => {
    /*
     * The guard that keeps this file honest as the schema grows. Without it,
     * migration 0013 adds a table, nobody grants anything, and the first
     * symptom is a bot failing in production — or worse, the table inheriting
     * access from a default privilege somebody added for convenience.
     */
    const rows = await admin.unsafe(
      `SELECT tablename FROM pg_tables WHERE schemaname = '${SCHEMA}' ORDER BY 1`,
    );
    const live = rows.map((row) => String(row['tablename']));

    expect(live.filter((table) => !(table in MATRIX))).toEqual([]);
    expect(Object.keys(MATRIX).filter((table) => !live.includes(table))).toEqual([]);
  });

  it('grants no table privileges to PUBLIC', async () => {
    // PUBLIC is a role everyone is a member of, so one grant here silently
    // undoes the whole file.
    const rows = await admin.unsafe(
      `SELECT table_name, privilege_type
       FROM information_schema.role_table_grants
       WHERE table_schema = '${SCHEMA}' AND grantee = 'PUBLIC'`,
    );
    expect(rows).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Cross-bot denial
  // ---------------------------------------------------------------------------

  describe('cross-bot denial', () => {
    const cases: readonly { role: Role; table: string; why: string }[] = [
      {
        role: 'bloom_guardian',
        table: 'point_events',
        why: 'the moderation bot must not read the economy',
      },
      {
        role: 'bloom_guardian',
        table: 'check_ins',
        why: 'wellbeing records are not moderation evidence',
      },
      {
        role: 'bloom_guardian',
        table: 'member_awards',
        why: 'recognition is Companion\u2019s',
      },
      {
        role: 'bloom_guardian',
        table: 'community_participants',
        why: 'who joined an event is not Guardian\u2019s business',
      },
      {
        role: 'bloom_guardian',
        table: 'bug_reports',
        why: 'Guardian may scrub a column, never read the row',
      },
      {
        role: 'bloom_companion',
        table: 'moderation_cases',
        why: 'the rewards bot must never see a case',
      },
      {
        role: 'bloom_companion',
        table: 'reports',
        why: 'report content is the most sensitive data here',
      },
      {
        role: 'bloom_companion',
        table: 'verification_attempts',
        why: 'onboarding state is read through Guardian, not the table',
      },
      {
        role: 'bloom_companion',
        table: 'member_roles',
        why: 'only Guardian touches roles, at any layer',
      },
      {
        role: 'bloom_companion',
        table: 'bug_reports',
        why: 'Labs data is not Companion\u2019s',
      },
      {
        role: 'bloom_labs',
        table: 'point_events',
        why: 'beta testing does not pay points',
      },
      {
        role: 'bloom_labs',
        table: 'moderation_cases',
        why: 'Labs has no moderation surface at all',
      },
      {
        role: 'bloom_labs',
        table: 'referral_triggers',
        why: 'the handoff is Guardian to Companion only',
      },
      {
        role: 'bloom_labs',
        table: 'users',
        why: 'Labs holds no identity',
      },
    ];

    for (const { role, table, why } of cases) {
      it(`refuses ${role} reading ${table} — ${why}`, async () => {
        /*
         * `SELECT *`, not `SELECT 1`.
         *
         * `SELECT 1` reads no column, so PostgreSQL allows it against any
         * table where the role holds a privilege on *some* column — which
         * Guardian does on the three erasure tables. The first draft of this
         * suite used it and passed while Guardian could still read every
         * word of a bug report. The star is the honest probe: it demands
         * every column, and so fails the moment any of them is readable.
         */
        await expect(as(role).unsafe(`SELECT * FROM ${SCHEMA}.${table}`)).rejects.toThrow(
          DENIED,
        );
      });
    }

    it('refuses Companion inserting a referral it could then pay itself for', async () => {
      /*
       * The one fraud the handoff is genuinely exposed to. Companion claims
       * and settles referrals, so if it could also create them it could
       * manufacture the thing it pays for. Guardian observes the join;
       * Companion only ever settles what Guardian recorded.
       */
      await expect(
        as('bloom_companion').unsafe(
          `INSERT INTO ${SCHEMA}.referral_triggers
             (guild_id, referred_user_id, inviter_user_id, source, state, idempotency_key)
           VALUES ('${GUILD}', '${MEMBER}', '${MEMBER}', 'invite_diff', 'qualified', 'forged-key')`,
        ),
      ).rejects.toThrow(DENIED);
    });

    it('refuses every runtime role the migration bookkeeping table', async () => {
      // A bot that can write this can convince the migrator a migration ran.
      for (const role of ROLES) {
        await expect(
          as(role).unsafe(`SELECT 1 FROM ${SCHEMA}.schema_migrations`),
        ).rejects.toThrow(DENIED);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Erasure: the deliberate exception, and its limits
  // ---------------------------------------------------------------------------

  describe('erasure is column-scoped', () => {
    it('lets Guardian blank a point reason', async () => {
      await expect(
        as('bloom_guardian').unsafe(
          `UPDATE ${SCHEMA}.point_events SET reason = NULL WHERE guild_id = '${GUILD}'`,
        ),
      ).resolves.toBeDefined();
    });

    it('refuses Guardian changing the points themselves', async () => {
      /*
       * The whole reason this is a column grant and not a table grant. With
       * UPDATE on the table, the bot that handles moderation could rewrite
       * the economy — and the ledger's own integrity rules live in
       * application code, which would never see it.
       */
      await expect(
        as('bloom_guardian').unsafe(
          `UPDATE ${SCHEMA}.point_events SET points = 9999 WHERE guild_id = '${GUILD}'`,
        ),
      ).rejects.toThrow(DENIED);
    });

    it('refuses Guardian reading what the economy paid', async () => {
      /*
       * Guardian can see which rows belong to a member and what text they
       * carry, because it cannot target an erasure otherwise. It cannot see
       * the number. That split is the whole point of the column grant, and
       * it is the assertion that would fail if someone widened the grant to
       * the table for convenience.
       */
      await expect(
        as('bloom_guardian').unsafe(
          `SELECT points FROM ${SCHEMA}.point_events WHERE guild_id = '${GUILD}'`,
        ),
      ).rejects.toThrow(DENIED);

      await expect(
        as('bloom_guardian').unsafe(`SELECT * FROM ${SCHEMA}.point_events`),
      ).rejects.toThrow(DENIED);

      // What it may read: enough to find the rows, and the text it erases.
      await expect(
        as('bloom_guardian').unsafe(
          `SELECT guild_id, user_id, reason FROM ${SCHEMA}.point_events WHERE guild_id = '${GUILD}'`,
        ),
      ).resolves.toBeDefined();
    });

    it('refuses Guardian reading a bug report\u2019s contents beyond the erasure columns', async () => {
      await expect(
        as('bloom_guardian').unsafe(
          `SELECT resolution FROM ${SCHEMA}.bug_reports WHERE guild_id = '${GUILD}'`,
        ),
      ).rejects.toThrow(DENIED);
    });

    it('refuses Guardian changing a bug report\u2019s status', async () => {
      await expect(
        as('bloom_guardian').unsafe(
          `UPDATE ${SCHEMA}.bug_reports SET status = 'TRIAGED' WHERE guild_id = '${GUILD}'`,
        ),
      ).rejects.toThrow(DENIED);
    });

    it('lets Guardian tombstone the text a member wrote', async () => {
      await expect(
        as('bloom_guardian').unsafe(
          `UPDATE ${SCHEMA}.bug_reports
           SET summary = '[erased]', steps = '[erased]', expected = NULL, updated_at = now()
           WHERE guild_id = '${GUILD}'`,
        ),
      ).resolves.toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // The audit trail
  // ---------------------------------------------------------------------------

  describe('audit events are append-only at the database', () => {
    /*
     * Previously an application convention: no repository method updates or
     * deletes an audit row. Now it is a privilege, which means it survives a
     * raw query, a future repository method, and anyone who decides a
     * particular row is embarrassing.
     */
    for (const role of ROLES) {
      it(`refuses ${role} updating an audit row`, async () => {
        await expect(
          as(role).unsafe(`UPDATE ${SCHEMA}.audit_events SET severity = 'info'`),
        ).rejects.toThrow(DENIED);
      });

      it(`refuses ${role} deleting an audit row`, async () => {
        await expect(
          as(role).unsafe(`DELETE FROM ${SCHEMA}.audit_events`),
        ).rejects.toThrow(DENIED);
      });
    }
  });

  // ---------------------------------------------------------------------------
  // DDL denial
  // ---------------------------------------------------------------------------

  describe('no runtime role may change the shape of the database', () => {
    for (const role of ROLES) {
      it(`refuses ${role} creating a table in the schema`, async () => {
        await expect(
          as(role).unsafe(`CREATE TABLE ${SCHEMA}.evil (id int)`),
        ).rejects.toThrow(DENIED);
      });

      it(`refuses ${role} dropping a table`, async () => {
        await expect(
          as(role).unsafe(`DROP TABLE ${SCHEMA}.audit_events`),
        ).rejects.toThrow(DENIED);
      });

      it(`refuses ${role} adding a column`, async () => {
        await expect(
          as(role).unsafe(`ALTER TABLE ${SCHEMA}.audit_events ADD COLUMN x int`),
        ).rejects.toThrow(DENIED);
      });

      it(`refuses ${role} creating a table in public`, async () => {
        // The usual escape hatch when the real schema is locked down.
        await expect(
          as(role).unsafe('CREATE TABLE public.evil (id int)'),
        ).rejects.toThrow(DENIED);
      });

      it(`refuses ${role} truncating a table`, async () => {
        // TRUNCATE is a separate privilege from DELETE and is granted nowhere.
        await expect(as(role).unsafe(`TRUNCATE ${SCHEMA}.audit_events`)).rejects.toThrow(
          DENIED,
        );
      });
    }

    it('refuses a runtime role creating a role', async () => {
      await expect(
        as('bloom_guardian').unsafe('CREATE ROLE sneaky LOGIN'),
      ).rejects.toThrow(/permission denied|must have/i);
    });

    it('confirms no runtime role is a superuser or can bypass RLS', async () => {
      const rows = await admin.unsafe(
        `SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls
         FROM pg_roles WHERE rolname IN ('bloom_guardian','bloom_companion','bloom_labs','bloom_migrator')`,
      );
      expect(rows).toHaveLength(4);
      for (const row of rows) {
        expect(row['rolsuper']).toBe(false);
        expect(row['rolcreatedb']).toBe(false);
        expect(row['rolcreaterole']).toBe(false);
        expect(row['rolbypassrls']).toBe(false);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // The migration role
  // ---------------------------------------------------------------------------

  describe('the migration role', () => {
    it('may create and drop objects', async () => {
      await as('migrator').unsafe(`CREATE TABLE ${SCHEMA}.migrator_probe (id int)`);
      await as('migrator').unsafe(`DROP TABLE ${SCHEMA}.migrator_probe`);
    });

    it('may read and write the migration bookkeeping table', async () => {
      await expect(
        as('migrator').unsafe(`SELECT 1 FROM ${SCHEMA}.schema_migrations`),
      ).resolves.toBeDefined();
    });

    it('is not a superuser', async () => {
      // Membership of bloom_owner is enough for DDL. Superuser would also
      // bypass every grant in this file.
      const rows = await admin.unsafe(
        `SELECT rolsuper FROM pg_roles WHERE rolname = 'bloom_migrator'`,
      );
      expect(rows[0]?.['rolsuper']).toBe(false);
    });

    it('is not reachable from any runtime role', async () => {
      /*
       * The property that makes "runtime bots must not receive migration
       * credentials" structural rather than procedural: even given the
       * migrator's name, a bot cannot assume it.
       */
      for (const role of ROLES) {
        await expect(as(role).unsafe('SET ROLE bloom_migrator')).rejects.toThrow(
          /permission denied|must be (a )?member/i,
        );
        await expect(as(role).unsafe('SET ROLE bloom_owner')).rejects.toThrow(
          /permission denied|must be (a )?member/i,
        );
      }
    });

    it('owns nothing itself — the owner role does', async () => {
      const rows = await admin.unsafe(
        `SELECT count(*)::int AS n FROM pg_tables
         WHERE schemaname = '${SCHEMA}' AND tableowner <> 'bloom_owner'`,
      );
      expect(rows[0]?.['n']).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // The other half: each bot can still do its job
  // ---------------------------------------------------------------------------

  describe('each bot can do its own work', () => {
    it('Guardian can run the onboarding and case path', async () => {
      const guardian = as('bloom_guardian');
      await guardian.unsafe(
        `INSERT INTO ${SCHEMA}.users (user_id, username, is_bot)
         VALUES ('${MEMBER}', 'tester', false)
         ON CONFLICT (user_id) DO UPDATE SET username = EXCLUDED.username`,
      );
      await guardian.unsafe(
        `INSERT INTO ${SCHEMA}.guild_members (guild_id, user_id, onboarding_state)
         VALUES ('${GUILD}', '${MEMBER}', 'unverified')
         ON CONFLICT (guild_id, user_id) DO NOTHING`,
      );
      await guardian.unsafe(
        `INSERT INTO ${SCHEMA}.audit_events (guild_id, bot_name, event, severity, source)
         VALUES ('${GUILD}', 'guardian', 'test.event', 'info', 'privilege-test')`,
      );
      const rows = await guardian.unsafe(
        `SELECT count(*)::int AS n FROM ${SCHEMA}.guild_members WHERE guild_id = '${GUILD}'`,
      );
      expect(Number(rows[0]?.['n'])).toBeGreaterThan(0);
    });

    it('Companion can write the ledger and read it back', async () => {
      const companion = as('bloom_companion');
      await companion.unsafe(
        `INSERT INTO ${SCHEMA}.point_events
           (guild_id, user_id, kind, points, idempotency_key)
         VALUES ('${GUILD}', '${MEMBER}', 'check_in', 5, 'privilege-test-ledger')
         ON CONFLICT (guild_id, idempotency_key) DO NOTHING`,
      );
      const rows = await companion.unsafe(
        `SELECT coalesce(sum(points), 0)::int AS total
         FROM ${SCHEMA}.point_events WHERE guild_id = '${GUILD}'`,
      );
      expect(Number(rows[0]?.['total'])).toBeGreaterThanOrEqual(0);
    });

    it('Labs can file a bug, which needs the one real sequence', async () => {
      /*
       * `bug_events.id` is the schema's only bigserial. Identity columns
       * carry their sequence privileges with the table; this one does not,
       * and forgetting the grant breaks inserts at runtime and nowhere else.
       */
      const labs = as('bloom_labs');
      await labs.unsafe(
        `INSERT INTO ${SCHEMA}.bug_counters (guild_id, next_number)
         VALUES ('${GUILD}', 2)
         ON CONFLICT (guild_id) DO UPDATE SET next_number = ${SCHEMA}.bug_counters.next_number + 1`,
      );
      const bug = await labs.unsafe(
        `INSERT INTO ${SCHEMA}.bug_reports
           (guild_id, bug_number, reporter_id, area, summary, steps)
         VALUES ('${GUILD}', ${String(Math.floor(Date.now() / 1000) % 1_000_000)}, '${MEMBER}', 'other',
                 'privilege probe bug report',
                 'open the app, then look at the screen')
         RETURNING id`,
      );
      const bugId = bug[0]?.['id'];
      expect(bugId).toBeDefined();

      // The insert that actually consumes the sequence.
      await labs.unsafe(
        `INSERT INTO ${SCHEMA}.bug_events (bug_id, to_status, actor_id)
         VALUES ('${String(bugId)}', 'TRIAGED', '${MEMBER}')`,
      );
    });

    it('all three can claim a job run', async () => {
      // `succeeded`, not `running`: a partial unique index allows only one
      // active run per job key, and a probe that left one behind would make
      // the suite fail on its second run rather than on a real regression.
      for (const role of ROLES) {
        await as(role).unsafe(
          `INSERT INTO ${SCHEMA}.job_runs
             (job_key, guild_id, bot_name, status, runner_id, lease_expires_at, finished_at)
           VALUES ('privileges.probe.${role}', '${GUILD}', '${roleToBot(role)}',
                   'succeeded', 'privilege-test', now(), now())`,
        );
      }
    });

    it('all three can record telemetry', async () => {
      for (const role of ROLES) {
        await as(role).unsafe(
          `INSERT INTO ${SCHEMA}.command_usage
             (guild_id, bot_name, actor_id, command, outcome, duration_ms)
           VALUES ('${GUILD}', '${roleToBot(role)}', '${MEMBER}', 'probe', 'success', 1)`,
        );
      }
    });
  });
});

function roleToBot(role: Role): string {
  return role.replace('bloom_', '');
}
