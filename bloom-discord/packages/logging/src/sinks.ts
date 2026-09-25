import type { LogEvent, LogSeverity } from '@bloom/shared-types';
import type { LogSink } from './types.js';

/**
 * Production sink: one JSON object per line on stdout.
 *
 * stdout rather than a file, because every target this deploys to (Docker,
 * managed containers, a bare Node process under systemd) collects stdout, and a
 * log file inside a container is a log file nobody reads.
 *
 * `error` and `fatal` go to stderr so that container platforms which split the
 * two streams surface them correctly.
 */
export class JsonLogSink implements LogSink {
  public write(event: LogEvent): void {
    const line = `${JSON.stringify(event)}\n`;
    if (event.severity === 'error' || event.severity === 'fatal') {
      process.stderr.write(line);
    } else {
      process.stdout.write(line);
    }
  }
}

const SEVERITY_LABEL: Readonly<Record<LogSeverity, string>> = {
  trace: 'TRACE',
  debug: 'DEBUG',
  info: 'INFO ',
  warn: 'WARN ',
  error: 'ERROR',
  fatal: 'FATAL',
};

const SEVERITY_COLOUR: Readonly<Record<LogSeverity, string>> = {
  trace: '\u001b[90m',
  debug: '\u001b[36m',
  info: '\u001b[32m',
  warn: '\u001b[33m',
  error: '\u001b[31m',
  fatal: '\u001b[35m',
};

const RESET = '\u001b[0m';
const DIM = '\u001b[2m';

/**
 * Development sink: readable, still complete.
 *
 * Never enable this in production — LOG_PRETTY is validated to be false there,
 * because an aggregator cannot parse it and the colour codes end up in storage.
 */
export class PrettyLogSink implements LogSink {
  public constructor(private readonly useColour: boolean = process.stdout.isTTY) {}

  public write(event: LogEvent): void {
    const colour = this.useColour ? SEVERITY_COLOUR[event.severity] : '';
    const reset = this.useColour ? RESET : '';
    const dim = this.useColour ? DIM : '';

    const time = event.timestamp.slice(11, 23);
    const head = `${dim}${time}${reset} ${colour}${SEVERITY_LABEL[event.severity]}${reset} ${dim}${event.bot_name}${reset} ${event.event}`;

    const annotations: string[] = [];
    if (event.command) annotations.push(`cmd=${event.command}`);
    if (event.actor_id) annotations.push(`actor=${event.actor_id}`);
    if (event.target_id) annotations.push(`target=${event.target_id}`);
    if (event.channel_id) annotations.push(`channel=${event.channel_id}`);
    if (typeof event.duration_ms === 'number')
      annotations.push(`${String(event.duration_ms)}ms`);
    if (event.error_code) annotations.push(`code=${event.error_code}`);
    if (event.correlation_id) annotations.push(`cid=${event.correlation_id.slice(0, 8)}`);

    const suffix =
      annotations.length > 0 ? ` ${dim}(${annotations.join(' ')})${reset}` : '';
    let line = `${head} — ${event.message}${suffix}\n`;

    if (event.context && Object.keys(event.context).length > 0) {
      line += `${dim}        ${JSON.stringify(event.context)}${reset}\n`;
    }
    if (event.stack) {
      line += `${dim}${event.stack}${reset}\n`;
    }

    if (event.severity === 'error' || event.severity === 'fatal') {
      process.stderr.write(line);
    } else {
      process.stdout.write(line);
    }
  }
}

/** Fan out to several sinks. Used when adding an audit or alerting sink later. */
export class MultiSink implements LogSink {
  public constructor(private readonly sinks: readonly LogSink[]) {}

  public write(event: LogEvent): void {
    for (const sink of this.sinks) {
      try {
        sink.write(event);
      } catch {
        // A failing sink must never take down the process that is logging.
        // Deliberately silent: there is nowhere left to report it to.
      }
    }
  }
}
