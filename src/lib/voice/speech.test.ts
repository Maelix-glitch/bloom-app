// @vitest-environment jsdom
/**
 * The orb's speech helpers: platform speech only, honestly absent when
 * the platform has none. Playback replaces (never overlaps) and a
 * superseded utterance's end event must not clear its successor's
 * state; dictation exists only where a recognition constructor does.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createRecognition,
  speakText,
  speechRecognitionSupported,
  speechSynthesisSupported,
  stopSpeaking,
} from "./speech";

class FakeUtterance {
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  rate = 1;
  constructor(public text: string) {}
}

function installSynthesis() {
  const speak = vi.fn();
  const cancel = vi.fn();
  Object.defineProperty(window, "speechSynthesis", {
    value: { speak, cancel },
    configurable: true,
  });
  Object.defineProperty(window, "SpeechSynthesisUtterance", {
    value: FakeUtterance,
    configurable: true,
  });
  return { speak, cancel };
}

function removeSpeech() {
  Reflect.deleteProperty(window, "speechSynthesis");
  Reflect.deleteProperty(window, "SpeechSynthesisUtterance");
  Reflect.deleteProperty(window, "SpeechRecognition");
  Reflect.deleteProperty(window, "webkitSpeechRecognition");
}

afterEach(() => {
  stopSpeaking();
  removeSpeech();
  vi.restoreAllMocks();
});

describe("speechSynthesis support", () => {
  it("is absent when the platform has none", () => {
    removeSpeech();
    expect(speechSynthesisSupported()).toBe(false);
    expect(speakText("Hello")).toBe(false);
  });

  it("speaks the text, whitespace collapsed, after cancelling what played", () => {
    const { speak, cancel } = installSynthesis();
    const onEnd = vi.fn();
    expect(speakText("  Your sleep\n\nwas steadier. ", onEnd)).toBe(true);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledTimes(1);
    const utterance = speak.mock.calls[0]?.[0] as FakeUtterance;
    expect(utterance.text).toBe("Your sleep was steadier.");
    utterance.onend?.();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("a superseded utterance's end does not finish its successor", () => {
    const { speak } = installSynthesis();
    const firstEnd = vi.fn();
    const secondEnd = vi.fn();
    speakText("First reply.", firstEnd);
    const first = speak.mock.calls[0]?.[0] as FakeUtterance;
    speakText("Second reply.", secondEnd);
    const second = speak.mock.calls[1]?.[0] as FakeUtterance;
    /* The cancel of the first fires its end late — it must not clear
       the second's state. */
    first.onend?.();
    expect(firstEnd).not.toHaveBeenCalled();
    expect(secondEnd).not.toHaveBeenCalled();
    second.onend?.();
    expect(secondEnd).toHaveBeenCalledTimes(1);
  });

  it("stopSpeaking cancels and silences the pending end callback", () => {
    const { speak, cancel } = installSynthesis();
    const onEnd = vi.fn();
    speakText("A reply.", onEnd);
    const utterance = speak.mock.calls[0]?.[0] as FakeUtterance;
    stopSpeaking();
    expect(cancel).toHaveBeenCalled();
    utterance.onend?.();
    expect(onEnd).not.toHaveBeenCalled();
  });

  it("refuses empty text", () => {
    const { speak } = installSynthesis();
    expect(speakText("   ")).toBe(false);
    expect(speak).not.toHaveBeenCalled();
  });
});

describe("speech recognition support", () => {
  it("is absent without a constructor", () => {
    removeSpeech();
    expect(speechRecognitionSupported()).toBe(false);
    expect(createRecognition()).toBeNull();
  });

  it("uses the webkit-prefixed constructor when that is what exists", () => {
    class FakeRecognition {
      lang = "";
      interimResults = false;
      continuous = false;
      onresult = null;
      onend = null;
      onerror = null;
      start() {}
      stop() {}
      abort() {}
    }
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: FakeRecognition,
      configurable: true,
    });
    expect(speechRecognitionSupported()).toBe(true);
    expect(createRecognition()).toBeInstanceOf(FakeRecognition);
  });
});
