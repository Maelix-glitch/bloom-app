type SoundName = "hover" | "open" | "charge" | "reveal" | "claim";

type BrowserWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let audioContext: AudioContext | null = null;
let muted = false;

function getAudioContext() {
  if (typeof window === "undefined" || muted) return null;
  if (audioContext) {
    // If the context was closed, drop it so we can create a fresh one.
    if (audioContext.state === "closed") {
      audioContext = null;
    } else {
      return audioContext;
    }
  }

  try {
    const AudioContextConstructor =
      window.AudioContext ?? (window as BrowserWindow).webkitAudioContext;
    if (!AudioContextConstructor) return null;

    audioContext = new AudioContextConstructor();
    return audioContext;
  } catch {
    // Creating AudioContext can throw (e.g. too many contexts, unsupported).
    return null;
  }
}

function tone(
  context: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine",
) {
  try {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.04);
  } catch {
    // Audio is best-effort.
  }
}

function noiseBurst(context: AudioContext, start: number) {
  try {
    const buffer = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * 0.14)), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1800, start);
    filter.Q.setValueAtTime(1.2, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.06, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start(start);
    source.stop(start + 0.15);
  } catch {
    // Audio is best-effort.
  }
}

/**
 * Tiny procedural UI score. It creates the sound at interaction time rather
 * than loading an audio file, so the reward experience remains self-contained
 * and still obeys browser autoplay rules.
 *
 * This function never throws — audio failures are silently ignored so a claim
 * button never shows a console error because of sound.
 */
export function playRewardSound(name: SoundName) {
  try {
    const context = getAudioContext();
    if (!context) return;

    // resume() can reject if user activation is lost (e.g. after an async await).
    // We call it but don't await, and we swallow any rejection.
    try {
      const maybePromise = context.resume();
      if (maybePromise && typeof (maybePromise as Promise<void>).catch === "function") {
        (maybePromise as Promise<void>).catch(() => {});
      }
    } catch {
      // ignore
    }

    const now = context.currentTime + 0.02;

    if (name === "hover") {
      tone(context, 680, now, 0.08, 0.018, "sine");
      return;
    }

    if (name === "open") {
      tone(context, 330, now, 0.12, 0.035, "sine");
      tone(context, 495, now + 0.06, 0.16, 0.024, "sine");
      return;
    }

    if (name === "charge") {
      tone(context, 160, now, 0.4, 0.035, "triangle");
      tone(context, 240, now + 0.12, 0.46, 0.028, "sine");
      tone(context, 380, now + 0.25, 0.5, 0.02, "sine");
      return;
    }

    if (name === "reveal") {
      tone(context, 523.25, now, 0.6, 0.05, "sine");
      tone(context, 659.25, now + 0.1, 0.68, 0.04, "sine");
      tone(context, 783.99, now + 0.2, 0.82, 0.032, "sine");
      tone(context, 1046.5, now + 0.34, 1.1, 0.02, "sine");
      noiseBurst(context, now + 0.31);
      return;
    }

    tone(context, 392, now, 0.18, 0.05, "triangle");
    tone(context, 587.33, now + 0.1, 0.32, 0.04, "sine");
    tone(context, 783.99, now + 0.2, 0.48, 0.03, "sine");
    tone(context, 1174.66, now + 0.35, 0.8, 0.02, "sine");
    noiseBurst(context, now + 0.18);
  } catch {
    // Never let audio break the claim flow.
  }
}

export function setRewardAudioMuted(value: boolean) {
  muted = value;
  if (muted && audioContext) {
    try {
      void audioContext.suspend();
    } catch {
      // ignore
    }
  }
}

export function isRewardAudioMuted() {
  return muted;
}
