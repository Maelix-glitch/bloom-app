/**
 * The Bloom Labs role vocabulary.
 *
 * Roles are referenced by *key* in code and by *id* at runtime. The display
 * names below exist only for operator-facing messages; nothing resolves a role
 * by name, because role names are editable by anyone with Manage Roles and
 * matching on one is how a bot grants the wrong role to the wrong person.
 */
export const ROLE_KEYS = [
  'founder',
  'administrator',
  'moderator',
  'bloomBot',
  'betaTester',
  'earlyBloom',
  'bloomMember',
] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_DISPLAY_NAMES: Readonly<Record<RoleKey, string>> = {
  founder: '✦ Founder',
  administrator: '◈ Administrator',
  moderator: '⟡ Moderator',
  bloomBot: '◉ Bloom Bot',
  betaTester: '◌ Beta Tester',
  earlyBloom: '✧ Early Bloom',
  bloomMember: '❋ Bloom Member',
};

/** Environment variable that carries each role's id. */
export const ROLE_ENV_KEYS: Readonly<Record<RoleKey, string>> = {
  founder: 'ROLE_FOUNDER',
  administrator: 'ROLE_ADMINISTRATOR',
  moderator: 'ROLE_MODERATOR',
  bloomBot: 'ROLE_BLOOM_BOT',
  betaTester: 'ROLE_BETA_TESTER',
  earlyBloom: 'ROLE_EARLY_BLOOM',
  bloomMember: 'ROLE_BLOOM_MEMBER',
};

/**
 * Expected top-to-bottom order in the Discord role list.
 *
 * This is documentation and a preflight warning, not an enforcement mechanism —
 * the real check reads live role positions from Discord before every write,
 * because someone can reorder roles at any moment.
 */
export const EXPECTED_ROLE_ORDER: readonly RoleKey[] = [
  'founder',
  'administrator',
  'moderator',
  'bloomBot',
  'betaTester',
  'earlyBloom',
  'bloomMember',
];

/**
 * Roles that may never be added, removed, or targeted by a moderation action,
 * regardless of who asks.
 */
export const PROTECTED_ROLE_KEYS: readonly RoleKey[] = [
  'founder',
  'administrator',
  'moderator',
];

/**
 * The only roles Guardian is permitted to write.
 *
 * Deliberately excludes `betaTester`: beta access is a Labs concern and granting
 * it is a product decision, so it is handled explicitly rather than falling out
 * of the onboarding machinery. It also excludes every staff role.
 */
export const GUARDIAN_MANAGED_ROLE_KEYS: readonly RoleKey[] = [
  'earlyBloom',
  'bloomMember',
];

/** Staff, in the sense of "may run moderation commands". */
export const STAFF_ROLE_KEYS: readonly RoleKey[] = [
  'founder',
  'administrator',
  'moderator',
];

export function isRoleKey(value: unknown): value is RoleKey {
  return typeof value === 'string' && (ROLE_KEYS as readonly string[]).includes(value);
}

export function isProtectedRole(key: RoleKey): boolean {
  return PROTECTED_ROLE_KEYS.includes(key);
}

export function isGuardianManagedRole(key: RoleKey): boolean {
  return GUARDIAN_MANAGED_ROLE_KEYS.includes(key);
}
