import { useLocation } from "@tanstack/react-router";

export function BloomHeader() {
  const { pathname } = useLocation();

  const moodActive = pathname === "/";
  const rewardsActive =
    pathname === "/rewards" || pathname.startsWith("/admin/rewards");

  return (
    <header
      className="flex h-[54px] items-center justify-between border-b px-[22px]"
      style={{
        background: "#14151B",
        borderColor: "#23252F",
      }}
    >
      {/* Bloom brand */}
      <div className="flex items-center gap-3">
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

        <span
          className="mx-1 h-4 w-px"
          style={{ background: "#30333F" }}
        />

        <span className="text-[12px]" style={{ color: "#63667A" }}>
          Mood
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex items-center gap-[2px]" aria-label="Primary">
        <a href="/bloom/index.html" className="bloom-nav-link">
          Today
        </a>

        <a href="/bloom/trackers.html" className="bloom-nav-link">
          Trackers
        </a>

        <a href="/bloom/cycle.html" className="bloom-nav-link">
          Cycle
        </a>

        <a
          href="/"
          className={`bloom-nav-link${
            moodActive ? " bloom-nav-active" : ""
          }`}
          aria-current={moodActive ? "page" : undefined}
        >
          Mood
        </a>

        <a
          href="/rewards"
          className={`bloom-nav-link${
            rewardsActive ? " bloom-nav-active" : ""
          }`}
          aria-current={rewardsActive ? "page" : undefined}
        >
          Rewards
        </a>

        <a href="/bloom/coach.html" className="bloom-nav-link">
          Coach
        </a>
      </nav>

      {/* Profile avatar */}
      <div
        className="grid h-[26px] w-[26px] place-items-center rounded-full border text-[10px]"
        style={{
          background: "#1F212B",
          borderColor: "#30333F",
          color: "#9B9CAC",
          fontFamily: "IBM Plex Mono, monospace",
        }}
        aria-label="Bloom profile"
      >
        B
      </div>
    </header>
  );
}