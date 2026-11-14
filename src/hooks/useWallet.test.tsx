// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/**
 * R16 — the points pill must move when the action moves, not after a
 * second network read. A claim's award RPC and a habit tick's award both
 * return the new server balance; `noteAccountBalance` hands that value
 * to the wallet store directly. Before the fix, the wallet ignored it
 * and re-read `profiles.total_points` on POINTS_CHANGED, so the pill
 * trailed every claim by a full round trip.
 */

const ctrl = vi.hoisted(() => {
  let resolvePoints!: (value: number | null) => void;
  return {
    authCb: null as ((uid: string | null) => void) | null,
    readPointsCalls: 0,
    readPoints: new Promise<number | null>((res) => {
      resolvePoints = res;
    }),
    resolvePoints: (v: number | null) => resolvePoints(v),
  };
});

vi.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: true,
  supabase: {},
  watchAuth: (onUser: (uid: string | null) => void) => {
    ctrl.authCb = onUser;
    return () => {
      ctrl.authCb = null;
    };
  },
}));

vi.mock("@/lib/home/habits", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/home/habits")>();
  return {
    ...actual,
    readPoints: () => {
      ctrl.readPointsCalls += 1;
      return ctrl.readPoints;
    },
  };
});

import { noteAccountBalance, useWallet } from "./useWallet";

describe("useWallet — noted balances move the pill without a re-read (R16)", () => {
  it("ignores a note before the session is known, then applies notes instantly", async () => {
    const view = renderHook(() => useWallet());

    /* No session yet: a stray note must not invent a balance. */
    act(() => noteAccountBalance(999));

    act(() => {
      ctrl.authCb?.("profile-1");
    });
    await waitFor(() => expect(ctrl.readPointsCalls).toBe(1));
    await act(async () => {
      ctrl.resolvePoints(500);
    });
    await waitFor(() => expect(view.result.current.balance).toBe(500));
    expect(view.result.current.source).toBe("account");
    expect(view.result.current.loading).toBe(false);

    /* A claim returns 620 from the RPC: the wallet shows it in the same
       frame, and readPoints is NOT called again — no second round trip. */
    act(() => noteAccountBalance(620));
    expect(view.result.current.balance).toBe(620);
    expect(ctrl.readPointsCalls).toBe(1);
    view.unmount();
  });
});
