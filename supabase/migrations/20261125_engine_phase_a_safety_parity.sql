-- Bloom Vitalis — Engine Phase A: server safety parity (M-250).
--
-- WHY THIS MIGRATION EXISTS
--
-- The authoritative server classifier in
-- `20261105_vitalis_authoritative_safety.sql` predates M-219, the slice
-- that tightened the client classifier
-- (`src/lib/vitalis/safety/classify.ts`, rules version
-- `vitalis-safety-1.1.0`). The M-243 census (docs/BLOOM_ALGORITHM.md,
-- Engine 5) verified the drift: the server mirror still warned at a
-- requested pace above 1.0 kg/week and had NO `underweight_target`
-- destination gate at all, so two pieces of safety law the product
-- believes are enforced everywhere were enforced only in the browser.
--
-- This migration replaces `health_record_safety_event()` with the
-- client classifier's law, rule for rule. It changes NO client
-- behaviour and NO threshold the client does not already enforce:
-- parity means the server catches up to the client's existing law,
-- never new law.
--
-- THE PARITY MAPPING (client rule -> server before -> server after)
--
--   aggressive_rate .... pace > 1.0 kg/wk, summary names "1 kg per
--                        week" -> pace > 0.75 kg/wk (the client's
--                        MAX_RATE_KG_PER_WEEK), summary names 0.75.
--   underweight_target . ABSENT — the server never read a target
--                        weight -> ADDED (section 5b below): the latest
--                        `target_weight` observation, converted with
--                        the same unit table as body weight, judged as
--                        a BMI with the same round-to-1dp formula the
--                        client uses (bmiOf), firing
--                        professional_review_required + blocking when
--                        target BMI < 18.5 and the goal is "lose" —
--                        the client's destination gate (M-219, F-03).
--   medical_condition .. non-high-risk conditions labelled by
--                        underscore-to-space only -> the client's
--                        conditionLabel() mapping: the four caution
--                        codes (type_2_diabetes, pcos, thyroid_disorder,
--                        hypertension) carry their client labels; any
--                        other code still falls back to
--                        underscore-to-space. Classification and
--                        blocking were already identical; only the
--                        summary wording drifted.
--   rules version ...... 'vitalis-safety-1.0.0' -> 'vitalis-safety-1.1.0',
--                        the client's SAFETY_RULES_VERSION, so an audit
--                        row names the law that actually produced it.
--
-- VERIFIED ALREADY AT PARITY (traced rule by rule, unchanged here):
-- urgent_symptom (same 4 codes, urgent_escalation, blocking),
-- age_missing (caution, blocking), adult_only (< 18,
-- professional_review_required, blocking), pregnancy,
-- eating_disorder_history, safety_answers_missing (either answer null,
-- caution, blocking), severe_underweight (BMI < 16),
-- underweight_loss_goal (BMI < 18.5 with a lose goal),
-- high_risk_condition (same 5 codes), medication (caution,
-- non-blocking), unexplained_weight_change, and the verdict assembly
-- itself: findings ordered by class rank descending then rule id,
-- classification = worst rank, blocking = any blocking finding or
-- rank >= professional_review_required, requiresProfessionalReview =
-- rank >= professional_review_required. BMI on both sides is rounded
-- to 1 decimal before any gate reads it.
--
-- PROOF. The shared case corpus in
-- `src/lib/vitalis/safety/safetyParityCases.ts` runs against the client
-- classifier in vitest (safetyParity.test.ts) and is shaped so the same
-- cases can later run against this SQL; the critical constants of this
-- file are pinned statically by
-- `src/lib/vitalis/safety/serverSafetyParity.guard.test.ts`.
--
-- The function keeps its 20261105 contract exactly: no arguments, the
-- caller's stored record only, verdict computed and recorded
-- server-side, append-only audit rows, same grants re-stated below.

