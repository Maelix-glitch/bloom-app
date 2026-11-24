/**
 * Blocked people — the undo for Block (M-232).
 *
 * Lives in Settings → Privacy beside Your consent. Lists the people
 * this person has blocked (from their own user_blocks rows, with the
 * name snapshot taken when the block was placed) and unblocks with one
 * tap. Blocking hides both directions, so unblocking restores both —
 * the copy says so plainly. People who blocked THIS person are never
 * listed here: a block is private to the person who placed it.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  IconChevronDown,
  IconChevronRight,
  IconUser,
} from "@/components/profile/SettingsIcons";

import { useSession } from "@/hooks/useSession";
import { listMyBlocks, unblockUser, type BlockedPerson } from "@/lib/profile/safetyService";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function BlockedSection() {
  const { userId } = useSession();
  const [open, setOpen] = useState(false);
  const [blocks, setBlocks] = useState<BlockedPerson[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setBlocks([]);
      return;
    }
    setBlocks(await listMyBlocks(userId));
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!userId) return null;

  const unblock = async (person: BlockedPerson) => {
    if (busyId) return;
    setBusyId(person.userId);
    try {
      const ok = await unblockUser(userId, person.userId);
      if (ok) {
        setBlocks((current) => (current ?? []).filter((b) => b.userId !== person.userId));
        toast(`Unblocked ${person.name}. You'll see each other in Bloom again.`);
      } else {
        toast.error("That unblock couldn't be saved. Please try again in a moment.");
      }
    } finally {
      setBusyId(null);
    }
  };

  const count = blocks?.length ?? 0;

  return (
    <>
      <button
        type="button"
        className="pf-row"
        data-testid="pf-row-blocked"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="pf-row-icon" aria-hidden>
          <IconUser />
        </span>
        <span className="pf-row-text">
          <span className="pf-row-label">Blocked people</span>
          <span className="pf-row-hint">
            People you&rsquo;ve blocked can&rsquo;t see your stories or profile — and you
            can&rsquo;t see theirs
          </span>
        </span>
        <span className="pf-row-value">{blocks === null ? "…" : `${count}`}</span>
        {open ? (
          <IconChevronDown className="pf-row-chevron" />
        ) : (
          <IconChevronRight className="pf-row-chevron" />
        )}
      </button>
      {open ? (
        <div className="pf-confirm" data-testid="pf-blocked-detail">
          {blocks === null ? (
            <p className="text-[length:var(--text-caption)] leading-relaxed text-muted-foreground">
              Loading…
            </p>
          ) : blocks.length === 0 ? (
            <p className="text-[length:var(--text-caption)] leading-relaxed text-muted-foreground">
              You haven&rsquo;t blocked anyone. You can block a person from their profile, or from
              the menu on any of their stories.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {blocks.map((person) => (
                <li key={person.userId} className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-[length:var(--text-caption)] font-medium leading-snug text-foreground">
                      {person.name}
                    </span>
                    <span className="block text-[length:var(--text-caption)] leading-snug text-muted-foreground">
                      Blocked on {formatDate(person.blockedAt)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void unblock(person)}
                    disabled={busyId !== null}
                    className="shrink-0 rounded-full border border-border px-3 py-1.5 text-[length:var(--text-caption)] font-medium text-foreground transition-colors hover:border-gold disabled:opacity-50"
                  >
                    {busyId === person.userId ? "Unblocking…" : "Unblock"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </>
  );
}
