import { Link, useLocation } from "@tanstack/react-router";

export function BloomHeader() {
  const { pathname } = useLocation();

  const moodActive = pathname === "/";
  const rewardsActive =
    pathname === "/rewards" || pathname.startsWith("/admin/rewards");
  const coachActive =
    pathname === "/coach" ||
    pathname.startsWith("/coach/") ||
    pathname === "/bloom/coach.html";
  const profileActive = pathname === "/profile" || pathname.startsWith("/@");

  return (
    <header
      className="flex h-[54px] items-center justify-between border-b px-[22px]"
      style={{
        background: "#14151B",
        borderColor: "#23252F",
      }}
    >
      {/* Bloom brand */}
      <div className="flex shrink-0 items-center gap-3">
        <svg
          viewBox="0 0 28 28"
          fill="none"
          width="22"
          height="22"
          aria-hidden="true"
        >
          <path
            d="M4 20c3-9 7-14 10-14s7 5 10 14"
            stroke="url(#bloomBrandGradient)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          <defs>
            <linearGradient
              id="bloomBrandGradient"
              x1="4"
              y1="13"
              x2="24"
              y2="13"
            >
              <stop stopColor="#8FB69C" />
              <stop offset="1" stopColor="#E0B36B" />
            </linearGradient>
          </defs>
        </svg>

        <span
          className="text-[16px]"
          style={{
            color: "#EDEBE4",
            fontFamily: "Fraunces, Georgia, serif",
            fontWeight: 500,
          }}
        >
          Bloom
        </span>

        <span className="mx-1 hidden h-4 w-px sm:block" style={{ background: "#30333F" }} />

        <span className="hidden text-[12px] sm:block" style={{ color: "#63667A" }}>
          Mood
        </span>
      </div>

      {/* Navigation */}
      <nav
        className="no-scrollbar flex min-w-0 items-center gap-[2px] overflow-x-auto"
        aria-label="Primary"
      >
        <a href="/bloom/index.html" className="bloom-nav-link shrink-0">
          Today
        </a>

        <a href="/bloom/trackers.html" className="bloom-nav-link shrink-0">
          Trackers
        </a>

        <a href="/bloom/cycle.html" className="bloom-nav-link shrink-0">
          Cycle
        </a>

        <a
          href="/"
          className={`bloom-nav-link shrink-0${
            moodActive ? " bloom-nav-active" : ""
          }`}
          aria-current={moodActive ? "page" : undefined}
        >
          Mood
        </a>

        <a
          href="/rewards"
          className={`bloom-nav-link shrink-0${
            rewardsActive ? " bloom-nav-active" : ""
          }`}
          aria-current={rewardsActive ? "page" : undefined}
        >
          Rewards
        </a>

        <a
          href="/coach"
          className={`bloom-nav-link shrink-0${
            coachActive ? " bloom-nav-active" : ""
          }`}
          aria-current={coachActive ? "page" : undefined}
        >
          Coach
        </a>
      </nav>

      {/* Profile */}
      <Link
        to="/profile"
        aria-label="Your profile"
        aria-current={profileActive ? "page" : undefined}
        className={`shrink-0 grid h-[26px] w-[26px] place-items-center rounded-full border text-[10px] transition-colors ${
          profileActive
            ? "border-[#4C5060] text-[#EDEBE4]"
            : "hover:border-[#3A3E4C] hover:text-[#C9CBD6]"
        }`}
        style={{
          background: "#1F212B",
          borderColor: "#30333F",
          color: "#9B9CAC",
          fontFamily: "IBM Plex Mono, monospace",
        }}
      >
        B
      </Link>
    </header>
  );
}
