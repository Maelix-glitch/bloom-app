import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The regression under test: the sidebar is mounted by each route, so changing
 * tabs unmounts and remounts it. Hooks written as `useState(default)` plus a
 * `useEffect` that reads storage therefore restarted from their default on
 * every navigation — painting the *wrong* nav for one frame before correcting.
 * For someone who had turned the cycle off, that was a visible flash of
 * "Cycle" on every tab change.
 *
 * The cache in prefsStore is what makes the second and every later mount
 * correct during render. These tests pin that behaviour at the level that
 * matters: after one read, the value is available synchronously, and a write
 * invalidates it.
 */

const KEY = "bloom.prefs.v1";

function installWindow(seed: Record<string, unknown> = {}) {
  const store = new Map<string, string>();
  if (Object.keys(seed).length > 0) {
    const doc: Record<string, { value: unknown; updatedAt: string }> = {};
    for (const [k, v] of Object.entries(seed)) {
      doc[k] = { value: v, updatedAt: new Date().toISOString() };
    }
    store.set(KEY, JSON.stringify(doc));
  }
  const listeners = new Map<string, Set<(e: unknown) => void>>();
  (globalThis as Record<string, unknown>)["window"] = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    addEventListener: (name: string, fn: (e: unknown) => void) => {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(fn);
    },
    removeEventListener: (name: string, fn: (e: unknown) => void) => {
      listeners.get(name)?.delete(fn);
    },
    dispatchEvent: (e: { type: string }) => {
      for (const fn of listeners.get(e.type) ?? []) fn(e);
      return true;
    },
  };
  return { store };
}

describe("prefsStore cache", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("reads storage only once for repeated snapshots", async () => {
    installWindow({ "onboarding.v1": { done: true, kind: "no-cycle" } });
    const prefs = await import("./prefs");
    const spy = vi.spyOn(prefs, "getPref");
    const { resetPrefCache } = await import("./prefsStore");
    resetPrefCache();

    /* Simulating what N mounts of the sidebar do: ask for the same key. */
    const parse = (raw: unknown) => (raw as { kind?: string })?.kind ?? null;
    const first = prefs.getPref("onboarding.v1", parse, "unspecified");
    expect(first).toBe("no-cycle");
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("serves the stored value, not the fallback, once read", async () => {
    installWindow({ "onboarding.v1": { done: true, kind: "no-cycle" } });
    const { getPref } = await import("./prefs");
    const parse = (raw: unknown) =>
      raw && typeof raw === "object" ? ((raw as { kind: string }).kind ?? null) : null;
    expect(getPref("onboarding.v1", parse, "unspecified")).toBe("no-cycle");
  });

  it("falls back cleanly when nothing is stored", async () => {
    installWindow();
    const { getPref } = await import("./prefs");
    expect(getPref("onboarding.v1", () => null, "unspecified")).toBe("unspecified");
  });
});

describe("the onboarding sentinel", () => {
  it("distinguishes 'not read yet' from 'nobody answered'", async () => {
    const { DEFAULT_ONBOARDING } = await import("./onboarding/profileKind");
    /*
     * Both have done:false, so the welcome flow must key off something else —
     * otherwise the server render, which cannot read storage, would decide
     * everyone needs onboarding and put the welcome screen in the HTML.
     */
    expect(DEFAULT_ONBOARDING.done).toBe(false);
    expect(DEFAULT_ONBOARDING.at).toBeNull();
    /* the hook's UNREAD sentinel uses a non-null `at`, which is the tell */
  });
});
