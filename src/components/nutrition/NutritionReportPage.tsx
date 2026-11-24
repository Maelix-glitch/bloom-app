/**
 * NutritionReportPage — the clinician report (N-UI): seven days of
 * intake, with sources, printable. Built entirely from the same real
 * aggregates the tab shows — week totals per day, provenance shares,
 * the body's own guides — with incompleteness marked wherever a day's
 * fibre or sodium rests on foods that did not report it. The profile
 * grid shows only what Bloom genuinely holds; a value it does not hold
 * reads "Not recorded", never a plausible invention.
 *
 * Age, sex, height and weight each get their own row, resolved the way
 * the rest of the app resolves the person: the Assessment's answers
 * first (the profile of record — targets, plan and dishes all read
 * `toHealthProfile` before anything else), the Trackers body profile
 * as the per-field fallback. Reading only the body profile here left
 * the report saying "Not recorded" for people whose answers live in
 * their completed Assessment — the owner-reported defect this fixes.
 */

import { Link } from "@tanstack/react-router";
import { ArrowLeft, Printer } from "lucide-react";

import { PlusGate } from "@/components/billing/PlusGate";
import { useAssessment } from "@/hooks/useAssessment";
import { useBodyProfile } from "@/hooks/useBodyProfile";
import { useEntitlement } from "@/hooks/useEntitlement";
import { useNutrition } from "@/hooks/useNutrition";
import { canUse } from "@/lib/billing/plans";
import { fmtDate, fmtGrams, fmtKcalApprox } from "@/lib/format";
import { ACTIVITY_LABEL, GOAL_LABEL } from "@/lib/health/body";
import { shiftDay } from "@/lib/localDay";
import {
  incompleteOptionalFields,
  isRealDayKey,
  kcalByProvenance,
  sumNutrients,
  weekAggregates,
  type LogEntry,
} from "@/lib/nutrition";

function longDate(day: string): string {
  const weekday = new Date(`${day}T12:00:00`).toLocaleDateString("en-IN", { weekday: "long" });
  return `${weekday}, ${fmtDate(day)}`;
}

