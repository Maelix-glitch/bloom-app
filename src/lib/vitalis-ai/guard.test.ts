/**
 * Phases 3–5 wiring pins. The deliberation behaviour itself is
 * tested against the pure core (core.test.ts); these pins hold the
 * EDGE FUNCTION's wiring of it — the deliberation call, the record
 * validation, the strike sites, the lock — so a future refactor of
 * index.ts cannot quietly unwire the guard. The Deno function cannot
 * run under vitest, so its source is the contract here, exactly as
 * prompt.test.ts pins the prompts.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const indexSource = readFileSync(
  fileURLToPath(new URL("../../../supabase/functions/coach/index.ts", import.meta.url)),
  "utf8",
);
const coreSource = readFileSync(
  fileURLToPath(new URL("../../../supabase/functions/coach/vitalis-core.ts", import.meta.url)),
  "utf8",
);
const orbSource = readFileSync(
  fileURLToPath(new URL("../../components/coach/CoachOrb.tsx", import.meta.url)),
  "utf8",
);

describe("the shared core stays pure", () => {
  it("vitalis-core.ts imports nothing and touches no globals", () => {
    expect(coreSource).not.toMatch(/^import\s/m);
    expect(coreSource).not.toContain("Deno.");
    expect(coreSource).not.toContain("fetch(");
  });
});

describe("edge wiring — deliberation (phase 3)", () => {
  it("vitalis chat runs the deliberation core", () => {
    expect(indexSource).toContain("runDeliberation");
    expect(indexSource).toContain("handleVitalisChat");
    expect(indexSource).toContain("VITALIS_DELIBERATION_ADDENDUM");
  });

  it("deliberation triggers on the client flag OR the server's plan-shape escalation", () => {
    expect(indexSource).toContain('body.deliberate === true');
    expect(indexSource).toContain("looksLikePlanRequest(message)");
  });

  it("flagged requests stream stage events as NDJSON", () => {
    expect(indexSource).toContain('type: "stage"');
    expect(indexSource).toContain("application/x-ndjson");
  });

  it("no preset or fake timer exists anywhere in the deliberation path", () => {
    expect(coreSource).not.toMatch(/setTimeout|setInterval|fakeStage|scriptedStage/);
  });
});

describe("edge wiring — proposals (phase 4)", () => {
  it("fast-path replies are proposal-sanitised too", () => {
    expect(indexSource).toContain("sanitizeProposals");
    expect(indexSource).toContain("parseActionBlocks");
  });

  it("the prompt teaches the fenced format and the allowlist only", () => {
    expect(indexSource).toContain("bloom-action");
    expect(indexSource).toContain("log_dish");
    expect(indexSource).toContain("compose_plan");
    expect(indexSource).toContain("swap_dish");
    expect(indexSource).toContain("propose_assessment_change");
  });
});

describe("edge wiring — strikes and the lock (phase 5)", () => {
  it("the record is schema-validated before use", () => {
    expect(indexSource).toContain("validateVitalisRecord(body.vitalisRecord)");
  });

  it("strikes come from only the structural sites — never message content", () => {
    const whys = new Set(
      [...indexSource.matchAll(/recordVitalisStrike\(\w+, \w+, "([a-z_]+)"\)/g)].map((m) => m[1]),
    );
    expect(whys).toEqual(
      new Set(["invalid_proposal", "malformed_action_result", "malformed_record"]),
    );
  });

  it("three strikes lock, and the lock is answered honestly", () => {
    expect(indexSource).toContain("VITALIS_STRIKE_LIMIT = 3");
    expect(indexSource).toContain("VITALIS_LOCKED_PARAGRAPHS");
    expect(indexSource).toContain("vitalisIsLocked(key)");
  });

  it("action results are dispatched and shape-validated", () => {
    expect(indexSource).toContain('"vitalis-action-result"');
    expect(indexSource).toContain("handleVitalisActionResult");
    expect(indexSource).toContain("VITALIS_ACTION_ALLOWLIST");
  });

  it("the caller key is a hash — the credential itself is never stored", () => {
    expect(indexSource).toContain("vitalisCallerKey");
    expect(indexSource).toContain("crypto.subtle.digest");
  });

  it("the lock touches vitalis mode only — TTS dispatch still runs first and Coach is separate", () => {
    const ttsAt = indexSource.indexOf('body.action === "tts"');
    const vitalisAt = indexSource.indexOf('body.mode === "vitalis"');
    expect(ttsAt).toBeGreaterThan(-1);
    expect(vitalisAt).toBeGreaterThan(ttsAt);
  });
});

describe("window wiring — confirm-first and the lock (phases 4–5)", () => {
  it("the window re-validates proposals before rendering cards", () => {
    expect(orbSource).toContain("sanitizeProposals(reply.actions");
  });

  it("applies go through the domain seams, on the confirm handler only", () => {
    expect(orbSource).toContain("logDish(dish, proposal.meal, nutrition.today)");
    expect(orbSource).toContain("plan.generate()");
    expect(orbSource).toContain("assessmentStateWithChange");
    expect(orbSource).toContain("reportActionResult(proposal.action, ok)");
  });

  it("the composer closes when the lock is reported", () => {
    expect(orbSource).toContain("disabled={locked}");
    expect(orbSource).toContain("lockedNotice");
  });
});
