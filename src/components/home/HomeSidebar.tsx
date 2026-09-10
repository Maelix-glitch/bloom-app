import { Link, useLocation } from "@tanstack/react-router";
import {
  CalendarCheck,
  GitBranch,
  Droplet,
  Smile,
  Gift,
  LifeBuoy,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import botanical from "@/assets/home/sidebar-botanical.jpg";
import { useRailIdentity } from "@/hooks/useRailIdentity";
import { useCycleVisible } from "@/hooks/useCycleVisible";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";

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
  className,
}: {
  size?: number;
  id?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
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

/**
 * The left rail every main page shares (lg and up). Inside an `.app-shell`
 * wrapper it is fixed to the left edge of the viewport — exactly one screen
 * tall, from the very top (there is no separate header bar any more) to the
 * bottom, where the botanical sits under a soft fade — so it never scrolls
 * with the page, however long the page is (Coach). The wrapper pads for its
 * width (see the App shell block in src/styles.css). `.app-nav` pins Bloom's
 * base palette so the rail is identical on every route, even ones that retint
 * the shared tokens (Rewards).
 *
 * Alignment: the brand row is laid out exactly like a nav link (the same
 * 16px icon slot at the same x, the same gap), so the mark sits on the icon
 * column and the wordmark on the label column.
 */
/**
 * The primary nav, minus "Cycle" when it doesn't apply — either because
 * tracking is switched off, or because this person said the cycle isn't part
 * of their Bloom during setup.
 */
function useNavItems() {
  const { visible } = useCycleVisible();
  return visible ? HOME_NAV : HOME_NAV.filter((i) => i.to !== "/cycle");
}

export function HomeSidebar() {
  const navItems = useNavItems();
  const { pathname } = useLocation();
  const profileActive = pathname === "/profile" || pathname.startsWith("/@");
  return (
    <aside className="app-nav app-sidebar z-[2] hidden w-[220px] shrink-0 flex-col justify-between overflow-clip border-r border-border lg:fixed lg:inset-y-0 lg:left-0 lg:flex">
      {/* Botanical: the 1:2 photo covers the whole rail — cover keeps its
          proportions (no stretch), anchored to the foot, fading into the
          panel above so there is never a hard line. */}
      <div
        aria-hidden="true"
        className="app-sidebar-botanical pointer-events-none absolute inset-0"
      >
        <img
          src={botanical}
          alt=""
          loading="lazy"
          width={600}
          height={1200}
          className="h-full w-full object-cover object-bottom"
        />
      </div>

      <div className="relative">
        <Link
          to="/"
          className="mx-4 flex h-[64px] items-center gap-3 px-3 text-foreground"
          aria-label="Bloom — Today"
        >
          {/* -3px margins give the 22px arc a 16px box — a nav icon's — so it
              is centred on the icon column and the wordmark starts where the
              labels do. */}
          <BloomMark size={22} id="bloomBrandGradientSidebar" className="-m-[3px] shrink-0" />
          <span className="font-display text-[22px] leading-none tracking-wide">Bloom</span>
        </Link>
        <span className="app-sidebar-rule mx-7 block h-px" />
        <nav className="mt-5 space-y-1 px-4" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.match(pathname);
            return (
              <Link
                key={item.label}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={`app-nav-link flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-colors ${
                  active
                    ? "app-nav-link-active text-foreground"
                    : "text-muted-foreground hover:bg-surface-2/40 hover:text-foreground"
                }`}
              >
                <Icon className={`size-4 ${active ? "text-primary" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <span className="app-sidebar-rule mx-7 mt-5 block h-px" />
        <Link
          to="/profile"
          aria-current={profileActive ? "page" : undefined}
          className={`mx-4 mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-colors ${
            profileActive
              ? "app-nav-link-active text-foreground"
              : "text-muted-foreground hover:bg-surface-2/40 hover:text-foreground"
          }`}
        >
          <UserRound className={`size-4 ${profileActive ? "text-primary" : ""}`} />
          Profile
        </Link>
      </div>

      <div className="relative">
        <div className="app-sidebar-quote px-7">
          <span className="app-sidebar-gold-rule block h-px w-8" />
          <p className="mt-5 font-display text-[17px] italic leading-snug text-muted-foreground">
            A calmer you, a brighter tomorrow.
          </p>
          <span className="app-sidebar-gold-rule mt-5 block h-px w-8" />
        </div>
        <RailProfile />
      </div>
    </aside>
  );
}

/**
 * The identity block at the foot of the rail — the avatar row the
 * harmonious-dashboard model shows under its sidebar: a settings glyph, the
 * avatar, the name and a one-line tagline. Real data: the signed-in user's
 * profile (photo when set, initials otherwise); signed out it invites you in.
 */
function RailProfile() {
  const id = useRailIdentity();
  const signedIn = id.status === "signed-in";
  const name = signedIn ? (id.displayName ?? "Your profile") : "Sign in";
  const line = signedIn
    ? (id.bio ?? "Keep growing.")
    : id.status === "checking"
      ? "…"
      : "Sync across your devices";
  return (
    <div className="mt-8 flex items-center gap-3 border-t border-border px-7 py-6">
      <Link
        to="/profile"
        aria-label="Settings"
        title="Settings"
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      >
        <Settings className="size-[18px]" strokeWidth={1.5} />
      </Link>
      <Link
        to="/profile"
        className="ml-2 flex min-w-0 items-center gap-3 rounded-full"
        aria-label={signedIn ? "Your profile" : "Sign in"}
        data-testid="rail-profile"
      >
        <ProfileAvatar
          name={id.displayName ?? "Bloom"}
          avatarPath={id.avatarPath}
          accent={id.accent}
          size={36}
        />
        <span className="min-w-0">
          <span className="block truncate text-sm text-foreground">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">{line}</span>
        </span>
      </Link>
    </div>
  );
}

/**
 * Phones and tablets have no rail, so a brand bar fixed to the top carries
 * the mark, the wordmark and the profile link; the primary links live in the
 * bottom tab bar (HomeMobileNav). Its height is `--app-top-bar` (60px) and
 * the `.app-shell` wrapper pads for it — see src/styles.css.
 */
export function HomeMobileBar() {
  const { pathname } = useLocation();
  const profileActive = pathname === "/profile" || pathname.startsWith("/@");
  return (
    <div className="app-nav app-mobile-bar fixed inset-x-0 top-0 z-20 flex h-[60px] items-center justify-between border-b border-border px-5 lg:hidden">
      <Link to="/" className="flex items-center gap-2.5 text-foreground" aria-label="Bloom — Today">
        <BloomMark size={22} id="bloomBrandGradientMobile" />
        <span className="font-display text-[21px] leading-none tracking-wide">Bloom</span>
      </Link>
      <Link
        to="/profile"
        aria-label="Your profile"
        aria-current={profileActive ? "page" : undefined}
        className={`grid size-9 place-items-center rounded-full border transition-colors ${
          profileActive
            ? "border-primary/50 text-foreground"
            : "border-border text-muted-foreground hover:text-foreground"
        }`}
      >
        <UserRound className="size-4" />
      </Link>
    </div>
  );
}

export function HomeMobileNav() {
  const { pathname } = useLocation();
  const navItems = useNavItems();
  return (
    <nav
      className="app-nav app-mobile-nav fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-border bg-surface/90 px-2 py-2 backdrop-blur-xl lg:hidden"
      aria-label="Primary"
    >
      {navItems.map((item) => {
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

/**
 * AppNav — the only chrome a main page renders. Drop it first inside any page
 * wrapper that carries the `app-shell` class: on desktop the rail (brand +
 * primary links + profile) is fixed beside the page's own <main>; on phones
 * the brand bar is fixed on top and the tab bar at the bottom. No re-nesting
 * needed — `.app-shell` (src/styles.css) pads for whichever chrome is shown.
 */
export function AppNav() {
  return (
    <>
      <HomeSidebar />
      <HomeMobileBar />
      <HomeMobileNav />
    </>
  );
}
