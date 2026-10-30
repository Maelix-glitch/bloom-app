/**
 * Body & daily targets — the advanced half of the trackers page.
 *
 * Everything here is derived from what the person enters and what they have
 * already logged today:
 *   · BMI with the healthy range for their height
 *   · resting burn (BMR) and daily burn (TDEE)
 *   · an energy target for lose / maintain / gain, with a safety floor
 *   · protein and hydration targets
 *   · a goal date, only when there is a goal weight
 *   · "how much water now", using the water already logged in Trackers
 *
 * Mobile-first on purpose: this is a tool, not a dashboard, so the first
 * screen is the answer and the form stays collapsed once data exists.
 */

import { useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, Calculator, Droplets, Flame, Pencil, Ruler, Scale, Target, Trash2 } from "lucide-react";

import { useBodyProfile } from "@/hooks/useBodyProfile";
import { useTrackers } from "@/hooks/useTrackers";
import { trackerDef } from "@/lib/trackers/core";
import {
  ACTIVITY_LABEL,
  BMI_BAND_LABEL,
  GOAL_LABEL,
  bmiScalePosition,
  hydrationStatus,
  isBodyReady,
  type ActivityLevel,
  type BodyGoal,
  type BodyProfile,
  type BodySex,
} from "@/lib/health/body";
import { formatDate } from "@/lib/cycle/predict";
import { cn } from "@/lib/utils";

import "@/styles/health-tools.css";

const NUM = (value: string): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function Field({
  label,
  value,
  onChange,
  suffix,
  placeholder,
  min,
  max,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="bt-field">
      <span className="bt-field__label">{label}</span>
      <span className="bt-field__input">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step ?? 0.1}
          onChange={(event) => onChange(event.target.value)}
        />
        {suffix ? <span className="bt-field__suffix">{suffix}</span> : null}
      </span>
    </label>
  );
}

