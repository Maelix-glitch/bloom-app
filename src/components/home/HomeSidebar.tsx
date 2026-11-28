import { Link, useLocation } from "@tanstack/react-router";
import { Settings, UserRound } from "lucide-react";

import { BloomIcon, type BloomIconName } from "@/components/icons/BloomIcon";
import { routeShowsAppNav } from "@/lib/appNav";

import botanical from "@/assets/home/sidebar-botanical.jpg";
import { useRailIdentity } from "@/hooks/useRailIdentity";
import { useThemeArt } from "@/hooks/useThemeArt";
import { useCycleVisible } from "@/hooks/useCycleVisible";
import { useEntitlement } from "@/hooks/useEntitlement";
import { PLANS } from "@/lib/billing/plans";
import { verificationStatus } from "@/lib/profile/verification";
import { memberBadgesOf } from "@/lib/profile/badges";
import { MemberBadges } from "@/components/profile/MemberBadges";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { VerifiedBadge } from "@/components/profile/VerifiedBadge";
import { BloomLogo } from "@/components/BloomLogo";
import { NotificationBell } from "@/components/notifications/NotificationCenter";
import { PointsChip } from "@/components/system/PointsChip";
import { Skeleton } from "@/components/ui/skeleton";
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
  { label: "Nutrition", to: "/nutrition", icon: "nutrition", match: (p) => p.startsWith("/nutrition") },
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
 * Composition (Reskin slice 2, after the owner's prototype; shell form
 * since brief v4): the brand at the top; the destinations as pills — the
 * active one on a filled --surface-2 with a 3px gold bar INSIDE the
 * pill's left edge and a gold glyph; the points card (RailPointsCard:
 * balance, percent of the way to the next rank, gold-gradient track —
 * the pre-v4 form, restored by owner directive 2026-11-19); Profile
 * below it; and at the foot, in a fixed-height botanical
 * band, the serif-italic tagline above the identity strip. The brand /
 * nav / card region scrolls on short screens; the footer stays pinned.
 * (Sync state lives in the Today TopBar pill alone — the rail used to
 * repeat it, and the duplicate was removed.)
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
  /* M-237: an equipped theme brings its own sidebar artwork; Bloom's
     fern photograph stays the fallback when no theme is equipped. */
  const themeArt = useThemeArt();
  const { pathname } = useLocation();
  const profileActive = pathname === "/profile" || pathname.startsWith("/@");
  return (
    <aside className="app-nav app-sidebar z-[2] hidden w-[220px] shrink-0 flex-col overflow-clip border-r border-border lg:fixed lg:inset-y-0 lg:left-0 lg:flex">
      <div className="relative min-h-0 flex-1 overflow-y-auto">
        <Link
          to="/"
          className="mx-4 flex h-[64px] items-center gap-3 px-3 text-foreground"
          aria-label="Bloom - Today"
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
                {/* The gold bar inside the pill's left edge marks the
                    active destination (brief v4 §20 — it used to sit on
                    the rail's outer edge, detached from the pill); the
                    pill fill and the gold glyph ride in
                    .app-nav-link-active and .app-nav-glyph (see
                    src/styles.css). */}
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
          under a dark gradient scrim. Since brief v4 (M-49) the band is
          a FIXED height (`.app-sidebar-footer`, 200px): the photograph
          is masked to dissolve upward instead of cropping at a hard
          line, the tagline sits over the scrim's strengthened band, and
          the identity strip is pinned at the foot — the old auto-height
          footer carried an 80px dead gap (pt-20) above the tagline. */}
      <div className="app-sidebar-footer relative shrink-0 overflow-hidden">
        <div
          aria-hidden="true"
          className="app-sidebar-botanical pointer-events-none absolute inset-0"
        >
          <img
            src={themeArt?.sidebar ?? botanical}
            alt=""
            loading="lazy"
            width={600}
            height={1200}
            className="h-full w-full object-cover object-bottom"
          />
        </div>
        <div aria-hidden="true" className="app-sidebar-scrim absolute inset-0" />
        <div className="relative flex h-full flex-col justify-end">
          <div className="app-sidebar-quote px-7 pb-3">
            <p className="font-display text-[length:var(--text-section)] italic leading-snug text-muted-foreground">
              A calmer you, a brighter tomorrow.
            </p>
          </div>
          <RailProfile />
        </div>
      </div>
    </aside>
  );
}

/**
 * The identity block at the foot of the rail, pinned at the botanical
 * footer's base: the avatar, the name, the member's PLAN, and the
 * settings affordance. Since brief v4 (M-91) the sub-line is the plan —
 * the level lives in the Level card alone, so it is stated once in the
 * rail, never twice — and the avatar carries no presence dot (a device
 * cannot know whether its owner is "online"; the dot claimed a state
 * nothing measured). Signed out it invites you in, as before.
 */
