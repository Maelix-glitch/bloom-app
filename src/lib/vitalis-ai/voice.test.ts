/**
 * Vitalis voice — chunking, the per-reply cap, the TTS request's
 * failure-is-silence contract, and the speaker's sequential queue.
 */
import { describe, expect, it, vi } from "vitest";

import { SPEECH_CHAR_CAP, VitalisSpeaker, requestVitalisSpeech, spokenChunks, splitIntoSentences } from "./voice";

/* The supabase seam: invoke is stubbed per test. */
const invoke = vi.fn();
vi.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: true,
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

describe("splitIntoSentences", () => {
  it("splits on sentence-final punctuation and flattens paragraphs", () => {
    expect(splitIntoSentences("Your protein is on track.\n\nDinner could use more of it. Shall we look?")).toEqual([
      "Your protein is on track.",
      "Dinner could use more of it.",
      "Shall we look?",
    ]);
  });

  it("keeps decimals and abbreviations intact", () => {
    expect(splitIntoSentences("Dr. Rao suggested 2.5 g of salt, e.g. at lunch. That is all.")).toEqual([
      "Dr. Rao suggested 2.5 g of salt, e.g. at lunch.",
      "That is all.",
    ]);
  });

  it("keeps a trailing fragment without punctuation", () => {
    expect(splitIntoSentences("One full stop. And a fragment")).toEqual(["One full stop.", "And a fragment"]);
  });

  it("returns nothing for empty text", () => {
    expect(splitIntoSentences("   \n ")).toEqual([]);
  });
});

describe("spokenChunks — the per-reply character cap", () => {
  it("speaks whole sentences in order until the budget is spent", () => {
    const text = "First sentence here. Second one follows it. Third is beyond the cap.";
    const chunks = spokenChunks(text, 50);
    expect(chunks).toEqual(["First sentence here.", "Second one follows it."]);
    expect(chunks.join(" ").length).toBeLessThanOrEqual(50);
  });

  it("never exceeds the default 800-character budget", () => {
    const sentence = "This is a reasonably long sentence about your lunch today. ";
    const chunks = spokenChunks(sentence.repeat(40));
    expect(chunks.join(" ").length).toBeLessThanOrEqual(SPEECH_CHAR_CAP);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it("word-splits a single over-long sentence so its opening is spoken", () => {
    const long = `Protein ${"matters ".repeat(30)}a lot.`;
    const chunks = spokenChunks(long, 60);
    expect(chunks.length).toBe(1);
    expect(chunks[0]!.length).toBeLessThanOrEqual(60);
    expect(chunks[0]).toContain("Protein");
  });
});

describe("requestVitalisSpeech — failure is silence", () => {
  it("returns the audio blob, re-wrapped as audio/mpeg", async () => {
    const raw = new Blob([new Uint8Array([1, 2, 3])], { type: "application/octet-stream" });
    invoke.mockResolvedValueOnce({ data: raw, error: null });
    const blob = await requestVitalisSpeech("Hello there.");
    expect(blob).toBeInstanceOf(Blob);
    expect(blob?.type).toBe("audio/mpeg");
    expect(invoke).toHaveBeenCalledWith("coach", { body: { action: "tts", text: "Hello there." } });
  });

  it("returns null when the function reports voice unavailable", async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { message: "503" } });
    await expect(requestVitalisSpeech("Hello.")).resolves.toBeNull();
  });

  it("returns null when the payload is not audio", async () => {
    invoke.mockResolvedValueOnce({ data: { error: "voice_unavailable" }, error: null });
    await expect(requestVitalisSpeech("Hello.")).resolves.toBeNull();
  });

  it("returns null when the invoke itself throws", async () => {
    invoke.mockRejectedValueOnce(new Error("network down"));
    await expect(requestVitalisSpeech("Hello.")).resolves.toBeNull();
  });
});

/* ------------------------------ the speaker ------------------------------ */

class FakeAudio {
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  paused = false;
  constructor(readonly url: string) {}
  play(): Promise<void> {
    return Promise.resolve();
  }
  pause(): void {
    this.paused = true;
  }
  end(): void {
    this.onended?.();
  }
}

function fakeSpeaker(available: (text: string) => boolean = () => true) {
  const fetched: string[] = [];
  const played: FakeAudio[] = [];
  const speaker = new VitalisSpeaker({
    fetchChunk: (text) => {
      fetched.push(text);
      return Promise.resolve(available(text) ? new Blob([text]) : null);
    },
    createUrl: (blob) => `blob:fake-${fetched.length}-${Math.random()}`,
    revokeUrl: () => {},
    createAudio: (url) => {
      const audio = new FakeAudio(url);
      played.push(audio);
      return audio;
    },
  });
  return { speaker, fetched, played };
}

const flush = async () => {
  for (let i = 0; i < 12; i += 1) await Promise.resolve();
};

describe("VitalisSpeaker", () => {
  it("plays a reply's sentences sequentially, in order", async () => {
    const { speaker, fetched, played } = fakeSpeaker();
    speaker.speak("First sentence. Second sentence.");
    await flush();
    expect(fetched).toContain("First sentence.");
    expect(played).toHaveLength(1);
    played[0]!.end();
    await flush();
    expect(played).toHaveLength(2);
    played[1]!.end();
    await flush();
    expect(played).toHaveLength(2);
  });

  it("skips a chunk whose speech is unavailable and keeps going", async () => {
    const { speaker, played } = fakeSpeaker((text) => !text.startsWith("First"));
    speaker.speak("First sentence. Second sentence.");
    await flush();
    expect(played).toHaveLength(1);
    played[0]!.end();
    await flush();
  });

  it("stop() halts playback and drops the rest of the queue", async () => {
    const { speaker, played } = fakeSpeaker();
    speaker.speak("First sentence. Second sentence. Third sentence.");
    await flush();
    expect(played).toHaveLength(1);
    speaker.stop();
    expect(played[0]!.paused).toBe(true);
    await flush();
    expect(played).toHaveLength(1);
  });

  it("a muted speaker fetches and plays nothing", async () => {
    const { speaker, fetched, played } = fakeSpeaker();
    speaker.setMuted(true);
    speaker.speak("You should never hear this.");
    await flush();
    expect(fetched).toHaveLength(0);
    expect(played).toHaveLength(0);
  });

  it("muting mid-reply stops the current sentence", async () => {
    const { speaker, played } = fakeSpeaker();
    speaker.speak("First sentence. Second sentence.");
    await flush();
    expect(played).toHaveLength(1);
    speaker.setMuted(true);
    expect(played[0]!.paused).toBe(true);
    await flush();
    expect(played).toHaveLength(1);
  });
});
