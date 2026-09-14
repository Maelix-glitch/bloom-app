import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  configured: true,
  invoke: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  get hasSupabaseConfig() {
    return state.configured;
  },
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => state.invoke(...args),
    },
  },
}));

import { queryGiphyCatalog } from "./giphy-edge";

describe("giphy edge client", () => {
  afterEach(() => {
    state.configured = true;
    state.invoke.mockReset();
  });

  it("returns the function's data array", async () => {
    state.invoke.mockResolvedValue({ data: { data: [{ id: "abc" }] }, error: null });
    const rows = await queryGiphyCatalog("gifs", "trending", { limit: "8" });
    expect(rows).toEqual([{ id: "abc" }]);
    expect(state.invoke).toHaveBeenCalledWith("giphy", {
      body: { catalog: "gifs", endpoint: "trending", q: undefined, limit: 8 },
    });
  });

  it("stays silent when Bloom has no database", async () => {
    state.configured = false;
    expect(await queryGiphyCatalog("stickers", "search", { q: "hi", limit: "4" })).toEqual([]);
    expect(state.invoke).not.toHaveBeenCalled();
  });

  it("fails soft on invoke errors", async () => {
    state.invoke.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await queryGiphyCatalog("stickers", "search", { q: "hi", limit: "4" })).toEqual([]);
  });

  it("drops malformed payloads", async () => {
    state.invoke.mockResolvedValue({ data: { data: "nope" }, error: null });
    expect(await queryGiphyCatalog("gifs", "trending", { limit: "6" })).toEqual([]);
  });
});
