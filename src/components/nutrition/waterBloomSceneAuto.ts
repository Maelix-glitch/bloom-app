import { mountWaterScene, type WaterScene } from "./waterBloomScene";

/**
 * Water the Bloom — the scene mount the panel actually uses.
 *
 * The flower is Bloom's own 3D bloom (M-163) wherever WebGL can
 * carry it, and the original 2D painter everywhere else. The
 * choice is made once, here, and is silent:
 *
 *   · WebGL is probed on a throwaway canvas — never on a canvas a
 *     scene will paint on. A canvas holds ONE context mode for life,
 *     so the two scenes can never share an element: the 2D painter
 *     keeps the component's canvas, and the 3D scene gets its own
 *     canvas laid over the same box. That is what makes the fallback
 *     total — a WebGL canvas can never be repainted as 2D.
 *   · No WebGL → the 2D scene mounts on the panel's canvas exactly
 *     as before this slice, and no second canvas ever exists.
 *   · WebGL → the 2D scene mounts and runs as today while three.js
 *     and the 3D scene load LAZILY behind a dynamic import that
 *     fires only when this panel mounts. When the 3D scene is ready
 *     it takes the day's current progress as its first value (the
 *     day as it stands — no pour), the 2D canvas is hidden and its
 *     scene destroyed.
 *   · If the import or the scene's initialisation fails, or the
 *     WebGL context is lost later, the 3D canvas is removed and the
 *     2D scene carries on at the day's current progress — silently
 *     and completely. The numbers never lived in either canvas.
 */

let probed: boolean | null = null;

/** Whether this browser can give us a WebGL context at all. Probed
 *  once, on a scratch canvas, and remembered. */
export function webglAvailable(): boolean {
  if (probed !== null) return probed;
  try {
    const scratch = document.createElement("canvas");
    const gl =
      scratch.getContext("webgl2") ??
      scratch.getContext("webgl") ??
      scratch.getContext("experimental-webgl");
    probed = gl !== null && gl !== undefined;
  } catch {
    probed = false;
  }
  return probed;
}

/** The scene a panel gets: 3D where WebGL answers, 2D where it does
 *  not. Pure, so the choice itself is unit-pinned. */
export function sceneKindFor(webgl: boolean): "3d" | "2d" {
  return webgl ? "3d" : "2d";
}

export function mountWaterSceneAuto(
  canvas: HTMLCanvasElement,
  opts: { reducedMotion: boolean },
): WaterScene {
  if (sceneKindFor(webglAvailable()) === "2d") {
    return mountWaterScene(canvas, opts);
  }

  let destroyed = false;
  let latest = 0;
  /* The 2D painter runs from the first frame — it is both the
     loading face of the panel and the fallback. */
  let flat: WaterScene | null = mountWaterScene(canvas, opts);
  let inner: WaterScene | null = null;
  let canvas3d: HTMLCanvasElement | null = null;

  const fallBack = () => {
    if (destroyed) return;
    inner?.destroy();
    inner = null;
    canvas3d?.remove();
    canvas3d = null;
    if (!flat) {
      canvas.style.visibility = "";
      flat = mountWaterScene(canvas, opts);
      flat.setProgress(latest);
    }
  };

  void import("./flower3d/scene")
    .then(({ mountFlowerScene3d }) => {
      if (destroyed) return;
      const el = document.createElement("canvas");
      el.className = canvas.className;
      el.style.position = "absolute";
      el.style.inset = "0";
      el.setAttribute("aria-hidden", "true");
      canvas.parentElement?.appendChild(el);
      try {
        const scene = mountFlowerScene3d(el, {
          reducedMotion: opts.reducedMotion,
          onFail: fallBack,
        });
        canvas3d = el;
        inner = scene;
        inner.setProgress(latest);
        /* The 3D flower stands where the painted one stood. */
        flat?.destroy();
        flat = null;
        canvas.style.visibility = "hidden";
      } catch {
        el.remove();
        fallBack();
      }
    })
    .catch(() => {
      fallBack();
    });

  return {
    setProgress(p: number) {
      latest = p;
      inner?.setProgress(p);
      flat?.setProgress(p);
    },
    destroy() {
      destroyed = true;
      inner?.destroy();
      flat?.destroy();
      canvas3d?.remove();
    },
  };
}
