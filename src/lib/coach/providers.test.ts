import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_PROVIDER,
  PROVIDERS,
  providerFor,
} from "./providers";

/**
 * The provider registry is split across two files that must agree:
 *
 *   src/lib/coach/providers.ts        — what the picker offers
 *   supabase/functions/coach/index.ts — what the server can actually call
 *
 * They're in different runtimes (browser vs Deno) so nothing links them at
 * compile time. A provider listed on the client but missing on the server is
 * a menu entry that fails every time it's chosen — and it fails *quietly*,
 * because the engine falls back to the on-device answer. You'd get a worse
 * answer with no indication why.
 *
 * These tests read the function's source and compare the two tables.
 */

const FUNCTION_SRC = readFileSync(
  join(process.cwd(), "supabase/functions/coach/index.ts"),
  "utf8",
);

/** Provider ids defined in the edge function's PROVIDERS map. */
function serverProviders(): string[] {
  const start = FUNCTION_SRC.indexOf("const PROVIDERS");
  expect(start, "the function has no PROVIDERS map").toBeGreaterThan(-1);
  /* Each entry starts a line with two spaces, an id, then `: {`. */
  const body = FUNCTION_SRC.slice(start);
  return [...body.matchAll(/^ {2}"?([a-z][a-z0-9-]*)"?: \{$/gm)].map((m) => m[1]!);
}

describe("client and server provider tables agree", () => {
  const server = serverProviders();
  const remote = PROVIDERS.filter((p) => p.remote).map((p) => p.id);

  it("finds the server's providers", () => {
    expect(server.length).toBeGreaterThan(0);
  });

  it("every remote provider in the picker exists on the server", () => {
    /* The failure this prevents: choosing a model that silently never works. */
    const orphans = remote.filter((id) => !server.includes(id));
    expect(orphans, `listed in the picker but not implemented server-side`).toEqual([]);
  });

  it("every server provider is offered in the picker", () => {
    /* Less serious — dead server code rather than a broken choice — but it
       means someone did half the job, so it's worth catching. */
    const hidden = server.filter((id) => !remote.includes(id));
    expect(hidden, "implemented server-side but not offered to anyone").toEqual([]);
  });
});

describe("the local provider", () => {
  it("is always registered", () => {
    /* engine.ts treats "local" as the guaranteed fallback; without it the
       coach could be completely mute when the network is down. */
    expect(PROVIDERS.some((p) => p.id === "local")).toBe(true);
  });

  it("is the only one that needs no network", () => {
    expect(PROVIDERS.filter((p) => !p.remote).map((p) => p.id)).toEqual(["local"]);
  });
});

describe("the registry itself", () => {
  it("has unique ids", () => {
    const ids = PROVIDERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every provider a name and a blurb", () => {
    for (const p of PROVIDERS) {
      expect(p.name.trim().length, p.id).toBeGreaterThan(0);
      /* The blurb sits under the name in a narrow menu — long ones wrap badly. */
      expect(p.blurb.trim().length, p.id).toBeGreaterThan(10);
      expect(p.blurb.length, p.id).toBeLessThan(90);
    }
  });

  it("has a default that actually exists", () => {
    expect(PROVIDERS.some((p) => p.id === DEFAULT_PROVIDER)).toBe(true);
  });

  it("falls back to the default for an unknown id", () => {
    /* A stored preference can outlive the provider it names. */
    expect(providerFor("a-model-that-was-removed").id).toBe(DEFAULT_PROVIDER);
  });
});

describe("the edge function's secrets", () => {
  it("reads a key per provider rather than hardcoding one", () => {
    /* Keys must only ever live in Supabase secrets — never in the client
       bundle, and never committed. */
    expect(FUNCTION_SRC).toMatch(/env:\s*"[A-Z_]+"/);
    expect(FUNCTION_SRC).toMatch(/Deno\.env\.get\(provider\.env\)/);
  });

  it("contains no literal API key", () => {
    /* sk-… prefixes for OpenAI and APInex. A key in source is an incident. */
    expect(FUNCTION_SRC).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
  });

  it("lets the model be changed without a redeploy", () => {
    /* Gateways rename and retire model ids; being able to fix that from the
       dashboard beats shipping a new function. */
    expect(FUNCTION_SRC).toMatch(/Deno\.env\.get\("COACH_MODEL/);
  });
});
