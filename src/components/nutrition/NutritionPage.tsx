/**
 * NutritionPage — the Nutrition tab (W4-3 N4), rebuilt to the owner's
 * prototype composition (N-UI): header + gold Add food, the date strip,
 * the rings hero with its provenance ledger, the meal timeline beside
 * the week panel and the micronutrient spectrum, today's plan, and the
 * pattern lab over real mood check-ins.
 *
 * Every number on this page comes from the nutrition lib over the
 * user's real log — totals, the target comparison (safety-gated: a
 * substantive safety block means no targets and no deficit framing
 * anywhere on the page), provenance shares, week aggregates, spectrum
 * floors. The page assembles and arranges; it derives nothing itself.
 * Deleting an entry is undoable for the shared undo window, and
 * yesterday's meals can be copied into today in one tap.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Camera, Plus, Sparkles, Undo2, X } from "lucide-react";

import { FeelIn } from "@/components/system/FeelIn";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useBodyProfile } from "@/hooks/useBodyProfile";
import { useMoodSystem } from "@/hooks/useMoodSystem";
import { peekEntitlement } from "@/lib/billing/entitlement";
import { requestPaywall } from "@/lib/billing/paywall";
import { canUse } from "@/lib/billing/plans";
import { useNutrition, yesterdayOf } from "@/hooks/useNutrition";
import { usePlan } from "@/hooks/usePlan";
import { shiftDay } from "@/lib/localDay";
import { aggregateDays } from "@/lib/mood/analytics";
import { UNDO_WINDOW_MS, type Undoable } from "@/lib/undo";
import {
  moodPatterns,
  spectrumForDay,
  sumNutrients,
  weekAggregates,
  type LogEntry,
  type Meal,
  type PatternDayInput,
} from "@/lib/nutrition";
import { AddFoodSheet } from "./AddFoodSheet";
import { DateNav, NutritionHero } from "./NutritionHero";
import { FoodCaptureSheet } from "./FoodCaptureSheet";
import { DishesSection } from "./DishesSection";
import { PatternLab, Spectrum, WeekPanel } from "./NutritionPanels";
import { MetabolicTwinSection } from "./MetabolicTwinSection";
import { GrocerySection } from "./GrocerySection";
import { ModesSection } from "./ModesSection";
import { NutritionPlanSection } from "./NutritionPlanSection";
import { ProgrammesSection } from "./ProgrammesSection";
import { NutritionTimeline } from "./NutritionTimeline";
import { PhotoCreditsSheet } from "./PhotoCreditsSheet";

interface SheetState {
  open: boolean;
  meal: Meal | null;
  editing: LogEntry | null;
}

/**
 * The Nutrition sub-nav (brief v7 N2, M-155): the section anchors as
 * plain text under ONE gold underline that slides to the section in
 * view. The pills are retired — no fill, no ring; the active item is
 * foreground text (data-selected + aria-current="page") and the
 * indicator, measured onto it (offsetLeft/width) and moved by
 * transform only. The entries follow the sections' own render
 * conditions exactly (the grocery entry exists only when its section
 * does), so an item never points at a section that is not on the
 * page. Until the scrollspy marks a section, no item is selected
 * and the underline stays hidden — the honest state.
 */
export function NutritionSubNav({
  active,
  showGrocery,
}: {
  active: string | null;
  showGrocery: boolean;
}) {
  const navRef = useRef<HTMLElement | null>(null);
  const [indicator, setIndicator] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = navRef.current?.querySelector<HTMLElement>('a[data-selected="true"]');
      setIndicator(el ? { x: el.offsetLeft, w: el.offsetWidth } : null);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active, showGrocery]);

  const itemProps = (id: string) => ({
    className: "nut-subnav__item",
    "data-selected": active === id || undefined,
    "aria-current": active === id ? ("page" as const) : undefined,
  });

  return (
    <nav ref={navRef} className="nut-subnav" aria-label="Nutrition sections">
      <a {...itemProps("nut-plan")} href="#nut-plan">
        Plan
      </a>
      {showGrocery ? (
        <a {...itemProps("nut-grocery")} href="#nut-grocery">
          Grocery &amp; pantry
        </a>
      ) : null}
      <a {...itemProps("nut-modes")} href="#nut-modes">
        Condition modes
      </a>
      <a {...itemProps("nut-programmes")} href="#nut-programmes">
        Programmes
      </a>
      <a {...itemProps("nut-dishes")} href="#nut-dishes">
        Dishes
      </a>
      <span
        className="nut-subnav__indicator"
        aria-hidden="true"
        data-active={active ?? undefined}
        style={{
          transform: `translateX(${indicator?.x ?? 0}px)`,
          width: indicator?.w ?? 0,
          opacity: indicator ? 1 : 0,
        }}
      />
    </nav>
  );
}

