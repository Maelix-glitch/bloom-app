import { createServer, type Server } from 'node:http';
import type { BotName } from '@bloom/shared-types';
import type { Logger } from '@bloom/logging';
import type { GatewayStatus } from './ports.js';
import type { PeerHealth } from './heartbeat.js';

/**
 * Health reporting.
 *
 * The brief's constraint here is unusually blunt: never report a component as
 * healthy without checking it. So every check below performs real work — the
 * database check issues a query, the gateway check reads the live websocket
 * state — and a check that cannot be performed reports `unknown`, which is not
 * the same as `up`.
 */
export type ComponentStatus = 'up' | 'degraded' | 'down' | 'unknown';

export interface ComponentHealth {
  readonly status: ComponentStatus;
  readonly detail: string;
  readonly latencyMs?: number;
  readonly checkedAt: string;
}

export interface HealthSnapshot {
  readonly status: ComponentStatus;
  readonly bot: BotName;
  readonly version: string;
  readonly environment: string;
  readonly uptimeSeconds: number;
  readonly components: Readonly<Record<string, ComponentHealth>>;
}

export interface HealthCheck {
  readonly name: string;
  /** Must actually exercise the dependency. A check that returns a constant is a lie. */
  run(): Promise<Omit<ComponentHealth, 'checkedAt'>>;
}

export interface HealthReporterOptions {
  readonly bot: BotName;
  readonly version: string;
  readonly environment: string;
  readonly checks: readonly HealthCheck[];
  /** Per-check ceiling. A hung dependency must not hang the health endpoint. */
  readonly checkTimeoutMs?: number;
}

export class HealthReporter {
  private readonly startedAt = Date.now();

  public constructor(private readonly options: HealthReporterOptions) {}

  public async snapshot(): Promise<HealthSnapshot> {
    const timeout = this.options.checkTimeoutMs ?? 3_000;

    const entries = await Promise.all(
      this.options.checks.map(async (check) => {
        const startedAt = Date.now();
        try {
          const result = await withDeadline(check.run(), timeout);
          return [
            check.name,
            { ...result, checkedAt: new Date().toISOString() },
          ] as const;
        } catch (error) {
          return [
            check.name,
            {
              status: 'down' as const,
              detail:
                error instanceof Error
                  ? `Check failed: ${error.message}`
                  : 'Check failed for an unknown reason.',
              latencyMs: Date.now() - startedAt,
              checkedAt: new Date().toISOString(),
            },
          ] as const;
        }
      }),
    );

    const components = Object.fromEntries(entries);
    return {
      status: worstOf(entries.map(([, health]) => health.status)),
      bot: this.options.bot,
      version: this.options.version,
      environment: this.options.environment,
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      components,
    };
  }
}

/**
 * The aggregate is the worst component, never an average.
 *
 * "Two of three subsystems are fine" is not a useful thing to tell a load
 * balancer when the third is the database.
 */
function worstOf(statuses: readonly ComponentStatus[]): ComponentStatus {
  if (statuses.includes('down')) return 'down';
  if (statuses.includes('degraded')) return 'degraded';
  if (statuses.includes('unknown')) return 'unknown';
  return statuses.length === 0 ? 'unknown' : 'up';
}

async function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Health check exceeded ${String(ms)}ms.`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Gateway check, reading the live connection state rather than a cached flag. */
export function gatewayCheck(status: () => GatewayStatus): HealthCheck {
  return {
    name: 'discord_gateway',
    run: () => {
      const current = status();

      if (!current.connected) {
        return Promise.resolve({
          status: 'down' as const,
          detail: 'Websocket is not connected.',
        });
      }

      if (current.pingMs === null) {
        return Promise.resolve({
          status: 'unknown' as const,
          detail: 'Connected, but no heartbeat has completed yet.',
        });
      }

      // Discord's own heartbeats are 41.25s apart; a round trip in the
      // hundreds of milliseconds is normal, seconds is not.
      const degraded = current.pingMs > 1_000;
      return Promise.resolve({
        status: degraded ? ('degraded' as const) : ('up' as const),
        detail: degraded
          ? `Connected, but the heartbeat round trip is ${String(current.pingMs)}ms.`
          : 'Connected.',
        latencyMs: current.pingMs,
      });
    },
  };
}

/** Database check. Takes a ping function so this module stays driver-agnostic. */
export function databaseCheck(ping: () => Promise<number>): HealthCheck {
  return {
    name: 'database',
    run: async () => {
      const latencyMs = await ping();
      const degraded = latencyMs > 500;
      return {
        status: degraded ? ('degraded' as const) : ('up' as const),
        detail: degraded
          ? `Reachable, but a round trip took ${String(latencyMs)}ms.`
          : 'Reachable.',
        latencyMs,
      };
    },
  };
}

export interface HealthServerOptions {
  readonly port: number;
  readonly reporter: HealthReporter;
  readonly logger: Logger;
  /**
   * What the other bots last said about themselves, if anything.
   *
   * Reported alongside this process's own status and never folded into it: a
   * peer being down is information, not a reason to fail this bot's readiness
   * probe and pull a working process out of service.
   */
  readonly peers?: () => Promise<readonly PeerHealth[]>;
}

/**
 * A minimal HTTP surface for orchestrators.
 *
 *   GET /health  — full snapshot; 200 when up or degraded, 503 when down.
 *   GET /ready   — 200 only when everything is up. Used as a readiness gate.
 *
 * No framework: two routes do not justify a dependency, and a smaller surface
 * on a port that may be reachable from the cluster is worth having.
 */
export function startHealthServer(options: HealthServerOptions): Server {
  const server = createServer((request, response) => {
    void (async () => {
      const path = (request.url ?? '/').split('?')[0];

      if (request.method !== 'GET' || (path !== '/health' && path !== '/ready')) {
        response.writeHead(404, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ error: 'not_found' }));
        return;
      }

      const snapshot = await options.reporter.snapshot();
      const healthy =
        path === '/ready' ? snapshot.status === 'up' : snapshot.status !== 'down';

      /*
       * Peers are best-effort. If reading them fails, this endpoint still
       * answers about the thing it is actually responsible for.
       */
      let peers: readonly PeerHealth[] | null = null;
      if (options.peers) {
        try {
          peers = await options.peers();
        } catch {
          peers = null;
        }
      }

      response.writeHead(healthy ? 200 : 503, {
        'content-type': 'application/json',
        'cache-control': 'no-store',
      });
      response.end(JSON.stringify({ ...snapshot, peers }, null, 2));
    })().catch((error: unknown) => {
      options.logger.error('health.server_error', 'Health endpoint failed.', { error });
      if (!response.headersSent) {
        response.writeHead(500, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ status: 'down', error: 'health_check_failed' }));
      }
    });
  });

  server.listen(options.port, () => {
    options.logger.info(
      'health.listening',
      `Health endpoint listening on port ${String(options.port)}.`,
    );
  });

  return server;
}
