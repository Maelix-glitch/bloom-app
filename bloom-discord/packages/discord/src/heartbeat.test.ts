import { describe, expect, it, vi } from 'vitest';
import type { BotName } from '@bloom/shared-types';
import type { HealthSnapshot, TelemetryRepository } from '@bloom/database';
import { createLogger, JsonLogSink } from '@bloom/logging';
import {
  Heartbeat,
  readPeers,
  HEARTBEAT_STALE_AFTER_SECONDS,
  type HeartbeatOptions,
} from './heartbeat.js';
import type { GatewayStatus } from './ports.js';

/**
 * A local telemetry stub.
 *
 * `@bloom/testing` depends on `@bloom/discord`, so nothing here may import the
 * shared fakes without creating a cycle. It stores what it is given rather than
 * returning constants — a stub that answers `[]` to every read would let this
 * whole file pass against an implementation that does nothing.
 */
class StubTelemetry implements TelemetryRepository {
  public readonly rows = new Map<BotName, HealthSnapshot>();
  public writes = 0;
  public failNextWrite = false;

  public recordCommand(): Promise<void> {
    return Promise.resolve();
  }

  public errorStats(): Promise<{
    total: number;
    errors: number;
    lastErrorAt: Date | null;
  }> {
    return Promise.resolve({ total: 0, errors: 0, lastErrorAt: null });
  }

  public writeHealth(snapshot: Omit<HealthSnapshot, 'observedAt'>): Promise<void> {
    if (this.failNextWrite) {
      this.failNextWrite = false;
      return Promise.reject(new Error('connection terminated'));
    }
    this.writes += 1;
    this.rows.set(snapshot.botName, { ...snapshot, observedAt: new Date() });
    return Promise.resolve();
  }

  public readHealth(botName: BotName): Promise<HealthSnapshot | null> {
    return Promise.resolve(this.rows.get(botName) ?? null);
  }

  public readAllHealth(): Promise<readonly HealthSnapshot[]> {
    return Promise.resolve([...this.rows.values()]);
  }

  /** Backdate a row, to model a process that stopped writing. */
  public age(botName: BotName, secondsAgo: number): void {
    const row = this.rows.get(botName);
    if (!row) throw new Error(`no row for ${botName}`);
    this.rows.set(botName, {
      ...row,
      observedAt: new Date(Date.now() - secondsAgo * 1000),
    });
  }
}

function connected(pingMs: number | null = 42): () => GatewayStatus {
  return () => ({ connected: true, pingMs, uptimeMs: 1_000, applicationId: null });
}

function testLogger(): ReturnType<typeof createLogger> {
  return createLogger({
    botName: 'platform',
    environment: 'development',
    version: '0.0.0-test',
    level: 'fatal',
    sink: new JsonLogSink(),
  });
}

function heartbeat(
  telemetry: TelemetryRepository,
  overrides: Partial<HeartbeatOptions> = {},
): Heartbeat {
  return new Heartbeat({
    bot: 'guardian',
    version: '1.2.3',
    environment: 'production',
    telemetry,
    logger: testLogger(),
    gatewayStatus: connected(),
    databaseOk: () => Promise.resolve(true),
    ...overrides,
  });
}