function BodyForm({ initial, onDone }: { initial: BodyProfile; onDone: () => void }) {
  const { save } = useBodyProfile();
  const [units, setUnits] = useState(initial.units);
  const imperial = units === "imperial";
  const [heightCm, setHeightCm] = useState(
    initial.heightCm ? String(imperial ? Math.round(initial.heightCm / 2.54) : initial.heightCm) : "",
  );
  const [weight, setWeight] = useState(
    initial.weightKg ? String(imperial ? Math.round(initial.weightKg * 2.20462 * 10) / 10 : initial.weightKg) : "",
  );
  const [target, setTarget] = useState(
    initial.targetWeightKg
      ? String(imperial ? Math.round(initial.targetWeightKg * 2.20462 * 10) / 10 : initial.targetWeightKg)
      : "",
  );
  const [age, setAge] = useState(initial.age ? String(initial.age) : "");
  const [sex, setSex] = useState<BodySex>(initial.sex);
  const [activity, setActivity] = useState<ActivityLevel>(initial.activity);
  const [goal, setGoal] = useState<BodyGoal>(initial.goal);
  const [rate, setRate] = useState(String(initial.rateKgPerWeek));
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const heightValue = NUM(heightCm);
    const weightValue = NUM(weight);
    const ageValue = NUM(age);
    const toCm = imperial && heightValue !== null ? heightValue * 2.54 : heightValue;
    const toKg = imperial && weightValue !== null ? weightValue / 2.20462 : weightValue;
    const targetKg = imperial && NUM(target) !== null ? NUM(target)! / 2.20462 : NUM(target);

    if (!toCm || toCm < 120 || toCm > 230) {
      setError("Add a height between 120 and 230 cm.");
      return;
    }
    if (!toKg || toKg < 30 || toKg > 300) {
      setError("Add a weight between 30 and 300 kg.");
      return;
    }
    if (!ageValue || ageValue < 13 || ageValue > 110) {
      setError("Add an age between 13 and 110 — the metabolism estimate needs it.");
      return;
    }
    if (goal !== "maintain" && targetKg !== null && (targetKg < 30 || targetKg > 300)) {
      setError("That goal weight looks too far outside the supported range.");
      return;
    }

    save({
      units,
      heightCm: Math.round(toCm * 10) / 10,
      weightKg: Math.round(toKg * 10) / 10,
      targetWeightKg: targetKg !== null ? Math.round(targetKg * 10) / 10 : null,
      age: Math.round(ageValue),
      sex,
      activity,
      goal,
      rateKgPerWeek: Math.min(1, Math.max(0.25, NUM(rate) ?? 0.5)),
    });
    setError(null);
    onDone();
  };

  return (
    <div className="bt-form">
      <div className="bt-seg" role="group" aria-label="Units">
        <button type="button" aria-pressed={!imperial} onClick={() => setUnits("metric")}>
          Metric
        </button>
        <button type="button" aria-pressed={imperial} onClick={() => setUnits("imperial")}>
          Imperial
        </button>
      </div>

      <div className="bt-form__grid">
        <Field
          label="Height"
          value={heightCm}
          onChange={setHeightCm}
          suffix={imperial ? "in" : "cm"}
          placeholder={imperial ? "69" : "175"}
          min={imperial ? 47 : 120}
          max={imperial ? 91 : 230}
        />
        <Field
          label="Weight"
          value={weight}
          onChange={setWeight}
          suffix={imperial ? "lb" : "kg"}
          placeholder={imperial ? "154" : "70"}
          min={imperial ? 66 : 30}
          max={imperial ? 661 : 300}
        />
        <Field label="Age" value={age} onChange={setAge} suffix="yrs" placeholder="28" min={13} max={110} step={1} />
        <label className="bt-field">
          <span className="bt-field__label">Biological sex (for the estimate)</span>
          <select value={sex} onChange={(event) => setSex(event.target.value as BodySex)}>
            <option value="unspecified">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </label>
      </div>

      <label className="bt-field">
        <span className="bt-field__label">Activity</span>
        <select value={activity} onChange={(event) => setActivity(event.target.value as ActivityLevel)}>
          {(Object.keys(ACTIVITY_LABEL) as ActivityLevel[]).map((key) => (
            <option key={key} value={key}>
              {ACTIVITY_LABEL[key]}
            </option>
          ))}
        </select>
      </label>

      <div className="bt-form__grid">
        <label className="bt-field">
          <span className="bt-field__label">Goal</span>
          <select value={goal} onChange={(event) => setGoal(event.target.value as BodyGoal)}>
            {(Object.keys(GOAL_LABEL) as BodyGoal[]).map((key) => (
              <option key={key} value={key}>
                {GOAL_LABEL[key]}
              </option>
            ))}
          </select>
        </label>
        {goal !== "maintain" ? (
          <>
            <Field
              label="Goal weight"
              value={target}
              onChange={setTarget}
              suffix={imperial ? "lb" : "kg"}
              placeholder={imperial ? "143" : "65"}
            />
            <label className="bt-field">
              <span className="bt-field__label">Pace</span>
              <select value={rate} onChange={(event) => setRate(event.target.value)}>
                <option value="0.25">Gentle · 0.25 kg/week</option>
                <option value="0.5">Steady · 0.5 kg/week</option>
                <option value="0.75">Faster · 0.75 kg/week</option>
                <option value="1">Aggressive · 1 kg/week</option>
              </select>
            </label>
          </>
        ) : null}
      </div>

      {error ? (
        <p className="bt-error" role="alert">
          {error}
        </p>
      ) : null}

      <button type="button" className="bt-primary" onClick={submit}>
        <Calculator className="size-4" strokeWidth={1.8} aria-hidden />
        Save my numbers
      </button>
      <p className="bt-note">
        These are standard estimates (Mifflin–St Jeor, 35 ml/kg), not medical advice. The calorie
        target never goes below a safe floor for the sex you selected.
      </p>
    </div>
  );
}

