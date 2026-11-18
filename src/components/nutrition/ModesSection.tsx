/**
 * Condition Modes (System 14) — the person's own plan guardrails.
 *
 * Plain words, one layer of claims: a mode is a preference the person
 * switches on, NOT a diagnosis and NOT medical advice, and this
 * section says so before any toggle. Each mode lists exactly what it
 * does mechanically (the mode definitions' own rule lines); an active
 * filtering mode shows how many library dishes it hides, computed
 * from the real library — a mode with no rules (thyroid, whose
 * nutrients Bloom's data does not carry) says that instead.
 *
 * Toggling writes the shared prefs key the plan hook reads, so the
 * next plan the person generates is judged by the modes they chose.
 */

import { useMemo } from "react";

import { Switch } from "@/components/ui/switch";
import { usePrefValue } from "@/lib/prefsStore";
import {
  EMPTY_MODES_VALUE,
  MODES_KEY,
  MODE_DEFINITIONS,
  modeHiddenCounts,
  parseModesValue,
  writeModes,
  type ModeId,
} from "@/lib/modes/modes";
import { DISH_LIBRARY } from "@/lib/nutrition/data/dishLibrary";
import { dishNutrients, type Dish } from "@/lib/nutrition/dishes";
import type { Nutrients } from "@/lib/nutrition/types";

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

  const hidden = useMemo(
    () => modeHiddenCounts(library, active.filter((id) => id !== "thyroid")),
    [library, active],
  );

  const toggle = (id: ModeId, on: boolean) => {
    writeModes(on ? [...active, id] : active.filter((m) => m !== id));
  };

  return (
    <section className="nut-card nut-rise mt-4" aria-label="Condition modes">
      <p className="eyebrow">Condition modes</p>
      <h2 className="mt-2 font-display text-[length:var(--text-section)] text-foreground">
        Guardrails you choose for your plan
      </h2>
      <p className="mt-2 max-w-[var(--measure)] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
        Modes are preferences you switch on — not a diagnosis, and not medical advice. They don&apos;t
        replace your doctor. A mode simply hides some dishes from your plan, by the plain rules
        listed under it.
      </p>

      <div className="mt-2">
        {MODE_DEFINITIONS.map((def) => {
          const on = active.includes(def.id);
          const hiddenCount = hidden.get(def.id);
          return (
            /* A bounded control row (system slice): the mode's text sits
               in a measure-capped column and the switch right after it —
               never at the far edge of the full-width card. */
            <div key={def.id} className="kv-row kv-row--control">
              <div className="min-w-0">
                <h3 className="text-[length:var(--text-body)] font-medium text-foreground">
                  {def.name}
                  {def.informationOnly ? (
                    <span className="ml-2 inline-flex items-center rounded-pill border border-border-subtle bg-surface-3 px-2 py-0.5 align-middle text-[length:var(--text-meta)] font-medium text-muted-foreground">
                      Not available yet
                    </span>
                  ) : null}
                </h3>
                {def.ruleLines.map((line) => (
                  <p
                    key={line}
                    className="mt-1 text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground"
                  >
                    {line}
                  </p>
                ))}
                {def.informationOnly && def.dataNote ? (
                  <p className="mt-1 text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
                    {def.dataNote}
                  </p>
                ) : null}
                {on && !def.informationOnly && hiddenCount !== undefined ? (
                  <p className="mt-1 text-[length:var(--text-support)] leading-[var(--leading-body)] text-foreground">
                    On now — hides {hiddenCount} of {library.length} dishes in the library from your
                    plan.
                  </p>
                ) : null}
              </div>
              {def.informationOnly ? (
                /* An information-only mode checks nothing — Bloom's food
                   data carries none of the nutrients it would judge by —
                   so it must not present a live switch. The control is
                   disabled and off, the badge says why it is here at
                   all, and the dataNote below names the missing data.
                   Stored prefs are never rewritten by this rendering. */
                <Switch
                  checked={false}
                  disabled
                  aria-label={`${def.name} mode — not available yet`}
                />
              ) : (
                <Switch
                  checked={on}
                  onCheckedChange={(checked) => toggle(def.id, checked)}
                  aria-label={`${def.name} mode`}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
