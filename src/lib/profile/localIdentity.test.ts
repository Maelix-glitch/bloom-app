// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import { localIdentity } from "./localIdentity";

/**
 * Device-only builds keep identity in localStorage (see localIdentity). The
 * store is the whole reason a name/@username/bio survives a revisit without
 * an account, so the round trip — and every way it can be interrupted — is
 * tested here.
 */

beforeEach(() => {
  window.localStorage.clear();
});

describe("localIdentity", () => {
  it("reads as null before anything is saved", () => {
    expect(localIdentity.read()).toBeNull();
  });

  it("round-trips a saved identity", () => {
    localIdentity.write({
      displayName: "Ivy",
      username: "quiet-lavender",
      bio: "Slow mornings.",
      accent: "sage",
      avatarPath: "preset:branch",
    });
    expect(localIdentity.read()).toMatchObject({
      displayName: "Ivy",
      username: "quiet-lavender",
      bio: "Slow mornings.",
      accent: "sage",
      avatarPath: "preset:branch",
    });
  });

  it("merges patches instead of replacing the record", () => {
    localIdentity.write({ displayName: "Ivy", username: "ivy", bio: "hi" });
    localIdentity.write({ accent: "rose" });
    const saved = localIdentity.read();
    expect(saved?.displayName).toBe("Ivy");
    expect(saved?.username).toBe("ivy");
    expect(saved?.bio).toBe("hi");
    expect(saved?.accent).toBe("rose");
  });

  it("leaves the avatar alone unless the patch mentions it", () => {
    localIdentity.write({ displayName: "Ivy", avatarPath: "preset:window" });
    localIdentity.write({ displayName: "Ivy Rose" });
    expect(localIdentity.read()?.avatarPath).toBe("preset:window");
    localIdentity.write({ avatarPath: null });
    expect(localIdentity.read()?.avatarPath).toBeNull();
  });

  it("trims and clamps to the same limits the database enforces", () => {
    localIdentity.write({
      displayName: "  ".repeat(2) + "I".repeat(60),
      username: "u".repeat(40),
      bio: "b".repeat(400),
    });
    const saved = localIdentity.read();
    expect(saved?.displayName).toBe("I".repeat(48));
    expect(saved?.username).toBe("u".repeat(30));
    expect(saved?.bio).toBe("b".repeat(200));
  });

  it("treats a corrupted record as absent, not half-applied", () => {
    window.localStorage.setItem("bloom.profile.local.v1", "{not json");
    expect(localIdentity.read()).toBeNull();
    // and a fresh write still works afterwards
    localIdentity.write({ displayName: "Ivy" });
    expect(localIdentity.read()?.displayName).toBe("Ivy");
  });

  it("clear removes the record", () => {
    localIdentity.write({ displayName: "Ivy" });
    localIdentity.clear();
    expect(localIdentity.read()).toBeNull();
  });
});
