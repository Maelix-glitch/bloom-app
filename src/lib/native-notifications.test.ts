// @vitest-environment jsdom
/**
 * M-239 · Native local notifications bridge.
 *
 * The plugin is mocked, so these tests pin the bridge contract itself:
 * on web every function is a no-op and the plugin is never touched; inside
 * the wrapper, permission, schedule, cancel and cancel-all reach the plugin
 * with the reminder key hashed to a stable integer id.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const plugin = {
  requestPermissions: vi.fn(),
  checkPermissions: vi.fn(),
  schedule: vi.fn(),
  cancel: vi.fn(),
  getPending: vi.fn(),
};

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: plugin,
}));

import {
  cancelAllNativeNotifications,
  cancelNativeNotification,
  checkNativeNotificationPermission,
  notificationIdForKey,
  notifyNowNative,
  requestNativeNotificationPermission,
  scheduleNativeNotification,
} from "./native-notifications";

function setNative(native: boolean) {
  (window as unknown as { Capacitor?: unknown }).Capacitor = {
    isNativePlatform: () => native,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  plugin.requestPermissions.mockResolvedValue({ display: "granted" });
  plugin.checkPermissions.mockResolvedValue({ display: "granted" });
  plugin.schedule.mockResolvedValue({});
  plugin.cancel.mockResolvedValue(undefined);
  plugin.getPending.mockResolvedValue({ notifications: [] });
});

afterEach(() => {
  delete (window as unknown as { Capacitor?: unknown }).Capacitor;
});

describe("notificationIdForKey", () => {
  it("is stable for the same key and differs across keys", () => {
    expect(notificationIdForKey("habit:abc:2026-11-25")).toBe(
      notificationIdForKey("habit:abc:2026-11-25"),
    );
    expect(notificationIdForKey("habit:abc:2026-11-25")).not.toBe(
      notificationIdForKey("habit:xyz:2026-11-25"),
    );
  });

  it("stays inside the positive 32-bit range the plugin accepts", () => {
    for (const key of ["evening:2026-11-25", "period:lead", "x", ""]) {
      const id = notificationIdForKey(key);
      expect(id).toBeGreaterThanOrEqual(0);
      expect(id).toBeLessThanOrEqual(0x7fffffff);
      expect(Number.isInteger(id)).toBe(true);
    }
  });
});

describe("on web everything is a no-op", () => {
  beforeEach(() => setNative(false));

  it("never touches the plugin", async () => {
    await expect(requestNativeNotificationPermission()).resolves.toBe(false);
    await expect(checkNativeNotificationPermission()).resolves.toBeNull();
    await expect(
      scheduleNativeNotification({
        key: "evening:2026-11-25",
        title: "Bloom",
        body: "Time to log",
        at: new Date(),
      }),
    ).resolves.toBe(false);
    await expect(
      notifyNowNative({ key: "evening:2026-11-25", title: "Bloom", body: "Time to log" }),
    ).resolves.toBe(false);
    await expect(cancelNativeNotification("evening:2026-11-25")).resolves.toBe(false);
    await expect(cancelAllNativeNotifications()).resolves.toBe(false);
    expect(plugin.requestPermissions).not.toHaveBeenCalled();
    expect(plugin.schedule).not.toHaveBeenCalled();
    expect(plugin.cancel).not.toHaveBeenCalled();
    expect(plugin.getPending).not.toHaveBeenCalled();
  });
});

describe("inside the wrapper", () => {
  beforeEach(() => setNative(true));

  it("reports permission truthfully", async () => {
    await expect(requestNativeNotificationPermission()).resolves.toBe(true);
    plugin.requestPermissions.mockResolvedValue({ display: "denied" });
    await expect(requestNativeNotificationPermission()).resolves.toBe(false);
    await expect(checkNativeNotificationPermission()).resolves.toBe("granted");
    plugin.checkPermissions.mockResolvedValue({ display: "prompt" });
    await expect(checkNativeNotificationPermission()).resolves.toBe("default");
  });

  it("schedules with the hashed id, the time and the tap target", async () => {
    const at = new Date("2026-11-25T20:30:00");
    await expect(
      scheduleNativeNotification({
        key: "evening:2026-11-25",
        title: "Bloom",
        body: "Nothing logged yet",
        at,
        url: "/trackers",
      }),
    ).resolves.toBe(true);
    expect(plugin.schedule).toHaveBeenCalledTimes(1);
    const arg = plugin.schedule.mock.calls[0]![0];
    expect(arg.notifications).toHaveLength(1);
    expect(arg.notifications[0].id).toBe(notificationIdForKey("evening:2026-11-25"));
    expect(arg.notifications[0].title).toBe("Bloom");
    expect(arg.notifications[0].schedule.at).toBe(at);
    expect(arg.notifications[0].extra).toEqual({ url: "/trackers" });
  });

  it("notifyNow schedules a moment out under the same id", async () => {
    await expect(
      notifyNowNative({ key: "habit:abc:2026-11-25", title: "Bloom", body: "Meditate" }),
    ).resolves.toBe(true);
    const arg = plugin.schedule.mock.calls[0]![0];
    expect(arg.notifications[0].id).toBe(notificationIdForKey("habit:abc:2026-11-25"));
    expect(arg.notifications[0].schedule.at.getTime()).toBeGreaterThan(Date.now());
  });

  it("cancels by key and cancels everything pending", async () => {
    await expect(cancelNativeNotification("habit:abc:2026-11-25")).resolves.toBe(true);
    expect(plugin.cancel).toHaveBeenCalledWith({
      notifications: [{ id: notificationIdForKey("habit:abc:2026-11-25") }],
    });

    plugin.getPending.mockResolvedValue({ notifications: [{ id: 7 }, { id: 9 }] });
    await expect(cancelAllNativeNotifications()).resolves.toBe(true);
    expect(plugin.cancel).toHaveBeenLastCalledWith({
      notifications: [{ id: 7 }, { id: 9 }],
    });
  });

  it("a plugin failure resolves false instead of throwing", async () => {
    plugin.schedule.mockRejectedValue(new Error("no plugin"));
    await expect(
      scheduleNativeNotification({
        key: "evening:2026-11-25",
        title: "Bloom",
        body: "Time to log",
        at: new Date(),
      }),
    ).resolves.toBe(false);
  });
});