function dayShort(day: string): string {
  return new Date(`${day}T12:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

const FIBRE_REFERENCE_G = 30;
const SODIUM_CEILING_MG = 2000;

export function NutritionReportPage({ endDay }: { endDay: string }) {
  const nutrition = useNutrition();
  const body = useBodyProfile();
  const assessment = useAssessment();
  const entitlementState = useEntitlement();
  const end = isRealDayKey(endDay) ? endDay : nutrition.today;
  const start = shiftDay(end, -6);
  const targets = nutrition.targetState.kind === "ready" ? nutrition.targetState.targets : null;
  const week = weekAggregates(nutrition.entries, end, targets?.proteinG ?? null);

  const entriesInWindow = nutrition.entries.filter((e) => e.day >= start && e.day <= end);
  const weekShares = kcalByProvenance(entriesInWindow);
  const loggedDays = week.days.filter((d) => d.totals !== null);
  const anyFibreIncomplete = week.days.some((d) => {
    const dayEntries = entriesInWindow.filter((e) => e.day === d.day);
    return dayEntries.length > 0 && incompleteOptionalFields(dayEntries.map((e) => e.nutrients)).has("fibreG");
  });

  const profile = body.profile;
  /* The person's identity numbers, per field: the Assessment's answer
     wins, the body profile fills what the Assessment never recorded,
     and a field neither store holds reads "Not recorded". */
  const answers = assessment.state.answers;
  const age = answers.ageYears ?? profile.age;
  const sex = answers.sex !== "unspecified" ? answers.sex : profile.sex;
  const heightCm = answers.heightCm ?? profile.heightCm;
  const weightKg = answers.weightKg ?? profile.weightKg;
  const guides: { label: string; value: string }[] = [
    { label: "Age", value: age !== null ? `${age} years` : "Not recorded" },
    { label: "Sex", value: sex !== "unspecified" ? sex : "Not recorded" },
    { label: "Height", value: heightCm !== null ? `${heightCm} cm` : "Not recorded" },
    { label: "Weight", value: weightKg !== null ? `${weightKg} kg` : "Not recorded" },
    { label: "Activity", value: ACTIVITY_LABEL[profile.activity] },
    { label: "Goal", value: GOAL_LABEL[profile.goal] },
    {
      label: "Energy guide",
      value: targets ? `${fmtKcalApprox(targets.kcal)} / day` : "Not set",
    },
    {
      label: "Protein guide",
      value: targets ? `~${fmtGrams(targets.proteinG)} g / day` : "Not set",
    },
    { label: "Fibre guide", value: `${FIBRE_REFERENCE_G} g / day` },
    { label: "Sodium ceiling", value: `${SODIUM_CEILING_MG.toLocaleString("en-IN")} mg / day` },
  ];

  const dayRow = (day: string, entries: LogEntry[]) => {
    const totals = sumNutrients(entries.map((e) => e.nutrients));
    const incomplete = incompleteOptionalFields(entries.map((e) => e.nutrients));
    const shares = kcalByProvenance(entries);
    return { totals, incomplete, shares };
  };

  const provenanceCards: { label: string; kcal: number; color: string; blurb: string }[] = [
    {
      label: "USDA FoodData Central",
      kcal: weekShares.usdaKcal,
      color: "var(--sage)",
      blurb: "Reference values published by the USDA (CC0), pinned per food in Bloom's reference set.",
    },
    {
      label: "Your value",
      kcal: weekShares.ownKcal,
      color: "var(--gold)",
      blurb: "Values you copied from packet labels yourself. Bloom stores them as stated, it does not verify them.",
    },
    {
      label: "Estimate, based on your photo",
      kcal: weekShares.estimateKcal,
      color: "var(--rose)",
      blurb: "Coach's estimate from a meal photo, confirmed by you before logging. An approximation, never a measurement.",
    },
  ];

  /* M-214: the clinician report is one of the reports Premium Plus
     carries. Same rule as the Weekly Report: a KNOWN entitlement
     below Plus meets the invitation; an unread one never blocks.
     UI gate — the report is built on-device from the person's own
     entries. */
  if (
    entitlementState.kind === "ready" &&
    !canUse(entitlementState.entitlement.tier, "advanced_analytics")
  ) {
    return (
      <PlusGate
        title="The nutrition report is part of Premium Plus"
        body="Seven days of intake with its sources, ready to print or share with a clinician. Reports and advanced analytics live in Premium Plus, with Vitalis and the Metabolic Twin."
      />
    );
  }

  return (
    <div className="nut-wrap nut-report">
      <div className="nut-report-print-hide flex items-center justify-between gap-3">
        <Link to="/nutrition" className="nut-btn nut-btn-ghost nut-btn-sm">
          <ArrowLeft className="size-3.5" aria-hidden /> Back to nutrition
        </Link>
        <button
          type="button"
          className="nut-btn nut-btn-gold nut-btn-sm"
          onClick={() => window.print()}
        >
          <Printer className="size-3.5" aria-hidden /> Print
        </button>
      </div>

      <header className="mt-6">
        <p className="eyebrow">Clinician report</p>
        <h1 className="mt-2 font-display text-[clamp(28px,4vw,38px)] leading-[1.08] text-foreground">
          Seven days of intake, <em className="nut-gold-text">with sources</em>
        </h1>
        <p className="mt-2 text-[length:var(--text-callout)] text-muted-foreground">
          {longDate(start)} to {longDate(end)} · from your Bloom food log
        </p>
      </header>

      <section className="nut-card mt-6" aria-label="Profile and guides">
        <h2 className="eyebrow">Profile &amp; guides</h2>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
          {guides.map((guide) => (
            <div key={guide.label}>
              <dt className="text-[length:var(--text-caption)] text-muted-foreground">
                {guide.label}
              </dt>
              <dd className="mt-0.5 font-display text-[18px] capitalize text-foreground">
                {guide.value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="nut-note">
          Guides are estimates from Mifflin–St Jeor and common reference intakes. They are
          not a prescription.
        </p>
      </section>

      <section className="nut-card mt-4" aria-label="Daily intake">
        <h2 className="eyebrow">Daily intake</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="nut-report-table">
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">kcal</th>
                <th scope="col">Protein g</th>
                <th scope="col">Carbs g</th>
                <th scope="col">Fat g</th>
                <th scope="col">Fibre g</th>
                <th scope="col">Sodium mg</th>
                <th scope="col">Verified</th>
              </tr>
            </thead>
            <tbody>
              {week.days.map((weekDay) => {
                const dayEntries = entriesInWindow.filter((e) => e.day === weekDay.day);
                if (dayEntries.length === 0) {
                  return (
                    <tr key={weekDay.day}>
                      <td>{dayShort(weekDay.day)}</td>
                      <td colSpan={7} className="text-muted-foreground">
                        Nothing logged
                      </td>
                    </tr>
                  );
                }
                const { totals, incomplete, shares } = dayRow(weekDay.day, dayEntries);
                return (
                  <tr key={weekDay.day}>
                    <td>{dayShort(weekDay.day)}</td>
                    <td>{Math.round(totals.kcal)}</td>
                    <td>{fmtGrams(totals.proteinG)}</td>
                    <td>{fmtGrams(totals.carbsG)}</td>
                    <td>{fmtGrams(totals.fatG)}</td>
                    <td>
                      {totals.fibreG !== undefined ? fmtGrams(totals.fibreG) : "-"}
                      {incomplete.has("fibreG") ? "*" : ""}
                    </td>
                    <td>
                      {totals.sodiumMg !== undefined
                        ? Math.round(totals.sodiumMg).toLocaleString("en-IN")
                        : "-"}
                      {incomplete.has("sodiumMg") ? "*" : ""}
                    </td>
                    <td>
                      {shares.verifiedShare !== null
                        ? `${Math.round(shares.verifiedShare * 100)}%`
                        : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>Average of {loggedDays.length} logged days</td>
                <td>{week.avgKcal ?? "-"}</td>
                <td>{week.avgProteinG !== null ? fmtGrams(week.avgProteinG) : "-"}</td>
                <td>{week.avgCarbsG !== null ? fmtGrams(week.avgCarbsG) : "-"}</td>
                <td>{week.avgFatG !== null ? fmtGrams(week.avgFatG) : "-"}</td>
                <td>-</td>
                <td>-</td>
                <td>
                  {weekShares.verifiedShare !== null
                    ? `${Math.round(weekShares.verifiedShare * 100)}%`
                    : "-"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {anyFibreIncomplete ? (
          <p className="nut-note">
            * Some logged foods don't report fibre. Those days' fibre totals are floors over
            the foods that did, not whole-day claims.
          </p>
        ) : null}
      </section>

      <section className="nut-card mt-4" aria-label="Data provenance">
        <h2 className="eyebrow">Data provenance</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {provenanceCards.map((card) => (
            <article
              key={card.label}
              className="rounded-[var(--radius-control)] border border-border-subtle p-4"
            >
              <p className="flex items-center gap-2 text-[length:var(--text-callout)] font-medium text-foreground">
                <span className="size-2 rounded-full" style={{ background: card.color }} aria-hidden />
                {card.label}
              </p>
              <p className="mt-2 font-display text-[30px] text-foreground tabular-nums">
                {weekShares.totalKcal > 0
                  ? `${Math.round((card.kcal / weekShares.totalKcal) * 100)}%`
                  : "-"}
              </p>
              <p className="mt-1 text-[length:var(--text-caption)] leading-[var(--leading-body)] text-muted-foreground">
                {card.blurb}
              </p>
            </article>
          ))}
        </div>
        <p className="nut-note">
          Self-reported intake is inherently imprecise, portions are weighed or estimated by
          the person eating, and photo estimates carry a natural margin. This report is
          informational and does not constitute medical advice.
        </p>
      </section>
    </div>
  );
}
