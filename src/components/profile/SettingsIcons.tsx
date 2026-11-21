/**
 * SettingsIcons — the Settings icon family (Premium Pass 3, M-211).
 *
 * One family, drawn for Bloom: a 24px grid, a single 1.5px stroke,
 * rounded caps and joins, no fills, optically centred in the row's
 * 30px icon box and rendered at 20px. The settings rows used to mix
 * stock glyphs at 14px (AccountRow, Consent, Trust) and 16px
 * (Sessions, Backup) with a heavier 2px stroke — the same row system
 * wearing two different voices, and both too small to read as drawn.
 * Every settings row glyph now comes from this file, so the family
 * can be refined in one place.
 *
 * The VerifiedBadge is not part of this family — it is a badge, not a
 * row glyph, and keeps its own component.
 */

import type { ReactNode } from "react";

function Glyph({ children, className = "size-5" }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function IconMail({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M4 7.5l8 6 8-6" />
    </Glyph>
  );
}

/** The verification seal: a rosette with a check and two ribbon tails. */
export function IconVerified({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <circle cx="12" cy="10" r="5.8" />
      <path d="M9.2 10.2l2 2 3.6-4" />
      <path d="M8.6 14.9L7.4 20.2l4.6-2.3 4.6 2.3-1.2-5.3" />
    </Glyph>
  );
}

export function IconClock({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Glyph>
  );
}

export function IconLogOut({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M13.5 4.5H8a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h5.5" />
      <path d="M10.5 12H21" />
      <path d="M17.5 8.5L21 12l-3.5 3.5" />
    </Glyph>
  );
}

export function IconLogIn({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M10.5 4.5H16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-5.5" />
      <path d="M3 12h10.5" />
      <path d="M10 8.5L13.5 12 10 15.5" />
    </Glyph>
  );
}

export function IconDroplet({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M12 3.5c3.4 4.1 5.8 7.2 5.8 10.3a5.8 5.8 0 1 1-11.6 0C6.2 10.7 8.6 7.6 12 3.5Z" />
    </Glyph>
  );
}

export function IconSound({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M4 9.8v4.4h3.4L12 18.6V5.4L7.4 9.8H4Z" />
      <path d="M15.4 9.6a3.6 3.6 0 0 1 0 4.8" />
      <path d="M17.8 7.2a7 7 0 0 1 0 9.6" />
    </Glyph>
  );
}

export function IconSparkles({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M11 4.2l1.6 4.3 4.3 1.6-4.3 1.6L11 16l-1.6-4.3L5.1 10l4.3-1.6L11 4.2Z" />
      <path d="M18.4 14.8l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8.8-2.1Z" />
    </Glyph>
  );
}

export function IconUser({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20.2c1.1-3.5 3.7-5.2 7-5.2s5.9 1.7 7 5.2" />
    </Glyph>
  );
}

export function IconPalette({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M12 4a8 8 0 1 0 0 16c1.3 0 2-.8 2-1.8 0-.8-.6-1.3-.6-2.1 0-1 .8-1.9 2-1.9H17a4 4 0 0 0 4-4C21 7 17 4 12 4Z" />
      <circle cx="7.8" cy="10.2" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7.6" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="16.2" cy="10.2" r="1.05" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

export function IconLock({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <rect x="5.5" y="10.5" width="13" height="9.5" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
      <path d="M12 14.6v1.8" />
    </Glyph>
  );
}

export function IconEye({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M3 12s3.2-5.6 9-5.6S21 12 21 12s-3.2 5.6-9 5.6S3 12 3 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Glyph>
  );
}

export function IconArchive({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <rect x="3.5" y="4.5" width="17" height="4.4" rx="1.2" />
      <path d="M5 8.9V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.9" />
      <path d="M9.8 13.2h4.4" />
    </Glyph>
  );
}

export function IconReplies({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M20.5 11.5a8.5 8.5 0 0 1-12.4 7.5L3 20.5l1.5-5.1A8.5 8.5 0 1 1 20.5 11.5Z" />
    </Glyph>
  );
}

export function IconShare({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="17.8" cy="5.4" r="2.6" />
      <circle cx="17.8" cy="18.6" r="2.6" />
      <path d="M8.3 10.7l7.2-4" />
      <path d="M8.3 13.3l7.2 4" />
    </Glyph>
  );
}

export function IconDownload({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M12 3.8v10.7" />
      <path d="M7.3 10.6L12 15.3l4.7-4.7" />
      <path d="M4.5 19.5h15" />
    </Glyph>
  );
}

export function IconBell({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M18.2 16.2H5.8c1-1.3 1.6-2.6 1.6-4.7a4.6 4.6 0 1 1 9.2 0c0 2.1.6 3.4 1.6 4.7Z" />
      <path d="M10.2 19.8a2 2 0 0 0 3.6 0" />
    </Glyph>
  );
}

export function IconSmartphone({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 17.8h2" />
    </Glyph>
  );
}

export function IconTrash({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M4.5 6.3h15" />
      <path d="M9.3 6V4.7A1.7 1.7 0 0 1 11 3h2a1.7 1.7 0 0 1 1.7 1.7V6" />
      <path d="M6.4 6.3l.9 12.5a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.9-12.5" />
      <path d="M10 10.3v6" />
      <path d="M14 10.3v6" />
    </Glyph>
  );
}

export function IconShieldCheck({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M12 3.4l7 2.5v5.6c0 4.6-2.9 7.7-7 9.4-4.1-1.7-7-4.8-7-9.4V5.9l7-2.5Z" />
      <path d="M8.9 11.7l2.2 2.2 4-4.3" />
    </Glyph>
  );
}

export function IconLaptop({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <rect x="5" y="5" width="14" height="9.8" rx="1.6" />
      <path d="M3 18.8h18l-1.7-4H4.7L3 18.8Z" />
    </Glyph>
  );
}

/** Two devices, one account: a monitor with a phone at its shoulder. */
export function IconDevices({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <rect x="3" y="4.5" width="13.5" height="10.5" rx="1.6" />
      <path d="M9.8 15v3.4" />
      <path d="M6.2 21h7.2" />
      <rect x="16.8" y="10.5" width="4.9" height="9.5" rx="1.4" />
    </Glyph>
  );
}

export function IconErase({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M5.2 15.8L12.7 6a2.15 2.15 0 0 1 3-.3l4 3.9a2.15 2.15 0 0 1 0 3.1l-6.2 6.8H8.3l-2.6-2.6a2 2 0 0 1-.5-1.1Z" />
      <path d="M7.8 20.5h12.7" />
    </Glyph>
  );
}

export function IconFileUp({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M6.5 3.5H14L19 8.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-15A1.5 1.5 0 0 1 6.5 3.5Z" />
      <path d="M13.5 3.5v5.5H19" />
      <path d="M12 17.8v-6" />
      <path d="M9.4 14.2L12 11.6l2.6 2.6" />
    </Glyph>
  );
}

export function IconChevronRight({ className = "size-4" }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M9 5.5l6.5 6.5L9 18.5" />
    </Glyph>
  );
}

export function IconChevronDown({ className = "size-4" }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M5.5 9l6.5 6.5L18.5 9" />
    </Glyph>
  );
}

export function IconCheck({ className = "size-3" }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Glyph>
  );
}

