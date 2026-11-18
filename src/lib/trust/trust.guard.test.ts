import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";

import { describe, expect, it } from "vitest";

import { PREFS_KEY } from "@/lib/prefs";
import { buildExport } from "@/lib/data/exportAll";
import { eraseDevice } from "@/lib/data/erase";
import { DISH_PHOTO_CREDITS } from "@/lib/nutrition/dishImages";
import { FOOD_PHOTO_CREDITS } from "@/lib/nutrition/foodImages";

import { TRUST_CLAIMS, TRUST_CLAIM_IDS } from "./claims";

/**
 * Trust & Verification (SYSTEM 10) — the claims Bloom makes in
 * Profile → Privacy → "Trust & security", proven against the code.
 *
 * Every line in the claims registry (`claims.ts`) is pinned here against
 * the thing that makes it true: the migration's grants, the coach
 * function's gate order, a scan of the shipped client source, the prefs
 * export/erase paths, the photo manifest. If a protection is removed,
 * the matching test fails and the claim must be removed with it — the
 * registry/UI sync check at the bottom is what forces that conversation.
 *
 * These are structural tests in the house style (see
 * supabase.guard.test.ts): they read the source, because the failures
 * they guard against — a secret pasted into client code, a grant widened
 * in a migration, a gate moved below a provider call — are exactly the
 * ones a runtime test cannot see.
 */

const SRC = join(process.cwd(), "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name.startsWith("_backup") || name === "node_modules") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

const FILES = walk(SRC).map((path) => ({
  path,
  rel: path.slice(SRC.length + 1).split(sep).join("/"),
  text: readFileSync(path, "utf8"),
}));

const fileText = (rel: string): string => {
  const f = FILES.find((x) => x.rel === rel);
  expect(f, `${rel} not found`).toBeDefined();
  return f!.text;
};

const BILLING_SQL = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261118_billing_foundation.sql"),
  "utf8",
);
const BILLING_LOWER = BILLING_SQL.toLowerCase();

/* ------------------------------------------------------------------ */
/* Claim: no-keys-in-app                                               */
/* ------------------------------------------------------------------ */

