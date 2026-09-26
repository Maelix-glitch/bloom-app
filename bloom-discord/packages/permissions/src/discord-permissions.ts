/**
 * Discord permission bits.
 *
 * Declared here rather than imported from discord.js, because this package must
 * stay free of the library — authorization is the last thing that should need a
 * gateway connection to unit-test.
 *
 * Values are from the current Discord API permission table. They are part of
 * the wire protocol and do not change; new permissions are only ever appended.
 */
export const DiscordPermission = {
  CreateInstantInvite: 1n << 0n,
  KickMembers: 1n << 1n,
  BanMembers: 1n << 2n,
  Administrator: 1n << 3n,
  ManageChannels: 1n << 4n,
  ManageGuild: 1n << 5n,
  AddReactions: 1n << 6n,
  ViewAuditLog: 1n << 7n,
  ViewChannel: 1n << 10n,
  SendMessages: 1n << 11n,
  ManageMessages: 1n << 13n,
  EmbedLinks: 1n << 14n,
  AttachFiles: 1n << 15n,
  ReadMessageHistory: 1n << 16n,
  MentionEveryone: 1n << 17n,
  UseExternalEmojis: 1n << 18n,
  ManageNicknames: 1n << 27n,
  ManageRoles: 1n << 28n,
  ManageWebhooks: 1n << 29n,
  UseApplicationCommands: 1n << 31n,
  ManageEvents: 1n << 33n,
  ManageThreads: 1n << 34n,
  CreatePublicThreads: 1n << 35n,
  CreatePrivateThreads: 1n << 36n,
  SendMessagesInThreads: 1n << 38n,
  /** Timeout. This is the current name for what used to be called "timeout members". */
  ModerateMembers: 1n << 40n,
} as const;

export type DiscordPermissionName = keyof typeof DiscordPermission;

/**
 * Whether a permission bitfield grants a permission.
 *
 * Administrator implies everything. That is Discord's rule, and reproducing it
 * here matters: a founder with Administrator but no explicit Kick Members must
 * still pass a kick check, or staff tooling appears broken for the one person
 * who can fix it.
 */
export function hasPermission(permissions: bigint, required: bigint): boolean {
  if (
    (permissions & DiscordPermission.Administrator) ===
    DiscordPermission.Administrator
  ) {
    return true;
  }
  return (permissions & required) === required;
}

/** Every required bit, for error messages that say what is actually missing. */
export function missingPermissions(
  permissions: bigint,
  required: readonly DiscordPermissionName[],
): readonly DiscordPermissionName[] {
  if (
    (permissions & DiscordPermission.Administrator) ===
    DiscordPermission.Administrator
  ) {
    return [];
  }
  return required.filter((name) => (permissions & DiscordPermission[name]) === 0n);
}

/** Human-readable name as it appears in the Discord UI. */
export const PERMISSION_DISPLAY_NAMES: Readonly<Record<DiscordPermissionName, string>> = {
  CreateInstantInvite: 'Create Invite',
  KickMembers: 'Kick Members',
  BanMembers: 'Ban Members',
  Administrator: 'Administrator',
  ManageChannels: 'Manage Channels',
  ManageGuild: 'Manage Server',
  AddReactions: 'Add Reactions',
  ViewAuditLog: 'View Audit Log',
  ViewChannel: 'View Channel',
  SendMessages: 'Send Messages',
  ManageMessages: 'Manage Messages',
  EmbedLinks: 'Embed Links',
  AttachFiles: 'Attach Files',
  ReadMessageHistory: 'Read Message History',
  MentionEveryone: 'Mention @everyone',
  UseExternalEmojis: 'Use External Emoji',
  ManageNicknames: 'Manage Nicknames',
  ManageRoles: 'Manage Roles',
  ManageWebhooks: 'Manage Webhooks',
  UseApplicationCommands: 'Use Application Commands',
  ManageEvents: 'Manage Events',
  ManageThreads: 'Manage Threads',
  CreatePublicThreads: 'Create Public Threads',
  CreatePrivateThreads: 'Create Private Threads',
  SendMessagesInThreads: 'Send Messages in Threads',
  ModerateMembers: 'Timeout Members',
};

/** Combine permission names into a single bitfield. */
export function permissionBits(...names: readonly DiscordPermissionName[]): bigint {
  return names.reduce((accumulator, name) => accumulator | DiscordPermission[name], 0n);
}