export function HealthTools({ className }: { className?: string }) {
  const body = useBodyProfile();
  const trackers = useTrackers();
  const [editing, setEditing] = useState(false);
  const [weighIn, setWeighIn] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  const todayWater =
    trackers.days.find((day) => day.date === trackers.today)?.waterMl ?? null;
  const targets = body.targets;
  const ready = isBodyReady(body.profile) && targets !== null;
  const hydration = targets ? hydrationStatus(targets.waterMl, todayWater) : null;
  const lastWeighIns = body.weighIns.slice(-6).reverse();
  const weightDelta =
    body.weighIns.length >= 2
      ? Math.round(
          (body.weighIns[body.weighIns.length - 1]!.kg - body.weighIns[0]!.kg) * 10,
        ) / 10
      : null;

  const doWeighIn = () => {
    const value = NUM(weighIn);
    if (!value) return;
    body.logWeight(value);
    setWeighIn("");
    setSaved(`Today's weight saved — ${value} kg.`);
    window.setTimeout(() => setSaved(null), 3200);
  };

  return (
    <section id="body-tools" className={cn("bt-shell", className)} aria-labelledby="bt-title">
      <header className="bt-head">
        <div>
          <p className="bt-kicker">
            <Activity className="size-3.5" strokeWidth={1.8} aria-hidden />
            Advanced tools
          </p>
          <h2 id="bt-title" className="bt-title">
            Body &amp; daily targets
          </h2>
          <p className="bt-lede">
            Turn your height and weight into numbers you can actually use: BMI with your healthy
            range, daily energy, protein, and how much water is left today.
          </p>
        </div>
        {ready && !editing ? (
          <button type="button" className="bt-ghost" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" strokeWidth={1.8} aria-hidden />
            Edit numbers
          </button>
        ) : null}
      </header>

      {!ready || editing ? (
        <BodyForm initial={body.profile} onDone={() => setEditing(false)} />
      ) : (
        <>
          <div className="bt-cards">
            <article className="bt-card bt-card--bmi">
              <p className="bt-card__label">
                <Scale className="size-3.5" strokeWidth={1.8} aria-hidden />
                BMI
              </p>
              <p className="bt-value">
                {targets.bmi.toFixed(1)}
                <span className="bt-value__unit">kg/m²</span>
              </p>
              <p className="bt-card__sub">{BMI_BAND_LABEL[targets.bmiBand]}</p>
              <div className="bt-scale" aria-hidden>
                <span
                  className="bt-scale__marker"
                  data-band={targets.bmiBand}
                  style={{ left: `${bmiScalePosition(targets.bmi) * 100}%` }}
                />
              </div>
              <p className="bt-card__foot">
                Healthy weight for your height: {targets.healthyWeight.min}–{targets.healthyWeight.max} kg
              </p>
            </article>

            <article className="bt-card bt-card--energy">
              <p className="bt-card__label">
                <Flame className="size-3.5" strokeWidth={1.8} aria-hidden />
                Daily energy
              </p>
              <p className="bt-value">
                {targets.calories.toLocaleString()}
                <span className="bt-value__unit">kcal</span>
              </p>
              <p className="bt-card__sub">
                {body.profile.goal === "maintain"
                  ? "to stay where you are"
                  : body.profile.goal === "lose"
                    ? `a ${Math.abs(targets.calorieDelta)} kcal deficit`
                    : `a ${Math.abs(targets.calorieDelta)} kcal surplus`}
              </p>
              <dl className="bt-mini">
                <div>
                  <dt>Resting burn</dt>
                  <dd>{targets.bmr.toLocaleString()} kcal</dd>
                </div>
                <div>
                  <dt>With activity</dt>
                  <dd>{targets.tdee.toLocaleString()} kcal</dd>
                </div>
                <div>
                  <dt>Protein</dt>
                  <dd>{targets.proteinG} g</dd>
                </div>
              </dl>
              {targets.floorApplied ? (
                <p className="bt-card__foot bt-card__foot--warn">
                  Held at the safe minimum for your selection — a faster pace isn't worth eating
                  less than this.
                </p>
              ) : null}
            </article>

            <article className="bt-card bt-card--water">
              <p className="bt-card__label">
                <Droplets className="size-3.5" strokeWidth={1.8} aria-hidden />
                Water right now
              </p>
              <p className="bt-value">
                {hydration!.remaining > 0 ? hydration!.remaining.toLocaleString() : "Done"}
                <span className="bt-value__unit">{hydration!.remaining > 0 ? "ml left" : ""}</span>
              </p>
              <p className="bt-card__sub">
                {hydration!.met
                  ? `${hydration!.drank} ml logged — target met.`
                  : `You've logged ${hydration!.drank} ml of ${targets.waterMl} ml today.`}
              </p>
              <div className="bt-bar" aria-hidden>
                <span style={{ width: `${Math.round(hydration!.percent * 100)}%` }} />
              </div>
              <p className="bt-card__foot">
                {hydration!.met
                  ? "Nothing more to chase — sip when thirsty."
                  : `About ${hydration!.glasses} × 250 ml glass${hydration!.glasses === 1 ? "" : "es"} to go.`}
              </p>
              <a className="bt-inline-link" href="#trackers">
                Log water in Trackers ↑
              </a>
            </article>
          </div>

          {body.profile.goal !== "maintain" && targets.targetWeightKg ? (
            <article className="bt-goal">
              <div className="bt-goal__head">
                <p className="bt-card__label">
                  <Target className="size-3.5" strokeWidth={1.8} aria-hidden />
                  Your goal
                </p>
                <button type="button" className="bt-ghost bt-ghost--sm" onClick={() => setEditing(true)}>
                  Change
                </button>
              </div>
              <p className="bt-goal__line">
                {body.profile.weightKg} kg → {targets.targetWeightKg} kg
                <span className="bt-goal__rate">
                  {body.profile.goal === "lose" ? "−" : "+"}
                  {body.profile.rateKgPerWeek} kg/week
                </span>
              </p>
              {targets.weeksToGoal && targets.goalDate ? (
                <p className="bt-card__foot">
                  At that pace: about {targets.weeksToGoal} weeks, around{" "}
                  {formatDate(targets.goalDate)}. A slower week is not a failure — the date moves
                  with the record, not against you.
                </p>
              ) : (
                <p className="bt-card__foot">You're at your goal weight. Maintaining is the plan now.</p>
              )}
              <p className="bt-note">
                A rate above ~1 kg/week is not recommended without a clinician; the app caps it here
                rather than pretending it's fine.
              </p>
            </article>
          ) : null}

          <article className="bt-weigh">
            <div className="bt-weigh__head">
              <p className="bt-card__label">
                <Scale className="size-3.5" strokeWidth={1.8} aria-hidden />
                Weight check-in
              </p>
              {weightDelta !== null ? (
                <span className={cn("bt-delta", weightDelta <= 0 ? "is-down" : "is-up")}>
                  {weightDelta <= 0 ? (
                    <ArrowDownRight className="size-3.5" aria-hidden />
                  ) : (
                    <ArrowUpRight className="size-3.5" aria-hidden />
                  )}
                  {Math.abs(weightDelta)} kg since your first entry
                </span>
              ) : null}
            </div>
            <div className="bt-weigh__row">
              <label className="bt-field bt-field--inline">
                <span className="sr-only">Today's weight in kg</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={weighIn}
                  placeholder={`${body.profile.weightKg ?? 70}`}
                  step={0.1}
                  min={25}
                  max={350}
                  onChange={(event) => setWeighIn(event.target.value)}
                />
                <span className="bt-field__suffix">kg</span>
              </label>
              <button type="button" className="bt-primary bt-primary--sm" onClick={doWeighIn}>
                Log today
              </button>
            </div>
            {saved ? (
              <p className="bt-saved" role="status">
                {saved}
              </p>
            ) : null}
            {lastWeighIns.length > 0 ? (
              <ul className="bt-log">
                {lastWeighIns.map((entry) => (
                  <li key={entry.date}>
                    <span>{formatDate(entry.date)}</span>
                    <b>{entry.kg} kg</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="bt-note">No weigh-ins yet. One a week is plenty.</p>
            )}
            <div className="bt-weigh__foot">
              <p className="bt-note">
                <Ruler className="mr-1 inline size-3" aria-hidden />
                Height {body.profile.heightCm} cm · logged privately on your account.
              </p>
              <button
                type="button"
                className="bt-danger"
                onClick={() => {
                  body.clear();
                  setWeighIn("");
                }}
              >
                <Trash2 className="size-3.5" aria-hidden />
                Clear body data
              </button>
            </div>
          </article>
        </>
      )}
    </section>
  );
}
