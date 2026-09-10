import { useEffect, useState } from "react";

/**
 * Latches true the first time `ready` is true, and stays true forever.
 *
 * Store flags like `loading` flip back on during background refetches — gating
 * a skeleton on the raw flag would flash the loader over good content. The
 * latch shows the skeleton only until the FIRST real data arrives, then never
 * again for the life of the page.
 */
export function useEverReady(ready: boolean): boolean {
  const [ever, setEver] = useState(ready);
  useEffect(() => {
    if (ready) setEver(true);
  }, [ready]);
  return ever;
}