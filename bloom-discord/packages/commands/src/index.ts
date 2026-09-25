/**
 * @bloom/commands
 *
 * The command contract: what a command declares, how it is routed, how it is
 * authorized, and the single error boundary every one of them passes through.
 *
 * Phase 0 ships the contract. The commands themselves arrive with the phase
 * that owns them — Guardian in Phase 1–2, Companion in 3–6, Labs in 7, which
 * also adds the component and modal routing the contract had reserved room for.
 */
export * from './spec.js';
export * from './invocation.js';
export * from './command.js';
export * from './namespace-command.js';
export * from './dispatcher.js';
export * from './custom-id.js';
export * from './interaction-dispatcher.js';
export * from './namespace.js';
