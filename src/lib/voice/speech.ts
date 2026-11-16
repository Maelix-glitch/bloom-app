/**
 * Browser speech for the Coach orb — reply playback and composer dictation
 * on the platform's own engines (SpeechSynthesis / SpeechRecognition).
 *
 * No backend, no API key, no network: the voices and the microphone belong
 * to the device, exactly like the composer's voice-note recorder. Both
 * engines are optional capabilities — every entry point here answers
 * "not available" cleanly so callers can simply not offer the control.
 *
 * Playback speaks the reply text the thread already holds; dictation only
 * ever fills the composer — nothing here sends, saves or answers.
 */

/* ------------------------------ playback -------------------------------- */

export function speechSynthesisSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance === "function"
  );
}

/** The utterance currently speaking, so a stale `onend` from a superseded
    reply can't clear the state of the one that replaced it. */
let currentUtterance: SpeechSynthesisUtterance | null = null;

export function stopSpeaking(): void {
  if (!speechSynthesisSupported()) return;
  currentUtterance = null;
  window.speechSynthesis.cancel();
}

/**
 * Speak `text` aloud, replacing whatever is currently spoken. Returns
 * false when speech is unavailable (or the text is empty) so the caller
 * can stand its UI down. `onEnd` fires when this utterance finishes or
 * fails — never when it was superseded by a newer one.
 */
export function speakText(text: string, onEnd?: () => void): boolean {
  if (!speechSynthesisSupported()) return false;
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return false;
  window.speechSynthesis.cancel();
  const utterance = new window.SpeechSynthesisUtterance(clean);
  currentUtterance = utterance;
  const finish = () => {
    if (currentUtterance === utterance) {
      currentUtterance = null;
      onEnd?.();
    }
  };
  utterance.onend = finish;
  utterance.onerror = finish;
  window.speechSynthesis.speak(utterance);
  return true;
}

/* ------------------------------ dictation ------------------------------- */

/**
 * The slice of the SpeechRecognition surface the orb uses, typed locally —
 * the DOM lib ships neither the prefixed nor the unprefixed constructor.
 */
export interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
export interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}
export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
export interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type RecognitionCtor = new () => SpeechRecognitionLike;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechRecognitionSupported(): boolean {
  return recognitionCtor() !== null;
}

export function createRecognition(): SpeechRecognitionLike | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}
