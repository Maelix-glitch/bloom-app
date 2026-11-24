/**
 * Voice-input capability — Voice-First India (System 11).
 *
 * Recognition is the browser's own Web Speech API, on-device, language
 * fixed to en-IN (Indian English). No server, no new AI, no audio ever
 * leaves through Bloom. The low-level constructor lives in ./speech
 * (the Coach orb's dictation path); this module is the command layer's
 * door: a capability answer a surface can render honestly, and a
 * one-shot listening session that hands back a final transcript.
 */

import { createRecognition, speechRecognitionSupported } from "./speech";

/** Recognition language — Indian English, always. */
export const VOICE_LANG = "en-IN" as const;

/** What a surface shows when the microphone path does not exist here.
    Honest and short: no dead button, typing keeps working. */
export const VOICE_UNSUPPORTED_MESSAGE =
  "Voice isn't available in this browser, typing works as always.";

export type VoiceCapability =
  | { supported: true; lang: typeof VOICE_LANG }
  | { supported: false; lang: typeof VOICE_LANG; message: string };

export function voiceCapability(): VoiceCapability {
  return speechRecognitionSupported()
    ? { supported: true, lang: VOICE_LANG }
    : { supported: false, lang: VOICE_LANG, message: VOICE_UNSUPPORTED_MESSAGE };
}

export interface ListeningHandlers {
  /** The final transcript (may be empty if nothing was heard). */
  onTranscript: (transcript: string) => void;
  /** Recognition failed (permission denied, no mic, network…). */
  onError: (error: string) => void;
  /** The session ended, with or without a transcript. */
  onEnd?: () => void;
}

/**
 * Start a one-shot listening session. Returns a stop function, or null
 * when recognition is unavailable (callers gate on voiceCapability()
 * first; null is the belt-and-braces answer). Interim results stay off:
 * commands act on final transcripts only.
 */
export function startListening(handlers: ListeningHandlers): (() => void) | null {
  const recognition = createRecognition();
  if (!recognition) return null;
  recognition.lang = VOICE_LANG;
  recognition.interimResults = false;
  recognition.continuous = false;
  let delivered = false;
  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]!;
      if (result.isFinal && result[0]) transcript += result[0].transcript;
    }
    if (transcript) {
      delivered = true;
      handlers.onTranscript(transcript);
    }
  };
  recognition.onerror = (event) => {
    handlers.onError(event.error ?? "unknown");
  };
  recognition.onend = () => {
    if (!delivered) handlers.onTranscript("");
    handlers.onEnd?.();
  };
  try {
    recognition.start();
  } catch {
    handlers.onError("start-failed");
    return null;
  }
  return () => {
    try {
      recognition.stop();
    } catch {
      /* already stopped */
    }
  };
}
