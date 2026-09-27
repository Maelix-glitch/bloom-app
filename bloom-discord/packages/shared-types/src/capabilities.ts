import type { BotName } from './bots.js';

/**
 * What each bot is *allowed to do*, independent of what Discord happens to have
 * granted it.
 *
 * The brief is unambiguous: only Guardian may touch roles, and only Guardian
 * may moderate. Relying on the invite URL alone to enforce that is one
 * mis-click away from being wrong, and a bot with a too-generous permission
 * integer would silently start working.
 *
 * So capability is asserted in code as well. Services that perform privileged
 * operations refuse to construct unless the owning bot declares the capability,
 * and the failure is `CAPABILITY_DENIED` at severity `fatal` — a wiring bug to
 * fix, never a manifest to widen.
 */
export const CAPABILITIES = [
  /** Add or remove guild roles. Guardian only. */
  'role:write',
  /** Read a member's roles for authorization and cohort queries. */
  'role:read',
  /** Timeout, kick, ban. Guardian only. */
  'moderation:execute',
  /** Write moderation cases, warnings and reports. Guardian only. */
  'moderation:record',
  /** Read and write private staff channels. Guardian only. */
  'staff:channels',
  /** Delete other members' messages (`/purge`). Guardian only. */
  'message:manage',
  /** Post messages in public community channels. */
  'message:send',
  /** Grant Bloom Points and reward state. Companion only. */
  'rewards:grant',
  /** Create and manage guild scheduled events. Companion only. */
  'events:manage',
  /** Manage beta cohorts, experiments and feature status. Labs only. */
  'beta:manage',
  /** Write the append-only audit trail. Every bot does this. */
  'audit:write',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

/**
 * The authoritative capability manifest.
 *
 * Read this table as the security model. If a future feature needs a capability
 * a bot does not have, that is a deliberate decision with a permission and
 * documentation change attached — not a one-line edit here.
 */
export const BOT_CAPABILITIES: Readonly<Record<BotName, readonly Capability[]>> = {
  guardian: [
    'role:write',
    'role:read',
    'moderation:execute',
    'moderation:record',
    'staff:channels',
    'message:manage',
    'message:send',
    'audit:write',
  ],
  companion: [
    'role:read',
    'message:send',
    'rewards:grant',
    'events:manage',
    'audit:write',
  ],
  labs: ['role:read', 'message:send', 'beta:manage', 'audit:write'],
};

export function hasCapability(bot: BotName, capability: Capability): boolean {
  return BOT_CAPABILITIES[bot].includes(capability);
}
