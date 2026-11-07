/**
 * ConfirmSheet — deprecated shim (UI update U2, plan §2.4).
 *
 * The confirm pattern now lives in bloom-sheet.tsx as `BloomConfirm`,
 * BloomSheet's confirm variant. This file re-exports it under the old name
 * so existing call sites keep working untouched; new code should import
 * `BloomConfirm` from "./bloom-sheet". U6 removes this shim when the last
 * call site migrates.
 */

export { BloomConfirm, BloomConfirm as ConfirmSheet } from "./bloom-sheet";
