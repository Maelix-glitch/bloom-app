/**
 * M-247 - the status page's wiring, pinned: the page is public
 * (it exists for the moment someone cannot sign in), it reads
 * ONLY the /api/status feed, and the service-role key and the
 * percentiles table stay server-side - the page must never
 * reference either.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

const SERVER = read("server.ts");
const ROOT = read("routes/__root.tsx");
const PAGE = read("routes/status.tsx");

describe("M-247: status page wiring", () => {
  it("the server answers /api/status from the status module", () => {
    expect(SERVER).toContain('"/api/status"');
    expect(SERVER).toContain("handleStatus");
  });

  it("the page is a public route, reachable signed out", () => {
    const list = ROOT.match(/const PUBLIC_ROUTES = \[([^\]]*)\]/);
    expect(list).not.toBeNull();
    expect(list![1]).toContain('"/status"');
  });

  it("the page reads the feed and nothing else", () => {
    expect(PAGE).toContain('fetch("/api/status"');
    expect(PAGE).not.toContain("latency_percentiles");
    expect(PAGE).not.toContain("latency_samples");
  });

  it("no secret ever reaches the page", () => {
    expect(PAGE).not.toContain("SERVICE_ROLE");
    expect(PAGE).not.toContain("service_role");
    expect(PAGE).not.toContain("serviceRoleKey");
  });
});
