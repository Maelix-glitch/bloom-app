/**
 * askVitalis — the Vitalis mode of the edge function, pinned at the
 * client seam: it must send the vitalis mode + scoped context, carry
 * NO Coach facts, and surface failures as VitalisUnavailable.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { VitalisUnavailable, askVitalis } from "./client";

const askEdge = vi.fn();
vi.mock("@/lib/coach/edge", () => ({
  COACH_FUNCTION: "coach",
  askEdge: (...args: unknown[]) => askEdge(...args),
}));

describe("askVitalis", () => {
  beforeEach(() => {
    askEdge.mockReset();
  });


  it("sends mode vitalis with the scoped context and no Coach facts", async () => {
    askEdge.mockResolvedValueOnce({ ok: true, paragraphs: ["Hello, I am Vitalis."], provider: "gemini" });
    const reply = await askVitalis({
      text: "How is my protein today?",
      history: [{ role: "user", content: "Earlier question" }],
      contextText: "## TARGETS\nEnergy target: 3,288 kcal a day.",
    });
    expect(reply.paragraphs).toEqual(["Hello, I am Vitalis."]);
    const request = askEdge.mock.calls[0]![0] as Record<string, unknown>;
    expect(request["mode"]).toBe("vitalis");
    expect(request["vitalisContext"]).toContain("3,288 kcal");
    expect(request["message"]).toBe("How is my protein today?");
    expect(request["facts"]).toBeUndefined();
    expect(request["register"]).toBe("normal");
  });

  it("keeps only the session's last eight turns as history", async () => {
    askEdge.mockResolvedValueOnce({ ok: true, paragraphs: ["Ok."], provider: "gemini" });
    const history = Array.from({ length: 12 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `turn ${i}`,
    }));
    await askVitalis({ text: "next", history, contextText: "ctx" });
    const request = askEdge.mock.calls[0]![0] as { history: unknown[] };
    expect(request.history).toHaveLength(8);
  });

  it("throws VitalisUnavailable carrying the edge reason", async () => {
    askEdge.mockResolvedValue({ ok: false, reason: "timeout" });
    await expect(askVitalis({ text: "hi", history: [], contextText: "ctx" })).rejects.toMatchObject({
      name: "VitalisUnavailable",
      reason: "timeout",
    });
    await expect(askVitalis({ text: "hi", history: [], contextText: "ctx" })).rejects.toBeInstanceOf(
      VitalisUnavailable,
    );
  });
});
