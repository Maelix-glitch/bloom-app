/**
 * M-242 - the latency sampler's contract: the sampling decision
 * (slow always, 1-in-10 otherwise), the percentile math (pinned
 * to Postgres percentile_cont semantics, which the SQL view
 * uses), the path exclusions, and the fire-and-forget write that
 * must never throw, never reject and never happen at all when
 * the service-role key is not configured.
 */
import { describe, expect, it, vi } from "vitest";

import {
  isSampledPath,
  percentileCont,
  primeServerEnv,
  recordLatencySample,
  resolveServerConfig,
  shouldSample,
  withLatencySampling,
  type FetchImpl,
  type LatencySample,
} from "./latency";

const ENV = {
  SUPABASE_URL: "https://proj.supabase.co/",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
};

const SAMPLE: LatencySample = {
  route: "/nutrition",
  method: "GET",
  status: 200,
  duration_ms: 1500,
  region: null,
};

describe("shouldSample", () => {
  it("always keeps a request slower than 1000 ms, whatever the roll", () => {
    expect(shouldSample(1001, 0.99)).toBe(true);
    expect(shouldSample(60_000, 1)).toBe(true);
  });

  it("keeps a fast request only inside the 1-in-10 rate", () => {
    expect(shouldSample(120, 0)).toBe(true);
    expect(shouldSample(120, 0.099)).toBe(true);
    expect(shouldSample(120, 0.1)).toBe(false);
    expect(shouldSample(120, 0.9)).toBe(false);
  });

  it("treats exactly 1000 ms as fast (the slow line is strictly over)", () => {
    expect(shouldSample(1000, 0.99)).toBe(false);
    expect(shouldSample(1000, 0.05)).toBe(true);
  });
});

describe("percentileCont (Postgres percentile_cont semantics)", () => {
  it("is null for no values and the value itself for one", () => {
    expect(percentileCont([], 0.5)).toBeNull();
    expect(percentileCont([42], 0.99)).toBe(42);
  });

  it("interpolates linearly between neighbours", () => {
    const values = [10, 20, 30, 40];
    expect(percentileCont(values, 0)).toBe(10);
    expect(percentileCont(values, 0.5)).toBe(25);
    expect(percentileCont(values, 0.95)).toBeCloseTo(38.5);
    expect(percentileCont(values, 0.99)).toBeCloseTo(39.7);
    expect(percentileCont(values, 1)).toBe(40);
  });

  it("sorts a copy and never mutates its input", () => {
    const values = [40, 10, 30, 20];
    expect(percentileCont(values, 0.5)).toBe(25);
    expect(values).toEqual([40, 10, 30, 20]);
  });
});

describe("isSampledPath", () => {
  it("samples app routes", () => {
    expect(isSampledPath("/")).toBe(true);
    expect(isSampledPath("/nutrition")).toBe(true);
    expect(isSampledPath("/profile")).toBe(true);
  });

  it("never samples the health endpoint, api paths, assets or files", () => {
    expect(isSampledPath("/api/health")).toBe(false);
    expect(isSampledPath("/api/anything")).toBe(false);
    expect(isSampledPath("/assets/index-abc.js")).toBe(false);
    expect(isSampledPath("/favicon.ico")).toBe(false);
    expect(isSampledPath("/sw.js")).toBe(false);
  });
});

describe("resolveServerConfig", () => {
  it("reads the runtime env and trims the URL's trailing slash", () => {
    const config = resolveServerConfig(ENV);
    expect(config.url).toBe("https://proj.supabase.co");
    expect(config.serviceRoleKey).toBe("service-key");
  });

  it("has no service key when the env does not provide one", () => {
    expect(resolveServerConfig({}).serviceRoleKey).toBeNull();
    expect(resolveServerConfig(null).serviceRoleKey).toBeNull();
    expect(resolveServerConfig(undefined).serviceRoleKey).toBeNull();
  });
});

describe("primeServerEnv", () => {
  it("resolves harmlessly off-platform (no cloudflare:workers in node)", async () => {
    await expect(primeServerEnv()).resolves.toBeUndefined();
    await expect(primeServerEnv()).resolves.toBeUndefined();
    /* ...and explicit-env resolution is unaffected afterwards. */
    expect(resolveServerConfig(ENV).serviceRoleKey).toBe("service-key");
  });
});

describe("recordLatencySample", () => {
  it("POSTs the sample to PostgREST with the service key, via waitUntil", async () => {
    const calls: { input: string; init: RequestInit }[] = [];
    const fetchImpl: FetchImpl = async (input, init) => {
      calls.push({ input, init });
      return new Response(null, { status: 201 });
    };
    let waited: Promise<unknown> | undefined;
    const ctx = {
      waitUntil: (p: Promise<unknown>) => {
        waited = p;
      },
    };

    expect(recordLatencySample(ENV, SAMPLE, ctx, fetchImpl)).toBe(true);
    await waited;

    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("https://proj.supabase.co/rest/v1/latency_samples");
    expect(calls[0]?.init.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init.body as string)).toEqual(SAMPLE);
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers["apikey"]).toBe("service-key");
    expect(headers["authorization"]).toBe("Bearer service-key");
  });

  it("swallows a failed write completely", async () => {
    const fetchImpl: FetchImpl = async () => {
      throw new Error("network down");
    };
    let waited: Promise<unknown> | undefined;
    const ctx = {
      waitUntil: (p: Promise<unknown>) => {
        waited = p;
      },
    };
    expect(recordLatencySample(ENV, SAMPLE, ctx, fetchImpl)).toBe(true);
    await expect(waited).resolves.toBeUndefined();
  });

  it("does nothing at all without a service-role key", () => {
    const fetchImpl = vi.fn<FetchImpl>(async () => new Response(null, { status: 201 }));
    expect(recordLatencySample({}, SAMPLE, undefined, fetchImpl)).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("withLatencySampling", () => {
  const request = (path: string) => new Request(`https://bloom.test${path}`);

  it("returns the render untouched and samples a slow request", async () => {
    const fetchImpl = vi.fn<FetchImpl>(async () => new Response(null, { status: 201 }));
    const times = [0, 1500];
    const response = await withLatencySampling(
      request("/nutrition"),
      ENV,
      undefined,
      async () => new Response("page", { status: 200 }),
      { now: () => times.shift() ?? 1500, random: () => 0.99, fetchImpl },
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("page");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("does not sample a fast request outside the rate", async () => {
    const fetchImpl = vi.fn<FetchImpl>(async () => new Response(null, { status: 201 }));
    const times = [0, 40];
    await withLatencySampling(
      request("/"),
      ENV,
      undefined,
      async () => new Response("page", { status: 200 }),
      { now: () => times.shift() ?? 40, random: () => 0.9, fetchImpl },
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("never even times the health endpoint", async () => {
    const fetchImpl = vi.fn<FetchImpl>(async () => new Response(null, { status: 201 }));
    const now = vi.fn(() => 0);
    const response = await withLatencySampling(
      request("/api/health"),
      ENV,
      undefined,
      async () => new Response("{}", { status: 200 }),
      { now, fetchImpl },
    );
    expect(response.status).toBe(200);
    expect(now).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
