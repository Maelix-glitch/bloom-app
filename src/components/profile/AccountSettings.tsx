/**
 * AccountSettings — the settings half of what used to be the Profile page,
 * moved to its own route (/settings) by Plan B (owner decision 2026-11-18,
 * senior diagnosis slice 5). A move, not a rewrite: the sections are the
 * same components with the same copy and behaviour — AccountRow (Account &
 * data, Personalisation, Privacy with Consent + Trust, Stories, Sharing &
 * data), PremiumSection (Membership), TrainerSection, HouseholdSection and
 * SessionsSection (with its danger zone) — and this component owns the
 * sheets those sections open, exactly as the profile page owned them
 * before: editor, privacy, share, preview, archive, story settings,
 * export, reminders, erase, restore and the sign-in dialog.
 *
 * The profile page keeps the identity/story overlays (its hero and tabs
 * open their own instances); nothing here shares state with it beyond the
 * stores both read.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconErase, IconFileUp } from "@/components/profile/SettingsIcons";
import { toast } from "sonner";

import { BloomConfirm } from "@/components/ui/bloom-sheet";
import { useMoodSystem } from "@/hooks/useMoodSystem";

import { EMOTION_MAP } from "@/lib/mood/types";
import { seenStore } from "@/lib/stories/seen";
import { verificationStatus } from "@/lib/profile/verification";
import {
  loadVerificationFacts,
  UNPROVEN_FACTS,
  type VerificationFacts,
} from "@/lib/profile/verificationService";
import { isStoryActive, type Story } from "@/lib/profile/types";
import type { ProfileSpace } from "@/hooks/useProfileSpace";
import type { MoodEntry } from "@/lib/mood/types";
import { StorySettings } from "@/components/stories/StorySettings";
import { buildViewModel, type FeaturedSources } from "@/components/profile/ProfileView";
import type { ProfileEditorSave } from "@/components/profile/ProfileEditor";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { PrivacySheet } from "@/components/profile/PrivacySheet";
import { RestoreSheet } from "@/components/profile/RestoreSheet";
import { SessionsSection } from "@/components/profile/SessionsSection";
import { PremiumSection } from "@/components/billing/PremiumSection";
import { TrainerSection } from "@/components/trainer/TrainerSection";
import { TrainerReferralSection } from "@/components/trainer/TrainerReferralSection";
import { HouseholdSection } from "@/components/household/HouseholdSection";
import { AccountRow } from "@/components/profile/AccountRow";
import { EraseSheet, ExportSheet, RemindersSheet } from "@/components/profile/DataSheets";
import { useExportBundle } from "@/hooks/useExportBundle";
import { useReminders } from "@/hooks/useReminders";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { ProfileShareSheet } from "@/components/profile/ProfileShareSheet";
import { SignedOutProfile } from "@/components/profile/SignedOutProfile";
import { PublicProfileView } from "@/components/profile/PublicProfileView";
import { StoryArchive } from "@/components/stories/StoryArchive";
import { StoryViewer } from "@/components/stories/StoryViewer";
import { HighlightComposer } from "@/components/highlights/HighlightComposer";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function AccountSettings({
  space,
  moodEntries,
}: {
  space: ProfileSpace;
  moodEntries: MoodEntry[];
}) {
  const { identity, authState, storiesByAge, highlightsBlock } = space;

  const [editorOpen, setEditorOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [storySettingsOpen, setStorySettingsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [eraseOpen, setEraseOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [viewer, setViewer] = useState<{ stories: Story[]; startIndex: number } | null>(null);
  const [highlightEditor, setHighlightEditor] = useState<{
    id: string | null;
    preselect: string | null;
  } | null>(null);

  /* after a magic-link sign-in resolves, the dialog steps aside on its own */
  useEffect(() => {
    if (authState === "signed-in") setSignInOpen(false);
  }, [authState]);

  /* Verification v2 facts — the same read the profile page makes for its
     hero tick: unproven until a read lands, so the Account row's status
     can appear late but never unproven. */
  const [verificationFacts, setVerificationFacts] =
    useState<VerificationFacts>(UNPROVEN_FACTS);
  /* M-194: the facts' landing is tracked separately — while a signed-in
     read is in flight the status computed from UNPROVEN_FACTS is a
     false claim ("1 step left") that the row printed and then replaced
     with "Verified" when the read landed. The row now holds a neutral
     no-claim state until the read settles (the sync lines' rule: while
     checking, print nothing that can be mistaken for the answer). */
  const [verificationFactsSettled, setVerificationFactsSettled] =
    useState(false);
  useEffect(() => {
    if (authState !== "signed-in") {
      setVerificationFacts(UNPROVEN_FACTS);
      setVerificationFactsSettled(true);
      return;
    }
    let alive = true;
    setVerificationFactsSettled(false);
    void loadVerificationFacts().then((facts) => {
      if (alive) {
        setVerificationFacts(facts);
        setVerificationFactsSettled(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [authState, identity]);

  /* the archive/viewer chain marks stories seen in the same device
     store the profile page reads — marking here is marking there */
  const markSeen = useCallback((story: Story) => {
    seenStore.mark(story.id);
  }, []);

  if (!identity) return null;

  const accent = identity.identity.accent;
  const allStories = storiesByAge ? [...storiesByAge.active, ...storiesByAge.archived] : [];
  const highlights = highlightsBlock?.status === "ready" ? highlightsBlock.data : [];

  /* the verification the Account group's row reports — the same status
     the profile hero's tick carries: the record fact, nothing else */
  const verification = verificationStatus({
    hasRecord: verificationFacts.hasRecord,
  });

  return (
    <AccountSettingsInner
      space={space}
      identity={identity}
      moodEntries={moodEntries}
      verification={verification}
      verificationPending={authState === "signed-in" && !verificationFactsSettled}
      allStories={allStories}
      highlights={highlights}
      accent={accent}
      ui={{
        editorOpen,
        setEditorOpen,
        privacyOpen,
        setPrivacyOpen,
        archiveOpen,
        setArchiveOpen,
        storySettingsOpen,
        setStorySettingsOpen,
        previewOpen,
        setPreviewOpen,
        signInOpen,
        setSignInOpen,
        exportOpen,
        setExportOpen,
        remindersOpen,
        setRemindersOpen,
        eraseOpen,
        setEraseOpen,
        restoreOpen,
        setRestoreOpen,
        shareSheetOpen,
        setShareSheetOpen,
        viewer,
        setViewer,
        highlightEditor,
        setHighlightEditor,
        markSeen,
      }}
    />
  );
}

type Setter = (v: boolean) => void;

interface SettingsUi {
  editorOpen: boolean;
  setEditorOpen: Setter;
  privacyOpen: boolean;
  setPrivacyOpen: Setter;
  archiveOpen: boolean;
  setArchiveOpen: Setter;
  storySettingsOpen: boolean;
  setStorySettingsOpen: Setter;
  previewOpen: boolean;
  setPreviewOpen: Setter;
  signInOpen: boolean;
  setSignInOpen: Setter;
  exportOpen: boolean;
  setExportOpen: Setter;
  remindersOpen: boolean;
  setRemindersOpen: Setter;
  eraseOpen: boolean;
  setEraseOpen: Setter;
  restoreOpen: boolean;
  setRestoreOpen: Setter;
  shareSheetOpen: boolean;
  setShareSheetOpen: Setter;
  viewer: { stories: Story[]; startIndex: number } | null;
  setViewer: (v: { stories: Story[]; startIndex: number } | null) => void;
  highlightEditor: { id: string | null; preselect: string | null } | null;
  setHighlightEditor: (v: { id: string | null; preselect: string | null } | null) => void;
  markSeen: (story: Story) => void;
}

function AccountSettingsInner({
  space,
  identity,
  moodEntries,
  verification,
  verificationPending,
  allStories,
  highlights,
  accent,
  ui,
}: {
  space: ProfileSpace;
  identity: NonNullable<ProfileSpace["identity"]>;
  moodEntries: MoodEntry[];
  verification: ReturnType<typeof verificationStatus>;
  verificationPending: boolean;
  allStories: Story[];
  highlights: import("@/lib/profile/types").HighlightItem[];
  accent: import("@/lib/profile/types").ProfileIdentity["accent"];
  ui: SettingsUi;
}) {
  const { authState, userId, storiesByAge, journey, rewardsBlock } = space;

  const reminders = useReminders();
  const install = useInstallPrompt();

  /* The Mood record's reset (F-41, M-204): it lived at the foot of
     Mood Intelligence; it belongs here, with the account's other data
     controls. Same confirm words, same reset underneath. */
  const moodSystem = useMoodSystem();
  const [moodResetOpen, setMoodResetOpen] = useState(false);

  const milestonesList = useMemo(() => {
    if (journey.status !== "ready") return [];
    return journey.milestones.achieved;
  }, [journey]);

  const featuredSources: FeaturedSources = useMemo(() => {
    const reflections = moodEntries
      .filter((e) => e.note && e.note.trim())
      .slice(-12)
      .reverse()
      .map((e) => ({
        id: e.id,
        title: `Reflection · ${new Date(e.timestamp).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        })}`,
        body: e.note!.trim(),
        date: new Date(e.timestamp).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        accent: EMOTION_MAP[e.emotions[0] ?? "neutral"].accent,
      }));
    const rewards = (rewardsBlock?.status === "ready" ? rewardsBlock.data : []).map((r) => ({
      id: r.id,
      title: r.title,
      date: r.claimed_at
        ? new Date(r.claimed_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "",
    }));
    return { stories: allStories, reflections, rewards, milestones: milestonesList };
  }, [moodEntries, rewardsBlock, allStories, milestonesList]);

  const previewModel = buildViewModel({
    identity: identity.identity,
    allStories,
    highlights,
    privacyPublic: identity.privacy.profileVisibility === "public",
    sources: featuredSources,
  });

  const editingHighlight =
    ui.highlightEditor?.id != null
      ? (highlights.find((h) => h.id === ui.highlightEditor!.id) ?? null)
      : null;

  /* B7 — the bundle is assembled only when the sheet asks for it */
  const exportBundle = useExportBundle({
    profile: {
      displayName: identity.identity.displayName,
      username: identity.identity.username,
      bio: identity.identity.bio,
      accent: identity.identity.accent,
      email: identity.email,
      memberSince: identity.memberSince,
    },
    stories: allStories.map((s) => ({
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
      stories: h.stories.map((st) => ({ title: st.title, createdAt: st.createdAt })),
    })),
    moodEntries,
    userId,
  });

  const remindersValue = !reminders.settings.enabled
    ? "off"
    : reminders.permission === "granted"
      ? "on"
      : "needs permission";
  const installValue = install.installed
    ? "installed"
    : install.canInstall
      ? "add to home screen"
      : install.ios
        ? "share → add to home screen"
        : null;

  const saveIdentity = async (patch: ProfileEditorSave) => {
    await space.actions.saveIdentity({
      displayName: patch.displayName,
      username: patch.username,
      bio: patch.bio,
      accent: patch.accent,
      featured: identity.identity.featured ?? null,
    });
  };

  const deleteStory = async (story: Story) => {
    try {
      const { undo } = await space.actions.removeStory(story);
      toast("Story deleted.", {
        action: {
          label: "Undo",
          onClick: () => {
            void undo().catch(() => toast.error("Couldn't bring that back."));
          },
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete that just now.");
    }
  };

  const shareAgain = async (story: Story) => {
    try {
      await space.actions.shareAgain(story);
      toast("Shared again for 24 hours.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't share that again.");
    }
  };

  return (
    <>
      {/* account + data — settings rows */}
      <section id="pf-account-data" className="pf-section pf-jump" aria-label="Account and data">
        <div className="pf-section-head">
          <div>
            <p className="pf-eyebrow">Account</p>
            <h2 className="pf-title">Account &amp; data</h2>
          </div>
        </div>
        <AccountRow
          identity={identity.identity}
          account={{ email: identity.email, memberSince: identity.memberSince }}
          verification={verification}
          verificationPending={verificationPending}
          privacy={identity.privacy}
          stories={allStories}
          highlights={highlights}
          isSignedIn={authState === "signed-in"}
          onOpenPrivacy={() => ui.setPrivacyOpen(true)}
          onShare={() => ui.setShareSheetOpen(true)}
          onPreview={() => ui.setPreviewOpen(true)}
          onOpenArchive={() => ui.setArchiveOpen(true)}
          onOpenStorySettings={() => ui.setStorySettingsOpen(true)}
          onEdit={() => ui.setEditorOpen(true)}
          onSignOut={() => {
            void space.actions.signOut();
          }}
          onSignIn={() => ui.setSignInOpen(true)}
          onExportAll={() => ui.setExportOpen(true)}
          onOpenReminders={() => ui.setRemindersOpen(true)}
          onOpenErase={() => ui.setEraseOpen(true)}
          {...(install.canInstall ? { onInstall: () => void install.install() } : {})}
          remindersValue={remindersValue}
          installValue={installValue}
        />

        {/* The other half of "Download everything". */}
        <section aria-label="Backup" className="pf-group mt-8">
          <h2 className="pf-group-label">Backup</h2>
          <div className="pf-group-rows">
            <button type="button" className="pf-row" onClick={() => ui.setRestoreOpen(true)}>
              <span className="pf-row-icon" aria-hidden>
                <IconFileUp />
              </span>
              <span className="pf-row-text">
                <span className="pf-row-label">Restore from backup</span>
                <span className="pf-row-hint">
                  Reads a “Download everything” file into this browser
                </span>
              </span>
              <span className="pf-row-value">json</span>
              <span />
            </button>
          </div>
        </section>

        {/* The Mood record's own data control (F-41, M-204) — moved
            here from the foot of Mood Intelligence. */}
        <section aria-label="Mood record" className="pf-group mt-8">
          <h2 className="pf-group-label">Mood record</h2>
          <div className="pf-group-rows">
            <button type="button" className="pf-row" onClick={() => setMoodResetOpen(true)}>
              <span className="pf-row-icon" aria-hidden>
                <IconErase />
              </span>
              <span className="pf-row-text">
                <span className="pf-row-label">Reset all mood data</span>
                <span className="pf-row-hint">
                  Removes every check-in in your Mood record, from this device and your account
                </span>
              </span>
              <span className="pf-row-value" />
              <span />
            </button>
          </div>
        </section>
        <BloomConfirm
          open={moodResetOpen}
          onClose={() => setMoodResetOpen(false)}
          title="Erase every mood entry?"
          description="Every check-in in your Mood record is removed, from this device and your account. This can't be undone."
          confirmLabel="Erase everything"
          busyLabel="Erasing…"
          onConfirm={() => moodSystem.resetAll()}
        />
      </section>

      {/* Money System: the membership card — plan, AI credits,
          and the door to Premium. */}
      <section id="pf-membership" className="pf-section pf-jump" aria-label="Membership">
        <PremiumSection />
      </section>

      {/* Trainer & Clinician Pro: the consent-gated share summary
          and trainer-proposed targets. (The referral code moved to
          the trainers-only server section below — M-171.) */}
      <section id="pf-trainer" className="pf-section pf-jump" aria-label="Trainer and clinician">
        <TrainerSection />
      </section>

      {/* Trainer referral (M-171): renders its own section ONLY when
          the server confirms this account is an admin-granted trainer.
          For everyone else this line leaves no trace in the page. */}
      <TrainerReferralSection />

      {/* One-Kitchen Family: the household the person cooks for,
          and the dishes that suit everyone at the table. */}
      <section id="pf-household" className="pf-section pf-jump" aria-label="Household">
        <HouseholdSection />
      </section>

      {/* Launch compliance: where you're signed in, and how to end it. */}
      <section
        id="pf-sessions"
        className="pf-section pf-jump"
        aria-label="Sessions and devices settings"
      >
        <div className="pf-section-head">
          <div>
            <p className="pf-eyebrow">Control</p>
            <h2 className="pf-title">Sessions &amp; devices</h2>
          </div>
        </div>
        <SessionsSection
          isSignedIn={authState === "signed-in"}
          onOpenErase={() => ui.setEraseOpen(true)}
        />
      </section>

      {/* overlays — the sheets these sections open */}
      <ProfileEditor
        open={ui.editorOpen}
        onClose={() => ui.setEditorOpen(false)}
        identity={identity.identity}
        onSave={saveIdentity}
        onCommitAvatar={space.actions.commitAvatar}
        onRemoveAvatar={space.actions.clearAvatar}
      />
      <ExportSheet
        open={ui.exportOpen}
        onClose={() => ui.setExportOpen(false)}
        build={exportBundle.build}
      />
      <RemindersSheet
        open={ui.remindersOpen}
        onClose={() => ui.setRemindersOpen(false)}
        reminders={reminders}
        install={install}
      />
      <EraseSheet
        open={ui.eraseOpen}
        onClose={() => ui.setEraseOpen(false)}
        isSignedIn={authState === "signed-in"}
        counts={exportBundle.counts}
        onErased={() => {
          ui.setEraseOpen(false);
          window.location.assign("/");
        }}
      />
      <PrivacySheet
        open={ui.privacyOpen}
        onClose={() => ui.setPrivacyOpen(false)}
        privacy={identity.privacy}
        hasUsername={Boolean(identity.identity.username)}
        onSave={space.actions.savePrivacySettings}
        onPreview={() => {
          ui.setPrivacyOpen(false);
          ui.setPreviewOpen(true);
        }}
      />
      <ProfileShareSheet
        open={ui.shareSheetOpen}
        onClose={() => ui.setShareSheetOpen(false)}
        identity={identity.identity}
        privacy={identity.privacy}
        onPreview={() => ui.setPreviewOpen(true)}
        onEditUsername={() => ui.setEditorOpen(true)}
      />
      <RestoreSheet open={ui.restoreOpen} onClose={() => ui.setRestoreOpen(false)} />
      <StoryArchive
        open={ui.archiveOpen}
        onClose={() => ui.setArchiveOpen(false)}
        archived={storiesByAge?.archived ?? []}
        active={storiesByAge?.active.filter((s) => isStoryActive(s)) ?? []}
        onView={(story) => {
          ui.setArchiveOpen(false);
          ui.setViewer({ stories: [story], startIndex: 0 });
        }}
        onShareAgain={(story) => void shareAgain(story)}
        onDelete={(story) => void deleteStory(story)}
        onAddToHighlight={(story) => {
          ui.setArchiveOpen(false);
          ui.setHighlightEditor({ id: null, preselect: story.id });
        }}
      />
      <HighlightComposer
        open={ui.highlightEditor !== null}
        editing={editingHighlight}
        allStories={allStories}
        preselectedStoryId={ui.highlightEditor?.preselect ?? null}
        defaultAccent={accent}
        onSave={space.actions.saveHighlight}
        onDelete={space.actions.removeHighlight}
        onClose={() => ui.setHighlightEditor(null)}
      />
      {ui.storySettingsOpen ? (
        <StorySettings userId={userId} onClose={() => ui.setStorySettingsOpen(false)} />
      ) : null}

      <StoryViewer
        target={ui.viewer}
        viewerName={identity.identity.displayName ?? "You"}
        viewerAvatarPath={identity.identity.avatarPath ?? null}
        accent={accent}
        userId={userId}
        userName={identity.identity.displayName ?? null}
        ownerId={userId}
        onSeen={ui.markSeen}
        onShareAgain={(story) => void shareAgain(story)}
        onAddToHighlight={(story) => ui.setHighlightEditor({ id: null, preselect: story.id })}
        onDelete={
          ui.viewer
            ? (story) => {
                void deleteStory(story).then(() => {
                  ui.setViewer(
                    ui.viewer && ui.viewer.stories.length <= 1
                      ? null
                      : ui.viewer
                        ? {
                            ...ui.viewer,
                            stories: ui.viewer.stories.filter((s) => s.id !== story.id),
                          }
                        : null,
                  );
                });
              }
            : undefined
        }
        onClose={() => ui.setViewer(null)}
      />

      <Dialog open={ui.previewOpen} onOpenChange={(o) => !o && ui.setPreviewOpen(false)}>
        <DialogContent className="top-1/2 left-1/2 max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-[680px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border-border bg-background">
          <DialogTitle className="sr-only">Profile preview</DialogTitle>
          {previewModel ? (
            <PublicProfileView
              model={previewModel}
              asPreview
              visitorId={userId}
              visitorName={identity.identity.displayName ?? null}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={ui.signInOpen} onOpenChange={(o) => !o && ui.setSignInOpen(false)}>
        <DialogContent className="top-1/2 left-1/2 w-[calc(100%-1.5rem)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-xl border-border bg-background">
          <DialogTitle className="sr-only">Sign in to Bloom</DialogTitle>
          <SignedOutProfile compact onSendMagicLink={space.actions.sendMagicLink} />
        </DialogContent>
      </Dialog>
    </>
  );
}
