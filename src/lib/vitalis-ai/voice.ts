/**
 * Vitalis auto-voice — ElevenLabs speech for Vitalis replies.
 *
 * The flow: a reply lands → it is split into sentences → the sentences
 * are requested from the coach edge function's TTS action one at a
 * time and played sequentially, the next chunk fetched while the
 * current one plays. There is no listen button anywhere in this
 * design: speech is automatic, and the only control is a mute.
 *
 * Voice is an enhancement, never a dependency. Every failure — no
 * Supabase config, no ELEVENLABS_API_KEY secret on the function, a
 * quota refusal, a network error, an autoplay block — resolves to
 * silence, and the text conversation carries on untouched.
 *
 * Cost guard: the ElevenLabs free tier is 10,000 characters a month,
 * so speech is capped per reply (SPEECH_CHAR_CAP) — the reply's first
 * sentences are spoken, in order, and the rest stays on screen.
 */

import { COACH_FUNCTION } from "@/lib/coach/edge";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

/** Per-reply spoken-character budget. Enforced here, on the client,
 *  before any TTS request is made (the function enforces its own
 *  per-request ceiling on top). */
export const SPEECH_CHAR_CAP = 800;

/* ------------------------------------------------------------------ */
/*  Sentence chunking                                                  */
/* ------------------------------------------------------------------ */

const DOT = "\u0001";
const ABBREVIATION = /\b(Dr|Mr|Mrs|Ms|St|Prof|Sr|Jr|vs|etc|approx|No)\./gi;

/**
 * Split reply text into speakable sentences. Paragraph breaks are
 * flattened (speech has no paragraphs), decimals and common
 * abbreviations keep their dots, and a trailing fragment without
 * terminal punctuation still counts as a sentence.
 */
export function splitIntoSentences(text: string): string[] {
  const flat = text.replace(/\s+/g, " ").trim();
  if (!flat) return [];
  const protectedText = flat
    .replace(/(\d)\.(\d)/g, `$1${DOT}$2`)
    .replace(/\be\.g\./gi, `e${DOT}g${DOT}`)
    .replace(/\bi\.e\./gi, `i${DOT}e${DOT}`)
    .replace(ABBREVIATION, `$1${DOT}`);
  const matches = protectedText.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [];
  return matches
    .map((part) => part.split(DOT).join(".").trim())
    .filter((part) => part.length > 0);
}

/** Word-boundary pieces of at most `cap` characters, for a single
 *  sentence that is longer than the whole speech budget. */
