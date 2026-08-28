/**
 * Account & privacy — the useful-but-secondary layer from the old profile,
 * moved down and kept quiet. Real account facts only.
 */

import { ShieldCheck } from "lucide-react";

import type { AccountDetails } from "@/lib/profile/types";
import type { ProfilePrivacy } from "@/lib/profile/types";

export function AccountSection({
  account,
  privacy,
  onOpenPrivacy,
}: {
  account: AccountDetails;
  privacy: ProfilePrivacy;
  onOpenPrivacy: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface/35 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <dl className="grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2">
          <div>
            <dt className="eyebrow">Email</dt>
            <dd className="mono mt-1 text-[12.5px] text-muted-foreground">
              {account.email ?? "not connected"}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">In Bloom since</dt>
            <dd className="mono mt-1 text-[12.5px] text-muted-foreground">
              {account.memberSince
                ? new Date(account.memberSince).toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Profile</dt>
            <dd className="mt-1 text-[12.5px] text-muted-foreground">
              {privacy.profileVisibility === "public" ? "Shared by choice" : "Private by default"}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">New stories</dt>
            <dd className="mt-1 text-[12.5px] text-muted-foreground">
              {privacy.storyVisibility === "public"
                ? "Public, until you change them"
                : "Private, until you share them"}
            </dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={onOpenPrivacy}
          className="inline-flex items-center gap-2 self-center rounded-full border border-border bg-surface px-4 py-2 text-[12.5px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
        >
          <ShieldCheck className="size-3.5" aria-hidden /> Privacy settings
        </button>
      </div>
      <p className="mt-4 border-t border-border/60 pt-3 text-[11.5px] leading-relaxed text-faint">
        Account security — email changes, data, sign-out — lives with your Bloom settings, not here.
        This page is only who you are inside Bloom.
      </p>
    </div>
  );
}
