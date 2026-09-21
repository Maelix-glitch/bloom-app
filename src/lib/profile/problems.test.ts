import { describe, expect, it } from "vitest";

import { classifyError } from "./problems";

/**
 * Every one of these shapes turned into the same sentence on screen —
 * "Your profile couldn't be read just now." — and each of them needs something
 * different from the person. These are the real strings the providers send.
 */
describe("classifyError", () => {
  it("reads an expired access token as a session problem worth retrying", () => {
    const problem = classifyError({
      message: "JWT expired",
      code: "PGRST301",
      details: null,
      hint: null,
    });
    expect(problem.kind).toBe("session");
    expect(problem.retryable).toBe(true);
    expect(problem.message).toMatch(/sign-in went stale/i);
  });

  it("reads a missing identity column as a partially readable schema", () => {
    const problem = classifyError({
      message: "column profiles.featured does not exist",
      code: "42703",
    });
    expect(problem.kind).toBe("schema");
    expect(problem.partialReadPossible).toBe(true);
    expect(problem.retryable).toBe(false);
  });

  it("reads PostgREST's 'no such column' the same way", () => {
    const problem = classifyError({
      message: "Could not find the 'featured' column of 'profiles' in the schema cache",
      code: "PGRST205",
    });
    expect(problem.kind).toBe("schema");
    expect(problem.partialReadPossible).toBe(true);
  });

  it("reads a missing table as a schema problem a narrower select cannot fix", () => {
    const problem = classifyError({
      message: 'relation "public.profiles" does not exist',
      code: "42P01",
    });
    expect(problem.kind).toBe("schema");
    expect(problem.partialReadPossible).toBe(false);
  });

  it("reads a blocked fetch as offline", () => {
    expect(classifyError(new TypeError("Failed to fetch")).kind).toBe("offline");
    expect(classifyError({ message: "NetworkError when attempting to fetch resource" }).kind).toBe(
      "offline",
    );
    expect(classifyError(new Error("request timed out")).kind).toBe("offline");
  });

  it("reads row level security as a permission problem", () => {
    const problem = classifyError({
      message: 'infinite recursion detected in policy for relation "profiles"',
      code: "42501",
    });
    expect(problem.kind).toBe("permission");
    expect(problem.retryable).toBe(false);
  });

  it("falls back to 'unknown' — and unknown is worth one more try", () => {
    const problem = classifyError({ message: "something else entirely" });
    expect(problem.kind).toBe("unknown");
    expect(problem.retryable).toBe(true);
  });

  it("never leaks the provider's string into the sentence shown on screen", () => {
    const problem = classifyError({
      message: 'relation "public.profiles" does not exist',
      code: "42P01",
    });
    expect(problem.message).not.toMatch(/42P01|relation|public\./);
    expect(problem.detail).toMatch(/42P01/);
  });
});
