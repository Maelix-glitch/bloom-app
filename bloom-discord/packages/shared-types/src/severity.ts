/**
 * Log severities, ordered. Used by the logger for threshold filtering and by
 * the error catalog to say how loudly a given failure should be reported.
 */
export const LOG_SEVERITIES = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
] as const;

export type LogSeverity = (typeof LOG_SEVERITIES)[number];

const SEVERITY_RANK: Readonly<Record<LogSeverity, number>> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

export function severityRank(severity: LogSeverity): number {
  return SEVERITY_RANK[severity];
}

export function isSeverityEnabled(
  severity: LogSeverity,
  threshold: LogSeverity,
): boolean {
  return SEVERITY_RANK[severity] >= SEVERITY_RANK[threshold];
}

export function isLogSeverity(value: unknown): value is LogSeverity {
  return (
    typeof value === 'string' && (LOG_SEVERITIES as readonly string[]).includes(value)
  );
}
