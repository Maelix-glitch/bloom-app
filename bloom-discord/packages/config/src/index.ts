/**
 * @bloom/config
 *
 * Typed configuration, validated once at boot. Nothing in this platform reads
 * `process.env` directly — everything reads a `PlatformConfig`, which means a
 * missing value is a startup failure with a named key rather than an
 * `undefined` discovered at 3am inside an interaction handler.
 */
export * from './types.js';
export * from './requirements.js';
export * from './load.js';
export * from './accessors.js';
export * from './summary.js';
export * from './env-file.js';
