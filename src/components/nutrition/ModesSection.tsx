/**
 * Condition Modes (System 14) — the person's own plan guardrails.
 *
 * Plain words, one layer of claims: a mode is a preference the person
 * switches on, NOT a diagnosis and NOT medical advice, and this
 * section says so once, in the `.note` above the grid, before any
 * toggle (registry M-69).
 *
 * Anti-document form (brief v3, slice 4): each mode is a TILE, not a
 * form row. The switch sits inside the tile's head (never floating
 * mid-card, M-66); the mode's rules are chips derived from its rule
 * data (M-68); and the footer states the mode's effect — "Would hide
 * N of 1,203 dishes" — in BOTH switch states, computed from the real
 * library by the same predicates the plan composer judges with. A
 * mode with no rules (thyroid, whose nutrients Bloom's data does not
 * carry) is a dimmed tile whose footer names the missing data; it
 * presents no live switch and hides nothing.
 *
 * Toggling writes the shared prefs key the plan hook reads, so the
 * next plan the person generates is judged by the modes they chose.
 */

import { useMemo } from "react";
import { Info } from "lucide-react";

import { SectionHead } from "@/components/ui/SectionHead";
import { Switch } from "@/components/ui/switch";
import { usePrefValue } from "@/lib/prefsStore";
import { fmtCount } from "@/lib/format";
import {
  EMPTY_MODES_VALUE,
  MODES_KEY,
  MODE_DEFINITIONS,
  modeHiddenCounts,
  parseModesValue,
  writeModes,
  type ModeDefinition,
  type ModeId,
  type ModeRule,
} from "@/lib/modes/modes";
import { DISH_LIBRARY } from "@/lib/nutrition/data/dishLibrary";
import { dishNutrients, type Dish } from "@/lib/nutrition/dishes";
import type { Nutrients } from "@/lib/nutrition/types";

/** A rule as a chip — the rule data's own terms, never a sentence. */
function ruleChip(rule: ModeRule): string {
  switch (rule.kind) {
    case "added_sugar_ingredient":
      return "Added sugar";
    case "max_carbs_per_serving":
      return `Carbs > ${rule.limitG} g`;
    case "max_sodium_per_serving":
      return `Sodium > ${fmtCount(rule.limitMg)} mg`;
  }
}

/** One description line from the rule kinds the mode actually carries. */
function modeDescription(def: ModeDefinition): string {
  const kinds = new Set(def.rules.map((r) => r.kind));
  const parts: string[] = [];
  if (kinds.has("added_sugar_ingredient")) parts.push("added sugar");
  if (kinds.has("max_carbs_per_serving")) parts.push("carbohydrate");
  if (kinds.has("max_sodium_per_serving")) parts.push("sodium");
  return `Hides dishes high in ${parts.join(" or ")}.`;
}

export function ModesSection() {
  const modes = usePrefValue(MODES_KEY, parseModesValue, EMPTY_MODES_VALUE);
  const active = modes.active;

  const library = useMemo(() => {
    const rows: { dish: Dish; nutrients: Nutrients }[] = [];
    for (const dish of DISH_LIBRARY) {
      try {
        rows.push({ dish, nutrients: dishNutrients(dish).nutrients });
      } catch {
        /* An unresolvable dish is not counted — never guessed at. */
      }
    }
    return rows;
  }, []);

  /* The effect of every filtering mode, on or off: the footer is a
     fact about the library and the mode's rules, not about the
     switch. Thyroid carries no rules and is never counted. */
  const hidden = useMemo(
    () =>
      modeHiddenCounts(
        library,
        MODE_DEFINITIONS.filter((d) => !d.informationOnly).map((d) => d.id),
      ),
    [library],
  );

  const toggle = (id: ModeId, on: boolean) => {
    writeModes(on ? [...active, id] : active.filter((m) => m !== id));
  };

  return (
    <section className="nut-card nut-rise section" aria-label="Condition modes">
      <SectionHead kicker="Condition modes" title="Guardrails you choose for your plan" />

      {/* The safety sentence is the most important text on this card,
          so it renders as a note (registry M-69): full-contrast text
          on a surface-2 ground with a rule — never the smallest,
          dimmest line here. */}
      <p className="note mt-4">
        <Info className="size-4" aria-hidden />
        <span>
          Modes are preferences you switch on, not a diagnosis, not medical advice, and no
          substitute for your doctor.
        </span>
      </p>

      <div className="tile-grid mt-4">
        {MODE_DEFINITIONS.map((def) => {
          const on = active.includes(def.id);
          const hiddenCount = hidden.get(def.id);
          return (
            <article
              key={def.id}
              className="tile mode"
              aria-disabled={def.informationOnly || undefined}
            >
              <header className="tile__head">
                <h3>
                  {def.name}
                  {def.informationOnly ? (
                    <span className="nut-badge ml-2 align-middle">Not available yet</span>
                  ) : null}
                </h3>
                {def.informationOnly ? (
                  /* An information-only mode checks nothing — Bloom's food
                     data carries none of the nutrients it would judge by —
                     so it must not present a live switch. The control is
                     disabled and off, the badge says why it is here at
                     all, and the footer names the missing data. Stored
                     prefs are never rewritten by this rendering. */
                  <Switch
                    checked={false}
                    disabled
                    aria-label={`${def.name} mode, not available yet`}
                  />
                ) : (
                  <Switch
                    checked={on}
                    onCheckedChange={(checked) => toggle(def.id, checked)}
                    aria-label={`${def.name} mode`}
                  />
                )}
              </header>

              {def.informationOnly ? null : (
                <>
                  <p className="mode__desc">{modeDescription(def)}</p>
                  <ul className="mode-chips">
                    {def.rules.map((rule) => (
                      <li key={rule.id} className="nut-badge">
                        {ruleChip(rule)}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <footer className="tile__foot">
                {def.informationOnly ? (
                  <span>Needs iodine or selenium data, hides nothing.</span>
                ) : hiddenCount !== undefined ? (
                  <span>
                    Would hide <strong>{fmtCount(hiddenCount)}</strong> of{" "}
                    {fmtCount(library.length)} dishes
                  </span>
                ) : null}
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}
