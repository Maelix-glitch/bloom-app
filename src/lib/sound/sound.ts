/**
 * Bloom's sound — synthesized, never sampled.
 *
 * A premium product is quiet, short and consistent: a soft tap on press, a
 * two-note rise on success, a low thud on something destructive. Everything
 * here is generated with the Web Audio API, so there are no files to download,
 * nothing to license, and the whole system costs a few hundred bytes.
 *
 * Rules it holds itself to:
 *   · **short** — nothing over ~320 ms; a UI sound you notice twice is a bug;
 *   · **soft** — sine/triangle only, gentle attack, exponential release, no
 *     clicks (the gain never steps to zero);
 *   · **warm** — notes glide a little and carry a quiet octave partial, so a
 *     tap lands as a soft *thock* rather than a bare beeper pip — a static
 *     high sine is what made the old tap read as an ugly click;
 *   · **rate-limited** — the same cue can't fire twice within 60 ms, so a
 *     fast tap doesn't machine-gun;
 *   · **polite** — silent until the first real user gesture (browsers require
 *     it anyway), silent when the tab is hidden, and silent for anyone who
 *     asked for reduced motion, which in practice means "stop the flourishes";
 *   · **off in one tap** — the preference follows the account.
 *
 * The context is created lazily on the first gesture and reused; nothing is
 * allocated until someone actually interacts.
 */

import { getPref, setPref } from "@/lib/prefs";

export const SOUND_PREF = "sound.enabled";

export type Cue =
  /** a button, a chip, a row — the everyday tap */
  | "tap"
  /** switching something on */
  | "toggleOn"
  /** switching something off */
  | "toggleOff"
  /** a save that worked */
  | "success"
  /** a milestone, a streak, a reward */
  | "celebrate"
  /** a sheet or dialog opening */
  | "open"
  /** a sheet or dialog closing */
  | "close"
  /** something was removed */
  | "delete"
  /** something needs attention */
  | "warn"
  /** navigating to another page */
  | "navigate";

interface Note {
  /** Hz */
  f: number;
  /** seconds from the cue start */
  t: number;
  /** seconds */
  d: number;
  /** 0–1, before the master gain */
  v: number;
  type?: OscillatorType;
  /**
   * Glide-to frequency (Hz), reached exponentially by the note's end. A
   * small pitch fall is what turns a pip into a pop; a small rise opens.
   * Omit for a steady tone.
   */
  g?: number;
  /**
   * Harmonic warmth: level (0–1, relative to `v`) of a quiet sine partial
   * one octave up, rendered with the same envelope. Body without harshness.
   */
  h?: number;
}

/**
 * The score. Frequencies are drawn from a pentatonic-ish set so any two cues
 * heard together still agree with each other. Exported as pure data so the
 * recipes themselves are testable without an AudioContext.
 *
 * The family voice: low-to-mid pitches, a touch of glide, a whisper of
 * octave partial, and peaks well under the old 0.16 — premium UI sound is
 * felt more than heard.
 */
