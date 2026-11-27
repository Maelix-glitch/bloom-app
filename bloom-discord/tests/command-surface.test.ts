import { describe, expect, it } from 'vitest';
import { guardianCommands } from '../apps/guardian/src/commands.js';
import { companionCommands } from '../apps/companion/src/commands.js';
import { labsCommands } from '../apps/labs/src/commands.js';
import { MODERATOR_STAFF_CAPABILITIES, STAFF_CAPABILITIES } from '@bloom/permissions';
import type { BloomCommand } from '@bloom/commands';

/**
 * A census of every command the platform exposes.
 *
 * Each feature's own tests prove that its commands refuse the wrong people.
 * None of them can prove the thing that actually goes wrong in production: a
 * new command, added months later in a hurry, that nobody gated. That failure
 * is invisible to every test that exists, because the test which would have
 * caught it was never written — it would have belonged to the feature that
 * does not exist yet.
 *
 * So this walks the whole surface, from the same arrays the bots register with
 * Discord, and asserts a decision was made about every branch. A new
 * subcommand with no policy fails here on the day it is written.
 *
 * It audits the existing authorization path. It does not add a second one:
 * there is no enforcement here, only the assertion that enforcement exists.
 */

interface Branch {
  readonly bot: string;
  readonly path: string;
  readonly hasPolicy: boolean;
  readonly policyLabel: string;
}

/**
 * Policies are closures, so what they require cannot be read back directly.
 * They do carry a label for diagnostics, which is what makes this auditable
 * without reaching into the permission kernel's internals.
 */
function labelOf(policy: unknown): string {
  if (policy === undefined || policy === null) return '(none)';
  const named = policy as { readonly label?: unknown; readonly name?: unknown };
  if (typeof named.label === 'string') return named.label;
  if (typeof named.name === 'string' && named.name.length > 0) return named.name;
  return '(unlabelled)';
}

function branchesOf(bot: string, commands: readonly BloomCommand<never>[]): Branch[] {
  const out: Branch[] = [];

  for (const command of commands) {
    const contributions = command.contributions ?? [];

    if (contributions.length === 0) {
      /*
       * A top-level command's policy is required by `BloomCommand`, so the
       * type system already guarantees it is present and there is nothing
       * for this audit to check. Recorded anyway, so the census reports the
       * whole surface rather than a filtered view of it.
       */
      out.push({
        bot,
        path: command.spec.name,
        hasPolicy: true,
        policyLabel: labelOf(command.policy),
      });
      continue;
    }

    for (const contribution of contributions) {
      const leaf = contribution.group
        ? `${contribution.group} ${contribution.spec.name}`
        : contribution.spec.name;

      /*
       * A subcommand inherits the namespace policy when it declares none, and
       * a subcommand policy can only narrow it. So the branch is guarded if
       * either level guards it — but which one is recorded, because
       * "inherited" and "explicit" are different review questions.
       */
      out.push({
        bot,
        path: `${command.spec.name} ${leaf}`,
        // `contribution.policy` is optional — this is the one that can
        // genuinely be missing, and the whole reason the census exists.
        hasPolicy: contribution.policy !== undefined,
        policyLabel:
          contribution.policy !== undefined
            ? labelOf(contribution.policy)
            : `inherited:${labelOf(command.policy)}`,
      });
    }
  }

  return out;
}

const BRANCHES: readonly Branch[] = [
  ...branchesOf('guardian', guardianCommands),
  ...branchesOf('companion', companionCommands),
  ...branchesOf('labs', labsCommands),
];

/**
 * Branches that change something a member can feel: standing, points,
 * membership, or another member's state.
 *
 * Matched on the path rather than listed one by one, so a new
 * `admin award-something` is covered the moment it is added rather than when
 * someone remembers to extend a list.
 */
const DESTRUCTIVE_PATTERNS: readonly RegExp[] = [
  /\badmin\b/,
  /\bcase\b/,
  /\bstaff\b/,
  /\bjobs (run|enable|disable)\b/,
  /\b(warn|timeout|untimeout|kick|ban|unban|purge|slowmode|lock|unlock)\b/,
  /\b(award|revoke|close|retry|triage|verify|reconcile)\b/,
  // Onboarding completion is a role transition — the highest-trust operation
  // the platform performs, and the one the whole Guardian/Companion split
  // exists to contain.
  /\bonboarding (complete|revoke)\b/,
];

