/**
 * Bloom — Capacitor post-build.
 *
 * TanStack Start's SPA mode emits the bootable app as dist/client/_shell.html
 * (plus a prerender attempt that doesn't always write index.html). The native
 * shell — and any static host — needs dist/client/index.html, so: copy it.
 *
 * Run via `npm run build:app`, or by hand after a BLOOM_TARGET=capacitor build.
 */
import { copyFileSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const client = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "client");
const shell = join(client, "_shell.html");
const index = join(client, "index.html");

if (!existsSync(shell)) {
  console.error("app-postbuild: dist/client/_shell.html not found — run the capacitor build first.");
  process.exit(1);
}
copyFileSync(shell, index);
console.log(
  `app-postbuild: index.html ready (${(statSync(index).size / 1024).toFixed(1)} KB) → webDir is dist/client`,
);
