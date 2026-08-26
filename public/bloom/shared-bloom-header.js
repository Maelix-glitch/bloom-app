document.addEventListener("DOMContentLoaded", () => {
  const fileName = window.location.pathname.split("/").pop() || "index.html";

  const pageInfo = {
    "index.html": "Today",
    "trackers.html": "Trackers",
    "cycle.html": "Cycle",
    "cycle-advanced.html": "Cycle",
    "rewards.html": "Rewards",
    "coach.html": "Coach",
  };

  const currentPage = pageInfo[fileName] || "Bloom";

  const navItems = [
    { label: "Today", href: "index.html" },
    { label: "Trackers", href: "trackers.html" },
    { label: "Cycle", href: "cycle.html" },
    { label: "Mood", href: "/" },
    { label: "Rewards", href: "rewards.html" },
    { label: "Coach", href: "coach.html" },
  ];

  const navHtml = navItems
    .map((item) => {
      const active = item.label === currentPage ? " bloom-nav-active" : "";
      return `<a href="${item.href}" class="bloom-nav-link${active}">${item.label}</a>`;
    })
    .join("");

  const header = document.createElement("header");
  header.className = "bloom-shared-header";

  header.innerHTML = `
    <div class="bloom-shared-brand">
      <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path
          d="M4 20c3-9 7-14 10-14s7 5 10 14"
          stroke="url(#sharedBloomBrandGradient)"
          stroke-width="2.2"
          stroke-linecap="round"
        />
        <defs>
          <linearGradient
            id="sharedBloomBrandGradient"
            x1="4"
            y1="13"
            x2="24"
            y2="13"
          >
            <stop stop-color="#8FB69C"/>
            <stop offset="1" stop-color="#E0B36B"/>
          </linearGradient>
        </defs>
      </svg>

      <span class="bloom-shared-name">Bloom</span>
      <span class="bloom-shared-separator"></span>
      <span class="bloom-shared-context">${currentPage}</span>
    </div>

    <nav class="bloom-shared-nav" aria-label="Primary">
      ${navHtml}
    </nav>

    <div class="bloom-shared-avatar" aria-label="Bloom profile">M</div>
  `;

  const oldHeaders = [...document.querySelectorAll("header")];
  const firstOldHeader = oldHeaders[0];
  const outerWrap = firstOldHeader?.closest(".wrap");

if (firstOldHeader && outerWrap) {
  outerWrap.before(header);
} else if (firstOldHeader) {
  firstOldHeader.before(header);
} else {
  document.body.prepend(header);
}

// Remove every old page header so no static page shows a duplicate.
oldHeaders.forEach((oldHeader) => oldHeader.remove());

document.body.classList.add("bloom-has-shared-header");
  

  const style = document.createElement("style");

  style.textContent = `
   body.bloom-has-shared-header {
  padding-top: 0 !important;
  }
    .bloom-shared-header {
      height: 54px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 0 22px !important;
      width: 100vw !important;
      position: relative !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      margin: 0 !important;
      background: #14151B !important;
      border-bottom: 1px solid #23252F !important;
      position: relative !important;
      z-index: 20 !important;
    }

    .bloom-shared-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 180px;
    }

    .bloom-shared-brand svg {
      width: 22px;
      height: 22px;
      flex-shrink: 0;
    }

    .bloom-shared-name {
      color: #EDEBE4;
      font-family: Fraunces, Georgia, serif;
      font-size: 16px;
      font-weight: 500;
      letter-spacing: -0.01em;
    }

    .bloom-shared-separator {
      width: 1px;
      height: 16px;
      margin: 0 4px;
      background: #30333F;
    }

    .bloom-shared-context {
      color: #63667A;
      font-family: Inter, system-ui, sans-serif;
      font-size: 12px;
    }

    .bloom-shared-nav {
      display: flex !important;
      align-items: center !important;
      gap: 2px !important;
    }

    .bloom-shared-nav .bloom-nav-link {
      position: static !important;
      color: #63667A !important;
      background: transparent !important;
      text-decoration: none !important;
      font-family: Inter, system-ui, sans-serif !important;
      font-size: 13px !important;
      font-weight: 450 !important;
      padding: 6px 11px !important;
      border-radius: 7px !important;
      transition: color .18s ease, background .18s ease !important;
    }

    .bloom-shared-nav .bloom-nav-link::after {
      display: none !important;
    }

    .bloom-shared-nav .bloom-nav-link:hover {
      color: #9B9CAC !important;
      background: #191A22 !important;
    }

    .bloom-shared-nav .bloom-nav-link.bloom-nav-active {
      color: #EDEBE4 !important;
      background: #1F212B !important;
    }

    .bloom-shared-avatar {
      width: 26px;
      height: 26px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      border: 1px solid #30333F;
      border-radius: 999px;
      background: #1F212B;
      color: #9B9CAC;
      font-family: "IBM Plex Mono", monospace;
      font-size: 10.5px;
    }

    @media (max-width: 760px) {
      .bloom-shared-header {
        margin-bottom: 34px !important;
        padding: 0 16px !important;
      }

      .bloom-shared-brand {
        min-width: auto;
      }

      .bloom-shared-context,
      .bloom-shared-separator,
      .bloom-shared-nav {
        display: none !important;
      }
    }
  `;

  document.head.appendChild(style);
});