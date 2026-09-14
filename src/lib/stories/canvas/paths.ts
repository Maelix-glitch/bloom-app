/**
 * Bloom Story Canvas — shared path builders.
 * Small, pure geometry helpers used by both the shape catalog and the
 * photo-mask catalog so curves stay consistent across the two.
 */

/** A smooth closed blob through the given points (0–100 space). */
export const blobPath = (points: readonly [number, number][], tension = 0.35): string => {
  const n = points.length;
  if (n < 3) return "";
  const at = (i: number): [number, number] => points[((i % n) + n) % n]!;
  let d = `M ${at(0)[0]} ${at(0)[1]}`;
  for (let i = 0; i < n; i += 1) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) * tension;
    const c1y = p1[1] + (p2[1] - p0[1]) * tension;
    const c2x = p2[0] - (p3[0] - p1[0]) * tension;
    const c2y = p2[1] - (p3[1] - p1[1]) * tension;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0]} ${p2[1]}`;
  }
  return `${d} Z`;
};

/** An n-point star (0–100 space). */
export const star = (cx: number, cy: number, outer: number, inner: number, n: number): string => {
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / n - Math.PI / 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return `M ${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(" L ")} Z`;
};

/** Rescale a 0–100 path into 0–1 space. */
export function toUnitPath(d: string): string {
  return d.replace(/-?\d+(\.\d+)?/g, (m) => (Number(m) / 100).toFixed(4));
}
