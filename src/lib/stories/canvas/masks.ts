/**
 * Bloom Story Canvas — photo masks and frames.
 *
 * A mask is the crop silhouette (normalized SVG path, applied as an
 * `objectBoundingBox` clip-path so it scales with the slot). A frame is the
 * chrome around it — polaroid mat, tape, film sprockets, window muntins.
 * Both render live and export through the same normalized geometry.
 */

import { blobPath } from "./paths";

export type PhotoMask =
  | "rect"
  | "rounded"
  | "circle"
  | "oval"
  | "arch"
  | "arch-soft"
  | "blob"
  | "leaf"
  | "diamond"
  | "hexagon"
  | "scallop"
  | "torn"
  | "asym"
  | "soft-corner";

export type PhotoFrame =
  "none" | "polaroid" | "tape" | "mat" | "film" | "window" | "magazine" | "torn-paper";

export interface MaskDef {
  id: PhotoMask;
  name: string;
  /** Normalized path (0–1 space) used as clip-path. Empty = plain rect. */
  d: string;
  /** Equivalent CSS border-radius, when a simple radius does the job better. */
  radius?: string;
}

export const MASKS: MaskDef[] = [
  { id: "rect", name: "Rectangle", d: "", radius: "0px" },
  { id: "rounded", name: "Rounded", d: "", radius: "8%" },
  { id: "soft-corner", name: "Soft corners", d: "", radius: "18%" },
  { id: "circle", name: "Circle", d: "", radius: "50%" },
  {
    id: "oval",
    name: "Oval",
    d: "M0.5 0 C0.776 0 1 0.224 1 0.5 C1 0.776 0.776 1 0.5 1 C0.224 1 0 0.776 0 0.5 C0 0.224 0.224 0 0.5 0 Z",
  },
  { id: "arch", name: "Arch", d: "M0 1 L0 0.5 A0.5 0.5 0 0 1 1 0.5 L1 1 Z" },
  {
    id: "arch-soft",
    name: "Soft arch",
    d: "M0 1 L0 0.42 C0 0.16 0.22 0 0.5 0 C0.78 0 1 0.16 1 0.42 L1 1 Z",
  },
  {
    id: "blob",
    name: "Blob",
    d: toNormalized(
      blobPath([
        [52, 3],
        [86, 18],
        [97, 52],
        [78, 88],
        [42, 97],
        [12, 78],
        [4, 42],
        [22, 12],
      ]),
    ),
  },
  { id: "leaf", name: "Leaf", d: "M0.5 0 C0.86 0.26 0.96 0.6 0.5 1 C0.04 0.6 0.14 0.26 0.5 0 Z" },
  { id: "diamond", name: "Diamond", d: "M0.5 0 L1 0.5 L0.5 1 L0 0.5 Z" },
  {
    id: "hexagon",
    name: "Hexagon",
    d: "M0.5 0 L1 0.25 L1 0.75 L0.5 1 L0 0.75 L0 0.25 Z",
  },
  {
    id: "scallop",
    name: "Scallop",
    d:
      "M0 0.06 Q0.06 0 0.125 0.05 Q0.19 0 0.25 0.05 Q0.31 0 0.375 0.05 Q0.44 0 0.5 0.05 " +
      "Q0.56 0 0.625 0.05 Q0.69 0 0.75 0.05 Q0.81 0 0.875 0.05 Q0.94 0 1 0.06 " +
      "L1 0.94 Q0.94 1 0.875 0.95 Q0.81 1 0.75 0.95 Q0.69 1 0.625 0.95 Q0.56 1 0.5 0.95 " +
      "Q0.44 1 0.375 0.95 Q0.31 1 0.25 0.95 Q0.19 1 0.125 0.95 Q0.06 1 0 0.94 Z",
  },
  {
    id: "torn",
    name: "Torn paper",
    d:
      "M0.01 0.04 L0.14 0.015 L0.28 0.05 L0.42 0.02 L0.58 0.055 L0.72 0.02 L0.86 0.05 L0.99 0.03 " +
      "L0.98 0.96 L0.85 0.985 L0.71 0.95 L0.57 0.98 L0.43 0.95 L0.29 0.98 L0.15 0.95 L0.02 0.97 Z",
  },
  {
    id: "asym",
    name: "Asymmetric",
    d: "M0 0.16 C0 0.07 0.07 0 0.16 0 L1 0 L1 0.84 C1 0.93 0.93 1 0.84 1 L0 1 Z",
  },
];

function toNormalized(d: string): string {
  return d.replace(/(-?\d+(\.\d+)?)/g, (m) => (Number(m) / 100).toFixed(4));
}

const MASK_BY_ID = new Map(MASKS.map((m) => [m.id, m]));

export function maskById(id: string | null | undefined): MaskDef {
  return MASK_BY_ID.get(id as PhotoMask) ?? MASKS[0]!;
}

export const MASK_CLIP_IDS: Record<PhotoMask, string> = Object.fromEntries(
  MASKS.filter((m) => m.d).map((m) => [m.id, `bloom-pmask-${m.id}`]),
) as Record<PhotoMask, string>;

/** The CSS `clip-path` for a mask, or undefined when border-radius does it. */
export function maskClipPath(id: PhotoMask): string | undefined {
  const def = maskById(id);
  if (!def.d) return undefined;
  return `url(#${MASK_CLIP_IDS[id]})`;
}

export function maskRadius(id: PhotoMask): string {
  return maskById(id).radius ?? "0px";
}

/* -------------------------------- frames -------------------------------- */

export interface FrameDef {
  id: PhotoFrame;
  name: string;
  /** Inner padding as a fraction of the shorter side. */
  pad: number;
  /** Extra bottom padding fraction (polaroid mat). */
  padBottom?: number;
  /** Chrome color. */
  color: string;
  /** Soft drop shadow under the whole frame. */
  shadow?: boolean;
}

export const FRAMES: FrameDef[] = [
  { id: "none", name: "None", pad: 0, color: "transparent" },
  { id: "polaroid", name: "Polaroid", pad: 0.055, padBottom: 0.16, color: "#FBF8F1", shadow: true },
  { id: "mat", name: "Mat", pad: 0.06, color: "#FBF8F1", shadow: true },
  { id: "tape", name: "Tape", pad: 0, color: "rgba(244,239,228,0.42)", shadow: true },
  { id: "film", name: "Film strip", pad: 0.09, color: "#14121C", shadow: true },
  { id: "window", name: "Window", pad: 0.05, color: "#F6F1E6", shadow: true },
  { id: "magazine", name: "Magazine", pad: 0.035, padBottom: 0.1, color: "#FFFFFF", shadow: true },
  { id: "torn-paper", name: "Torn paper", pad: 0.045, color: "#F7F2E6", shadow: true },
];

const FRAME_BY_ID = new Map(FRAMES.map((f) => [f.id, f]));

export function frameById(id: string | null | undefined): FrameDef {
  return FRAME_BY_ID.get(id as PhotoFrame) ?? FRAMES[0]!;
}
