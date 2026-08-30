/**
 * Atmosphere — the drifting light behind the page.
 *
 * Three blurred orbs picked from the active theme, moving slowly enough to
 * feel like a room rather than a screensaver. Purely decorative: it's hidden
 * from assistive tech, skipped when the theme asks for no atmosphere, and
 * frozen entirely under prefers-reduced-motion.
 */

export function Atmosphere() {
  return (
    <div className="ci-atmos" aria-hidden>
      <i />
      <i />
      <i />
    </div>
  );
}
