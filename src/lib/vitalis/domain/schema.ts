/**
 * Runtime validation at the Vitalis boundary.
 *
 * The domain types are compile-time only; anything arriving from storage, a
 * form, or an import is `unknown` and must pass through here first. Zod is
 * already a Bloom dependency and is used elsewhere in the app, so this adds no
 * new package.
 *
 * Failure is explicit: `parseHealthProfile` throws `VitalisValidationError`
 * carrying every issue, and `safeParseHealthProfile` returns a result instead.
 * Nothing is coerced or defaulted silently.
 */

import { z } from "zod";

import { CONSENT_POLICY_VERSION, type ConsentRecord } from "./consent";
import {
  DIETARY_PATTERNS,
  HEALTH_PROFILE_VERSION,
  type ActivityLevel,
  type DietaryPattern,
  type HealthProfile,
  type Sex,
  type UnitSystem,
  type VitalisGoal,
} from "./profile";
import { DATA_QUALITIES, PROVENANCE_SOURCES, isIsoTimestamp } from "./provenance";
import {
  URGENT_SYMPTOMS,
  type SafetyGoal,
  type SafetyInput,
  type UrgentSymptom,
} from "./safety";
import { UNIT_CODES, dimensionOf, type Quantity, type Unit } from "./units";

function enumOf<T extends string>(values: readonly T[]): z.ZodEnum<[T, ...T[]]> {
  return z.enum([...values] as [T, ...T[]]);
}

const unitSchema = enumOf<Unit>(UNIT_CODES);
const isoDateTime = z.string().refine(isIsoTimestamp, { message: "expected an ISO date or datetime" });

export const quantitySchema = z
  .object({
    value: z.number().finite(),
    unit: unitSchema,
  })
  .strict();

export const provenanceSchema = z
  .object({
    source: enumOf(PROVENANCE_SOURCES),
    recordedAt: isoDateTime,
    method: z.string().min(1).max(80).optional(),
    methodVersion: z.string().min(1).max(40).optional(),
    quality: enumOf(DATA_QUALITIES).optional(),
    confidence: z.number().min(0).max(1).optional(),
    note: z.string().max(280).optional(),
  })
  .strict();

export const measurementSchema = z
  .object({
    value: quantitySchema,
    provenance: provenanceSchema,
  })
  .strict();

const textList = (maxItems: number, maxLength: number) =>
  z.array(z.string().min(1).max(maxLength)).max(maxItems);

export const dietaryProfileSchema = z
  .object({
    pattern: enumOf<DietaryPattern>(DIETARY_PATTERNS).nullable(),
    allergies: textList(30, 60),
    intolerances: textList(30, 60),
    dislikedFoods: textList(50, 60),
    cuisines: textList(20, 60),
    mealsPerDay: z.number().int().min(1).max(12).nullable(),
  })
  .strict();

export const healthConstraintsSchema = z
  .object({
    conditions: textList(30, 80),
    medications: textList(30, 120),
    pregnantOrBreastfeeding: z.boolean().nullable(),
    eatingDisorderHistory: z.boolean().nullable(),
    unexplainedWeightChange: z.boolean().nullable(),
    symptoms: z.array(enumOf<UrgentSymptom>(URGENT_SYMPTOMS)).max(URGENT_SYMPTOMS.length),
  })
  .strict();

const DIMENSION_OF_FIELD = {
  height: "length",
  weight: "mass",
  waist: "length",
  targetWeight: "mass",
} as const;

