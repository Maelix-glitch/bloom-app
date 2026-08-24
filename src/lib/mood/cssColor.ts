/**
 * Resolves any CSS color (var(), color-mix(), oklch…) to a canvas-safe
 * rgb()/rgba() string. Modern Chrome serializes computed colors as
 * oklch()/oklab()/color(srgb …), which the Canvas 2D API cannot parse,
 * so anything non-rgb is converted to sRGB mathematically.
 */

let probe: HTMLSpanElement | null = null;
const cache = new Map<string, string>();

function probeColor(value: string): string {
  if (typeof document === "undefined") return value;
  if (!probe) {
    probe = document.createElement("span");
    probe.style.display = "none";
    document.body.appendChild(probe);
  }
  probe.style.color = "rgb(1, 2, 3)"; // sentinel so invalid input is detectable
  probe.style.color = value;
  const resolved = getComputedStyle(probe).color;
  return resolved && resolved !== "rgb(1, 2, 3)" ? resolved : value;
}

const DEG = Math.PI / 180;

function gamma(c: number): number {
  const x = Math.min(1, Math.max(0, c));
  return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

type Vec3 = [number, number, number];

function oklabToSrgb(L: number, a: number, b: number): Vec3 {
  const l = L + 0.3963377774 * a + 0.2158037573 * b;
  const m = L - 0.1055613458 * a - 0.0638541728 * b;
  const s = L - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l ** 3;
  const m3 = m ** 3;
  const s3 = s ** 3;
  return [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ];
}

function labToSrgb(L: number, a: number, b: number): Vec3 {
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const e = 216 / 24389;
  const k = 24389 / 27;
  const inv = (f: number) => (f ** 3 > e ? f ** 3 : (116 * f - 16) / k);
  const X = inv(fx) * 0.96422;
  const Y = L > k * e ? ((L + 16) / 116) ** 3 : L / k;
  const Z = inv(fz) * 0.82521;
  // Bradford adaptation D50 → D65
  const X65 = 0.9555766 * X - 0.0230393 * Y + 0.0631636 * Z;
  const Y65 = -0.0282895 * X + 1.0099416 * Y + 0.0210077 * Z;
  const Z65 = 0.0122982 * X - 0.020483 * Y + 1.3299098 * Z;
  return [
    3.2404542 * X65 - 1.5371385 * Y65 - 0.4985314 * Z65,
    -0.969266 * X65 + 1.8760108 * Y65 + 0.041556 * Z65,
    0.0556434 * X65 - 0.2040259 * Y65 + 1.0572252 * Z65,
  ];
}

function displayP3ToSrgb(r: number, g: number, b: number): Vec3 {
  return [
    1.2249401 * r - 0.2249404 * g,
    -0.0420569 * r + 1.0420571 * g,
    -0.0196376 * r - 0.0786361 * g + 1.0982735 * b,
  ];
}

function splitFn(input: string): { name: string; parts: string[]; alpha: string | null } | null {
  const m = /^([a-z0-9-]+)\((.*)\)$/i.exec(input.trim());
  if (!m) return null;
  const fnName = m[1] ?? "";
  let body = (m[2] ?? "").trim();
  let alpha: string | null = null;
  const slash = body.split("/");
  if (slash.length > 1) {
    alpha = slash[1].trim();
    body = slash[0].trim();
  }
  const parts = body.includes(",") ? body.split(",").map((s) => s.trim()) : body.split(/\s+/);
  return { name: m[1].toLowerCase(), parts, alpha };
}

/** Numeric component; `pctScale` maps 100% onto the space's reference range. */
function num(raw: string | undefined, pctScale = 1): number {
  if (!raw || raw === "none") return 0;
  if (raw.endsWith("%")) return (parseFloat(raw) / 100) * pctScale;
  const v = parseFloat(raw);
  return Number.isFinite(v) ? v : 0;
}

function alphaOf(raw: string | null): number {
  if (raw == null) return 1;
  if (raw.endsWith("%")) return Math.min(1, Math.max(0, parseFloat(raw) / 100));
  const v = parseFloat(raw);
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
}

function toSrgb(resolved: string): { rgb: Vec3; alpha: number } | null {
  const fn = splitFn(resolved);
  if (!fn) return null;
  const { name, parts } = fn;
  const alpha = alphaOf(fn.alpha);
  switch (name) {
    case "oklch":
      return {
        rgb: oklabToSrgb(
          num(parts[0]),
          num(parts[1], 0.4) * Math.cos(num(parts[2]) * DEG),
          num(parts[1], 0.4) * Math.sin(num(parts[2]) * DEG),
        ),
        alpha,
      };
    case "oklab":
      return { rgb: oklabToSrgb(num(parts[0]), num(parts[1], 0.4), num(parts[2], 0.4)), alpha };
    case "lch":
      return {
        rgb: labToSrgb(
          num(parts[0], 100),
          num(parts[1], 150) * Math.cos(num(parts[2]) * DEG),
          num(parts[1], 150) * Math.sin(num(parts[2]) * DEG),
        ),
        alpha,
      };
    case "lab":
      return { rgb: labToSrgb(num(parts[0], 100), num(parts[1], 125), num(parts[2], 125)), alpha };
    case "color": {
      const space = (parts[0] ?? "").toLowerCase();
      const channels: Vec3 = [num(parts[1]), num(parts[2]), num(parts[3])];
      if (space === "srgb") return { rgb: channels, alpha };
      if (space === "srgb-linear") return { rgb: channels.map(gamma) as Vec3, alpha };
      if (space === "display-p3") return { rgb: displayP3ToSrgb(...channels), alpha };
      return null;
    }
    default:
      return null;
  }
}

export function resolveCssColor(value: string): string {
  const hit = cache.get(value);
  if (hit) return hit;

  const resolved = probeColor(value).trim();
  let out = resolved;
  if (!resolved.startsWith("rgb")) {
    const converted = toSrgb(resolved);
    if (converted) {
      const [r, g, b] = converted.rgb.map((c) => Math.round(gamma(c) * 255));
      out =
        converted.alpha >= 1
          ? `rgb(${r}, ${g}, ${b})`
          : `rgba(${r}, ${g}, ${b}, ${Math.round(converted.alpha * 1000) / 1000})`;
    }
  }
  cache.set(value, out);
  return out;
}
