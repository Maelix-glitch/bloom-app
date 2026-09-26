#!/usr/bin/env tsx
/**
 * Container health probe.
 *
 *   pnpm health                       # checks http://127.0.0.1:$HEALTH_PORT/health
 *   pnpm health -- --ready            # readiness instead of liveness
 *   pnpm health -- --url http://…     # explicit target
 *
 * Used as the Docker HEALTHCHECK command. Exits 0 when the endpoint reports a
 * usable service and non-zero otherwise, which is the whole contract a
 * container runtime cares about.
 *
 * It deliberately does no checking of its own — it asks the running process,
 * which is the only thing that knows whether its gateway connection is alive.
 * A probe that independently pinged the database would happily report a healthy
 * bot that had been disconnected from Discord for an hour.
 */
interface HealthResponse {
  readonly status: string;
  readonly bot?: string;
  readonly components?: Record<string, { status: string; detail: string }>;
}

function valueOf(argv: readonly string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const path = argv.includes('--ready') ? '/ready' : '/health';
  const port = process.env['HEALTH_PORT'] ?? '8080';
  const url = valueOf(argv, '--url') ?? `http://127.0.0.1:${port}${path}`;

  // A probe that can hang is a probe that stops being a probe.
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, 5_000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const body = (await response.json()) as HealthResponse;

    process.stdout.write(`${String(response.status)} ${body.status}\n`);
    for (const [name, component] of Object.entries(body.components ?? {})) {
      process.stdout.write(`  ${name}: ${component.status} — ${component.detail}\n`);
    }

    process.exit(response.ok ? 0 : 1);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      `Health endpoint unreachable at ${url}: ${reason}\n` +
        'If the process is running, check that HEALTH_PORT matches and that the endpoint was enabled (it is skipped when HEALTH_PORT is unset).\n',
    );
    process.exit(1);
  } finally {
    clearTimeout(timer);
  }
}

await main();
