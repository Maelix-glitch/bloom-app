import { Link, useLocation } from "@tanstack/react-router";

import { BloomLogo } from "@/components/BloomLogo";

export function BloomHeader() {
  const { pathname } = useLocation();

  const todayActive = pathname === "/";
  const moodActive = pathname === "/mood" || pathname.startsWith("/mood/");
  const rewardsActive = pathname === "/rewards" || pathname.startsWith("/admin/rewards");
  const coachActive = pathname === "/coach" || pathname.startsWith("/coach/");
  const cycleActive = pathname === "/cycle" || pathname.startsWith("/cycle/");
  const trackersActive = pathname === "/trackers" || pathname.startsWith("/trackers/");
  const profileActive = pathname === "/profile" || pathname.startsWith("/@");

  return (
    <header
      className="flex h-[54px] items-center justify-between border-b px-[22px]"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border-subtle)",
      }}
    >
      {/* Bloom brand */}
      <div className="flex shrink-0 items-center gap-3">
        <BloomLogo size={22} />

        <span
          className="text-[16px]"
          style={{
            color: "var(--foreground)",
            fontFamily: "var(--font-display)",
            fontWeight: 500,
          }}
        >
          Bloom
        </span>

        <span className="mx-1 hidden h-4 w-px sm:block" style={{ background: "var(--border)" }} />

        <span className="hidden text-[12px] sm:block" style={{ color: "var(--faint)" }}>
          {todayActive
            ? "Today"
            : trackersActive
              ? "Trackers"
              : cycleActive
                ? "Cycle"
                : moodActive
                  ? "Mood"
                  : rewardsActive
                    ? "Rewards"
                    : coachActive
                      ? "Coach"
                      : profileActive
                        ? "Profile"
                        : "Bloom"}
        </span>
      </div>

      {/* Navigation */}
      <nav
        className="no-scrollbar flex min-w-0 items-center gap-[2px] overflow-x-auto"
        aria-label="Primary"
      >
        <Link
          to="/"
          className={`bloom-nav-link shrink-0${todayActive ? " bloom-nav-active" : ""}`}
          aria-current={todayActive ? "page" : undefined}
        >
          Today
        </Link>

        <Link
          to="/trackers"
          className={`bloom-nav-link shrink-0${trackersActive ? " bloom-nav-active" : ""}`}
          aria-current={trackersActive ? "page" : undefined}
        >
          Trackers
        </Link>

        <Link
          to="/cycle"
          className={`bloom-nav-link shrink-0${cycleActive ? " bloom-nav-active" : ""}`}
          aria-current={cycleActive ? "page" : undefined}
        >
          Cycle
        </Link>

        <Link
          to="/mood"
          className={`bloom-nav-link shrink-0${moodActive ? " bloom-nav-active" : ""}`}
          aria-current={moodActive ? "page" : undefined}
        >
          Mood
        </Link>

        <Link
          to="/rewards"
          className={`bloom-nav-link shrink-0${rewardsActive ? " bloom-nav-active" : ""}`}
          aria-current={rewardsActive ? "page" : undefined}
        >
          Rewards
        </Link>

        <Link
          to="/coach"
          className={`bloom-nav-link shrink-0${coachActive ? " bloom-nav-active" : ""}`}
          aria-current={coachActive ? "page" : undefined}
        >
          Coach
        </Link>
      </nav>

      {/* Profile */}
      <Link
        to="/profile"
        aria-label="Your profile"
        aria-current={profileActive ? "page" : undefined}
        className={`shrink-0 grid h-[26px] w-[26px] place-items-center rounded-full border text-[10px] transition-colors ${
          profileActive
            ? "border-[var(--border-strong)] text-[var(--foreground)]"
            : "border-[var(--border)] text-[var(--faint)] hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)]"
        }`}
        style={{
          background: "var(--surface-2)",
          fontFamily: "var(--font-mono)",
        }}
      >
        B
      </Link>
    </header>
  );
}
