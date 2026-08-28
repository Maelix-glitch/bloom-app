/**
 * Account & privacy + quick actions — the administrative corner, kept at
 * the bottom, quiet, and genuinely functional (every row does something real).
 */

import { useState } from "react";
import { ChevronRight, Download, Eye, Lock, Share2, ShieldCheck } from "lucide-react";

import type {
  AccountDetails,
  ProfilePrivacy,
  Story,
  HighlightItem,
  ProfileIdentity,
} from "@/lib/profile/types";

function Row({
  icon,
  label,
  value,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  const inner = (
    <>
      <span
        className="grid size-7 shrink-0 place-items-center rounded-full border border-border bg-surface-2/60 text-faint"
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-left text-[12.5px] text-muted-foreground">{label}</span>
      <span
        className={
          danger
            ? "text-[12.5px] text-rose"
            : "mono truncate max-w-[46%] text-[11.5px] text-foreground"
        }
      >
        {value}
      </span>
      {onClick ? <ChevronRight className="size-3.5 shrink-0 text-faint" aria-hidden /> : null}
    </>
  );
  if (!onClick) {
    return <div className="flex w-full items-center gap-3 px-4 py-2.5">{inner}</div>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2/50"
    >
      {inner}
    </button>
  );
}

/** Export what the user has chosen to keep — identity, stories, highlights. JSON, client-side. */
function exportProfile(
  identity: ProfileIdentity,
  stories: Story[],
  highlights: HighlightItem[],
  account: AccountDetails,
) {
  const payload = {
    exportedAt: new Date().toISOString(),
    profile: {
      displayName: identity.displayName,
      username: identity.username,
      bio: identity.bio,
      accent: identity.accent,
      memberSince: account.memberSince,
    },
    stories: stories.map((s) => ({
      kind: s.kind,
      title: s.title,
      body: s.body,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      visibility: s.visibility,
    })),
    highlights: highlights.map((h) => ({
      name: h.name,
      accent: h.accent,
      icon: h.icon,
      stories: h.stories.map((s) => ({ title: s.title, createdAt: s.createdAt })),
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bloom-profile-export.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function AccountRow({
  identity,
  account,
  privacy,
  stories,
  highlights,
  onOpenPrivacy,
  onShare,
  onPreview,
}: {
  identity: ProfileIdentity;
  account: AccountDetails;
  privacy: ProfilePrivacy;
  stories: Story[];
  highlights: HighlightItem[];
  onOpenPrivacy: () => void;
  onShare: () => void;
  onPreview: () => void;
}) {
  const [exporting, setExporting] = useState(false);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <section
        aria-label="Account and privacy"
        className="overflow-hidden rounded-2xl border border-border/80 bg-surface/40"
      >
        <header className="flex items-center gap-2 px-4 pb-1 pt-4">
          <ShieldCheck className="size-4 text-sage" strokeWidth={1.8} aria-hidden />
          <h3 className="display text-[15px]">Account &amp; privacy</h3>
        </header>
        <div className="flex flex-col divide-y divide-border/40">
          <Row
            icon={<span className="text-[10px]">✉</span>}
            label="Email"
            value={account.email ?? "not connected"}
          />
          <Row
            icon={<span className="text-[10px]">◷</span>}
            label="Member since"
            value={
              account.memberSince
                ? new Date(account.memberSince).toLocaleDateString(undefined, {
                    month: "short",
                    year: "numeric",
                  })
                : "—"
            }
          />
          <Row
            icon={<Lock className="size-3.5" />}
            label="Privacy"
            value={
              privacy.profileVisibility === "public" ? "Shared by choice" : "Private by default"
            }
            onClick={onOpenPrivacy}
          />
        </div>
        <div className="px-4 pb-4 pt-2">
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-[12.5px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            <ShieldCheck className="size-3.5" aria-hidden /> Privacy settings
          </button>
        </div>
      </section>

      <section
        aria-label="Quick actions"
        className="overflow-hidden rounded-2xl border border-border/80 bg-surface/40"
      >
        <header className="flex items-center gap-2 px-4 pb-1 pt-4">
          <SparkleMark />
          <h3 className="display text-[15px]">Quick actions</h3>
        </header>
        <div className="flex flex-col divide-y divide-border/40 pb-1">
          <Row
            icon={<Share2 className="size-3.5" />}
            label="Share profile"
            value="link"
            onClick={onShare}
          />
          <Row
            icon={<Eye className="size-3.5" />}
            label="Preview as others see it"
            value="preview"
            onClick={onPreview}
          />
          <Row
            icon={<Download className="size-3.5" />}
            label="Export my data"
            value={exporting ? "preparing…" : "json"}
            onClick={() => {
              setExporting(true);
              try {
                exportProfile(identity, stories, highlights, account);
              } finally {
                setExporting(false);
              }
            }}
          />
        </div>
        <p className="px-4 pb-4 pt-1 text-[11px] leading-relaxed text-faint">
          Account security — email changes, data, sign-out — lives with your Bloom settings, not
          here.
        </p>
      </section>
    </div>
  );
}

function SparkleMark() {
  return (
    <span className="grid size-[16px] place-items-center" aria-hidden>
      <svg viewBox="0 0 16 16" className="size-4 text-amber" fill="none">
        <path
          d="M8 2l1.3 3.7L13 7l-3.7 1.3L8 12l-1.3-3.7L3 7l3.7-1.3L8 2z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