create or replace function public.health_record_safety_event()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  uid uuid := auth.uid();
  prof public.health_profiles;
  profile_found boolean := false;
  age_years smallint;
  goal_text text;
  rate numeric;
  height_cm numeric;
  weight_kg numeric;
  target_weight_kg numeric;
  bmi_value numeric;
  target_bmi_value numeric;
  pregnant boolean;
  eating_disorder boolean;
  unexplained boolean;
  conditions jsonb := '[]'::jsonb;
  medications jsonb := '[]'::jsonb;
  symptoms jsonb := '[]'::jsonb;
  urgent constant text[] := array[
    'chest_pain', 'fainting', 'severe_shortness_of_breath', 'uncontrolled_bleeding'
  ];
  high_risk constant text[] := array[
    'type_1_diabetes', 'type_2_diabetes_on_insulin', 'chronic_kidney_disease',
    'cardiovascular_disease', 'eating_disorder_diagnosed'
  ];
  findings jsonb := '[]'::jsonb;
  classification text := 'standard';
  max_rank integer := 0;
  blocking boolean := false;
  fired text[];
  others text[];
  summary text;
  event_id uuid;
  rules_version constant text := 'vitalis-safety-1.1.0';
begin
  if uid is null then
    raise exception 'health_record_safety_event() requires a signed-in user' using errcode = '42501';
  end if;

  select * into prof from public.health_profiles where user_id = uid;
  profile_found := found;

  if profile_found then
    age_years := prof.age_years;
    goal_text := prof.goal;
    rate := prof.rate_kg_per_week;
    -- Each guard is deliberate: health_constraints is client-writable JSON, and
    -- jsonb_array_length()/jsonb_array_elements_text() raise on a non-array. A
    -- malformed value must not take the safety function down.
    if jsonb_typeof(prof.health_constraints) = 'object' then
      if jsonb_typeof(prof.health_constraints->'pregnantOrBreastfeeding') = 'boolean' then
        pregnant := (prof.health_constraints->>'pregnantOrBreastfeeding')::boolean;
      end if;
      if jsonb_typeof(prof.health_constraints->'eatingDisorderHistory') = 'boolean' then
        eating_disorder := (prof.health_constraints->>'eatingDisorderHistory')::boolean;
      end if;
      if jsonb_typeof(prof.health_constraints->'unexplainedWeightChange') = 'boolean' then
        unexplained := (prof.health_constraints->>'unexplainedWeightChange')::boolean;
      end if;
      if jsonb_typeof(prof.health_constraints->'conditions') = 'array' then
        conditions := prof.health_constraints->'conditions';
      end if;
      if jsonb_typeof(prof.health_constraints->'medications') = 'array' then
        medications := prof.health_constraints->'medications';
      end if;
      if jsonb_typeof(prof.health_constraints->'symptoms') = 'array' then
        symptoms := prof.health_constraints->'symptoms';
      end if;
    end if;
  end if;

  -- Latest measurement of each kind, converted to canonical units server-side.
  -- The conversion lives here so a client cannot influence BMI by claiming a
  -- different unit.
  select o.value * case o.unit
           when 'cm' then 1
           when 'm' then 100
           when 'in' then 2.54
         end
    into height_cm
    from public.health_observations o
   where o.user_id = uid and o.kind = 'height'
   order by o.recorded_at desc, o.created_at desc
   limit 1;

  select o.value * case o.unit
           when 'kg' then 1
           when 'lb' then 0.45359237
           when 'g' then 0.001
         end
    into weight_kg
    from public.health_observations o
   where o.user_id = uid and o.kind = 'weight'
   order by o.recorded_at desc, o.created_at desc
   limit 1;

  -- The destination gate's input (M-250): the stated target weight, read
  -- and converted exactly like body weight. A target weight of zero or
  -- less is not a destination (the client's bmiOf returns null for it),
  -- so it is discarded rather than judged.
  select o.value * case o.unit
           when 'kg' then 1
           when 'lb' then 0.45359237
           when 'g' then 0.001
         end
    into target_weight_kg
    from public.health_observations o
   where o.user_id = uid and o.kind = 'target_weight'
   order by o.recorded_at desc, o.created_at desc
   limit 1;

  if target_weight_kg is not null and target_weight_kg <= 0 then
    target_weight_kg := null;
  end if;

  if height_cm is not null and weight_kg is not null and height_cm > 0 then
    bmi_value := round(weight_kg / ((height_cm / 100.0) * (height_cm / 100.0)), 1);
  end if;

  if height_cm is not null and target_weight_kg is not null and height_cm > 0 then
    target_bmi_value := round(target_weight_kg / ((height_cm / 100.0) * (height_cm / 100.0)), 1);
  end if;

  -- 1. Urgent symptoms outrank everything.
  select coalesce(array_agg(case value
             when 'chest_pain' then 'chest pain'
             when 'fainting' then 'fainting or loss of consciousness'
             when 'severe_shortness_of_breath' then 'severe shortness of breath'
             when 'uncontrolled_bleeding' then 'bleeding you cannot stop'
             else value end), '{}')
    into fired
    from jsonb_array_elements_text(symptoms)
   where value = any (urgent);

  if coalesce(array_length(fired, 1), 0) > 0 then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'ruleId', 'urgent_symptom',
      'classification', 'urgent_escalation',
      'summary', 'You reported ' || array_to_string(fired, ', ') ||
                 '. Please contact emergency or urgent care now. Bloom is stopping its suggestions.',
      'blocking', true));
  end if;

  -- 2. Age gates.
  if age_years is null then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'ruleId', 'age_missing',
      'classification', 'caution',
      'summary', 'Bloom needs your age before it can suggest an energy target, because needs change with age.',
      'blocking', true));
  elsif age_years < 18 then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'ruleId', 'adult_only',
      'classification', 'professional_review_required',
      'summary', 'Bloom''s targets are written for adults. Under 18, growth needs a different approach than a calorie plan.',
      'blocking', true));
  end if;

  -- 3. Pregnancy and disordered-eating history.
  if pregnant is true then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'ruleId', 'pregnancy',
      'classification', 'professional_review_required',
      'summary', 'Energy needs during pregnancy and breastfeeding are specific to you. Bloom won''t set them; a clinician can.',
      'blocking', true));
  end if;

  if eating_disorder is true then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'ruleId', 'eating_disorder_history',
      'classification', 'professional_review_required',
      'summary', 'With a history of disordered eating, calorie targets and weight tracking can do more harm than good. Bloom won''t set them.',
      'blocking', true));
  end if;

  -- 4. Unanswered is not "no".
  if pregnant is null or eating_disorder is null then
    summary := 'Bloom can''t confirm a plan is appropriate until you answer: ' ||
      concat_ws(' and ',
        case when pregnant is null then 'pregnancy/breastfeeding' end,
        case when eating_disorder is null then 'eating-disorder history' end) || '.';
    findings := findings || jsonb_build_array(jsonb_build_object(
      'ruleId', 'safety_answers_missing',
      'classification', 'caution',
      'summary', summary,
      'blocking', true));
  end if;

  -- 5. BMI gates.
  if bmi_value is not null and bmi_value < 16 then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'ruleId', 'severe_underweight',
      'classification', 'professional_review_required',
      'summary', 'A BMI of ' || bmi_value::text ||
                 ' is well below the healthy range. That needs a clinician''s input, not a calorie target.',
      'blocking', true));
  elsif bmi_value is not null and bmi_value < 18.5 and goal_text = 'lose' then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'ruleId', 'underweight_loss_goal',
      'classification', 'professional_review_required',
      'summary', 'A BMI of ' || bmi_value::text ||
                 ' is already below the healthy range, so Bloom won''t plan weight loss.',
      'blocking', true));
  end if;

  -- 5b. The destination gate (M-250, mirroring the client's M-219 rule):
  -- a lose goal aimed at a target weight that is itself underweight is
  -- judged by where it ends, not only by where the person starts.
  if target_bmi_value is not null and target_bmi_value < 18.5 and goal_text = 'lose' then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'ruleId', 'underweight_target',
      'classification', 'professional_review_required',
      'summary', 'Your target weight works out to a BMI of ' || target_bmi_value::text ||
                 ', below the healthy range. Bloom won''t plan weight loss toward an underweight goal, please set a target inside the healthy range, or talk it through with a clinician.',
      'blocking', true));
  end if;

  -- 6. Conditions and medication.
  select coalesce(array_agg(case value
             when 'type_1_diabetes' then 'type 1 diabetes'
             when 'type_2_diabetes_on_insulin' then 'type 2 diabetes managed with insulin'
             when 'chronic_kidney_disease' then 'chronic kidney disease'
             when 'cardiovascular_disease' then 'heart or blood-vessel disease'
             when 'eating_disorder_diagnosed' then 'a diagnosed eating disorder'
             else replace(value, '_', ' ') end), '{}')
    into fired
    from jsonb_array_elements_text(conditions)
   where value = any (high_risk);

  if coalesce(array_length(fired, 1), 0) > 0 then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'ruleId', 'high_risk_condition',
      'classification', 'professional_review_required',
      'summary', 'With ' || array_to_string(fired, ', ') ||
                 ', calorie and fluid targets need to be set with your treating clinician.',
      'blocking', true));
  end if;

  -- Labels mirror the client's conditionLabel(): the four caution codes
  -- carry their client labels (M-250); any other code falls back to
  -- underscore-to-space, as the client does.
  select coalesce(array_agg(case value
             when 'type_2_diabetes' then 'type 2 diabetes (not on insulin)'
             when 'pcos' then 'PCOS'
             when 'thyroid_disorder' then 'a thyroid disorder'
             when 'hypertension' then 'high blood pressure (hypertension)'
             else replace(value, '_', ' ') end), '{}')
    into others
    from jsonb_array_elements_text(conditions)
   where not (value = any (high_risk));

  if coalesce(array_length(others, 1), 0) > 0 then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'ruleId', 'medical_condition',
      'classification', 'caution',
      'summary', 'Bloom will keep suggestions conservative because you reported ' ||
                 array_to_string(others, ', ') || '.',
      'blocking', false));
  end if;

  if jsonb_array_length(medications) > 0 then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'ruleId', 'medication',
      'classification', 'caution',
      'summary', 'Some medications change appetite, weight or hydration. Bloom''s estimates can be less accurate while you take them.',
      'blocking', false));
  end if;

  -- 7. Unexplained weight change.
  if unexplained is true then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'ruleId', 'unexplained_weight_change',
      'classification', 'professional_review_required',
      'summary', 'Weight changing without an obvious reason is worth checking with a clinician before changing your intake on purpose.',
      'blocking', true));
  end if;

  -- 8. An aggressive requested pace is allowed but always clamped downstream.
  -- The cap is the client's MAX_RATE_KG_PER_WEEK: 0.75 kg/week (M-219).
  -- The 20261105 mirror still used the retired 1.0 line (M-250).
  if rate is not null and rate > 0.75 then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'ruleId', 'aggressive_rate',
      'classification', 'caution',
      'summary', 'Bloom caps weight change at 0.75 kg per week, so your requested pace will be slowed to that.',
      'blocking', false));
  end if;

  -- Deterministic presentation: severity descending, then rule id.
  select coalesce(jsonb_agg(entry order by rank desc, rule_id), '[]'::jsonb)
    into findings
    from (
      select entry,
             case entry->>'classification'
               when 'urgent_escalation' then 3
               when 'professional_review_required' then 2
               when 'caution' then 1
               else 0 end as rank,
             entry->>'ruleId' as rule_id
        from jsonb_array_elements(findings) as entry
    ) ordered;

  select coalesce(max(case entry->>'classification'
               when 'urgent_escalation' then 3
               when 'professional_review_required' then 2
               when 'caution' then 1
               else 0 end), 0)
    into max_rank
    from jsonb_array_elements(findings) as entry;

  classification := case max_rank
    when 3 then 'urgent_escalation'
    when 2 then 'professional_review_required'
    when 1 then 'caution'
    else 'standard'
  end;

  select exists (
    select 1 from jsonb_array_elements(findings) as entry
     where (entry->>'blocking')::boolean
  ) into blocking;
  blocking := blocking or max_rank >= 2;

  insert into public.health_safety_events (user_id, classification, findings, rules_version)
  values (uid, classification, findings, rules_version)
  returning id into event_id;

  insert into public.health_audit_events (user_id, action, detail)
  values (
    uid,
    'health.safety.classified',
    jsonb_build_object(
      'safety_event_id', event_id,
      'classification', classification,
      'rules_version', rules_version
    )
  );

  return jsonb_build_object(
    'classification', classification,
    'findings', findings,
    'blocking', blocking,
    'requiresProfessionalReview', max_rank >= 2,
    'rulesVersion', rules_version,
    'evaluatedAt', now()
  );
end;
$$;

revoke all on function public.health_record_safety_event() from public;
revoke all on function public.health_record_safety_event() from anon;
grant execute on function public.health_record_safety_event() to authenticated;

comment on function public.health_record_safety_event() is
  'Computes and records the authoritative safety classification for auth.uid() from that user''s stored profile and observations. Takes no arguments: a caller cannot supply a classification or findings. Returns the verdict. Append-only. Brought to parity with the TypeScript classifier (vitalis-safety-1.1.0) by the Engine Phase A migration (M-250): pace line 0.75 kg/week, the underweight_target destination gate, caution-condition labels, rules version 1.1.0.';
