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
}

/**
 * The score. Frequencies are drawn from a pentatonic-ish set so any two cues
 * heard together still agree with each other.
 */
const SCORE: Record<Cue, Note[]> = {
  tap: [{ f: 880, t: 0, d: 0.045, v: 0.16, type: "sine" }],
  toggleOn: [
    { f: 660, t: 0, d: 0.05, v: 0.15 },
    { f: 990, t: 0.045, d: 0.07, v: 0.13 },
  ],
  toggleOff: [
    { f: 660, t: 0, d: 0.05, v: 0.14 },
    { f: 440, t: 0.045, d: 0.08, v: 0.12 },
  ],
  success: [
    { f: 587.33, t: 0, d: 0.09, v: 0.16 },
    { f: 880, t: 0.075, d: 0.16, v: 0.14 },
  ],
  celebrate: [
    { f: 587.33, t: 0, d: 0.1, v: 0.15 },
    { f: 880, t: 0.08, d: 0.12, v: 0.14 },
    { f: 1174.66, t: 0.17, d: 0.22, v: 0.11 },
  ],
  open: [{ f: 520, t: 0, d: 0.13, v: 0.1, type: "triangle" }],
  close: [{ f: 380, t: 0, d: 0.12, v: 0.09, type: "triangle" }],
  delete: [
    { f: 300, t: 0, d: 0.09, v: 0.14, type: "triangle" },
    { f: 190, t: 0.07, d: 0.16, v: 0.12, type: "triangle" },
  ],
  warn: [
    { f: 500, t: 0, d: 0.08, v: 0.13 },
    { f: 500, t: 0.13, d: 0.1, v: 0.11 },
  ],
  navigate: [{ f: 740, t: 0, d: 0.06, v: 0.09, type: "sine" }],
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

  const t0 = c.currentTime;
  for (const note of SCORE[cue]) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = note.type ?? "sine";
    osc.frequency.value = note.f;

    const start = t0 + note.t;
    const end = start + note.d;
    /* a real attack/release — stepping the gain is what makes UI sounds click */
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(note.v, start + Math.min(0.012, note.d / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}

/** Sync the in-memory flag with the stored preference (call once at boot). */
export function initSound(): void {
  enabled = soundEnabled();
}
