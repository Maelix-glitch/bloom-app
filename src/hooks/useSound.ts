/**
 * Sound, wired to the app.
 *
 * `useSoundBoot()` goes in the root once: it reads the preference, unlocks the
 * audio context on the first real gesture (browsers demand one), and keeps the
 * flag in step when the preference changes on another device.
 *
 * `useSound()` is what components call — `sound("tap")`, and a `soundEnabled`
 * / `setSoundEnabled` pair for the settings row.
 */

import { useCallback, useEffect, useState } from "react";

import { PREFS_CHANGED } from "@/lib/prefs";
import {
  initSound,
  play,
  setSoundEnabled as writeSound,
  soundEnabled as readSound,
  unlockSound,
  type Cue,
} from "@/lib/sound/sound";

/** Root-level: unlock on first gesture, follow the stored preference. */
export function useSoundBoot(): void {
  useEffect(() => {
    initSound();
    const unlock = () => unlockSound();
    /* `once` per event, but several kinds — whichever the person does first */
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    const sync = () => initSound();
    window.addEventListener(PREFS_CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener(PREFS_CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
}

export interface SoundStore {
  sound: (cue: Cue) => void;
  enabled: boolean;
  setEnabled: (on: boolean) => void;
}

export function useSound(): SoundStore {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const sync = () => setEnabled(readSound());
    sync();
    window.addEventListener(PREFS_CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PREFS_CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const sound = useCallback((cue: Cue) => play(cue), []);

  const set = useCallback((on: boolean) => {
    writeSound(on);
    setEnabled(on);
  }, []);

  return { sound, enabled, setEnabled: set };
}
