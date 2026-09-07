/**
 * Account & data — the settings list at the bottom of the profile, in the
 * grouped-rows grammar phones use. Every row does something real: nothing
 * is a placeholder. The export payload is unchanged from the first profile
 * (identity, stories, highlights → one JSON file, client-side).
 */

import { useState } from "react";
import {
  Archive,
  ChevronRight,
  Clock,
  Download,
  Eye,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Palette,
  Share2,
} from "lucide-react";

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
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
  testId?: string;
}) {
  const inner = (
    <>
      <span className="pf-row-icon" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 truncate">{label}</span>
      <span className={danger ? "pf-row-value pf-row-value--danger" : "pf-row-value"}>{value}</span>
      {onClick ? <ChevronRight className="pf-row-chevron size-3.5" aria-hidden /> : <span />}
    </>
  );
  if (!onClick) {
    return <div className="pf-row">{inner}</div>;
  }
  return (
    <button type="button" onClick={onClick} className="pf-row" data-testid={testId}>
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

const ACCENT_LABEL: Record<ProfileIdentity["accent"], string> = {
  violet: "Violet",
  sky: "Sky",
  amber: "Amber",
  sage: "Sage",
  rose: "Rose",
};

export function AccountRow({
  identity,
  account,
  privacy,
  stories,
  highlights,
  isSignedIn,
  onOpenPrivacy,
  onShare,
  onPreview,
  onOpenArchive,
  onEdit,
  onSignOut,
  onSignIn,
}: {
  identity: ProfileIdentity;
  account: AccountDetails;
  privacy: ProfilePrivacy;
  stories: Story[];
  highlights: HighlightItem[];
  isSignedIn: boolean;
  onOpenPrivacy: () => void;
  onShare: () => void;
  onPreview: () => void;
  onOpenArchive: () => void;
  onEdit: () => void;
  onSignOut: () => void;
  onSignIn: () => void;
}) {
  const [exporting, setExporting] = useState(false);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <section aria-label="Account" className="pf-card overflow-hidden">
        <p className="pf-eyebrow px-4 pt-3.5 pb-1">Account</p>
        <div className="pf-rows">
          <Row
            icon={<Mail className="size-3.5" />}
            label="Email"
            value={account.email ?? "not connected"}
          />
          <Row
            icon={<Clock className="size-3.5" />}
            label="Tracking since"
            value={
              account.memberSince
                ? new Date(account.memberSince).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—"
            }
          />
          <Row
            icon={<Palette className="size-3.5" />}
            label="Accent"
            value={ACCENT_LABEL[identity.accent]}
            onClick={onEdit}
          />
          <Row
            icon={<Lock className="size-3.5" />}
            label="Privacy"
            value={privacy.profileVisibility === "public" ? "Shared by choice" : "Private"}
            onClick={onOpenPrivacy}
            testId="pf-row-privacy"
          />
          {isSignedIn ? (
            <Row
              icon={<LogOut className="size-3.5" />}
              label="Sign out"
              value="this device"
              onClick={onSignOut}
              danger
              testId="pf-row-signout"
            />
          ) : (
            <Row
              icon={<LogIn className="size-3.5" />}
              label="Sign in"
              value="magic link"
              onClick={onSignIn}
              testId="pf-row-signin"
            />
          )}
        </div>
      </section>

      <section aria-label="Your data" className="pf-card overflow-hidden">
        <p className="pf-eyebrow px-4 pt-3.5 pb-1">Sharing &amp; data</p>
        <div className="pf-rows">
          <Row
            icon={<Share2 className="size-3.5" />}
            label="Share profile"
            value={identity.username ? `/@${identity.username}` : "pick a @username"}
            onClick={onShare}
          />
          <Row
            icon={<Eye className="size-3.5" />}
            label="Preview as others see it"
            value="preview"
            onClick={onPreview}
          />
          <Row
            icon={<Archive className="size-3.5" />}
            label="Story archive"
            value={`${stories.length} kept`}
            onClick={onOpenArchive}
          />
          <Row
            icon={<Download className="size-3.5" />}
            label="Export my profile"
            value={exporting ? "preparing…" : "json"}
            testId="pf-row-export"
            onClick={() => {
              setExporting(true);
              try {
                exportProfile(identity, stories, highlights, account);
              } finally {
                window.setTimeout(() => setExporting(false), 600);
              }
            }}
          />
        </div>
      </section>
    </div>
  );
}
