/**
 * /settings — the settings half of the old Profile page, on its own route
 * (Plan B, owner decision 2026-11-18; senior diagnosis slice 5). Profile
 * is identity + story + record + health now; everything account-shaped —
 * Account & data, Membership, Trainer & clinician, Household,
 * Personalisation, Privacy/Trust, Sessions & devices and the danger zone
 * — lives here, as the same sections the profile page used to stack.
 *
 * Data: the same `useProfileSpace` the profile page reads. This route
 * only assembles the page shell and hands the space to AccountSettings,
 * which owns the sections and their sheets — no new SQL, no new stores.
 */

import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import profileCss from "../styles/profile.css?url";
import storiesCss from "../styles/stories.css?url";
import storiesFontsCss from "../styles/fonts-stories.css?url";

import { useProfileSpace } from "@/hooks/useProfileSpace";
import { Atmosphere } from "@/components/mood/Atmosphere";
import { accentVar } from "@/components/mood/primitives";
import { AccountSettings } from "@/components/profile/AccountSettings";
import {
  ProfileProblemNotice,
  ProfileSwap,
  ProfileUnavailable,
} from "@/components/profile/ProfileLoading";
import { SignedOutProfile } from "@/components/profile/SignedOutProfile";
import { hasSupabaseConfig } from "@/lib/supabase";

export const Route = createFileRoute("/settings")({
  head: () => ({
    links: [
      { rel: "stylesheet", href: profileCss },
      /* The account sections open Stories surfaces (archive, viewer,
         story settings), so the Stories styles ride along as they did
         on /profile. */
      { rel: "stylesheet", href: storiesCss },
      { rel: "stylesheet", href: storiesFontsCss },
    ],
    meta: [
      { title: "Bloom — Settings" },
      {
        name: "description",
        content:
          "Your Bloom settings: account and data, membership, trainer and household, privacy, sessions and devices.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const space = useProfileSpace();
  const { identity, authState } = space;

  const moodEntries = useMemo(
    () => (space.moodBlock?.status === "ready" ? space.moodBlock.data : []),
    [space.moodBlock],
  );

  /* Nothing to show yet — no cached copy, no device copy, read still in
     flight. Same contract as /profile: the skeleton stands in the page's
     own layout and crossfades to the real page. */
  const settingsLoading =
    authState === "checking" ||
    space.identityBlock === null ||
    space.identityBlock.status === "loading";

  const accent = identity?.identity.accent ?? "violet";

  return (
    <div
      className="pf app-shell relative min-h-screen bg-background text-foreground"
      style={{
        ["--profile-accent" as string]: accentVar[accent],
        ["--profile-accent-soft" as string]: `color-mix(in oklab, ${accentVar[accent]} 10%, transparent)`,
        ["--profile-accent-border" as string]: `color-mix(in oklab, ${accentVar[accent]} 38%, transparent)`,
        ["--profile-accent-glow" as string]: `0 16px 44px -26px color-mix(in oklab, ${accentVar[accent]} 65%, transparent)`,
      }}
    >
      <Atmosphere />

      {/* The rulebook container (1040px, centred) since brief v4 (M-76),
          matching /profile; Today and Nutrition keep the wider measure. */}
      <main className="page relative pb-28 pt-[calc(var(--bloom-header-h)+8px)] sm:pt-5 lg:pb-16">
        <ProfileSwap loading={settingsLoading}>
          {!identity ? (
            space.profileProblem || !hasSupabaseConfig ? (
              <ProfileUnavailable
                problem={space.profileProblem}
                syncing={space.identitySyncing}
                onRetry={space.retryIdentity}
              />
            ) : (
              <div className="mx-auto w-full max-w-[560px] pt-6">
                <div className="pf-section-head">
                  <div>
                    <p className="pf-eyebrow">Settings</p>
                    <h1 className="pf-title">Settings</h1>
                  </div>
                </div>
                <SignedOutProfile onSendMagicLink={space.actions.sendMagicLink} />
              </div>
            )
          ) : (
            <div className="flex flex-col">
              {space.profileProblem ? (
                <ProfileProblemNotice
                  problem={space.profileProblem}
                  syncing={space.identitySyncing}
                  onRetry={space.retryIdentity}
                />
              ) : null}

              {/* the page head — what this is, and the way back to the
                  profile it used to live under */}
              <div className="pf-section-head">
                <div>
                  <p className="pf-eyebrow">Settings</p>
                  <h1 className="pf-title">Settings</h1>
                </div>
                <Link to="/profile" className="pf-link">
                  Your profile
                </Link>
              </div>

              <AccountSettings space={space} moodEntries={moodEntries} />
            </div>
          )}
        </ProfileSwap>
      </main>
    </div>
  );
}
