/**
 * @bloom/discord
 *
 * The only package permitted to import discord.js — enforced by an ESLint
 * `no-restricted-imports` rule rather than left to discipline.
 *
 * Everything here is either an adapter (translating between Discord's shapes
 * and ours), a port implementation, or process lifecycle. No business rules
 * live in this package, which is what keeps a discord.js major upgrade a local
 * change instead of a rewrite.
 */
export * from './intents.js';
export * from './client.js';
export * from './ports.js';
export * from './adapters/message.js';
export * from './adapters/command-spec.js';
export * from './adapters/interaction.js';
export * from './adapters/member.js';
export * from './services/guild-query.js';
export * from './services/role-service.js';
export * from './services/moderation-service.js';
export * from './services/channel-moderation-service.js';
export * from './services/messaging.js';
export * from './registrar.js';
export * from './runtime.js';
export * from './telemetry.js';
export * from './health.js';
export * from './scheduler-lock.js';
export * from './jobs/index.js';
export * from './bootstrap.js';
