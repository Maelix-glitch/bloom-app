import { useEffect, useRef, type CSSProperties } from "react";

/** Deterministic PRNG so SSR and hydration render identical particle fields. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTE = ["var(--violet)", "var(--sky)", "var(--amber)", "var(--sage)", "var(--rose)"];

const MOTES = (() => {
  const rand = mulberry32(1337);
  return Array.from({ length: 18 }, (_, i) => ({
    left: rand() * 100,
    bottom: rand() * 30,
    size: 1.5 + rand() * 2.5,
    color: PALETTE[i % PALETTE.length],
    duration: 14 + rand() * 16,
    delay: -rand() * 24,
    sway: (rand() - 0.5) * 120,
    peak: 0.25 + rand() * 0.45,
  }));
})();

/**
 * A soft light that trails the pointer — eased in a rAF loop so it feels
 * like a physical lamp rather than a cursor. Disabled for touch / reduced motion.
 */
function Spotlight() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let raf = 0;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight * 0.28;
    let x = tx;
    let y = ty;
    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };
    const loop = () => {
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      el.style.transform = `translate3d(${x - 320}px, ${y - 320}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-0 size-[640px] rounded-full"
      style={{
        background:
          "radial-gradient(circle, color-mix(in oklab, var(--violet) 8%, transparent), transparent 62%)",
        willChange: "transform",
      }}
    />
  );
}

export function Atmosphere() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Slow aurora beam sweeping behind everything */}
      <div className="absolute left-1/2 top-[-70%] size-[170vmax] -translate-x-1/2">
        <div
          className="animate-aurora size-full opacity-[0.07]"
          style={{
            background:
              "conic-gradient(from 0deg, transparent, color-mix(in oklab, var(--violet) 42%, transparent) 12%, transparent 28%, color-mix(in oklab, var(--sky) 36%, transparent) 46%, transparent 62%, color-mix(in oklab, var(--amber) 26%, transparent) 78%, transparent)",
          }}
        />
      </div>

      {/* Ambient color fields */}
      <span
        className="animate-drift absolute -left-52 -top-56 size-[620px] rounded-full blur-[110px] opacity-45"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--violet) 22%, transparent), transparent 70%)",
        }}
      />
      <span
        className="animate-drift absolute -bottom-40 -right-40 size-[540px] rounded-full blur-[110px] opacity-40"
        style={{
          animationDelay: "-9s",
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--sky) 20%, transparent), transparent 70%)",
        }}
      />
      <span
        className="animate-drift absolute left-1/2 top-1/3 size-[420px] -translate-x-1/2 rounded-full blur-[130px] opacity-25"
        style={{
          animationDelay: "-16s",
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--rose) 16%, transparent), transparent 70%)",
        }}
      />

      {/* Rising motes */}
      {MOTES.map((m, i) => (
        <span
          key={i}
          className="animate-mote absolute rounded-full"
          style={
            {
              left: `${m.left}%`,
              bottom: `-${m.bottom}px`,
              width: m.size,
              height: m.size,
              background: m.color,
              animationDuration: `${m.duration}s`,
              animationDelay: `${m.delay}s`,
              "--mote-x": `${m.sway}px`,
              "--mote-peak": m.peak,
            } as CSSProperties
          }
        />
      ))}

      <Spotlight />

      {/* Perspective grid */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklab, var(--border) 55%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--border) 55%, transparent) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(120% 90% at 50% 0%, black, transparent 75%)",
        }}
      />

      {/* Film grain */}
      <div
        className="absolute inset-0 opacity-[0.18] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
