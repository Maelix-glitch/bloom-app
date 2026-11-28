/**
 * Plan-outcome canonical form + hash — the Phase B parity yardstick.
 *
 * Two engines agree when their canonical hashes match. The canonical
 * form is the whole plan outcome with the two stamps removed (`id`
 * and `generatedAt` — the only fields that legitimately differ
 * between two runs of the same deterministic computation), object
 * keys sorted, and every number rounded to 4 decimal places so a
 * serialization wobble can never fake a disagreement.
 *
 * This file exists in two places that MUST stay identical:
 *   - the app repo: src/lib/nutrition/engineCanonical.ts
 *   - the private engine tree: functions/engine/canonical.ts
 * If you change one, change the other, or parity results are void.
 */

function roundNumber(n: number): number {
  if (!Number.isFinite(n)) return n;
  const r = Math.round(n * 10000) / 10000;
  return r === 0 ? 0 : r; // normalize -0
}

function canonicalValue(value: unknown): unknown {
  if (typeof value === "number") return roundNumber(value);
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v === undefined) continue;
      out[key] = canonicalValue(v);
    }
    return out;
  }
  return value;
}

/**
 * The comparable form of a PlanOutcome: everything except the plan's
 * `id` and `generatedAt` stamps.
 */
export function canonicalOutcome(outcome: unknown): unknown {
  if (outcome === null || typeof outcome !== "object") return outcome;
  const o = outcome as Record<string, unknown>;
  if (o.ok === true && o.plan !== null && typeof o.plan === "object") {
    const plan = { ...(o.plan as Record<string, unknown>) };
    delete plan.id;
    delete plan.generatedAt;
    return canonicalValue({ ok: true, plan });
  }
  return canonicalValue(outcome);
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** The one-call hash both sides compute over a PlanOutcome. */
export async function planOutcomeHash(outcome: unknown): Promise<string> {
  return sha256Hex(stableStringify(canonicalOutcome(outcome)));
}