export function NutritionPage() {
  const nutrition = useNutrition();
  const body = useBodyProfile();
  const plan = usePlan();
  const { entries: moodEntries } = useMoodSystem();
  const [day, setDay] = useState(nutrition.today);
  const [sheet, setSheet] = useState<SheetState>({ open: false, meal: null, editing: null });
  const [captureOpen, setCaptureOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [undoable, setUndoable] = useState<(Undoable & { entry: LogEntry }) | null>(null);
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);

  const isToday = day === nutrition.today;
  const dayLog = nutrition.dayLog(day);
  const comparison = nutrition.comparison(day);
  const targets = nutrition.targetState.kind === "ready" ? nutrition.targetState.targets : null;

  const week = useMemo(
    () => weekAggregates(nutrition.entries, day, targets?.proteinG ?? null),
    [nutrition.entries, day, targets],
  );
  const spectrum = useMemo(
    () => spectrumForDay(dayLog.entries, nutrition.spectrumSex),
    [dayLog.entries, nutrition.spectrumSex],
  );

  /* PatternLab inputs: the last 28 days of real food logs joined with
     the mood module's own day aggregation (mean check-in, 1–10). Days
     without a check-in or without food simply take part in nothing —
     `moodPatterns` enforces the two-days-each-side minimum. */
  const patterns = useMemo(() => {
    const moodByDay = new Map(aggregateDays(moodEntries).map((agg) => [agg.date, agg.mood]));
    const days: PatternDayInput[] = [];
    for (let back = 27; back >= 0; back -= 1) {
      const d = shiftDay(nutrition.today, -back);
      const dayEntries = nutrition.entries.filter((e) => e.day === d);
      const totals = sumNutrients(dayEntries.map((e) => e.nutrients));
      days.push({
        day: d,
        mood: moodByDay.get(d) ?? null,
        hasFood: dayEntries.length > 0,
        proteinG: totals.proteinG,
        fibreG: dayEntries.length > 0 ? (totals.fibreG ?? null) : null,
        breakfastProteinG: sumNutrients(
          dayEntries.filter((e) => e.meal === "breakfast").map((e) => e.nutrients),
        ).proteinG,
      });
    }
    return moodPatterns(days, {
      proteinTargetG: targets?.proteinG ?? null,
      fibreReferenceG: 30,
    });
  }, [moodEntries, nutrition.entries, nutrition.today, targets]);

  /* The undo snapshot dies with its window, like every Bloom undo. */
  useEffect(() => {
    if (!undoable) return;
    const t = window.setTimeout(() => setUndoable(null), UNDO_WINDOW_MS);
    return () => window.clearTimeout(t);
  }, [undoable]);

  const remove = (entry: LogEntry) => {
    nutrition.removeEntry(entry);
    setUndoable({
      id: Date.now(),
      message: `Removed “${entry.name}”.`,
      until: Date.now() + UNDO_WINDOW_MS,
      entry,
    });
  };

  const undo = () => {
    if (!undoable) return;
    nutrition.restoreEntry(undoable.entry);
    setUndoable(null);
  };

  const yesterday = yesterdayOf(day);
  const yesterdayCount = nutrition.dayLog(yesterday).entries.length;

  /* The merged empty state (empty-state slice, diagnosis §C): an
     account that has never logged a food and has no plan does not get
     a stack of separate empty blocks — the zeroed hero, a "nothing
     logged" card, four empty meal cards, an empty week, an empty
     spectrum, an all-insufficient twin, an empty grocery list and an
     empty pattern lab. It gets ONE empty state with one action. The
     plan section keeps its own states below (a refusal is a standing
     state, "create my plan" is a real offer, a ready plan is
     content), and the dish library, modes and programmes stay —
     they are content, not empty states. A plan that exists for
     another day ("outdated") also ends the merged state: the person
     has a plan history, and the day view is the honest surface. */
  const freshAccount =
    nutrition.entries.length === 0 &&
    (plan.state.kind === "can_generate" || plan.state.kind === "refused");

  /* Sub-nav scrollspy (brief v4 Slice 3): the sticky bar marks the
     section in view. IntersectionObserver in the house pattern — no
     scroll listeners, and where IO is absent (jsdom, very old
     webviews) no chip is marked, which is the honest state. The band
     is the strip just under the stuck bar: a section counts as
     current when it crosses it. */
  useEffect(() => {
    if (!isToday || typeof IntersectionObserver === "undefined") return;
    const ids = ["nut-plan", "nut-grocery", "nut-modes", "nut-programmes", "nut-dishes"];
    const targets = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveAnchor(entry.target.id);
        }
      },
      { rootMargin: "-88px 0px -55% 0px" },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [isToday, freshAccount]);

  return (
    <div className="nut-wrap nut-page">
      <header className="nut-rise">
        <p className="eyebrow">Nutrition</p>
        <h1 className="mt-2 font-display text-[clamp(30px,4.6vw,44px)] leading-[1.05] text-foreground">
          What you eat, <em className="nut-gold-text">honestly labelled</em>
        </h1>
        <p className="mt-2.5 max-w-[58ch] text-[length:var(--text-body)] leading-[var(--leading-body)] text-muted-foreground">
          Every value carries its source. USDA reference data, your own packet labels, or a
          clearly marked estimate. Nothing is presented as more certain than it is.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="nut-btn nut-btn-gold"
            onClick={() => setSheet({ open: true, meal: null, editing: null })}
          >
            <Plus className="size-4" aria-hidden /> Add food
          </button>
          <button
            type="button"
            className="nut-btn nut-btn-ghost"
            onClick={() => {
              /* M-214: photo-led logging (this capture flow) is
                 Premium Plus; food-photo analysis in the Coach
                 stays Premium. A KNOWN entitlement below Plus
                 meets the paywall instead of the camera; an unread
                 one never blocks (house rule), and the analysis
                 itself still runs through the function's own gate.
                 UI gate — the function cannot tell a capture photo
                 from a Coach photo today (same contract), recorded
                 in M-214. */
              const entitlement = peekEntitlement();
              if (
                entitlement?.kind === "ready" &&
                !canUse(entitlement.entitlement.tier, "photo_led_logging")
              ) {
                requestPaywall("premium_plus");
                return;
              }
              setCaptureOpen(true);
            }}
          >
            <Camera className="size-4" aria-hidden /> Photo estimate
          </button>
        </div>
      </header>

      <div className="mt-6">
        <DateNav
          day={day}
          today={nutrition.today}
          onSelect={setDay}
          targets={targets}
          kcalOfDay={(d) => {
            const log = nutrition.dayLog(d);
            return log.entries.length > 0 ? log.totals.kcal : null;
          }}
        />
        {!isToday ? (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              className="nut-backlink"
              onClick={() => setDay(nutrition.today)}
            >
              Today
            </button>
          </div>
        ) : null}
      </div>

      {/* Sub-navigation (Plan B, senior diagnosis slice 5): the today
          view is a long stack of named sections — plan, grocery, modes,
          programmes, dishes. The items are plain anchors to the section
          ids below, named as the sections name themselves; the entries
          follow the sections' own render conditions exactly, so an item
          never points at a section that is not on the page. Dishes stay
          a section here rather than a route of their own: the library
          is day-coupled — a dish logged from it lands on the day being
          viewed, which is this page's state. */}
      {isToday ? (
        <NutritionSubNav active={activeAnchor} showGrocery={!freshAccount} />
      ) : null}

      {freshAccount ? (
        <section className="nut-card nut-rise mt-4" aria-label="Nothing logged yet">
          <EmptyState
            title="Nothing logged yet"
            description="When you log a food, this page fills in, your totals, your week and the patterns behind them, every value labelled with its source."
            action={
              <Button
                type="button"
                onClick={() => setSheet({ open: true, meal: null, editing: null })}
              >
                <Plus className="size-4" aria-hidden /> Log your first food
              </Button>
            }
          />
        </section>
      ) : (
        <>
          <NutritionHero
            day={day}
            today={nutrition.today}
            log={dayLog}
            targetState={nutrition.targetState}
            comparison={comparison}
            bmr={body.targets?.bmr ?? null}
            tdee={body.targets?.tdee ?? null}
          />

          {dayLog.entries.length === 0 ? (
            /* An empty DAY is one compact row, not a full card (M-125,
               the empty-state rules): the hero above already carries
               the day, so this row only says nothing is in it yet and
               offers the log action. The fresh-account state above
               keeps the full EmptyState — there the empty state IS
               the page's main content. */
            <div className="empty-row nut-rise mt-4" role="status">
              <span className="empty-row-icon" aria-hidden>
                <Sparkles className="size-4" />
              </span>
              <p className="empty-row-text">
                <strong>Nothing logged yet</strong>, when you log a food, it appears here with
                its source attached, and your totals above start to move.
              </p>
              <button
                type="button"
                className="nut-btn nut-btn-ghost nut-btn-sm empty-row-action"
                onClick={() => setSheet({ open: true, meal: null, editing: null })}
              >
                <Plus className="size-3.5" aria-hidden /> Log your first food
              </button>
            </div>
          ) : null}

          <FeelIn className="mt-4 grid items-start gap-4 lg:grid-cols-[1.25fr_1fr]">
            <NutritionTimeline
              entries={dayLog.entries}
              onAdd={(meal) => setSheet({ open: true, meal, editing: null })}
              onEdit={(entry) => setSheet({ open: true, meal: null, editing: entry })}
              onRemove={remove}
            />
            <div className="space-y-8">
              <WeekPanel week={week} targets={targets} reportDay={day} />
              <Spectrum rows={spectrum} sex={nutrition.spectrumSex} />
            </div>
          </FeelIn>
        </>
      )}

      {isToday && yesterdayCount > 0 ? (
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => nutrition.copyDayInto(yesterday, nutrition.today)}
          >
            Copy yesterday's meals
          </Button>
        </div>
      ) : null}

      {/* Today's plan — a plan is built for a day, so it belongs to the
          today view; other days are the record, not the plan. */}
      {isToday ? (
        <FeelIn id="nut-plan" className="nut-jump" delay={60}>
          <NutritionPlanSection />
        </FeelIn>
      ) : null}

      {/* The grocery list + pantry (System 5) — derived from the same
          stored plan the section above renders, so it belongs to the
          today view beside it. With no plan and no logs it has nothing
          to derive, so the merged empty state covers it too. Brief v7
          N5 (§7.1): the plan's shopping list precedes the Twin — the
          day reads plan → balance → adjustments → shopping → Twin. */}
      {isToday && !freshAccount ? (
        <FeelIn id="nut-grocery" className="nut-jump" delay={120}>
          <GrocerySection />
        </FeelIn>
      ) : null}
      {/* The metabolic twin — a standing model of the person, computed
          from the record as of today; it belongs to every day's view
          because it describes the person, not the day being viewed.
          In the merged empty state it steps aside: every one of its
          fields would only read "insufficient". */}
      {!freshAccount ? (
        <FeelIn delay={180}>
          <MetabolicTwinSection />
        </FeelIn>
      ) : null}
      {/* Condition modes (System 14) — the person's own guardrails on
          the plan above; they belong with the plan, on the today view. */}
      {isToday ? (
        <FeelIn id="nut-modes" className="nut-jump" delay={240}>
          <ModesSection />
        </FeelIn>
      ) : null}
      {/* Programmes — a multi-week arc over the plan, the log and
          the weigh-ins; like the plan, it belongs to the today
          view, other days are the record. */}
      {isToday ? (
        <FeelIn id="nut-programmes" className="nut-jump" delay={300}>
          <ProgrammesSection />
        </FeelIn>
      ) : null}

      {/* The dish library (D4) — browsing and logging a recipe belong
          to every day's view; a dish logged from here lands on the day
          being viewed. */}
      <FeelIn id="nut-dishes" className="nut-jump" delay={300}>
        <DishesSection day={day} />
      </FeelIn>

      {/* The pattern lab reads the log, so on a fresh account it is
          one more empty block — the merged state above covers it. */}
      {!freshAccount ? (
        <FeelIn delay={300}>
          <PatternLab patterns={patterns} />
        </FeelIn>
      ) : null}

      {/* Photo credits — the reference foods' photographs are real
          photographs from Wikimedia Commons; their authors and licences
          are credited in full, one tap away (P3-R). */}
      <footer className="mt-8 border-t border-border-subtle pt-4">
        <Button type="button" variant="ghost" size="sm" onClick={() => setCreditsOpen(true)}>
          Photo credits
        </Button>
        <p className="nut-note">
          Food photographs are real photographs from Wikimedia Commons, used under free
          licences, each one credited to its photographer.
        </p>
      </footer>

      <PhotoCreditsSheet open={creditsOpen} onClose={() => setCreditsOpen(false)} />

      <AddFoodSheet
        open={sheet.open}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        day={day}
        editing={sheet.editing}
        initialMeal={sheet.meal}
      />

      <FoodCaptureSheet open={captureOpen} onClose={() => setCaptureOpen(false)} day={day} />

      {undoable ? (
        <div
          key={undoable.id}
          className="nut-undo"
          role="status"
          aria-live="polite"
          data-testid="nutrition-undo"
          style={{ ["--nut-undo-ms" as string]: `${UNDO_WINDOW_MS}ms` }}
        >
          <span className="min-w-0 truncate">{undoable.message}</span>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
            onClick={undo}
          >
            <Undo2 className="size-3.5" aria-hidden /> Undo
          </button>
          <button
            type="button"
            className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Dismiss"
            onClick={() => setUndoable(null)}
          >
            <X className="size-3.5" aria-hidden />
          </button>
          <span className="nut-undo__bar" aria-hidden />
        </div>
      ) : null}
    </div>
  );
}
