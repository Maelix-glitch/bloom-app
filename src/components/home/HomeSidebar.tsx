import { Link, useLocation } from "@tanstack/react-router";
import {
  CalendarCheck,
  GitBranch,
  Droplet,
  Smile,
  Gift,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";

import botanical from "@/assets/home/sidebar-botanical.jpg";

export const HOME_NAV: {
  label: string;
  to: string;
  icon: LucideIcon;
  match: (p: string) => boolean;
}[] = [
  { label: "Today", to: "/", icon: CalendarCheck, match: (p) => p === "/" },
  { label: "Trackers", to: "/trackers", icon: GitBranch, match: (p) => p.startsWith("/trackers") },
  { label: "Cycle", to: "/cycle", icon: Droplet, match: (p) => p.startsWith("/cycle") },
  { label: "Mood", to: "/mood", icon: Smile, match: (p) => p.startsWith("/mood") },
  { label: "Rewards", to: "/rewards", icon: Gift, match: (p) => p.startsWith("/rewards") },
  { label: "Coach", to: "/coach", icon: LifeBuoy, match: (p) => p.startsWith("/coach") },
];

/**
 * Bloom's brand mark — the same single arc, same gradient as BloomHeader and
 * the legacy shared header, so the home page carries the current logo.
 */
export function BloomMark({
  size = 22,
  id = "bloomBrandGradientHome",
}: {
  size?: number;
  id?: string;
}) {
  return (
    <svg viewBox="0 0 28 28" fill="none" width={size} height={size} aria-hidden="true">
      <path
        d="M4 20c3-9 7-14 10-14s7 5 10 14"
        stroke={`url(#${id})`}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id={id} x1="4" y1="13" x2="24" y2="13">
          <stop stopColor="#8FB69C" />
          <stop offset="1" stopColor="#E0B36B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function HomeSidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="relative hidden w-[212px] shrink-0 flex-col justify-between overflow-hidden border-r border-border bg-surface/40 py-6 lg:flex">
      <img
        src={botanical}
        alt=""
        loading="lazy"
        width={600}
        height={1200}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] w-full object-cover opacity-45"
      />
      <div className="relative">
        <Link to="/" className="flex items-center gap-2.5 px-6 text-foreground">
          <BloomMark size={22} id="bloomBrandGradientSidebar" />
          <span className="font-display text-2xl tracking-wide">Bloom</span>
        </Link>
        <nav className="mt-8 space-y-1 px-3" aria-label="Primary">
          {HOME_NAV.map((item) => {
            const Icon = item.icon;
            const active = item.match(pathname);
            return (
              <Link
                key={item.label}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "border border-border bg-surface-2/70 text-foreground"
                    : "text-muted-foreground hover:bg-surface-2/40 hover:text-foreground"
                }`}
              >
                <Icon className={`size-4 ${active ? "text-primary" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <p className="relative px-6 font-display text-lg italic leading-snug text-muted-foreground">
        <span className="mb-3 block h-px w-8 bg-border" />A calmer you, a brighter tomorrow.
      </p>
    </aside>
  );
}

export function HomeMobileNav() {
  const { pathname } = useLocation();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-border bg-surface/90 px-2 py-2 backdrop-blur-xl lg:hidden"
      aria-label="Primary"
    >
      {HOME_NAV.map((item) => {
        const Icon = item.icon;
        const active = item.match(pathname);
        return (
          <Link
            key={item.label}
            to={item.to}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-1 rounded-lg px-2 py-1 text-[10px] ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
