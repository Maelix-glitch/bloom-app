/**
 * @bloom/commands
 *
 * The command contract: what a command declares, how it is routed, how it is
 * authorized, and the single error boundary every one of them passes through.
 *
 * Phase 0 ships the contract. The commands themselves arrive with the phase
 * that owns them — Guardian in Phase 1–2, Companion in 3–4, Labs in 5.
 */
export * from './spec.js';
export * from './invocation.js';
export * from './command.js';
export * from './dispatcher.js';
export * from './namespace.js';
