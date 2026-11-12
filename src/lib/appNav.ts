/**
 * Which routes carry the app chrome (the rail, the phone brand bar and
 * the phone tab bar) — the rule the root layout's `AppNavGate` applies.
 *
 * The chrome is mounted ONCE by the root layout, not by each page. It
 * used to be rendered inside every page component, and the root wraps
 * each page in a `key={pathname}` remount (the page crossfade), so every
 * tab switch destroyed and recreated the sidebar: its arrival animation
 * replayed, its images were brand-new DOM nodes, and the whole rail
 * visibly "refreshed" on every navigation. Mounted at the root it stays
 * the same DOM across client-side navigation; only the page beside it
 * changes.
 *
 * The set below reproduces exactly the routes that rendered the chrome
 * when it lived in the pages:
 *   · the main sections — Today, Trackers, Cycle, Mood (incl.
 *     intelligence), Rewards (incl. the Atelier), Coach, Profile, the
 *     weekly Report, and the admin progression page;
 *   · NOT the public surfaces — /privacy, /terms and the /@handle public
 *     profile — nor /dashboard and /admin/rewards, which carry their
 *     own headers, nor any unmatched path (the branded 404 stands alone,
 *     as it did when pages owned the chrome).
 */
const APP_NAV_SECTIONS = [
  "/trackers",
  "/cycle",
  "/mood",
  "/rewards",
  "/coach",
  "/profile",
  "/report",
] as const;

export function routeShowsAppNav(pathname: string): boolean {
  if (pathname === "/" || pathname === "/admin/progression") return true;
  return APP_NAV_SECTIONS.some(
    (section) => pathname === section || pathname.startsWith(`${section}/`),
  );
}
