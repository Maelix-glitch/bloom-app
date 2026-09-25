/**
 * @bloom/testing
 *
 * Fakes, fixtures and harnesses. Never a dependency of production code — it is
 * a devDependency everywhere it is used, and nothing under apps/ imports it.
 *
 * The fakes deliberately enforce the same rules as the real implementations
 * (hierarchy refusals, single-acknowledgement interactions, lease contention).
 * A permissive fake makes tests pass and production fail, which is worse than
 * having no test at all.
 */
export * from './clock.js';
export * from './log-capture.js';
export * from './fixtures.js';
export * from './fake-discord.js';
export * from './fake-repositories.js';
export * from './fake-interaction.js';
export * from './fake-lock.js';
