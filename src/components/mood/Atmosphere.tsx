export function Atmosphere() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <span
        className="animate-drift absolute -left-52 -top-56 size-[620px] rounded-full blur-[110px] opacity-45"
        style={{
          background: "radial-gradient(circle, color-mix(in oklab, var(--violet) 22%, transparent), transparent 70%)",
        }}
      />
      <span
        className="animate-drift absolute -bottom-40 -right-40 size-[540px] rounded-full blur-[110px] opacity-40"
        style={{
          animationDelay: "-9s",
          background: "radial-gradient(circle, color-mix(in oklab, var(--sky) 20%, transparent), transparent 70%)",
        }}
      />
      <span
        className="animate-drift absolute left-1/2 top-1/3 size-[420px] -translate-x-1/2 rounded-full blur-[130px] opacity-25"
        style={{
          animationDelay: "-16s",
          background: "radial-gradient(circle, color-mix(in oklab, var(--rose) 16%, transparent), transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklab, var(--border) 55%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--border) 55%, transparent) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(120% 90% at 50% 0%, black, transparent 75%)",
        }}
      />
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
