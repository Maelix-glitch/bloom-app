import { afterEach, describe, expect, it, vi } from "vitest";

import { ACCOUNT_CHECK_TIMEOUT_MS, watchAccountCheck } from "./accountCheck";

describe("watchAccountCheck", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("settles a check that never finishes", () => {
    vi.useFakeTimers();
    const onStuck = vi.fn();
    watchAccountCheck(() => true, onStuck);
    vi.advanceTimersByTime(ACCOUNT_CHECK_TIMEOUT_MS - 1);
    expect(onStuck).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onStuck).toHaveBeenCalledTimes(1);
  });

  it("stays quiet when the check settled in time", () => {
    vi.useFakeTimers();
    const onStuck = vi.fn();
    let checking = true;
    watchAccountCheck(() => checking, onStuck);
    checking = false;
    vi.advanceTimersByTime(ACCOUNT_CHECK_TIMEOUT_MS + 1);
    expect(onStuck).not.toHaveBeenCalled();
  });

  it("stays quiet when cancelled", () => {
    vi.useFakeTimers();
    const onStuck = vi.fn();
    const cancel = watchAccountCheck(() => true, onStuck);
    cancel();
    vi.advanceTimersByTime(ACCOUNT_CHECK_TIMEOUT_MS + 1);
    expect(onStuck).not.toHaveBeenCalled();
  });
});
