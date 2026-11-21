/**
 * useTrainerReferral — the React face of lib/trainer/referralServer.
 *
 * "loading" until the server's answer lands, then the service's
 * state. Surfaces must treat both "loading" and "unavailable" as
 * "render nothing": the trainer section appears only on a positive,
 * server-checked answer, so a regular account never sees a trace of
 * it — not even a flicker of a section that then disappears.
 */

import { useEffect, useState } from "react";

import { fetchMyTrainer, type MyTrainerState } from "@/lib/trainer/referralServer";

export type UseTrainerReferralState = MyTrainerState | { kind: "loading" };

export function useTrainerReferral(): UseTrainerReferralState {
  const [state, setState] = useState<UseTrainerReferralState>({ kind: "loading" });

  useEffect(() => {
    let live = true;
    void fetchMyTrainer().then((next) => {
      if (live) setState(next);
    });
    return () => {
      live = false;
    };
  }, []);

  return state;
}
