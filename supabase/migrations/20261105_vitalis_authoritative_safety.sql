-- Bloom Vitalis — authoritative server-side safety boundary, and explicit
-- database privileges.
--
-- WHY THIS REPLACES THE PHASE 1 SAFETY RPC
--
-- Phase 1 accepted a classification and a findings array from the client and
-- only checked their shape. That meant a client could submit "standard" for a
-- person whose own record says a blocking rule applies, and the audit table
-- would then contain a misleading authoritative row. Shape validation is not
-- verification.
--
-- `health_record_safety_event()` now takes NO arguments. It reads the caller's
-- stored profile and observations, derives the safety input itself, applies the
-- versioned rules, and returns the verdict. A client can ask for a fresh
-- classification; it cannot state one. The dropped three-argument version is
-- removed, not merely revoked, so there is no callable surface left that
-- accepts a verdict.
--
-- The rules below mirror `src/lib/vitalis/safety/classify.ts` rule for rule
-- (same ids, same classes, same blocking flags, same ordering). The SQL is
-- authoritative; the TypeScript classifier is a preview, and an integration
-- test seeds identical fixtures through both and compares the verdicts so the
-- two cannot silently drift.
--
-- PRIVILEGES. Earlier the tables relied on Supabase's default grants, under
-- which `anon` receives ALL on new public tables. That is not something to
-- leave implicit for health data, so every privilege below is now stated.

-- ---------------------------------------------------------------------------
-- The goal may legitimately be unanswered
-- ---------------------------------------------------------------------------

-- Phase 1 allowed `goal` to be null in the domain model but the column kept a
-- default. A default is not an answer, and treating it as one let a fresh
-- profile look like it had chosen "general health".
alter table public.health_profiles alter column goal drop default;
alter table public.health_profiles alter column goal drop not null;

-- ---------------------------------------------------------------------------
-- Explicit table privileges
-- ---------------------------------------------------------------------------

revoke all on table public.health_profiles from public;
revoke all on table public.health_profiles from anon;
revoke all on table public.health_profiles from authenticated;
grant select, insert, update, delete on table public.health_profiles to authenticated;
grant select on table public.health_profiles to service_role;

revoke all on table public.health_observations from public;
revoke all on table public.health_observations from anon;
revoke all on table public.health_observations from authenticated;
grant select, insert, update, delete on table public.health_observations to authenticated;
grant select on table public.health_observations to service_role;

revoke all on table public.health_consents from public;
revoke all on table public.health_consents from anon;
revoke all on table public.health_consents from authenticated;
grant select, insert, update, delete on table public.health_consents to authenticated;
grant select on table public.health_consents to service_role;

-- Safety and audit records are owner-readable and nobody-writable. Not even the
-- owner may DELETE them directly; erasure goes through erase_my_data().
revoke all on table public.health_safety_events from public;
revoke all on table public.health_safety_events from anon;
revoke all on table public.health_safety_events from authenticated;
grant select on table public.health_safety_events to authenticated;
grant select on table public.health_safety_events to service_role;

revoke all on table public.health_audit_events from public;
revoke all on table public.health_audit_events from anon;
revoke all on table public.health_audit_events from authenticated;
grant select on table public.health_audit_events to authenticated;
grant select on table public.health_audit_events to service_role;

-- Sequences behind the identity column need the same treatment, otherwise the
-- (unusable) INSERT grant would still expose a sequence to probe.
revoke all on sequence public.health_audit_events_id_seq from public;
revoke all on sequence public.health_audit_events_id_seq from anon;
revoke all on sequence public.health_audit_events_id_seq from authenticated;
grant usage, select on sequence public.health_audit_events_id_seq to service_role;

-- ---------------------------------------------------------------------------
-- Append-only enforcement, at the table rather than only in policy
-- ---------------------------------------------------------------------------

-- Row-level security stops clients writing these rows, but RLS is bypassed by
-- the table owner and by service_role. This trigger makes "append-only" a
-- property of the table. Deletes are still allowed, because account erasure
-- must be able to remove a person's own rows; updates are not.
create or replace function public.health_reject_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception '% is append-only and cannot be updated', tg_table_name using errcode = '42501';
end;
$$;

revoke all on function public.health_reject_mutation() from public;
revoke all on function public.health_reject_mutation() from anon;
revoke all on function public.health_reject_mutation() from authenticated;

drop trigger if exists health_safety_events_append_only on public.health_safety_events;
create trigger health_safety_events_append_only
  before update on public.health_safety_events
  for each row execute function public.health_reject_mutation();

drop trigger if exists health_audit_events_append_only on public.health_audit_events;
create trigger health_audit_events_append_only
  before update on public.health_audit_events
  for each row execute function public.health_reject_mutation();

-- ---------------------------------------------------------------------------
-- Remove the client-supplied verdict surface
-- ---------------------------------------------------------------------------

-- Dropped, not just revoked: a revoked function can be re-granted by mistake,
-- and an argument list that accepts a classification is the hazard itself.
drop function if exists public.health_record_safety_event(text, jsonb, text);

-- ---------------------------------------------------------------------------
-- Authoritative classification
-- ---------------------------------------------------------------------------

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
  bmi_value numeric;
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
  rules_version constant text := 'vitalis-safety-1.0.0';
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

  if height_cm is not null and weight_kg is not null and height_cm > 0 then
    bmi_value := round(weight_kg / ((height_cm / 100.0) * (height_cm / 100.0)), 1);
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

  select coalesce(array_agg(replace(value, '_', ' ')), '{}')
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
  if rate is not null and rate > 1 then
    findings := findings || jsonb_build_array(jsonb_build_object(
      'ruleId', 'aggressive_rate',
      'classification', 'caution',
      'summary', 'Bloom caps weight change at 1 kg per week, so your requested pace will be slowed to that.',
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
  'Computes and records the authoritative safety classification for auth.uid() from that user''s stored profile and observations. Takes no arguments: a caller cannot supply a classification or findings. Returns the verdict. Append-only; the TypeScript classifier in src/lib/vitalis/safety is a preview that this function outranks.';

-- Re-state the Phase 1 function privileges explicitly, so this migration is the
-- single place where the Vitalis grant surface can be reviewed.
revoke all on function public.health_record_observation(text, numeric, text, text, timestamptz, text, text, numeric, text) from public;
revoke all on function public.health_record_observation(text, numeric, text, text, timestamptz, text, text, numeric, text) from anon;
grant execute on function public.health_record_observation(text, numeric, text, text, timestamptz, text, text, numeric, text) to authenticated;

revoke all on function public.health_set_consent(text, boolean, text) from public;
revoke all on function public.health_set_consent(text, boolean, text) from anon;
grant execute on function public.health_set_consent(text, boolean, text) to authenticated;

revoke all on function public.erase_my_data() from public;
revoke all on function public.erase_my_data() from anon;
grant execute on function public.erase_my_data() to authenticated;