export const SOUND_SCORE: Record<Cue, Note[]> = {
  /* a soft thock: mid sine falling a fourth, gone in 85 ms */
  tap: [{ f: 620, t: 0, d: 0.085, v: 0.11, type: "sine", g: 470, h: 0.25 }],
  toggleOn: [
    { f: 520, t: 0, d: 0.06, v: 0.1, g: 560, h: 0.2 },
    { f: 780, t: 0.04, d: 0.09, v: 0.09, h: 0.2 },
  ],
  toggleOff: [
    { f: 520, t: 0, d: 0.06, v: 0.095, g: 490, h: 0.2 },
    { f: 392, t: 0.04, d: 0.1, v: 0.085, h: 0.15 },
  ],
  success: [
    { f: 587.33, t: 0, d: 0.1, v: 0.11, h: 0.25 },
    { f: 880, t: 0.07, d: 0.17, v: 0.1, h: 0.3 },
  ],
  celebrate: [
    { f: 587.33, t: 0, d: 0.085, v: 0.11, h: 0.25 },
    { f: 880, t: 0.055, d: 0.095, v: 0.1, h: 0.3 },
    { f: 1174.66, t: 0.115, d: 0.16, v: 0.085, h: 0.35 },
  ],
  /* a gentle rise, like the sheet itself lifting */
  open: [{ f: 440, t: 0, d: 0.14, v: 0.08, type: "triangle", g: 560, h: 0.15 }],
  /* and settling back down */
  close: [{ f: 500, t: 0, d: 0.12, v: 0.07, type: "triangle", g: 360, h: 0.15 }],
  delete: [
    { f: 260, t: 0, d: 0.09, v: 0.11, type: "triangle", g: 210, h: 0.1 },
    { f: 170, t: 0.06, d: 0.15, v: 0.095, type: "triangle", g: 140, h: 0.1 },
  ],
  /* a soft two-note descent — "look here", never an alarm beep */
  warn: [
    { f: 392, t: 0, d: 0.11, v: 0.09, g: 370, h: 0.2 },
    { f: 330, t: 0.1, d: 0.15, v: 0.08, h: 0.15 },
  ],
  /* barely there: a small rise as the page changes */
  navigate: [{ f: 560, t: 0, d: 0.07, v: 0.065, type: "sine", g: 640, h: 0.2 }],
};

const hasWindow = () => typeof window !== "undefined";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let unlocked = false;
let enabled = true;
const lastPlayed = new Map<Cue, number>();

function reducedMotion(): boolean {
  if (!hasWindow()) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Read the stored preference. Defaults to ON — the app is meant to feel alive. */
export function soundEnabled(): boolean {
  return getPref<boolean>(SOUND_PREF, (raw) => (typeof raw === "boolean" ? raw : null), true);
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  setPref(SOUND_PREF, on);
  if (on) void play("toggleOn");
}

function ensureContext(): AudioContext | null {
  if (!hasWindow()) return null;
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Browsers refuse to start audio before a gesture. Call this once from a real
 * pointer/key event — after that every cue works. Safe to call repeatedly.
 */
export function unlockSound(): void {
  if (unlocked) return;
  const c = ensureContext();
  if (!c) return;
  unlocked = true;
  if (c.state === "suspended") void c.resume();
}

/** Play a cue. Silent (and free) when muted, hidden, or before the first gesture. */
export function play(cue: Cue): void {
  if (!hasWindow() || !enabled || !unlocked) return;
  if (document.hidden) return;
  if (reducedMotion() && cue !== "success" && cue !== "warn") return;

  const now = Date.now();
  const last = lastPlayed.get(cue) ?? 0;
  if (now - last < 60) return;
  lastPlayed.set(cue, now);

  const c = ensureContext();
  if (!c || !master) return;
  if (c.state === "suspended") void c.resume();
  const out = master;

  const t0 = c.currentTime;
  for (const note of SOUND_SCORE[cue]) {
    const start = t0 + note.t;
    const end = start + note.d;
    const attack = Math.min(0.012, note.d / 3);

    /* One voice: an oscillator with the house envelope — a real attack and
       an exponential release, because stepping the gain is what makes UI
       sounds click. Rendered twice per note when the recipe asks for
       harmonic warmth: the fundamental, plus a quiet sine an octave up. */
    const voice = (freq: number, glideTo: number | undefined, peak: number, type: OscillatorType) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (glideTo !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(glideTo, end);
      }
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain);
      gain.connect(out);
      osc.start(start);
      osc.stop(end + 0.02);
    };

    voice(note.f, note.g, note.v, note.type ?? "sine");
    if (note.h) {
      voice(note.f * 2, note.g === undefined ? undefined : note.g * 2, note.v * note.h, "sine");
    }
  }
}

/** Sync the in-memory flag with the stored preference (call once at boot). */
export function initSound(): void {
  enabled = soundEnabled();
}
