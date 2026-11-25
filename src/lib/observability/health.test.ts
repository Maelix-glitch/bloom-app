/**
 * M-242 - /api/health's two honest answers: 200 with
 * { ok: true, db: "ok" } when the database check passes, and
 * 503 with { ok: false, db: "error" } for every failure shape -
 * a bad response, a network throw, or no configuration at all.
 * A health endpoint that guesses "fine" is worse than none.
 */
import { describe, expect, it, vi } from "vitest";

import { checkDatabase, handleHealth } from "./health";
import type { FetchImpl } from "./latency";

const ENV = {
  SUPABASE_URL: "https://proj.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
};

describe("checkDatabase", () => {
  it("passes when the service-role probe of latency_samples answers ok", async () => {
    const seen: string[] = [];
    const fetchImpl: FetchImpl = async (input) => {
      seen.push(input);
      return new Response("[]", { status: 200 });
    };
    await expect(checkDatabase(ENV, fetchImpl)).resolves.toBe(true);
    expect(seen[0]).toContain("/rest/v1/latency_samples?select=id&limit=1");
  });

  it("fails on a non-ok response and on a network throw", async () => {
    await expect(
      checkDatabase(ENV, async () => new Response("no", { status: 500 })),
    ).resolves.toBe(false);
    await expect(
      checkDatabase(ENV, async () => {
        throw new Error("down");
      }),
    ).resolves.toBe(false);
  });

  it("fails without configuration and never calls fetch", async () => {
    const fetchImpl = vi.fn<FetchImpl>(async () => new Response("[]", { status: 200 }));
    await expect(checkDatabase({}, fetchImpl)).resolves.toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("handleHealth", () => {
  it("answers 200 { ok: true, db: 'ok' } when healthy", async () => {
    const res = await handleHealth(ENV, async () => new Response("[]", { status: 200 }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    await expect(res.json()).resolves.toEqual({ ok: true, db: "ok" });
  });

  it("answers 503 { ok: false, db: 'error' } when the check fails", async () => {
    const res = await handleHealth(ENV, async () => new Response("no", { status: 503 }));
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ ok: false, db: "error" });
  });

  it("answers 503 when unconfigured", async () => {
    const res = await handleHealth({}, async () => new Response("[]", { status: 200 }));
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ ok: false, db: "error" });
  });
});
