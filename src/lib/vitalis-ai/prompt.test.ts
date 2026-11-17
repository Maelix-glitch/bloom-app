/**
 * The Vitalis contract inside the coach edge function, pinned at the
 * source — the same guard style as photo-prompt.test.ts, because the
 * function is Deno code and never runs under vitest.
 *
 * What is pinned:
 *   · Vitalis has its OWN system prompt, selected only by
 *     `mode: "vitalis"`; the Coach prompt is untouched beside it.
 *   · The prompt carries the identity rules the owner set: the name,
 *     never-a-doctor, numbers only from the given record, missing
 *     data named honestly, and no bracketed sidecar directives.
 *   · The TTS action reads its key from the ELEVENLABS_API_KEY env
 *     secret at request time, sends it as the xi-api-key header to
 *     ElevenLabs with the pinned model and default voice, answers a
 *     clean voice_unavailable when the secret is absent, and never
 *     puts the key in a log line.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SOURCE = readFileSync(join(process.cwd(), "supabase/functions/coach/index.ts"), "utf8");

function sliceBetween(startMarker: string, endMarker: string): string {
  const start = SOURCE.indexOf(startMarker);
  if (start === -1) return "";
  const end = SOURCE.indexOf(endMarker, start + startMarker.length);
  return SOURCE.slice(start, end === -1 ? undefined : end);
}

const VITALIS_PROMPT = sliceBetween("const VITALIS_SYSTEM", "`;");
const TTS_SECTION = sliceBetween("const ELEVENLABS_DEFAULT_VOICE_ID", "Deno.serve");

describe("the Vitalis system prompt", () => {
  it("exists as its own prompt, distinct from the Coach's", () => {
    expect(VITALIS_PROMPT.length).toBeGreaterThan(400);
    expect(SOURCE).toContain("You are the coach inside Bloom");
    expect(SOURCE).toContain('body.mode === "vitalis"');
  });

  it("names the identity: Vitalis", () => {
    expect(VITALIS_PROMPT).toContain("You are Vitalis");
  });

  it("carries the never-a-doctor rule", () => {
    expect(VITALIS_PROMPT).toMatch(/not a doctor/i);
    expect(VITALIS_PROMPT).toMatch(/never diagnose/i);
    expect(VITALIS_PROMPT).toMatch(/clinician/);
  });

  it("carries the engine-numbers-only rule", () => {
    expect(VITALIS_PROMPT).toContain("only quote numbers that appear in the record");
    expect(VITALIS_PROMPT).toMatch(/Never invent a number/);
  });

  it("scopes the world to nutrition and assessment, and missing data to honesty", () => {
    expect(VITALIS_PROMPT).toMatch(/NUTRITION AND ASSESSMENT/);
    expect(VITALIS_PROMPT).toMatch(/data is missing/i);
  });

  it("forbids bracketed sidecar directives — Vitalis writes no Coach memories", () => {
    expect(VITALIS_PROMPT).toContain("[BLOOM_");
    expect(VITALIS_PROMPT).toMatch(/never emit/i);
  });
});

describe("the TTS action", () => {
  it("is dispatched before message validation", () => {
    expect(SOURCE).toContain('body.action === "tts"');
    expect(SOURCE.indexOf('body.action === "tts"')).toBeLessThan(SOURCE.indexOf("empty message"));
  });

  it("reads the key from the env secret and sends it as xi-api-key", () => {
    expect(TTS_SECTION).toContain('Deno.env.get("ELEVENLABS_API_KEY")');
    expect(TTS_SECTION).toContain('"xi-api-key"');
    expect(TTS_SECTION).toContain("https://api.elevenlabs.io/v1/text-to-speech/");
  });

  it("pins the model and the default voice (Sarah)", () => {
    expect(TTS_SECTION).toContain("eleven_flash_v2_5");
    expect(TTS_SECTION).toContain("EXAVITQu4vr4xnSDxMaL");
  });

  it("answers a clean voice_unavailable when the secret is absent", () => {
    expect(TTS_SECTION).toContain('json({ error: "voice_unavailable" }, 503)');
  });

  it("never logs the key", () => {
    expect(TTS_SECTION).not.toMatch(/console\.(log|error|info)\([^)]*apiKey/);
    expect(TTS_SECTION).not.toContain("${apiKey}");
    expect(SOURCE).not.toMatch(/ELEVENLABS_API_KEY\s*=\s*"/);
  });
});
