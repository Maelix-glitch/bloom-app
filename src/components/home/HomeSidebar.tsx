import { Link, useLocation } from "@tanstack/react-router";
import { Settings, UserRound } from "lucide-react";

import { BloomIcon, type BloomIconName } from "@/components/icons/BloomIcon";
import { routeShowsAppNav } from "@/lib/appNav";

import botanical from "@/assets/home/sidebar-botanical.jpg";
import { useRailIdentity } from "@/hooks/useRailIdentity";
import { useCycleVisible } from "@/hooks/useCycleVisible";
import { useWallet } from "@/hooks/useWallet";
import { rankFor } from "@/lib/progression/ranks";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { BloomLogo } from "@/components/BloomLogo";
import { NotificationBell } from "@/components/notifications/NotificationCenter";
import { PointsChip } from "@/components/system/PointsChip";
import { RailPointsCard } from "@/components/home/RailPointsCard";

/**
 * The primary destinations, marked with the bespoke registry glyphs (U4):
 * the old Lucide picks — GitBranch for Trackers, LifeBuoy for Coach — said
 * nothing about the places they named, in Bloom's language or any other.
 */
export const HOME_NAV: {
  label: string;
  to: string;
  icon: BloomIconName;
  match: (p: string) => boolean;
}[] = [
  { label: "Today", to: "/", icon: "today", match: (p) => p === "/" },
  { label: "Trackers", to: "/trackers", icon: "trackers", match: (p) => p.startsWith("/trackers") },
  { label: "Cycle", to: "/cycle", icon: "cycle", match: (p) => p.startsWith("/cycle") },
  { label: "Mood", to: "/mood", icon: "mood", match: (p) => p.startsWith("/mood") },
  { label: "Rewards", to: "/rewards", icon: "rewards", match: (p) => p.startsWith("/rewards") },
  { label: "Coach", to: "/coach", icon: "coach", match: (p) => p.startsWith("/coach") },
];

