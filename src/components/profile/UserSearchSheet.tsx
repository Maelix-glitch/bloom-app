/**
 * UserSearchSheet — find other people in Bloom, from the Profile page's
 * magnifying glass.
 *
 * One BloomSheet, like every other premium dialog on this page. The input
 * searches by display name or @username through the `search_profiles`
 * RPC (see lib/profile/userSearchService): only profiles their owners
 * made public can appear, the searcher never sees themselves, and the
 * blue tick beside a name is the `account_verifications` record — the
 * same truth as the hero's badge, never a decoration. The member
 * badges beside it (M-209) ride the same RPC and the same rule: the
 * trainer row and the granted `member_badges` rows, derived in
 * lib/profile/badges — never decoration either.
 *
 * A row with a @username opens that person's public profile (/@username
 * is a real route); a row without one has no page to open, so it is
 * informational only — no dead taps. States are honest throughout: an
 * idle hint before two characters, a searching line while the call is
 * out, a plain "no one matches" when the list is empty, and a retryable
 * error when the search itself fails.
 */

import { useEffect, useRef, useState } from "react";
import { Loader2, Search, SearchX, WifiOff } from "lucide-react";

import { BloomIcon } from "@/components/icons/BloomIcon";
import { BloomSheet, SheetBody, SheetItem } from "@/components/ui/bloom-sheet";
import { MemberBadges } from "@/components/profile/MemberBadges";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { VerifiedBadge } from "@/components/profile/VerifiedBadge";
import {
  searchProfiles,
  USER_SEARCH_MIN_TERM,
  type UserSearchResult,
} from "@/lib/profile/userSearchService";
import { verificationStatusFromRecord } from "@/lib/profile/verification";
import { cn } from "@/lib/utils";

type SearchPhase =
  | { kind: "idle" }
  | { kind: "searching"; term: string }
  | { kind: "results"; term: string; results: UserSearchResult[] }
  | { kind: "error"; term: string };

const DEBOUNCE_MS = 300;

