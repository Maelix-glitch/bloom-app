/**
 * Resolves any CSS color (var(), color-mix(), oklch…) to a computed rgb()/rgba()
 * string that the Canvas 2D API can parse. DOM tooltips accept modern CSS, but
 * ECharts' canvas renderer does not.
 */
let probe: HTMLSpanElement | null = null;

export function resolveCssColor(value: string): string {
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
