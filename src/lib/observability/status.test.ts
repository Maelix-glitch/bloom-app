/**
 * M-247 - the status feed's contract: rows are shaped honestly
 * (malformed rows never print), the degraded rule is one
 * definition (p99 over 2,000 ms on at least 20 samples), and
 * the payload degrades to "needs attention" - never to a throw -
 * when the database cannot be reached.
 */
import { describe, expect, it } from "vitest";

import type { FetchImpl } from "./latency";
import { buildStatus, handleStatus, isDegraded, shapeStatusRows } from "./status";

const ENV = {
  SUPABASE_URL: "https://proj.supabase.co/",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
};

const ROWS = [
  { route: "/mood", samples: 42, p50_ms: 27, p95_ms: 120, p99_ms: 300 },
  { route: "/", samples: 120, p50_ms: 4, p95_ms: 30, p99_ms: 90 },
  { route: "/nutrition", samples: 25, p50_ms: 300, p95_ms: 1500, p99_ms: 2600 },
];

function fetchFor(rows: unknown, healthOk = true): FetchImpl {
  return async (input) => {
    if (input.includes("latency_percentiles")) {
      return new Response(JSON.stringify(rows), { status: 200 });
    }
    /* the health check's table probe */
    return new Response(healthOk ? "[]" : "nope", { status: healthOk ? 200 : 500 });
  };
}

describe("isDegraded", () => {
  it("needs both the p99 and the sample floor", () => {
    expect(isDegraded(20, 2001)).toBe(true);
    expect(isDegraded(19, 9000)).toBe(false);
    expect(isDegraded(200, 2000)).toBe(false);
    expect(isDegraded(200, 150)).toBe(false);
  });
});

describe("shapeStatusRows", () => {
  it("sorts busiest first and flags the degraded route", () => {
    const shaped = shapeStatusRows(ROWS);
    expect(shaped.map((r) => r.route)).toEqual(["/", "/mood", "/nutrition"]);
    expect(shaped.find((r) => r.route === "/nutrition")?.degraded).toBe(true);
    expect(shaped.find((r) => r.route === "/mood")?.degraded).toBe(false);
  });

  it("drops malformed rows instead of printing them", () => {
    const shaped = shapeStatusRows([
      { route: "/ok", samples: 3, p50_ms: 1, p95_ms: 2, p99_ms: 3 },
      { route: "", samples: 3, p50_ms: 1, p95_ms: 2, p99_ms: 3 },
      { route: "/bad", samples: "many", p50_ms: 1, p95_ms: 2, p99_ms: 3 },
      { route: "/bad2", samples: 3, p50_ms: null, p95_ms: 2, p99_ms: 3 },
      { samples: 3, p50_ms: 1, p95_ms: 2, p99_ms: 3 },
    ]);
    expect(shaped).toHaveLength(1);
    expect(shaped[0]?.route).toBe("/ok");
  });
});

describe("buildStatus / handleStatus", () => {
  it("answers ok with shaped routes when the database answers", async () => {
    const payload = await buildStatus(ENV, fetchFor(ROWS), () =>
      new Date("2026-11-25T12:00:00.000Z"),
    );
    expect(payload.ok).toBe(true);
    expect(payload.db).toBe("ok");
    expect(payload.checkedAt).toBe("2026-11-25T12:00:00.000Z");
    expect(payload.routes).toHaveLength(3);
  });

  it("reports needs-attention with no routes when the database is down", async () => {
    const payload = await buildStatus(ENV, fetchFor(ROWS, false));
    expect(payload.ok).toBe(false);
    expect(payload.db).toBe("error");
    expect(payload.routes).toEqual([]);
  });

  it("never throws, even when fetch itself explodes", async () => {
    const boom: FetchImpl = async () => {
      throw new Error("network gone");
    };
    const res = await handleStatus(ENV, boom);
    expect(res.status).toBe(200);
    const payload = (await res.json()) as { ok: boolean; db: string };
    expect(payload.ok).toBe(false);
    expect(payload.db).toBe("error");
  });

  it("without a service key the feed is honest: db error, no routes", async () => {
    const payload = await buildStatus({}, fetchFor(ROWS));
    expect(payload.ok).toBe(false);
    expect(payload.routes).toEqual([]);
  });
});