export function UserSearchSheet({
  open,
  onClose,
  currentUserId,
  onOpenProfile,
}: {
  open: boolean;
  onClose: () => void;
  /** The searcher — excluded from results (server-side, and again here). */
  currentUserId: string | null;
  /** Open a person's public profile by @username. */
  onOpenProfile: (username: string) => void;
}) {
  const [term, setTerm] = useState("");
  const [phase, setPhase] = useState<SearchPhase>({ kind: "idle" });
  /* A slow answer to an older term must never overwrite a newer one. */
  const requestSeq = useRef(0);
  /* Bumped by the error state's retry, to re-run the same term at once. */
  const [retryNonce, setRetryNonce] = useState(0);

  /* Every opening starts fresh: yesterday's term is not today's search. */
  useEffect(() => {
    if (open) {
      requestSeq.current += 1;
      setTerm("");
      setPhase({ kind: "idle" });
    }
  }, [open ]);

  useEffect(() => {
    if (!open) return;
    const cleaned = term.trim();
    if (cleaned.length < USER_SEARCH_MIN_TERM) {
      requestSeq.current += 1;
      setPhase({ kind: "idle" });
      return;
    }
    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    setPhase({ kind: "searching", term: cleaned });
    const timer = window.setTimeout(() => {
      void searchProfiles(cleaned, currentUserId).then((outcome) => {
        if (requestSeq.current !== seq) return;
        setPhase(
          outcome.status === "ok"
            ? { kind: "results", term: cleaned, results: outcome.results }
            : { kind: "error", term: cleaned },
        );
      });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [open, term, currentUserId, retryNonce]);

  return (
    <BloomSheet open={open} onClose={onClose} title="Find people" size="md">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="bsheet-icon absolute right-4 top-4 z-10 sm:right-5"
      >
        <BloomIcon name="close" size={16} />
      </button>
      <SheetBody className="pb-6">
        <SheetItem className="px-5 pr-14 pt-1 sm:px-6 sm:pr-16">
          <p className="mono flex items-center gap-1.5 text-[length:var(--text-micro)] uppercase tracking-[var(--tracking-caps)] text-faint-strong">
            <Search className="size-3" aria-hidden />
            People
          </p>
          <h2 className="display mt-2 text-[length:var(--text-title)] leading-tight tracking-tight">
            Find people in Bloom
          </h2>
          <p className="mt-1.5 text-[length:var(--text-support)] leading-relaxed text-muted-foreground">
            Search by name or @username. Only public profiles appear here.
          </p>
        </SheetItem>

        <SheetItem className="px-5 pt-5 sm:px-6">
          <div className="flex items-center gap-2 rounded-full border border-border bg-background/60 px-3.5 py-2 backdrop-blur focus-within:border-border-strong">
            <Search className="size-4 shrink-0 text-faint" aria-hidden />
            <input
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Name or @username"
              aria-label="Search people by name or username"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent text-[length:var(--text-callout)] text-foreground outline-none placeholder:text-faint"
            />
            {phase.kind === "searching" ? (
              <Loader2 className="size-4 shrink-0 animate-pulse text-faint" aria-hidden />
            ) : null}
          </div>
        </SheetItem>

        <SheetItem className="px-5 pt-4 sm:px-6">
          {phase.kind === "idle" ? (
            <p className="px-1 py-3 text-center text-[length:var(--text-caption)] leading-relaxed text-faint-strong">
              Type at least {USER_SEARCH_MIN_TERM} letters of a name or @username.
            </p>
          ) : phase.kind === "searching" ? (
            <p
              className="px-1 py-3 text-center text-[length:var(--text-caption)] text-faint-strong"
              role="status"
            >
              Searching for “{phase.term}”…
            </p>
          ) : phase.kind === "error" ? (
            <div className="px-1 py-3 text-center">
              <WifiOff className="mx-auto size-5 text-faint" aria-hidden />
              <p className="mt-2 text-[length:var(--text-caption)] leading-relaxed text-muted-foreground">
                Couldn&rsquo;t search just now. Your connection may be down, or Bloom may be
                catching up.
              </p>
              <button
                type="button"
                onClick={() => setRetryNonce((n) => n + 1)}
                className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-[length:var(--text-caption)] font-medium transition-colors hover:border-border-strong hover:text-foreground"
              >
                Try again
              </button>
            </div>
          ) : phase.results.length === 0 ? (
            <div className="px-1 py-3 text-center">
              <SearchX className="mx-auto size-5 text-faint" aria-hidden />
              <p className="mt-2 text-[length:var(--text-caption)] leading-relaxed text-muted-foreground">
                No one matches “{phase.term}” yet.
              </p>
            </div>
          ) : (
            <ul className="no-scrollbar -mx-1 max-h-[46dvh] divide-y divide-border-subtle overflow-y-auto px-1">
              {phase.results.map((person) => (
                <SearchResultRow
                  key={person.userId}
                  person={person}
                  onOpenProfile={onOpenProfile}
                />
              ))}
            </ul>
          )}
        </SheetItem>
      </SheetBody>
    </BloomSheet>
  );
}

function SearchResultRow({
  person,
  onOpenProfile,
}: {
  person: UserSearchResult;
  onOpenProfile: (username: string) => void;
}) {
  const inner = (
    <>
      <ProfileAvatar
        name={person.displayName}
        avatarPath={person.avatarPath}
        accent={person.accent}
        size={44}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[length:var(--text-callout)] font-medium text-foreground">
            {person.displayName}
          </span>
          <VerifiedBadge
            status={verificationStatusFromRecord(person.verified)}
            size={15}
            className="shrink-0"
          />
          <MemberBadges badges={person.badges} size="sm" />
        </span>
        {person.username ? (
          <span className="mono mt-0.5 block truncate text-[length:var(--text-caption)] text-faint">
            @{person.username}
          </span>
        ) : null}
      </span>
    </>
  );

  /* No @username, no public page — the row informs, it does not tap. */
  if (!person.username) {
    return <li className="flex items-center gap-3 py-3">{inner}</li>;
  }
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpenProfile(person.username!)}
        aria-label={`Open ${person.displayName}'s profile`}
        className={cn(
          "flex w-full items-center gap-3 py-3 text-left",
          "transition-colors hover:text-foreground",
        )}
      >
        {inner}
      </button>
    </li>
  );
}