/** Sliders — the Edit affordance on the Trackers targets (M-210). */
export function IconSliders({ className = "size-4" }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M5 7.5h6" />
      <path d="M15.5 7.5H19" />
      <circle cx="13.2" cy="7.5" r="2.1" />
      <path d="M5 16.5h2.5" />
      <path d="M12 16.5h7" />
      <circle cx="9.7" cy="16.5" r="2.1" />
    </Glyph>
  );
}

/** The six tracker glyphs (M-210), keyed by tracker id. */
export function IconMoon({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M20.2 13.8A8.4 8.4 0 1 1 10.2 3.8a6.8 6.8 0 0 0 10 10Z" />
    </Glyph>
  );
}

export function IconBook({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M12 6.8C10.1 5.2 7.6 4.6 4 4.6v13.2c3.6 0 6.1.6 8 2.2 1.9-1.6 4.4-2.2 8-2.2V4.6c-3.6 0-6.1.6-8 2.2Z" />
      <path d="M12 6.8v13.2" />
    </Glyph>
  );
}

export function IconActivity({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M3 12h4l2.4-6.2 4.2 12.4L16 12h5" />
    </Glyph>
  );
}

export function IconBolt({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M13 3L4.8 13.4h6L9.9 21 18.7 10.6h-6.1L13 3Z" />
    </Glyph>
  );
}

export function IconMonitor({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <rect x="3" y="4.5" width="18" height="12" rx="1.8" />
      <path d="M12 16.5v3.5" />
      <path d="M8 20h8" />
    </Glyph>
  );
}
