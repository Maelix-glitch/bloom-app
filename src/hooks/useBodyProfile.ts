/**
 * Body profile + weigh-ins, device-first and account-synced through the shared
 * preferences document (so height/weight follow the person, not the browser).
 */

import { useCallback, useMemo } from "react";

import { getPref, setPref } from "@/lib/prefs";
import { usePrefValue } from "@/lib/prefsStore";
import { todayLocal } from "@/lib/localDay";
import {
  BODY_KEY,
  DEFAULT_BODY,
  WEIGHINS_KEY,
  bodyTargetsOf,
  parseBodyProfile,
  parseWeighIns,
  type BodyProfile,
  type WeighIn,
} from "@/lib/health/body";

export interface BodyStore {
  profile: BodyProfile;
  weighIns: WeighIn[];
  targets: ReturnType<typeof bodyTargetsOf>;
  today: string;
  save: (patch: Partial<BodyProfile>) => void;
  logWeight: (kg: number, date?: string) => void;
  clear: () => void;
}

export function useBodyProfile(): BodyStore {
  const profile = usePrefValue(BODY_KEY, parseBodyProfile, DEFAULT_BODY);
  const weighIns = usePrefValue(WEIGHINS_KEY, parseWeighIns, []);
  const today = todayLocal();

  const save = useCallback((patch: Partial<BodyProfile>) => {
    /* Read the current value through the same pref so quick successive edits
       compose instead of overwriting each other with a stale closure. */
    const current = getPref(BODY_KEY, parseBodyProfile, DEFAULT_BODY);
    const next: BodyProfile = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    setPref(BODY_KEY, next);
  }, []);

  const logWeight = useCallback(
    (kg: number, date: string = todayLocal()) => {
      if (!Number.isFinite(kg) || kg < 25 || kg > 350) return;
      const rounded = Math.round(kg * 10) / 10;
      const next = [...parseWeighIns(weighIns.filter((entry) => entry.date !== date)), {
        date,
        kg: rounded,
      }].sort((a, b) => (a.date < b.date ? -1 : 1));
      setPref(WEIGHINS_KEY, next.slice(-365));
      save({ weightKg: rounded });
    },
    [weighIns, save],
  );

  const clear = useCallback(() => {
    setPref(BODY_KEY, DEFAULT_BODY);
    setPref(WEIGHINS_KEY, []);
  }, []);

  const targets = useMemo(() => bodyTargetsOf(profile, today), [profile, today]);

  return { profile, weighIns, targets, today, save, logWeight, clear };
}
