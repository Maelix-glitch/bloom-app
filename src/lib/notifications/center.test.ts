// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import { clearNotices, listNotices, markAllRead, recordNotice, unreadCount } from "./center";

beforeEach(() => {
  window.localStorage.clear();
});

describe("notification center", () => {
  it("starts empty and stays honest", () => {
    expect(listNotices()).toEqual([]);
    expect(unreadCount()).toBe(0);
  });

  it("records deliveries, newest first, unread", () => {
    recordNotice({ kind: "habit", title: "Water", body: "b", url: "/" });
    recordNotice({ kind: "evening", title: "Evening", body: "b", url: "/" });
    const list = listNotices();
    expect(list).toHaveLength(2);
    expect(list[0]!.kind).toBe("evening");
    expect(list.every((n) => n.read === false)).toBe(true);
    expect(unreadCount(list)).toBe(2);
  });

  it("same key same reason replaces instead of stacking", () => {
    recordNotice({ key: "habit:h1:2026-09-19", kind: "habit", title: "A", body: "", url: "/" });
    recordNotice({ key: "habit:h1:2026-09-19", kind: "habit", title: "A2", body: "", url: "/" });
    const list = listNotices();
    expect(list).toHaveLength(1);
    expect(list[0]!.title).toBe("A2");
  });

  it("marks read and clears", () => {
    recordNotice({ kind: "habit", title: "x", body: "", url: "/" });
    markAllRead();
    expect(unreadCount()).toBe(0);
    clearNotices();
    expect(listNotices()).toEqual([]);
  });

  it("survives garbage on disk", () => {
    window.localStorage.setItem("bloom.notifications.v1", "{not json");
    expect(listNotices()).toEqual([]);
  });
});
