/**
 * M-242 - the slice of the cloudflare:workers module this app
 * uses. The repo does not carry @cloudflare/workers-types, and
 * the only binding the observability layer reads is `env` (the
 * Worker's vars and secrets as a plain record). Declared here,
 * next to its only consumer, so tsc can check the dynamic import
 * in latency.ts; at runtime the platform provides the real
 * module, and off-platform the import simply fails and is caught.
 */
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