/**
 * The left rail every main page shares (lg and up). Inside an `.app-shell`
 * wrapper it is fixed to the left edge of the viewport — exactly one screen
 * tall, from the very top (there is no separate header bar any more) to the
 * bottom, where the botanical footer sits under a soft fade — so it never
 * scrolls with the page, however long the page is (Coach). The wrapper pads
 * for its width (see the App shell block in src/styles.css). `.app-nav` pins
 * Bloom's base palette so the rail is identical on every route, even ones
 * that retint the shared tokens (Rewards).
 *
 * Composition (Reskin slice 2, after the owner's prototype): the brand at
 * the top; the destinations as pills — the active one on a white-alpha fill
 * with a gold tick on the rail's left edge and a gold glyph; the points
 * card in its richer form (RailPointsCard: balance, percent to the next
 * rank, gold-gradient track); Profile below it; and at the foot, over
 * Bloom's own botanical photograph, the sync line and the serif-italic
 * tagline above the identity strip.
 *
 * Alignment: the brand row is laid out exactly like a nav link (the same
 * 17px icon slot at the same x, the same gap), so the mark sits on the icon
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
    <aside className="app-nav app-sidebar z-[2] hidden w-[220px] shrink-0 flex-col overflow-clip border-r border-border lg:fixed lg:inset-y-0 lg:left-0 lg:flex">
      <div className="relative">
        <Link
          to="/"
          className="mx-4 flex h-[64px] items-center gap-3 px-3 text-foreground"
          aria-label="Bloom — Today"
        >
          {/* -3px margins give the 22px arc a 16px box — a nav icon's — so it
              is centred on the icon column and the wordmark starts where the
              labels do. */}
          <BloomLogo size={22} className="-m-[3px] shrink-0" />
          <span className="font-display text-[22px] leading-none tracking-wide">Bloom</span>
        </Link>
        <nav className="mt-2 space-y-1 px-4" aria-label="Primary">
          {navItems.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.label}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={`app-nav-link relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[length:var(--text-callout)] font-medium leading-[var(--leading-callout)] ${
                  active ? "app-nav-link-active" : ""
                }`}
              >
                {/* The gold tick on the rail's left edge marks the active
                    destination (the prototype's signature); the pill fill
                    and the gold glyph ride in .app-nav-link-active and
                    .app-nav-glyph (see src/styles.css). */}
                {active ? <span aria-hidden="true" className="app-nav-tick" /> : null}
                {/* The glyph rides in .app-nav-glyph: the wrapper carries
                    the colour, the grow/settle transform and the glow disc,
                    and data-glyph keys the per-glyph choreography (see
                    "Sidebar icon motion" in src/styles.css). */}
                <span className="app-nav-glyph" data-glyph={item.icon}>
                  <BloomIcon name={item.icon} size={17} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mx-4 mt-6">
          <RailPointsCard />
        </div>
        <Link
          to="/profile"
          aria-current={profileActive ? "page" : undefined}
          className={`app-nav-link relative mx-4 mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[length:var(--text-callout)] font-medium leading-[var(--leading-callout)] ${
            profileActive ? "app-nav-link-active" : ""
          }`}
        >
          {profileActive ? <span aria-hidden="true" className="app-nav-tick" /> : null}
          {/* The bespoke profile glyph in the same .app-nav-glyph wrapper
              as the primary links, so it takes the same colour, glow and
              choreography (it carried a stock Lucide person before). */}
          <span className="app-nav-glyph" data-glyph="profile">
            <BloomIcon name="profile" size={17} />
          </span>
          Profile
        </Link>
      </div>

      {/* Botanical footer: Bloom's own fern photograph, local to the foot
          of the rail now (it spanned the whole rail before the reskin),
          under a dark gradient scrim. Over it: the sync line — Bloom's
          "Synced with your account" element, kept — and the serif-italic
          tagline, then the identity strip on a blurred dark band. */}
      <div className="relative mt-auto overflow-hidden">
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
        <div aria-hidden="true" className="app-sidebar-scrim absolute inset-0" />
        <div className="app-sidebar-quote relative px-7 pb-5 pt-20">
          <RailSyncLine />
          <p className="mt-3 font-display text-[length:var(--text-section)] italic leading-snug text-muted-foreground">
            A calmer you, a brighter tomorrow.
          </p>
        </div>
        <RailProfile />
      </div>
    </aside>
  );
}

/**
 * The sync line at the head of the botanical footer — the same honest
 * states the Today toolbar's sync line speaks, from the one wallet store:
 * the account balance read means the record is synced with the account;
 * a failed read says the device number is standing in; signed out, the
 * record lives on this device. Settled states only, like every Bloom sync
 * line — while the account read is in flight there is no line at all.
 */
function RailSyncLine() {
  const wallet = useWallet();
  if (wallet.loading) return null;
  const synced = wallet.source === "account";
  const text = synced
    ? "Synced with your account"
    : wallet.degraded
      ? "Account couldn't load — showing this device"
      : "Saved on this device";
  return (
    <p
      data-testid="rail-sync-line"
      className="flex items-center gap-2 text-[length:var(--text-meta)] font-medium uppercase leading-[var(--leading-meta)] tracking-[var(--tracking-meta)] text-faint-strong"
    >
      <span
        aria-hidden="true"
        className={`h-[5px] w-[5px] shrink-0 rounded-full ${synced ? "bg-sage" : "bg-faint-strong"}`}
      />
      {text}
    </p>
  );
}

/**
 * The identity block at the foot of the rail, on the botanical footer's
 * blurred dark band: the avatar (with the sage dot while the account is
 * signed in — the synced state the line above names), the name, the
 * current rank from the real progression balance, and the settings
 * affordance. Signed out it invites you in, as before.
 */