describe('Heartbeat', () => {
  it('writes immediately on start, before the first interval elapses', async () => {
    const telemetry = new StubTelemetry();
    const beat = heartbeat(telemetry);

    beat.start();
    await vi.waitFor(() => {
      expect(telemetry.writes).toBe(1);
    });
    beat.stop();

    // A bot that starts and then dies should still leave a trace of having
    // started, rather than looking like it never ran.
    expect(telemetry.rows.get('guardian')).toBeDefined();
  });

  it('records the live gateway state rather than an assumption', async () => {
    const telemetry = new StubTelemetry();
    const beat = heartbeat(telemetry, {
      gatewayStatus: () => ({
        connected: false,
        pingMs: null,
        uptimeMs: 0,
        applicationId: null,
      }),
    });

    beat.start();
    await vi.waitFor(() => {
      expect(telemetry.writes).toBe(1);
    });
    beat.stop();

    const row = telemetry.rows.get('guardian');
    expect(row?.gatewayConnected).toBe(false);
    expect(row?.gatewayPingMs).toBeNull();
  });

  it('records a failing database as not ok, and still writes the row', async () => {
    const telemetry = new StubTelemetry();
    const beat = heartbeat(telemetry, { databaseOk: () => Promise.resolve(false) });

    beat.start();
    await vi.waitFor(() => {
      expect(telemetry.writes).toBe(1);
    });
    beat.stop();

    expect(telemetry.rows.get('guardian')?.databaseOk).toBe(false);
  });

  it('keeps one instance id across beats, so a restart is distinguishable', async () => {
    const telemetry = new StubTelemetry();
    const beat = heartbeat(telemetry, { intervalSeconds: 0.01 });

    beat.start();
    await vi.waitFor(() => {
      expect(telemetry.writes).toBeGreaterThan(2);
    });
    beat.stop();

    const first = telemetry.rows.get('guardian');
    expect(first?.instanceId).toBeTruthy();

    // A second process gets a different id. Without that, a crash loop and a
    // healthy process both produce a recent observed_at and look identical.
    const other = new StubTelemetry();
    const second = heartbeat(other);
    second.start();
    await vi.waitFor(() => {
      expect(other.writes).toBe(1);
    });
    second.stop();

    expect(other.rows.get('guardian')?.instanceId).not.toBe(first?.instanceId);
  });

  it('survives a write failure instead of taking the bot down', async () => {
    const telemetry = new StubTelemetry();
    telemetry.failNextWrite = true;
    const beat = heartbeat(telemetry, { intervalSeconds: 0.01 });

    beat.start();
    // The failure is swallowed: a bot serving members perfectly well must not
    // fall over because it could not write a row saying so. The stale row is
    // itself the signal.
    await vi.waitFor(() => {
      expect(telemetry.writes).toBeGreaterThan(0);
    });
    beat.stop();
  });

  it('stops writing once stopped', async () => {
    const telemetry = new StubTelemetry();
    const beat = heartbeat(telemetry, { intervalSeconds: 0.01 });

    beat.start();
    await vi.waitFor(() => {
      expect(telemetry.writes).toBeGreaterThan(1);
    });
    beat.stop();

    const afterStop = telemetry.writes;
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(telemetry.writes).toBe(afterStop);
  });

  it('is idempotent on start, so a double start does not double the rate', async () => {
    const telemetry = new StubTelemetry();
    const beat = heartbeat(telemetry, { intervalSeconds: 0.05 });

    beat.start();
    beat.start();
    await vi.waitFor(() => {
      expect(telemetry.writes).toBeGreaterThan(0);
    });
    beat.stop();

    // Two intervals would write twice as often and, worse, only one of them
    // would be cleared on stop.
    await new Promise((resolve) => setTimeout(resolve, 60));
    const settled = telemetry.writes;
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(telemetry.writes).toBe(settled);
  });
});

describe('readPeers', () => {
  async function seed(): Promise<StubTelemetry> {
    const telemetry = new StubTelemetry();
    for (const bot of ['guardian', 'companion', 'labs'] as const) {
      await telemetry.writeHealth({
        botName: bot,
        instanceId: `instance-${bot}`,
        version: '1.2.3',
        environment: 'production',
        gatewayConnected: true,
        gatewayPingMs: 40,
        databaseOk: true,
        startedAt: new Date(),
        commandsHandled: 0,
        errorsTotal: 0,
        lastCommandAt: null,
        lastErrorAt: null,
        lastErrorCode: null,
        details: {},
      });
    }
    return telemetry;
  }

  it('reports the other bots and never itself', async () => {
    const telemetry = await seed();

    const peers = await readPeers(telemetry, 'guardian');

    expect(peers.map((peer) => peer.bot).sort()).toEqual(['companion', 'labs']);
  });

  it('reports age, not liveness', async () => {
    const telemetry = await seed();

    const peers = await readPeers(telemetry, 'guardian');
    const peer = peers[0];

    expect(peer).toBeDefined();
    expect(peer?.lastSeenSecondsAgo).toBeTypeOf('number');
    // There is deliberately no "online" field. A stored row is a statement
    // about a moment in the past, and rendering it as a present-tense claim is
    // exactly what the table's own comment warns against.
    expect(peer).not.toHaveProperty('online');
    expect(peer).not.toHaveProperty('up');
  });

  it('marks a row stale once three heartbeats have been missed', async () => {
    const telemetry = await seed();
    telemetry.age('labs', HEARTBEAT_STALE_AFTER_SECONDS + 1);

    const peers = await readPeers(telemetry, 'guardian');

    expect(peers.find((peer) => peer.bot === 'labs')?.stale).toBe(true);
    expect(peers.find((peer) => peer.bot === 'companion')?.stale).toBe(false);
  });

  it('does not call a row stale while it is still within the window', async () => {
    const telemetry = await seed();
    telemetry.age('labs', HEARTBEAT_STALE_AFTER_SECONDS - 5);

    const peers = await readPeers(telemetry, 'guardian');

    // One missed write is a slow query or a redeployment, not an outage.
    expect(peers.find((peer) => peer.bot === 'labs')?.stale).toBe(false);
  });

  it('still reports a stale peer that claims its gateway was connected', async () => {
    const telemetry = await seed();
    telemetry.age('companion', 3_600);

    const peers = await readPeers(telemetry, 'guardian');
    const companion = peers.find((peer) => peer.bot === 'companion');

    // The stored flag says "connected" because that is what was true an hour
    // ago. Both facts are reported; the reader is told how old they are.
    expect(companion?.gatewayConnected).toBe(true);
    expect(companion?.stale).toBe(true);
    expect(companion?.lastSeenSecondsAgo).toBeGreaterThan(3_000);
  });

  it('returns nothing when no bot has ever written a heartbeat', async () => {
    const peers = await readPeers(new StubTelemetry(), 'guardian');

    // An empty list, not an invented set of three bots reported as unknown.
    expect(peers).toEqual([]);
  });
});
