import { ACTIVE_CASE_STATUSES } from '@bloom/database';
import type { CaseRow, MemberRecord, MemberRecordSummary } from '@bloom/database';
import type { ModerationActionRow } from '@bloom/database';
import type { GuildId, RoleKey, UserId } from '@bloom/shared-types';
import { ROLE_DISPLAY_NAMES, ROLE_KEYS } from '@bloom/shared-types';
import type { MemberSnapshot } from '@bloom/discord';
import type { GuardianDeps } from '../../deps.js';

/**
 * Everything Guardian knows about one member, assembled for a staff reader.
 *
 * A read model, not a service: it owns no rules, performs no writes and makes
 * no decisions. It exists so the command handler stays a handler — gather,
 * render, return — and so the *shape* of what staff may see is written down in
 * one typed place rather than implied by whichever fields a template happened
 * to interpolate.
 *
 * Everything here comes from repositories Guardian already holds. Nothing
 * reaches into Companion or Labs; see {@link StaffMemberProfile.progression}
 * for how reward data is meant to arrive later.
 */

export interface StaffMemberProfile {
  readonly userId: UserId;
  /** Live from Discord. Null when the member has left the guild. */
  readonly snapshot: MemberSnapshot | null;
  /** Guardian's own membership row. Null if Guardian has never seen them. */
  readonly record: MemberRecord | null;
  /** Configured Bloom roles the member currently holds, in hierarchy order. */
  readonly roleKeys: readonly RoleKey[];
  readonly moderation: MemberRecordSummary;
  readonly recentActions: readonly ModerationActionRow[];
  readonly cases: {
    readonly total: number;
    readonly open: number;
    /** True when the count hit the query cap and is a floor, not an exact total. */
    readonly truncated: boolean;
  };
  /** Open reports naming this member as the subject. Counts only, never text. */
  readonly openReportsAgainst: number;

  /**
   * Reward and progression data, when a read model for it exists.
   *
   * Deliberately `null` today and deliberately typed as an optional block
   * rather than omitted. Points, ranks and achievements belong to Companion,
   * and the correct way to surface them here is a narrow, read-only contract
   * that Companion publishes — not giving Guardian the rewards repository.
   * Widening `GuardianRepositories` would undo the isolation that makes "only
   * Companion writes the economy" checkable by the compiler.
   *
   * The extension point is this field plus a `progression?: ProgressionReader`
   * dependency: fill both in and the profile renders it, with no other change.
   */
  readonly progression: null;
}

/** A member's configured Bloom roles, in the platform's hierarchy order. */
export function configuredRoleKeys(
  deps: Pick<GuardianDeps, 'config'>,
  roleIds: readonly string[],
): readonly RoleKey[] {
  const held = new Set(roleIds);
  return ROLE_KEYS.filter((key) => {
    const roleId = deps.config.roles[key];
    return roleId !== null && held.has(roleId);
  });
}

export function roleLabels(keys: readonly RoleKey[]): string {
  if (keys.length === 0) return '_None of the configured Bloom roles._';
  return keys.map((key) => ROLE_DISPLAY_NAMES[key]).join(' · ');
}

const CASE_SCAN_LIMIT = 100;
const REPORT_SCAN_LIMIT = 100;

/**
 * Gather the profile.
 *
 * Reads run concurrently because they are independent and a staff command
 * still has Discord's three-second budget to meet; the Discord member fetch is
 * allowed to fail soft, because a member who has left the guild is exactly the
 * person staff most often need to look up.
 */
export async function loadStaffMemberProfile(
  deps: Pick<GuardianDeps, 'config' | 'guilds' | 'repositories'>,
  guildId: GuildId,
  userId: UserId,
): Promise<StaffMemberProfile> {
  const [snapshot, record, moderation, recentActions, cases, reports] = await Promise.all(
    [
      deps.guilds.getMember(guildId, userId),
      deps.repositories.identity.findMember(guildId, userId),
      deps.repositories.moderation.summarise(guildId, userId),
      deps.repositories.moderation.listForSubject(guildId, userId, { limit: 5 }),
      deps.repositories.cases.list(guildId, {
        subjectId: userId,
        limit: CASE_SCAN_LIMIT,
      }),
      deps.repositories.cases.listReports(guildId, { limit: REPORT_SCAN_LIMIT }),
    ],
  );

  const open = cases.filter((row: CaseRow) => ACTIVE_CASE_STATUSES.includes(row.status));

  return {
    userId,
    snapshot,
    record,
    roleKeys: configuredRoleKeys(deps, snapshot?.roleIds ?? []),
    moderation,
    recentActions,
    cases: {
      total: cases.length,
      open: open.length,
      truncated: cases.length >= CASE_SCAN_LIMIT,
    },
    openReportsAgainst: reports.filter((report) => report.targetUserId === userId).length,
    progression: null,
  };
}