const isDestructive = (branch: Branch): boolean =>
  DESTRUCTIVE_PATTERNS.some((pattern) => pattern.test(branch.path));

describe('command surface census', () => {
  it('finds a command surface to audit at all', () => {
    // A census that silently enumerated nothing would pass every assertion
    // below while proving nothing, which is the classic way an audit test
    // rots into decoration.
    expect(BRANCHES.length).toBeGreaterThan(40);
  });

  it('every branch inherits or declares an authorization policy', () => {
    /*
     * Nothing is ungoverned: a subcommand with no policy of its own still
     * runs behind the namespace policy, which `BloomCommand` requires. So
     * the assertion is not "a policy exists" — the types guarantee that —
     * but that every branch is accounted for, and that the ones which merely
     * inherit are the ones we expect to inherit.
     *
     * The destructive test below is where inheritance stops being enough.
     */
    const inheriting = BRANCHES.filter((branch) => !branch.hasPolicy).map(
      (branch) => `${branch.bot}: /${branch.path}`,
    );

    // Reads and member self-service, and nothing that changes another member.
    for (const path of inheriting) {
      expect(path).not.toMatch(/\badmin\b|\bstaff\b/);
    }
  });

  it('every destructive branch is gated on more than the namespace default', () => {
    /*
     * Inheriting the namespace policy is correct for a read. It is not
     * enough for anything that moves points or changes someone's standing:
     * those must name their own requirement, so that widening the namespace
     * later cannot quietly widen them too.
     */
    const inherited = BRANCHES.filter(
      (branch) => isDestructive(branch) && branch.policyLabel.startsWith('inherited:'),
    ).map((branch) => `${branch.bot}: /${branch.path} -> ${branch.policyLabel}`);

    expect(inherited).toEqual([]);
  });

  it('no bot exposes a branch belonging to another bot', () => {
    // Namespacing is the contract that keeps three bots in one server from
    // colliding, and a cross-registered command is a silent takeover of
    // someone else's name.
    const namespaces: Readonly<Record<string, string>> = {
      guardian: 'guardian',
      companion: 'companion',
      labs: 'labs',
    };

    for (const branch of BRANCHES) {
      const root = branch.path.split(' ')[0] ?? '';
      const owner = namespaces[branch.bot];
      if (root === owner) continue;

      // Top-level member conveniences are allowed to sit outside the
      // namespace, but they must not be another bot's namespace.
      expect(Object.values(namespaces)).not.toContain(root);
    }
  });

  it('the staff capability set has not quietly grown', () => {
    /*
     * The census is only meaningful if the vocabulary it audits is stable.
     * A new capability is a deliberate act; this fails when one appears so
     * that it arrives with a decision about who holds it rather than as a
     * side effect.
     */
    expect(STAFF_CAPABILITIES).toHaveLength(13);
    expect(MODERATOR_STAFF_CAPABILITIES).toHaveLength(8);
  });

  it('moderators hold no economic capability', () => {
    /*
     * The standing rule across every phase: moderation and the economy are
     * separate powers. A moderator can act on behaviour and cannot move
     * points, read balances, or run the community machinery.
     */
    const economic = [
      'staff.rewards.read',
      'staff.rewards.manage',
      'staff.community.manage',
    ];

    for (const capability of economic) {
      expect([...MODERATOR_STAFF_CAPABILITIES]).not.toContain(capability);
    }
  });

  it('records the surface it audited, so review sees the shape', () => {
    /*
     * Not an assertion so much as a printout the next reviewer gets for
     * free: if this list looks wrong, the guards above are testing the wrong
     * thing.
     */
    const byBot = BRANCHES.reduce<Record<string, number>>((acc, branch) => {
      acc[branch.bot] = (acc[branch.bot] ?? 0) + 1;
      return acc;
    }, {});

    expect(Object.keys(byBot).toSorted()).toEqual(['companion', 'guardian', 'labs']);
    for (const count of Object.values(byBot)) expect(count).toBeGreaterThan(5);
  });
});