function RailProfile() {
  const id = useRailIdentity();
  const wallet = useWallet();
  const signedIn = id.status === "signed-in";
  // While the session is still restoring, the name holds the same neutral
  // placeholder the tagline below already uses — painting "Sign in" here
  // flashed guest copy at signed-in users on every cold load.
  const name = signedIn
    ? (id.displayName ?? "Your profile")
    : id.status === "checking"
      ? "…"
      : "Sign in";
  const line = signedIn
    ? wallet.loading
      ? "…"
      : rankFor(wallet.balance).rank.name
    : id.status === "checking"
      ? "…"
      : "Sync across your devices";
  return (
    <div className="app-sidebar-profile relative flex items-center gap-3 px-5 py-4">
      <Link
        to="/profile"
        className="flex min-w-0 flex-1 items-center gap-3 rounded-full"
        aria-label={signedIn ? "Your profile" : id.status === "checking" ? "Profile" : "Sign in"}
        data-testid="rail-profile"
      >
        <span className="relative shrink-0">
          <ProfileAvatar
            name={id.displayName ?? "Bloom"}
            avatarPath={id.avatarPath}
            accent={id.accent}
            size={40}
          />
          {signedIn ? (
            <span
              aria-hidden="true"
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--sidebar)] bg-sage"
            />
          ) : null}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[length:var(--text-callout)] font-medium leading-[var(--leading-callout)] text-foreground">
            {name}
          </span>
          <span className="block truncate text-[length:var(--text-caption)] leading-[var(--leading-caption)] text-muted-foreground">
            {line}
          </span>
        </span>
      </Link>
      <Link
        to="/profile"
        aria-label="Settings"
        title="Settings"
        className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
      >
        <Settings className="size-[18px]" strokeWidth={1.5} />
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
        <BloomLogo size={22} />
        <span className="font-display text-[21px] leading-none tracking-wide">Bloom</span>
      </Link>
      <div className="flex items-center gap-2">
        <PointsChip compact />
        <NotificationBell />
        <Link
          to="/profile"
          aria-label="Your profile"
          aria-current={profileActive ? "page" : undefined}
          data-active={profileActive}
          className="bloom-icon-btn"
        >
          <UserRound className="size-[18px]" strokeWidth={1.75} />
        </Link>
      </div>
    </div>
  );
}

/**
 * The phone tab bar — a floating pill (Reskin slice 2, after the owner's
 * prototype): inset from the screen edges, panel at 90% over a backdrop
 * blur, a heavy soft shadow; the geometry lives in src/styles/responsive.css
 * (§3) and the active pill in src/styles.css. Six destinations share the
 * width equally (flex: 1) so every label always fits — even on a 320px
 * phone — and each item meets the 48px touch floor.
 */
export function HomeMobileNav() {
  const { pathname } = useLocation();
  const navItems = useNavItems();
  return (
    <nav className="app-nav app-mobile-nav fixed inset-x-3 z-20 lg:hidden" aria-label="Primary">
      {navItems.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.label}
            to={item.to}
            aria-current={active ? "page" : undefined}
            aria-label={item.label}
            className={active ? "" : "text-muted-foreground"}
          >
            <span className="app-nav-glyph" data-glyph={item.icon}>
              <BloomIcon name={item.icon} size={22} strokeWidth={active ? 2.1 : 1.75} />
            </span>
            <span aria-hidden="true">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * AppNav — the app's one chrome: on desktop the rail (brand + primary
 * links + profile) fixed beside the page's own <main>; on phones the
 * brand bar fixed on top and the tab bar at the bottom. The pieces are
 * all viewport-fixed, and `.app-shell` (src/styles.css) pads page
 * content for whichever chrome is shown, so the chrome itself no
 * longer needs to live inside a page.
 *
 * It is mounted exactly once, by the root layout through `AppNavGate`
 * below — never by a page. It used to be rendered by every page, and
 * because the root remounts each page on navigation (the keyed
 * crossfade wrapper), the rail was destroyed and recreated on every
 * tab switch: its arrival animation replayed, its botanical and avatar
 * images were new DOM nodes, and the whole sidebar visibly refreshed.
 * At the root it is the same DOM on every route; switching tabs only
 * moves the active state across it.
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

/**
 * The root layout's chrome switch: renders `AppNav` on the routes that
 * carry it (see `routeShowsAppNav` in src/lib/appNav.ts for the set and
 * why), nothing anywhere else — the public pages, the gate and the 404
 * stand without a rail, exactly as they did when pages owned the chrome.
 */
export function AppNavGate() {
  const { pathname } = useLocation();
  return routeShowsAppNav(pathname) ? <AppNav /> : null;
}