describe("no AI or payment secrets in the client source", () => {
  /*
   * The only env values the shipped app may read are its public config.
   * A provider key read here would be bundled and shipped to every
   * browser — this is the exact list, so adding a read forces a
   * conscious decision about whether the new value is public.
   */
  const PUBLIC_ENV_KEYS = [
    "DEV",
    "PROD",
    "VITE_COACH_FUNCTION",
    "VITE_SUPABASE_ANON_KEY",
    "VITE_SUPABASE_URL",
    "VITE_VAPID_PUBLIC_KEY",
  ];

  it("reads only the known public env keys", () => {
    const read = new Set<string>();
    for (const f of FILES) {
      for (const m of f.text.matchAll(/import\.meta\.env\[["']([A-Z_]+)["']\]/g)) read.add(m[1]!);
      for (const m of f.text.matchAll(/import\.meta\.env\.([A-Z_]+)/g)) read.add(m[1]!);
    }
    expect([...read].sort()).toEqual(PUBLIC_ENV_KEYS);
  });

  it("contains no key-shaped strings", () => {
    const SHAPES: readonly [string, RegExp][] = [
      ["OpenAI-style key", /\bsk-[A-Za-z0-9_-]{16,}/],
      ["Stripe/Razorpay-style live or test key", /\b(sk|rk)_(live|test)_[A-Za-z0-9]{8,}/],
      ["webhook secret", /\bwhsec_[A-Za-z0-9]{8,}/],
      ["AWS access key id", /\bAKIA[A-Z0-9]{16}/],
      ["Google API key", /\bAIza[A-Za-z0-9_-]{20,}/],
      ["JWT literal (a hardcoded session/anon token)", /\beyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{10,}/],
      ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{20,}/],
    ];
    const offenders: string[] = [];
    for (const f of FILES) {
      for (const [name, shape] of SHAPES) {
        if (shape.test(f.text)) offenders.push(`${f.rel}: ${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("never reads server env or assigns a provider secret", () => {
    /* Deno.env is the edge functions' env — client code has no business
       naming it. A provider secret NAME with a literal value assigned is
       a leaked key whatever shape it takes. */
    const offenders = FILES.filter(
      (f) =>
        f.text.includes("Deno.env") ||
        /(GEMINI|GROQ|APINEX|TEAMOROUTER|ELEVENLABS|RAZORPAY|STRIPE|HF)_[A-Z_]*(API_KEY|KEY|TOKEN|SECRET)\s*=\s*["']/.test(
          f.text,
        ),
    );
    expect(offenders.map((f) => f.rel)).toEqual([]);
  });

  /*
   * process.env belongs to Node tooling, not the shipped client. The one
   * allowance is the vitalis DB integration-test harness, which reads a
   * local test-database connection and is only ever loaded by the
   * *.integration.test.ts files the default suite excludes — it is never
   * bundled. Named and pinned, in the supabase.guard style.
   */
  const PROCESS_ENV_ALLOWANCE = ["lib/vitalis/db/harness.ts"];

  it("uses process.env only in the named test harness", () => {
    const offenders = FILES.filter(
      (f) => f.text.includes("process.env") && !PROCESS_ENV_ALLOWANCE.includes(f.rel),
    );
    expect(offenders.map((f) => f.rel)).toEqual([]);
    for (const rel of PROCESS_ENV_ALLOWANCE) {
      const f = FILES.find((x) => x.rel === rel);
      expect(f, `${rel} is listed but missing — update the allowance`).toBeDefined();
      expect(f!.text, rel).toContain("process.env");
    }
    const dbConfig = readFileSync(resolve(process.cwd(), "vitest.db.config.ts"), "utf8");
    expect(dbConfig).toContain("harness");
  });
});

/* ------------------------------------------------------------------ */
/* Claim: export-and-erase (every health prefs key)                    */
/* ------------------------------------------------------------------ */

describe("every health prefs key is covered by export and erasure", () => {
  /*
   * There is NO central registry of prefs keys in this codebase — the
   * keys are scattered across their owning modules. So this test pins
   * the full list it can find by scanning, and a new health key fails
   * here until it is added consciously. Coverage itself is structural:
   * every key lives inside the one prefs document, export carries that
   * document verbatim, and erasure removes the whole document (device)
   * and the whole user_prefs row set (account).
   */
  const HEALTH_PREFS_KEYS = [
    "health.assessment.v1",
    "health.assessmentDelta.v1",
    "health.assessmentHistory.v1",
    "health.assessmentPrompt.v1",
    "health.body.v1",
    "health.coachlog.v1",
    "health.foodlog.v1",
    "health.foods.v1",
    "health.household.v1",
    "health.labs.v1",
    "health.modes.v1",
    "health.nudges.v1",
    "health.pantry.v1",
    "health.plan.v1",
    "health.planlog.v1",
    "health.programmes.v1",
    "health.targetAdjustment.v1",
    "health.trainer.v1",
    "health.weighins.v1",
  ];

  it("the scanned health keys are exactly the pinned list", () => {
    const found = new Set<string>();
    for (const f of FILES) {
      for (const m of f.text.matchAll(/"(health\.[a-zA-Z]+\.v\d+)"/g)) found.add(m[1]!);
    }
    expect([...found].sort()).toEqual(HEALTH_PREFS_KEYS);
  });

  it("all of them live inside the single prefs document", () => {
    /* The document is one localStorage key under the bloom.* prefix —
       that is what makes whole-document export/erasure cover every key. */
    expect(PREFS_KEY).toBe("bloom.prefs.v1");
    expect(PREFS_KEY.startsWith("bloom.")).toBe(true);
  });

  it("export carries the prefs document verbatim", () => {
    expect(fileText("lib/data/exportAll.ts")).toContain("prefs: input.prefs ?? null");
    const hook = fileText("hooks/useExportBundle.ts");
    expect(hook).toContain("buildExport({");
    expect(hook).toContain("loadDoc()");

    const doc = Object.fromEntries(
      HEALTH_PREFS_KEYS.map((k) => [k, { value: { marker: k }, updatedAt: "2026-11-18T00:00:00.000Z" }]),
    );
    const bundle = buildExport({ exportedAt: "2026-11-18T00:00:00.000Z", prefs: doc });
    const carried = bundle.prefs as Record<string, { value: { marker: string } }>;
    for (const k of HEALTH_PREFS_KEYS) {
      expect(carried[k]?.value.marker, k).toBe(k);
    }
  });

  it("device erasure removes the whole prefs document", () => {
    const eraseSrc = fileText("lib/data/erase.ts");
    expect(eraseSrc).toContain('key.startsWith("bloom.")');

    const store = new Map<string, string>([
      [PREFS_KEY, "{}"],
      ["bloom.habits", "[]"],
      ["someone.elses.key", "keep me"],
    ]);
    const stub = {
      get length() {
        return store.size;
      },
      key: (i: number) => [...store.keys()][i] ?? null,
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    } as unknown as Storage;

    const removed = eraseDevice(stub);
    expect(removed).toBe(2);
    expect(store.has(PREFS_KEY)).toBe(false);
    expect(store.get("someone.elses.key")).toBe("keep me");
  });

  it("account erasure deletes the caller's user_prefs rows", () => {
    /* The newest erase_my_data() restatement is the billing migration's;
       eraseCoverage.test.ts pins the full table list — this pins the one
       table every health prefs key syncs through. */
    expect(BILLING_LOWER).toContain("delete from public.user_prefs where profile_id = uid");
  });
});

/* ------------------------------------------------------------------ */
/* Claims: server-paywall, ai-gate-first, credits-ledger               */
/* ------------------------------------------------------------------ */

describe("the Money System's enforcement facts", () => {
  const SERVICE_ROLE_ONLY = [
    "grant_credits(uuid, integer, text, text)",
    "activate_subscription(uuid, text, text, text, text, timestamptz, timestamptz)",
    "set_subscription_status(uuid, text, timestamptz, boolean)",
  ] as const;

  it("money-moving RPCs are service_role ONLY", () => {
    for (const fn of SERVICE_ROLE_ONLY) {
      expect(BILLING_LOWER, fn).toContain(`revoke all on function public.${fn} from public`);
      expect(BILLING_LOWER, fn).toContain(`revoke all on function public.${fn} from authenticated`);
      expect(BILLING_LOWER, fn).toContain(`grant execute on function public.${fn} to service_role`);
      expect(BILLING_LOWER, fn).not.toContain(`grant execute on function public.${fn} to authenticated`);
    }
  });

  it("the caller's own entitlement RPCs are authenticated-only", () => {
    for (const fn of ["get_my_entitlement()", "spend_credits(integer, text)"]) {
      expect(BILLING_LOWER, fn).toContain(`revoke all on function public.${fn} from public`);
      expect(BILLING_LOWER, fn).toContain(`grant execute on function public.${fn} to authenticated`);
    }
  });

  it("clients cannot write the billing tables; the ledger is append-only", () => {
    for (const t of ["subscriptions", "ai_credit_balances", "ai_credit_ledger"]) {
      expect(BILLING_LOWER, t).toContain(`revoke all on public.${t} from anon`);
      expect(BILLING_LOWER, t).toContain(`revoke insert, update, delete on public.${t} from authenticated`);
      expect(BILLING_LOWER, t).toContain(`grant select on public.${t} to authenticated`);
    }
    /* Append-only is the audit claim: every mutation writes balance_after
       (the column exists and is constrained), and no client role holds a
       write grant on the ledger (asserted above). */
    expect(BILLING_LOWER).toContain("balance_after integer not null check (balance_after >= 0)");
  });

  it("the coach gate runs BEFORE any provider call", () => {
    const coach = readFileSync(resolve(process.cwd(), "supabase/functions/coach/index.ts"), "utf8");

    /* Chat paths (Coach + Vitalis): gate, then the 402 refusal, then —
       only after both — the provider chain. */
    const gateAt = coach.indexOf('billingGateCheck(req, isVitalis ? "vitalis" : "coach"');
    expect(gateAt, "chat-path gate call").toBeGreaterThan(-1);
    const refusalAt = coach.indexOf("if (gateError) return json(gateError, 402);", gateAt);
    expect(refusalAt, "402 refusal after the gate").toBeGreaterThan(gateAt);
    const providerAt = coach.indexOf("runProviderChain({", refusalAt);
    expect(providerAt, "provider chain after the refusal").toBeGreaterThan(refusalAt);

    /* TTS path is gated too. */
    expect(coach).toContain('billingGateCheck(req, "tts"');

    /* The gate's decision logic is the pure, unit-tested module — the
       function must actually consult it, not a local re-implementation. */
    expect(coach).toContain('from "./billing-core.ts"');
    const core = readFileSync(resolve(process.cwd(), "supabase/functions/coach/billing-core.ts"), "utf8");
    expect(core).toContain("export function decideGate");
  });
});

/* ------------------------------------------------------------------ */
/* Claim: photo-licences                                               */
/* ------------------------------------------------------------------ */

describe("every shipped food photograph is credited and freely licensed", () => {
  /* The same allowlist the dish manifest tests enforce: CC0, public
     domain, CC BY, CC BY-SA (any version). Nothing else may ship. */
  const ALLOWED_LICENCE = /^(CC0|Public domain|CC BY( \d\.\d( [a-z]{2})?)?|CC BY-SA( \d\.\d( [a-z]{2})?)?)$/;

  it("dish and food photos all carry an author and an allowed licence", () => {
    const all = [...DISH_PHOTO_CREDITS, ...FOOD_PHOTO_CREDITS];
    expect(all.length).toBeGreaterThan(0);
    for (const photo of all) {
      expect(photo.author.trim().length, photo.commonsTitle).toBeGreaterThan(0);
      expect(ALLOWED_LICENCE.test(photo.license), `${photo.commonsTitle}: ${photo.license}`).toBe(true);
    }
  });

  it("the credits surface exists in the Nutrition tab", () => {
    const page = fileText("components/nutrition/NutritionPage.tsx");
    expect(page).toContain("PhotoCreditsSheet");
  });
});

/* ------------------------------------------------------------------ */
/* Claim: provenance-labels                                            */
/* ------------------------------------------------------------------ */

describe("nutrition numbers carry provenance in the type system", () => {
  it("foods and log entries cannot exist without a provenance", () => {
    const types = fileText("lib/nutrition/types.ts");
    expect(types).toContain("provenance: FoodProvenance");
    expect(types).toContain("provenance: EntryProvenance");
  });

  it("coach photo estimates enter only through the estimate factory", () => {
    const entries = fileText("lib/nutrition/entries.ts");
    expect(entries).toContain("export function createEstimateEntry");
    const coachLog = fileText("lib/nutrition/coachLog.ts");
    expect(coachLog).toContain("createEstimateEntry({");
  });
});

/* ------------------------------------------------------------------ */
/* Registry ↔ UI sync                                                  */
/* ------------------------------------------------------------------ */

describe("the claims registry and the UI stay in sync", () => {
  it("the registry is exactly the set this suite knows how to prove", () => {
    expect(TRUST_CLAIM_IDS).toEqual([
      "server-paywall",
      "ai-gate-first",
      "credits-ledger",
      "no-keys-in-app",
      "consent-record",
      "export-and-erase",
      "photo-licences",
      "provenance-labels",
    ]);
    for (const claim of TRUST_CLAIMS) {
      expect(claim.line.trim().length, claim.id).toBeGreaterThan(0);
      expect(claim.surface.trim().length, claim.id).toBeGreaterThan(0);
    }
  });

  it("the Profile section renders from the registry, not a copy", () => {
    const section = fileText("components/profile/TrustSection.tsx");
    expect(section).toContain("TRUST_CLAIMS");
    expect(section).toContain('from "@/lib/trust/claims"');
  });

  it("the consent backing surface the registry points at exists", () => {
    const row = fileText("components/profile/AccountRow.tsx");
    expect(row).toContain("<ConsentSection />");
    expect(row).toContain("<TrustSection />");
  });
});
