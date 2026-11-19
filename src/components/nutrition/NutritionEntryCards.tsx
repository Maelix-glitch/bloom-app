/**
 * Nutrition's two doors — the Today band and the Profile card, in the
 * same component language as the Assessment's (`AssessmentEntry`).
 *
 * Both read today's log through `useNutrition`: when food is logged they
 * show today's kcal against the target (framed as the estimate it is);
 * when nothing is logged — or no target can honestly be computed — they
 * invite rather than invent. Both doors lead to the Nutrition tab; the
 * logging itself happens there.
 */

import { Link } from "@tanstack/react-router";

import { BloomIcon } from "@/components/icons/BloomIcon";
import { Button } from "@/components/ui/button";
import { useNutrition } from "@/hooks/useNutrition";
import { fmtCount, fmtGrams, fmtKcalApprox } from "@/lib/format";

function useTodaySummary() {
  const nutrition = useNutrition();
  const comparison = nutrition.comparison(nutrition.today);
  const count = nutrition.dayLog(nutrition.today).entries.length;
  return { comparison, count };
}

function summaryLine(count: number, kcal: number, proteinG: number): string {
  if (count === 0) return "";
  return `${Math.round(kcal)} kcal · ${fmtGrams(proteinG)} g protein · ${count} ${
    count === 1 ? "food" : "foods"
  } logged`;
}

/* ---------------------------------- Today ---------------------------------- */

export function NutritionTodayCard() {
  const { comparison, count } = useTodaySummary();
  const { totals, targets } = comparison;
  const hasData = count > 0;

  return (
    <section className="home-band" aria-labelledby="home-nutrition-title">
      <div className="flex items-start gap-3 px-2 pb-3 pt-2">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-gold/10 text-gold"
        >
          <BloomIcon name="nutrition" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="home-eyebrow">Nutrition</p>
          <h2 id="home-nutrition-title" className="home-band-title mt-1">
            {hasData
              ? targets
                ? `${fmtCount(totals.kcal)} of your ${fmtKcalApprox(targets.kcal)} target`
                : `${Math.round(totals.kcal)} kcal logged today`
              : "What did you eat today?"}
          </h2>
          <p className="mt-1 max-w-[52ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
            {hasData
              ? `${summaryLine(count, totals.kcal, totals.proteinG)}. Every value carries its source — USDA data, your labels, or a marked estimate.`
              : "Log meals and see them against your daily target. Every value is labelled with where it came from — nothing is presented as more certain than it is."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" asChild>
              <Link to="/nutrition">{hasData ? "Open Nutrition" : "Log food"}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Profile --------------------------------- */

export function NutritionProfileCard() {
  const { comparison, count } = useTodaySummary();
  const { totals, targets } = comparison;
  const hasData = count > 0;

  const statusLine = hasData
    ? `Today: ${summaryLine(count, totals.kcal, totals.proteinG)}${
        targets ? `, against a ${fmtKcalApprox(targets.kcal)} target (an estimate from your body numbers)` : ""
      }.`
    : "Nothing logged today yet.";

  return (
    <div className="pf-card pf-card--pad">
      <div className="pf-section-head">
        <div>
          <p className="pf-eyebrow">Nutrition</p>
          <h2 className="pf-title">Food &amp; your target</h2>
        </div>
      </div>
      <p className="max-w-[56ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
        What you eat, logged against the day — USDA reference values, your own packet labels,
        and Coach estimates, each labelled as what it is. {statusLine}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" asChild>
          <Link to="/nutrition">{hasData ? "Open Nutrition" : "Log your first food"}</Link>
        </Button>
      </div>
    </div>
  );
}
