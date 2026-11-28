import { bloomError, err, ok, type BloomError, type Result } from '@bloom/shared-types';
import {
  subjectHasAnyRoleKey,
  subjectHasRoleKey,
  type AuthorizationContext,
} from './context.js';
import type { AuthorizationPolicy } from './policies.js';
import {
  STAFF_CAPABILITIES,
  STAFF_TIERS,
  STAFF_TIER_CAPABILITIES,
  type StaffCapability,
} from './staff-capabilities.js';

/**
 * The staff authorization kernel.
 *
 * One function decides what a person may do — `resolveStaffCapabilities` — and
 * everything else is a thin wrapper over it. That shape is deliberate: when
 * somebody asks "why was this allowed?", there is exactly one place to read,
 * and it is a pure function of the `AuthorizationContext` the command framework
 * already builds from Discord's signed interaction payload.
 *
 * Deny by default, in three senses. An unrecognised member resolves to the
 * empty set. A capability absent from a tier's row is not granted, ever,
 * including to that tier's own commands. And a malformed policy call denies
 * rather than falling through.
 *
 * What this intentionally does NOT do: it does not consult Discord permission
 * bits. `requireModerator` and friends in `policies.ts` accept Manage/Moderate
 * Members as a fallback so a legitimately-privileged member is not locked out
 * by a missing role assignment, and that behaviour is untouched. Carrying the
 * fallback into the staff kernel would mean anyone the server happened to give
 * Timeout Members could award rewards, which inverts the point of the tiers.
 * Staff capability comes from a staff role, or from owning the guild.
 */

const granted: Result<void, BloomError> = ok(undefined);

/**
 * Everything this subject may do, as a set.
 *
 * Returns a fresh set each call rather than a shared constant, so a caller
 * cannot cast away `ReadonlySet` and poison the next caller's answer.
 */
export function resolveStaffCapabilities(
  context: AuthorizationContext,
): ReadonlySet<StaffCapability> {
  const capabilities = new Set<StaffCapability>();

  /*
   * The guild check comes first and applies to the owner too. `isGuildOwner`
   * describes the subject's standing in *the guild the interaction came from*;
   * if that is not the configured guild, it says nothing about authority here.
   * The command framework also applies `requireConfiguredGuild`, but this
   * kernel must be safe when called directly.
   */
  if (context.subject.guildId !== context.config.discord.guildId) return capabilities;

  if (context.subject.isGuildOwner) {
    for (const capability of STAFF_CAPABILITIES) capabilities.add(capability);
    return capabilities;
  }

  // Fast path for the overwhelmingly common case: not staff at all.
  if (!subjectHasAnyRoleKey(context, STAFF_TIERS)) return capabilities;

  // A member may hold several tiers; the grant is their union.
  for (const tier of STAFF_TIERS) {
    if (!subjectHasRoleKey(context, tier)) continue;
    for (const capability of STAFF_TIER_CAPABILITIES[tier]) capabilities.add(capability);
  }

  return capabilities;
}

export function hasStaffCapability(
  context: AuthorizationContext,
  capability: StaffCapability,
): boolean {
  return resolveStaffCapabilities(context).has(capability);
}

/**
 * Denial, written once so every staff policy fails the same way.
 *
 * `userMessage` says only that the command is staff-only: naming the missing
 * capability would tell an unauthorized caller which lever to go looking for,
 * and the member cannot act on it anyway. The specifics go to `details`, which
 * reaches the operator log, and they are capability names and the command name
 * — never role ids, never the subject's other grants, never guild config.
 */
function deny(
  context: AuthorizationContext,
  required: readonly StaffCapability[],
  missing: readonly StaffCapability[],
): Result<void, BloomError> {
  return err(
    bloomError('UNAUTHORIZED', {
      userMessage: 'This command is available to the Bloom staff team.',
      operatorHint: `Actor lacks the staff capability ${missing
        .map((capability) => `"${capability}"`)
        .join(
          ', ',
        )}. Grant it by assigning a staff role whose tier carries it; do not widen a tier to unblock one command.`,
      details: {
        required_staff_capabilities: [...required],
        missing_staff_capabilities: [...missing],
        command: context.command ?? null,
      },
    }),
  );
}

/**
 * A policy call with no capabilities is a wiring bug, not a decision.
 *
 * It denies — deny by default outranks the vacuous-truth reading of "all of
 * nothing" — but reports it as a configuration error, because telling the
 * operator "the actor is unauthorized" would send them to inspect roles when
 * the real fault is in the command definition.
 */
function denyEmptyPolicy(helper: string): Result<void, BloomError> {
  return err(
    bloomError('CONFIGURATION_ERROR', {
      operatorHint: `${helper}() was called with no capabilities, so it cannot authorize anything. Name the staff capabilities the command requires.`,
      details: { helper },
    }),
  );
}

/** Require one capability. */
export function requireStaffCapability(capability: StaffCapability): AuthorizationPolicy {
  return (context) => {
    if (hasStaffCapability(context, capability)) return granted;
    return deny(context, [capability], [capability]);
  };
}

/** Require at least one of several capabilities. */
export function requireAnyStaffCapability(
  ...capabilities: readonly StaffCapability[]
): AuthorizationPolicy {
  return (context) => {
    if (capabilities.length === 0) return denyEmptyPolicy('requireAnyStaffCapability');

    const held = resolveStaffCapabilities(context);
    if (capabilities.some((capability) => held.has(capability))) return granted;

    // None were held, so everything asked for is missing.
    return deny(context, capabilities, capabilities);
  };
}

/** Require every one of several capabilities. */
export function requireAllStaffCapabilities(
  ...capabilities: readonly StaffCapability[]
): AuthorizationPolicy {
  return (context) => {
    if (capabilities.length === 0) return denyEmptyPolicy('requireAllStaffCapabilities');

    const held = resolveStaffCapabilities(context);
    const missing = capabilities.filter((capability) => !held.has(capability));
    if (missing.length === 0) return granted;

    return deny(context, capabilities, missing);
  };
}
