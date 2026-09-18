/**
 * Settings — the grouped-row list at the bottom of the profile.
 *
 * The grammar is the one phones use everywhere: a small label floating above a
 * group of connected rows, quiet hairlines between them, and nothing else. An
 * earlier version of this wrapped every group in a bordered card on a
 * two-column grid, which reads as a dashboard of panels rather than a settings
 * list — the rows stopped feeling like one system and started competing.
 *
 * Two rules this file holds to:
 *
 *   · **Every row does something real.** Nothing here is a placeholder, and no
 *     group exists for symmetry. If Bloom grows a notification preference, it
 *     gets a row then; there is no "Notifications" heading waiting empty.
 *   · **A capability switch explains its consequence before it takes.** Turning
 *     cycle tracking off removes the cycle from the whole app — nav, Today,
 *     coach, profile. That is reversible but it is not small, so it asks first.
 */

import { useState } from "react";
import {
  Archive,
  Bell,
  ChevronRight,
  Clock,
  Download,
  Eye,
  Lock,
  LogIn,
  MessageCircle,
  LogOut,
  Mail,
  Palette,
  Share2,
  Smartphone,
  Trash2,
  Droplet,
  UserRound,
  Volume2,
} from "lucide-react";

import { useCycleVisible } from "@/hooks/useCycleVisible";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useSound } from "@/hooks/useSound";
import { SEX_LABEL } from "@/lib/onboarding/profileKind";

import type {
  AccountDetails,
  ProfilePrivacy,
  Story,
  HighlightItem,
  ProfileIdentity,
} from "@/lib/profile/types";

/* ------------------------------- primitives ------------------------------ */

function Row({
  icon,
  label,
  hint,
  value,
  onClick,
  danger = false,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  /** A second line, only where the label alone is ambiguous. */
  hint?: string;
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
      <span className="pf-row-text">
        <span className="pf-row-label">{label}</span>
        {hint ? <span className="pf-row-hint">{hint}</span> : null}
      </span>
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

/**
 * A row that flips something rather than opening something. Same grammar as
 * `Row`, but the whole row is the hit target and the state is announced.
 */
function SwitchRow({
  icon,
  label,
  value,
  on,
  onToggle,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  on: boolean;
  onToggle: (next: boolean) => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onToggle(!on)}
      className="pf-row"
      data-testid={testId}
    >
      <span className="pf-row-icon" aria-hidden>
        {icon}
      </span>
      <span className="pf-row-text">
        <span className="pf-row-label">{label}</span>
      </span>
      <span className="pf-row-value">{value}</span>
      <span className="pf-switch" data-on={on} aria-hidden>
        <span className="pf-switch-knob" />
      </span>
    </button>
  );
}

/**
 * A group: label, then connected rows. No card, no border around the lot — the
 * hairlines between rows are what hold it together.
 */
function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section aria-label={label} className="pf-group">
      <h2 className="pf-group-label">{label}</h2>
      <div className="pf-group-rows">{children}</div>
    </section>
  );
}

/**
 * The confirmation for switches that remove something from the app.
 *
 * Deliberately not a modal with a title, a paragraph and two heavy buttons: it
 * says the consequence in one line and offers two choices. Inline, where the
 * switch is, so the question and its context are the same place.
 */
function ConfirmRow({
  open,
  message,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="pf-confirm" role="alertdialog" aria-label="Confirm change">
      <p className="pf-confirm-msg">{message}</p>
      <div className="pf-confirm-actions">
        <button type="button" className="pf-confirm-btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="pf-confirm-btn pf-confirm-btn--go"
          onClick={onConfirm}
          autoFocus
        >
          Turn it off
        </button>
      </div>
    </div>
  );
}

/* -------------------------------- sections ------------------------------- */

/**
 * Personalization — how Bloom is shaped for this person.
 *
 * This is the only place the profile-shape answer lives after onboarding, and
 * it is a switch rather than a re-run of the setup questions: one decision,
 * clearly stated, reversible, and the cycle surfaces elsewhere respond to it
 * rather than duplicating it.
 */