function splitLongSentence(sentence: string, cap: number): string[] {
  const words = sentence.split(/\s+/);
  const out: string[] = [];
  let current = "";
  for (const word of words) {
    if (current && (current + " " + word).length > cap) {
      out.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) out.push(current);
  return out;
}

/**
 * The chunks to speak for one reply: whole sentences, in order, first
 * sentences first, until the per-reply character budget is spent. A
 * sentence longer than the budget is word-split so its opening can
 * still be spoken; anything past the budget stays on screen only.
 */
export function spokenChunks(text: string, cap: number = SPEECH_CHAR_CAP): string[] {
  const pieces: string[] = [];
  for (const sentence of splitIntoSentences(text)) {
    if (sentence.length <= cap) pieces.push(sentence);
    else pieces.push(...splitLongSentence(sentence, cap));
  }
  const chunks: string[] = [];
  let used = 0;
  for (const piece of pieces) {
    if (used + piece.length > cap) break;
    chunks.push(piece);
    used += piece.length + 1;
  }
  return chunks;
}

/* ------------------------------------------------------------------ */
/*  The TTS request                                                    */
/* ------------------------------------------------------------------ */

/**
 * Ask the coach function to speak one chunk. Resolves to the MP3 blob,
 * or null on ANY failure — unconfigured, voice_unavailable (no secret
 * or quota), network — because voice must never break the conversation.
 * The function returns the audio as an octet-stream, which supabase-js
 * hands back as a Blob; it is re-wrapped as audio/mpeg for the player.
 */
export async function requestVitalisSpeech(text: string): Promise<Blob | null> {
  if (!hasSupabaseConfig) return null;
  try {
    const { data, error } = await supabase.functions.invoke(COACH_FUNCTION, {
      body: { action: "tts", text },
    });
    if (error || !(data instanceof Blob) || data.size === 0) return null;
    return data.type === "audio/mpeg" ? data : new Blob([data], { type: "audio/mpeg" });
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  The speaker — a small sequential playback queue                    */
/* ------------------------------------------------------------------ */

export interface VitalisAudioLike {
  play: () => Promise<void> | void;
  pause: () => void;
  onended: (() => void) | null;
  onerror: (() => void) | null;
}

export interface VitalisSpeakerDeps {
  fetchChunk: (text: string) => Promise<Blob | null>;
  createUrl: (blob: Blob) => string;
  revokeUrl: (url: string) => void;
  createAudio: (url: string) => VitalisAudioLike;
}

const defaultDeps: VitalisSpeakerDeps = {
  fetchChunk: requestVitalisSpeech,
  createUrl: (blob) => URL.createObjectURL(blob),
  revokeUrl: (url) => URL.revokeObjectURL(url),
  createAudio: (url) => new Audio(url) as unknown as VitalisAudioLike,
};

export class VitalisSpeaker {
  private readonly deps: VitalisSpeakerDeps;
  /** Bumped on every stop/new speech: a pump that wakes to a stale
   *  generation simply leaves. */
  private generation = 0;
  private audio: VitalisAudioLike | null = null;
  private urls: string[] = [];
  private pendingResolve: (() => void) | null = null;
  private muted = false;

  constructor(deps: VitalisSpeakerDeps = defaultDeps) {
    this.deps = deps;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** Muting stops whatever is playing and silences future replies for
   *  the session. Unmuting never resumes a cut-off reply. */
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.stop();
  }

  /** Speak a reply. Replaces anything currently being spoken. */
  speak(text: string): void {
    if (this.muted) return;
    const chunks = spokenChunks(text);
    if (chunks.length === 0) return;
    this.stop();
    const generation = this.generation;
    void this.pump(chunks, generation);
  }

  /** Halt playback and drop every queued chunk and object URL. */
  stop(): void {
    this.generation += 1;
    if (this.audio) {
      const audio = this.audio;
      this.audio = null;
      audio.onended = null;
      audio.onerror = null;
      try {
        audio.pause();
      } catch {
        /* already stopped */
      }
    }
    if (this.pendingResolve) {
      const resolve = this.pendingResolve;
      this.pendingResolve = null;
      resolve();
    }
    for (const url of this.urls) this.deps.revokeUrl(url);
    this.urls = [];
  }

  /** A fetch that can only ever resolve — a throwing chunk source
   *  degrades to a skipped chunk, never an unhandled rejection. */
  private fetch(text: string): Promise<Blob | null> {
    try {
      return this.deps.fetchChunk(text).catch(() => null);
    } catch {
      return Promise.resolve(null);
    }
  }

  private async pump(chunks: string[], generation: number): Promise<void> {
    /* Prefetch one chunk ahead so sentences run together. */
    let next: Promise<Blob | null> | null = null;
    for (let i = 0; i < chunks.length; i += 1) {
      if (generation !== this.generation) return;
      const pending = next ?? this.fetch(chunks[i] as string);
      next = i + 1 < chunks.length ? this.fetch(chunks[i + 1] as string) : null;
      const blob = await pending;
      if (generation !== this.generation) return;
      if (!blob) continue; /* voice unavailable for this chunk — skip it */
      const url = this.deps.createUrl(blob);
      this.urls.push(url);
      await this.play(url, generation);
      if (generation !== this.generation) return;
    }
  }

  private play(url: string, generation: number): Promise<void> {
    return new Promise((resolve) => {
      const audio = this.deps.createAudio(url);
      this.audio = audio;
      this.pendingResolve = resolve;
      const done = () => {
        audio.onended = null;
        audio.onerror = null;
        if (this.audio === audio) this.audio = null;
        if (this.pendingResolve === resolve) this.pendingResolve = null;
        resolve();
      };
      audio.onended = done;
      /* A failed chunk ends itself — the queue never stalls on one. */
      audio.onerror = done;
      try {
        const playing = audio.play();
        if (playing && typeof playing.catch === "function") {
          /* An autoplay refusal is silence, not an error state. */
          playing.catch(() => {
            if (generation === this.generation) done();
          });
        }
      } catch {
        done();
      }
    });
  }
}