function RailProfile() {
  const id = useRailIdentity();
  const entitlement = useEntitlement();
  const signedIn = id.status === "signed-in";
  /* The verified tick beside the rail name, from the same status as the
     Profile hero — grant-only (2026-11-22): a record in
     account_verifications, granted by the owner, is the whole truth.
     The badge component itself renders nothing unless the status is
     verified, so the tick MEANS something real; the rail wears it in
     Bloom gold (tone="gold") because the blue read as an off-palette
     import inside the rail (brief v4; M-91). The record fact the
     identity carries is unproven until its verification read lands —
     the conservative direction. */
  const verification = verificationStatus({
    hasRecord: id.verification.hasRecord,
  });
  /* The member badges (M-209), from the same identity read. The rail
     is 220px wide and this row already truncates the name beside the
     avatar and the settings link — three pills (~230px of labels)
     cannot fit without crushing the name to nothing, so the rail
     wears the single highest-priority badge (the derivation's order:
     founder, trainer, tester) at the small size. The full set lives
     on the Profile hero and in Settings. */
  const railBadges = memberBadgesOf(id.badges);
  // While the session is still restoring, the name holds a skeleton bar
  // (M-202, F-01) — painting "Sign in" here flashed guest copy at
  // signed-in users on every cold load, and an ellipsis reads as a
  // broken label rather than a loading state.
  const namePending = !signedIn && id.status === "checking";
  const name = signedIn
    ? (id.displayName ?? "Your profile")
    : id.status === "checking"
      ? null
      : "Sign in";
  /* The plan line: the real entitlement's plan name. While it loads, a
     skeleton bar in its slot; when billing is unavailable the row falls
     back to the member's @username rather than inventing a plan. */
  const linePending =
    (signedIn && entitlement.kind === "loading") || (!signedIn && id.status === "checking");
  const line = signedIn
    ? entitlement.kind === "loading"
      ? null
      : entitlement.kind === "ready"
        ? PLANS[entitlement.entitlement.tier].name
        : id.username
          ? `@${id.username}`
          : "Bloom account"
    : id.status === "checking"
      ? null
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
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[length:var(--text-callout)] font-medium leading-[var(--leading-callout)] text-foreground">
            {namePending ? (
              <Skeleton className="inline-block h-[0.95em] w-24" aria-hidden />
            ) : (
              <span className="truncate">{name}</span>
            )}
            {signedIn ? <VerifiedBadge status={verification} size={14} tone="gold" /> : null}
            {signedIn ? <MemberBadges badges={railBadges.slice(0, 1)} size="sm" /> : null}
          </span>
          <span className="block truncate text-[length:var(--text-caption)] leading-[var(--leading-caption)] text-muted-foreground">
            {linePending ? (
              <Skeleton className="inline-block h-[0.95em] w-16" aria-hidden />
            ) : (
              line
            )}
          </span>
        </span>
      </Link>
      <Link
        to="/settings"
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
 * Phones and tablets have no rail. Until M-249 this mounted a fixed brand
 * bar (mark + wordmark + the account buttons); the owner asked for the
 * brand header gone (2026-11-25) — "just the floating profile and the
 * other buttons". What remains is exactly that: the account cluster
 * (points, bell, settings, profile) floating at the top right, each
 * button carrying its own chip material (.bloom-icon-btn in shell.css,
 * the points pill its own), no strip behind them. The container is
 * click-through (pointer-events-none) so the page owns the top again;
 * the shell still reserves the old 60px (--app-top-bar) so no page
 * layout moved. The primary links live in the bottom tab bar
 * (HomeMobileNav).
 */
export function HomeMobileBar() {
  const { pathname } = useLocation();
  const profileActive = pathname === "/profile" || pathname.startsWith("/@");
  return (
    <div className="app-nav app-mobile-bar pointer-events-none fixed inset-x-0 top-0 z-20 flex items-start justify-between px-5 pt-3 lg:hidden">
      {/* M-258 (owner, 2026-11-27): the points pill lives at the top-LEFT;
          the bell, settings and profile stay at the top-right. */}
      <div className="pointer-events-auto">
        <PointsChip compact />
      </div>
      <div className="pointer-events-auto flex items-center gap-2">
        <NotificationBell />
        {/* The rail's settings gear, mirrored in the phone bar (Plan B):
            the account sections live on /settings now, and phones have
            no rail to carry the gear. */}
        <Link
          to="/settings"
          aria-label="Settings"
          title="Settings"
          className="bloom-icon-btn"
        >
          <Settings className="size-[18px]" strokeWidth={1.75} />
        </Link>
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
 * (§3) and the active pill in src/styles.css. Seven destinations share the
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