function PersonalizationSection() {
  const { optedOut } = useCycleVisible();
  const { setKind, state } = useOnboarding();
  const { enabled, setEnabled, sound } = useSound();
  const [confirming, setConfirming] = useState(false);

  /* The answer given during setup, stored as it was given. It is shown, never
     inferred back out of the capability: "female, cycle off" and "prefer not
     to say" would otherwise look identical here. */
  const sexValue = state.sex ? SEX_LABEL[state.sex] : "Not answered";

  return (
    <Group label="Personalization">
      <SwitchRow
        icon={<Droplet className="size-3.5" />}
        label="Cycle tracking"
        value={optedOut ? "off" : "on"}
        on={!optedOut}
        testId="pf-row-cycle"
        onToggle={(next) => {
          /* Turning it on is immediate. Turning it off takes the cycle out of
             the whole app, so it asks first. */
          if (next) {
            sound("toggleOn");
            setKind("cycle");
            return;
          }
          setConfirming(true);
        }}
      />
      <ConfirmRow
        open={confirming}
        message="Turning off cycle tracking removes Cycle from your Bloom — the nav entry, the Today ring and your coach's cycle context. Nothing you have logged is deleted, and you can turn it back on here."
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          sound("toggleOff");
          setKind("no-cycle");
        }}
      />
      <SwitchRow
        icon={<Volume2 className="size-3.5" />}
        label="Sound"
        value={enabled ? "on" : "off"}
        on={enabled}
        testId="pf-row-sound"
        onToggle={(next) => {
          /* setEnabled plays the confirmation itself when switching on — the
             only way to hear what you just enabled. */
          if (!next) sound("toggleOff");
          setEnabled(next);
        }}
      />
      <Row
        icon={<UserRound className="size-3.5" />}
        label="You told us"
        hint={
          state.sex
            ? "Asked once at setup. Changing it never deletes anything logged."
            : "Not asked yet — the switch above is what Bloom is going by."
        }
        value={sexValue}
      />
    </Group>
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
  onOpenStorySettings,
  onEdit,
  onSignOut,
  onSignIn,
  onExportAll,
  onOpenReminders,
  onOpenErase,
  onInstall,
  remindersValue,
  installValue,
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
  onOpenStorySettings?: (() => void) | undefined;
  onEdit: () => void;
  onSignOut: () => void;
  onSignIn: () => void;
  /** One file with the whole record. */
  onExportAll: () => void;
  /** Permission and per-kind switches. */
  onOpenReminders: () => void;
  /** Typed-confirmation erase. */
  onOpenErase: () => void;
  /** The install prompt, when the browser has one to give. */
  onInstall?: (() => void) | undefined;
  remindersValue: string;
  installValue: string | null;
}) {
  const [exporting, setExporting] = useState(false);

  return (
    <div className="pf-settings">
      <Group label="Account">
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
      </Group>

      <PersonalizationSection />

      <Group label="Appearance">
        <Row
          icon={<Palette className="size-3.5" />}
          label="Accent"
          value={ACCENT_LABEL[identity.accent]}
          onClick={onEdit}
          testId="pf-row-accent"
        />
      </Group>

      <Group label="Privacy">
        <Row
          icon={<Lock className="size-3.5" />}
          label="Profile visibility"
          value={privacy.profileVisibility === "public" ? "Public" : "Private"}
          onClick={onOpenPrivacy}
          testId="pf-row-privacy"
        />
        <Row
          icon={<Eye className="size-3.5" />}
          label="Preview as others see it"
          onClick={onPreview}
          testId="pf-row-preview"
        />
      </Group>

      <Group label="Stories">
        <Row
          icon={<Archive className="size-3.5" />}
          label="Archive"
          value={`${stories.length} kept`}
          onClick={onOpenArchive}
          testId="pf-row-archive"
        />
        {onOpenStorySettings ? (
          <Row
            icon={<MessageCircle className="size-3.5" />}
            label="Replies, reactions & audience"
            onClick={onOpenStorySettings}
            testId="pf-row-story-settings"
          />
        ) : null}
      </Group>

      <Group label="Sharing & data">
        <Row
          icon={<Share2 className="size-3.5" />}
          label="Share profile"
          value={identity.username ? `/@${identity.username}` : "pick a @username"}
          onClick={onShare}
          testId="pf-row-share"
        />
        <Row
          icon={<Download className="size-3.5" />}
          label="Download everything"
          value="json"
          testId="pf-row-export-all"
          onClick={onExportAll}
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
        <Row
          icon={<Bell className="size-3.5" />}
          label="Reminders"
          value={remindersValue}
          testId="pf-row-reminders"
          onClick={onOpenReminders}
        />
        {installValue ? (
          <Row
            icon={<Smartphone className="size-3.5" />}
            label="Install on this device"
            value={installValue}
            testId="pf-row-install"
            {...(onInstall ? { onClick: onInstall } : {})}
          />
        ) : null}
        <Row
          icon={<Trash2 className="size-3.5" />}
          label="Erase everything"
          value="permanent"
          danger
          testId="pf-row-erase"
          onClick={onOpenErase}
        />
      </Group>
    </div>
  );
}