export const healthProfileSchema = z
  .object({
    userId: z.string().min(1).max(64),
    version: z.literal(HEALTH_PROFILE_VERSION),
    units: enumOf<UnitSystem>(["metric", "imperial"]),
    ageYears: z.number().int().min(13).max(110).nullable(),
    sex: enumOf<Sex>(["female", "male", "unspecified"]),
    height: measurementSchema.nullable(),
    weight: measurementSchema.nullable(),
    waist: measurementSchema.nullable(),
    targetWeight: measurementSchema.nullable(),
    goal: enumOf<VitalisGoal>(["lose", "maintain", "gain", "recomp", "general_health"]).nullable(),
    activity: enumOf<ActivityLevel>(["sedentary", "light", "moderate", "active", "very_active"]).nullable(),
    rateKgPerWeek: z.number().min(0).max(5),
    dietary: dietaryProfileSchema,
    constraints: healthConstraintsSchema,
    updatedAt: isoDateTime,
  })
  .strict()
  .superRefine((profile, ctx) => {
    for (const field of ["height", "weight", "waist", "targetWeight"] as const) {
      const measurement = profile[field];
      if (!measurement) continue;
      const expected = DIMENSION_OF_FIELD[field];
      const actual = dimensionOf(measurement.value.unit);
      if (actual !== expected) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field, "value", "unit"],
          message: `${field} must be a ${expected} measurement, received ${actual}`,
        });
      }
    }
  });

export const consentRecordSchema = z
  .object({
    purpose: enumOf(["health_data_processing", "sensitive_health_processing", "ai_assistance", "caregiver_sharing"] as const),
    state: enumOf(["granted", "withdrawn", "not_asked"] as const),
    policyVersion: z.string().min(1).max(64),
    decidedAt: isoDateTime.nullable(),
  })
  .strict();

export const consentRecordsSchema = z.array(consentRecordSchema).max(50);

export const safetyInputSchema = z
  .object({
    ageYears: z.number().int().min(13).max(110).nullable(),
    bmi: z.number().min(5).max(100).nullable(),
    goal: enumOf<SafetyGoal>(["lose", "maintain", "gain", "recomp", "general_health"]).nullable(),
    pregnantOrBreastfeeding: z.boolean().nullable(),
    eatingDisorderHistory: z.boolean().nullable(),
    medicalConditions: textList(30, 80),
    currentMedications: textList(30, 120),
    unexplainedWeightChange: z.boolean().nullable(),
    symptoms: z.array(enumOf<UrgentSymptom>(URGENT_SYMPTOMS)).max(URGENT_SYMPTOMS.length),
    requestedRateKgPerWeek: z.number().min(0).max(5).nullable(),
  })
  .strict();

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export class VitalisValidationError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[]) {
    super(`Invalid Vitalis data: ${issues.map((issue) => `${issue.path || "(root)"} ${issue.message}`).join("; ")}`);
    this.name = "VitalisValidationError";
    this.issues = issues;
  }
}

function issuesOf(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly ValidationIssue[] };

function parseWith<S extends z.ZodTypeAny>(schema: S, input: unknown): ParseResult<z.infer<S>> {
  const result = schema.safeParse(input);
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, issues: issuesOf(result.error) };
}

export function safeParseHealthProfile(input: unknown): ParseResult<HealthProfile> {
  return parseWith(healthProfileSchema, input) as ParseResult<HealthProfile>;
}

export function parseHealthProfile(input: unknown): HealthProfile {
  const result = safeParseHealthProfile(input);
  if (!result.ok) throw new VitalisValidationError(result.issues);
  return result.value;
}

export function safeParseConsentRecords(input: unknown): ParseResult<ConsentRecord[]> {
  return parseWith(consentRecordsSchema, input) as ParseResult<ConsentRecord[]>;
}

export function parseConsentRecords(input: unknown): ConsentRecord[] {
  const result = safeParseConsentRecords(input);
  if (!result.ok) throw new VitalisValidationError(result.issues);
  return result.value;
}

export function safeParseSafetyInput(input: unknown): ParseResult<SafetyInput> {
  return parseWith(safetyInputSchema, input) as ParseResult<SafetyInput>;
}

export function parseSafetyInput(input: unknown): SafetyInput {
  const result = safeParseSafetyInput(input);
  if (!result.ok) throw new VitalisValidationError(result.issues);
  return result.value;
}

export function parseQuantity(input: unknown): Quantity {
  const result = parseWith(quantitySchema, input);
  if (!result.ok) throw new VitalisValidationError(result.issues);
  return result.value;
}

/** The policy version this build writes into new consent records. */
export const CURRENT_CONSENT_POLICY_VERSION = CONSENT_POLICY_VERSION;
