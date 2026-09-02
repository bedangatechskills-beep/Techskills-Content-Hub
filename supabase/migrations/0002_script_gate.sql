-- ============================================================================
-- 0002_script_gate.sql — Phase 2: script versions, AI evaluations, script
-- approval, material-change detection, Nepali verification.
-- Rules: versions are append-only; AI is advisory and never moves a stage or
--        approves; approvals are immutable rows; reasons mandatory for change
--        requests, dismissed flags and material changes.
-- ============================================================================

create type public.script_approval_status as enum ('draft','submitted','approved','superseded','changes_requested');
create type public.approval_decision as enum ('approved','changes_requested');
create type public.ai_evaluation_type as enum ('script','creative');
create type public.flag_action as enum ('resolved','dismissed');

-- ---------------------------------------------------------------------------
-- Settings (workflow configuration, admin-editable)
-- ---------------------------------------------------------------------------
create table public.app_settings (
  key        text primary key,
  value      jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

insert into public.app_settings (key, value, description) values
  ('require_ai_before_submit', 'true', 'A completed AI script evaluation is required before submitting a version for approval'),
  ('script_reapproval_required', 'true', 'A material script change after approval sends the record back to Script Approval'),
  ('ai_provider_label', '"mock"', 'Informational: which provider the Edge Function is configured to use');

create or replace function public.setting_bool(p_key text, p_default boolean default false)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select (value)::text::boolean from public.app_settings where key = p_key and jsonb_typeof(value) = 'boolean'), p_default);
$$;

-- ---------------------------------------------------------------------------
-- Script versions (§24–25)
-- ---------------------------------------------------------------------------
create table public.script_versions (
  id                 uuid primary key default gen_random_uuid(),
  content_id         uuid not null references public.content_records(id),
  version_no         int not null,
  body               text not null check (length(trim(body)) > 0),
  script_shape       public.script_shape not null default 'spoken',
  change_summary     text,
  is_material_change boolean,          -- null = not yet answered (only meaningful after an approval exists)
  material_reason    text,
  approval_status    public.script_approval_status not null default 'draft',
  created_by         uuid references public.profiles(id),
  created_at         timestamptz not null default now(),
  unique (content_id, version_no)
);
create index script_versions_content_idx on public.script_versions(content_id, version_no desc);

alter table public.content_records
  add constraint content_records_current_script_fkey foreign key (current_script_version_id) references public.script_versions(id),
  add constraint content_records_approved_script_fkey foreign key (approved_script_version_id) references public.script_versions(id);

-- ---------------------------------------------------------------------------
-- Script approvals (immutable rows)
-- ---------------------------------------------------------------------------
create table public.script_approvals (
  id                uuid primary key default gen_random_uuid(),
  content_id        uuid not null references public.content_records(id),
  script_version_id uuid not null references public.script_versions(id),
  approver_id       uuid not null references public.profiles(id),
  decision          public.approval_decision not null,
  reason            text,
  created_at        timestamptz not null default now()
);
create index script_approvals_content_idx on public.script_approvals(content_id, created_at desc);

-- ---------------------------------------------------------------------------
-- AI evaluations (§105) and flag resolutions
-- ---------------------------------------------------------------------------
create table public.ai_evaluations (
  id                  uuid primary key default gen_random_uuid(),
  content_id          uuid not null references public.content_records(id),
  evaluation_type     public.ai_evaluation_type not null,
  script_version_id   uuid references public.script_versions(id),
  creative_version_id uuid,                     -- fk added in Phase 3
  provider            text not null,
  model               text not null,
  prompt_version      text not null,
  input_hash          text not null,
  overall_score       numeric(3,1),
  category_scores     jsonb not null default '{}'::jsonb,
  recommendations     jsonb not null default '[]'::jsonb,
  hard_flags          jsonb not null default '[]'::jsonb,
  verdict             text,
  summary             text,
  raw_response        jsonb,
  requested_by        uuid references public.profiles(id),
  duration_ms         int,
  created_at          timestamptz not null default now()
);
create index ai_evaluations_content_idx on public.ai_evaluations(content_id, created_at desc);
create index ai_evaluations_version_idx on public.ai_evaluations(script_version_id, created_at desc);
create index ai_evaluations_hash_idx on public.ai_evaluations(input_hash);

create table public.ai_flag_resolutions (
  id            uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.ai_evaluations(id),
  flag_key      text not null,
  flag_index    int not null,
  action        public.flag_action not null,
  reason        text,
  actor_id      uuid not null references public.profiles(id),
  created_at    timestamptz not null default now(),
  unique (evaluation_id, flag_index)
);

-- Material change transitions: the author can send the record back to Script
-- Approval from any post-approval stage, always with a reason.
insert into public.allowed_transitions (from_status, to_status, permission_key, reason_required, is_backward, label)
select s, 'script_approval', 'script.edit', true, true, 'Material script change'
from unnest(array['ready_for_production','production','production_review','dm_review','changes_required','content_review','ready_for_final_approval','final_approval']) s
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.latest_script_evaluation(p_version_id uuid)
returns public.ai_evaluations language sql stable security definer set search_path = public as $$
  select * from public.ai_evaluations
  where script_version_id = p_version_id and evaluation_type = 'script'
  order by created_at desc limit 1;
$$;

-- ---------------------------------------------------------------------------
-- create_script_version(content, body, change_summary)
-- ---------------------------------------------------------------------------
create or replace function public.create_script_version(p_content_id uuid, p_body text, p_change_summary text default null)
returns public.script_versions
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.auth_profile_id();
  v_rec public.content_records;
  v_ver public.script_versions;
  v_no int;
  v_shape public.script_shape;
begin
  if not public.has_permission('script.edit') then
    raise exception 'script.edit permission required' using errcode = '42501';
  end if;
  if coalesce(trim(p_body), '') = '' then
    raise exception 'script body is required' using errcode = '22023';
  end if;

  select * into v_rec from public.content_records where id = p_content_id for update;
  if v_rec.id is null then raise exception 'content record not found' using errcode = 'P0002'; end if;

  select coalesce(max(version_no), 0) + 1 into v_no from public.script_versions where content_id = p_content_id;
  select ct.script_shape into v_shape from public.content_types ct where ct.id = v_rec.content_type_id;

  insert into public.script_versions (content_id, version_no, body, script_shape, change_summary, created_by,
                                      is_material_change)
  values (p_content_id, v_no, p_body, coalesce(v_shape, 'spoken'), nullif(trim(p_change_summary), ''), v_me,
          case when v_rec.approved_script_version_id is null then false else null end)
  returning * into v_ver;

  update public.content_records set current_script_version_id = v_ver.id, updated_by = v_me where id = p_content_id;

  perform public.log_activity(p_content_id, 'script_version_created',
    format('%s created script V%s on %s%s', public.actor_name(), v_no, v_rec.content_id,
           case when v_ver.change_summary is not null then ' — ' || v_ver.change_summary else '' end),
    null, jsonb_build_object('version_id', v_ver.id, 'version_no', v_no));

  if v_rec.approved_script_version_id is not null then
    perform public.log_activity(p_content_id, 'script_changed_after_approval',
      format('%s changed the script after approval (V%s); material or not is pending', public.actor_name(), v_no),
      jsonb_build_object('approved_version_id', v_rec.approved_script_version_id), jsonb_build_object('version_id', v_ver.id));
  end if;

  return v_ver;
end $$;

-- ---------------------------------------------------------------------------
-- mark_version_material(version, is_material, reason)
-- ---------------------------------------------------------------------------
create or replace function public.mark_version_material(p_version_id uuid, p_is_material boolean, p_reason text default null)
returns public.script_versions
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.auth_profile_id();
  v_ver public.script_versions;
  v_rec public.content_records;
begin
  if not public.has_permission('script.edit') then
    raise exception 'script.edit permission required' using errcode = '42501';
  end if;
  select * into v_ver from public.script_versions where id = p_version_id for update;
  if v_ver.id is null then raise exception 'script version not found' using errcode = 'P0002'; end if;
  select * into v_rec from public.content_records where id = v_ver.content_id for update;

  if v_rec.approved_script_version_id is null then
    raise exception 'no approved script exists; nothing to compare against' using errcode = '22023';
  end if;
  if v_rec.current_script_version_id <> p_version_id then
    raise exception 'only the current version can be classified' using errcode = '22023';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'a reason is required when classifying a change after approval' using errcode = '23514';
  end if;

  update public.script_versions set is_material_change = p_is_material, material_reason = trim(p_reason)
   where id = p_version_id returning * into v_ver;

  perform public.log_activity(v_rec.id, 'script_material_change',
    format('%s marked script V%s as %s change', public.actor_name(), v_ver.version_no,
           case when p_is_material then 'a MATERIAL' else 'a non-material' end),
    null, jsonb_build_object('version_id', p_version_id, 'is_material', p_is_material), p_reason);

  if p_is_material and public.setting_bool('script_reapproval_required', true) then
    -- Old approval stays in history; pointer is cleared; version superseded.
    update public.script_versions set approval_status = 'superseded'
     where id = v_rec.approved_script_version_id and approval_status = 'approved';
    update public.content_records set approved_script_version_id = null, updated_by = v_me where id = v_rec.id;
    update public.script_versions set approval_status = 'submitted' where id = p_version_id;

    if v_rec.status_key <> 'script_approval' then
      perform public.move_stage(v_rec.id, 'script_approval', 'Material script change: ' || trim(p_reason));
    end if;
    perform public.notify(public.final_approvers(), v_rec.id, 're_approval_required',
      format('%s needs script re-approval', v_rec.content_id),
      format('V%s is a material change: %s', v_ver.version_no, trim(p_reason)));
  end if;

  return v_ver;
end $$;

-- ---------------------------------------------------------------------------
-- submit_script_for_approval(version)
-- ---------------------------------------------------------------------------
create or replace function public.submit_script_for_approval(p_version_id uuid)
returns public.content_records
language plpgsql security definer set search_path = public as $$
declare
  v_ver public.script_versions;
  v_rec public.content_records;
  v_eval public.ai_evaluations;
begin
  if not public.has_permission('script.submit') then
    raise exception 'script.submit permission required' using errcode = '42501';
  end if;
  select * into v_ver from public.script_versions where id = p_version_id;
  if v_ver.id is null then raise exception 'script version not found' using errcode = 'P0002'; end if;
  select * into v_rec from public.content_records where id = v_ver.content_id for update;
  if v_rec.current_script_version_id <> p_version_id then
    raise exception 'only the current version can be submitted' using errcode = '22023';
  end if;
  if v_rec.status_key <> 'script_copy' then
    raise exception 'the record must be in Script / Copy to submit' using errcode = '22023';
  end if;
  if public.setting_bool('require_ai_before_submit', true) then
    v_eval := public.latest_script_evaluation(p_version_id);
    if v_eval.id is null then
      raise exception 'run the AI script check on this version before submitting' using errcode = '23514';
    end if;
  end if;

  update public.script_versions set approval_status = 'submitted' where id = p_version_id;
  perform public.log_activity(v_rec.id, 'script_submitted',
    format('%s submitted script V%s of %s for approval', public.actor_name(), v_ver.version_no, v_rec.content_id),
    null, jsonb_build_object('version_id', p_version_id));

  v_rec := public.move_stage(v_rec.id, 'script_approval', null);
  perform public.notify(public.final_approvers(), v_rec.id, 'script_ready_for_review',
    format('%s script V%s is ready for review', v_rec.content_id, v_ver.version_no), v_rec.title);
  return v_rec;
end $$;

-- ---------------------------------------------------------------------------
-- approve_script(version) / request_script_changes(version, reason)
-- ---------------------------------------------------------------------------
create or replace function public.approve_script(p_version_id uuid)
returns public.content_records
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.auth_profile_id();
  v_ver public.script_versions;
  v_rec public.content_records;
begin
  if not public.has_permission('script.approve') then
    raise exception 'script.approve permission required' using errcode = '42501';
  end if;
  select * into v_ver from public.script_versions where id = p_version_id;
  if v_ver.id is null then raise exception 'script version not found' using errcode = 'P0002'; end if;
  select * into v_rec from public.content_records where id = v_ver.content_id for update;
  if v_rec.status_key <> 'script_approval' then
    raise exception 'the record is not awaiting script approval' using errcode = '22023';
  end if;
  if v_rec.current_script_version_id <> p_version_id then
    raise exception 'only the current version can be approved' using errcode = '22023';
  end if;

  update public.script_versions set approval_status = 'superseded'
   where content_id = v_rec.id and approval_status = 'approved' and id <> p_version_id;
  update public.script_versions set approval_status = 'approved', is_material_change = coalesce(is_material_change, false)
   where id = p_version_id;
  update public.content_records set approved_script_version_id = p_version_id, updated_by = v_me where id = v_rec.id;

  insert into public.script_approvals (content_id, script_version_id, approver_id, decision)
  values (v_rec.id, p_version_id, v_me, 'approved');

  perform public.log_activity(v_rec.id, 'script_approved',
    format('Script V%s approved by %s', v_ver.version_no, public.actor_name()),
    null, jsonb_build_object('version_id', p_version_id, 'version_no', v_ver.version_no));

  v_rec := public.move_stage(v_rec.id, 'ready_for_production', null);
  return v_rec;
end $$;

create or replace function public.request_script_changes(p_version_id uuid, p_reason text)
returns public.content_records
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.auth_profile_id();
  v_ver public.script_versions;
  v_rec public.content_records;
begin
  if not public.has_permission('script.approve') then
    raise exception 'script.approve permission required' using errcode = '42501';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'a reason is required to request changes' using errcode = '23514';
  end if;
  select * into v_ver from public.script_versions where id = p_version_id;
  if v_ver.id is null then raise exception 'script version not found' using errcode = 'P0002'; end if;
  select * into v_rec from public.content_records where id = v_ver.content_id for update;
  if v_rec.status_key <> 'script_approval' then
    raise exception 'the record is not awaiting script approval' using errcode = '22023';
  end if;

  update public.script_versions set approval_status = 'changes_requested' where id = p_version_id;
  insert into public.script_approvals (content_id, script_version_id, approver_id, decision, reason)
  values (v_rec.id, p_version_id, v_me, 'changes_requested', trim(p_reason));

  perform public.log_activity(v_rec.id, 'script_changes_requested',
    format('%s requested changes on script V%s', public.actor_name(), v_ver.version_no),
    null, jsonb_build_object('version_id', p_version_id), p_reason);

  v_rec := public.move_stage(v_rec.id, 'script_copy', trim(p_reason));
  perform public.notify(coalesce(array[v_rec.dm_owner_id, v_ver.created_by], '{}'), v_rec.id, 'changes_requested',
    format('Changes requested on %s script V%s', v_rec.content_id, v_ver.version_no), trim(p_reason));
  return v_rec;
end $$;

-- ---------------------------------------------------------------------------
-- record_ai_evaluation(p) — called by the evaluate-script Edge Function with
-- the service role after the provider answers. Never moves a stage.
-- ---------------------------------------------------------------------------
create or replace function public.record_ai_evaluation(p jsonb)
returns public.ai_evaluations
language plpgsql security definer set search_path = public as $$
declare
  v_eval public.ai_evaluations;
  v_rec public.content_records;
  v_ver public.script_versions;
  v_requester uuid := (p ->> 'requested_by')::uuid;
  v_nepali boolean;
  v_actor text;
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'record_ai_evaluation is service-only' using errcode = '42501';
  end if;

  select * into v_ver from public.script_versions where id = (p ->> 'script_version_id')::uuid;
  if v_ver.id is null then raise exception 'script version not found' using errcode = 'P0002'; end if;
  select * into v_rec from public.content_records where id = v_ver.content_id;

  insert into public.ai_evaluations (
    content_id, evaluation_type, script_version_id, provider, model, prompt_version, input_hash,
    overall_score, category_scores, recommendations, hard_flags, verdict, summary, raw_response, requested_by, duration_ms
  ) values (
    v_rec.id, 'script', v_ver.id, p ->> 'provider', p ->> 'model', p ->> 'prompt_version', p ->> 'input_hash',
    (p ->> 'overall_score')::numeric, coalesce(p -> 'category_scores', '{}'::jsonb),
    coalesce(p -> 'recommendations', '[]'::jsonb), coalesce(p -> 'hard_flags', '[]'::jsonb),
    p ->> 'verdict', p ->> 'summary', p -> 'raw_response', v_requester, (p ->> 'duration_ms')::int
  ) returning * into v_eval;

  select full_name into v_actor from public.profiles where id = v_requester;

  insert into public.activity_log (content_id, actor_id, event_type, description, new_value, source, metadata)
  values (v_rec.id, v_requester, 'ai_evaluation_completed',
    format('AI script check on V%s: %s/10, %s hard flag%s (%s)', v_ver.version_no,
           coalesce(v_eval.overall_score::text, '—'), jsonb_array_length(v_eval.hard_flags),
           case when jsonb_array_length(v_eval.hard_flags) = 1 then '' else 's' end, coalesce(v_eval.verdict, 'n/a')),
    jsonb_build_object('evaluation_id', v_eval.id, 'overall_score', v_eval.overall_score, 'verdict', v_eval.verdict,
                       'flag_count', jsonb_array_length(v_eval.hard_flags)),
    'ai', jsonb_build_object('provider', v_eval.provider, 'model', v_eval.model, 'requested_by_name', v_actor));

  -- Nepali text flagged: mark the record as needing a human verifier (never auto-corrected).
  select exists (select 1 from jsonb_array_elements(v_eval.hard_flags) f where f ->> 'key' = 'nepali_verify') into v_nepali;
  if v_nepali and v_rec.nepali_verification = 'not_needed' then
    update public.content_records set nepali_verification = 'pending' where id = v_rec.id;
    insert into public.activity_log (content_id, actor_id, event_type, description, source)
    values (v_rec.id, v_requester, 'nepali_verification_requested',
            format('Nepali text detected on %s; human verification pending', v_rec.content_id), 'ai');
    insert into public.notifications (recipient_id, content_id, type, title, body)
    select p2.id, v_rec.id, 'nepali_verification_requested', format('%s has Nepali text to verify', v_rec.content_id), v_rec.title
    from public.profiles p2 where p2.account_status = 'active' and p2.can_verify_nepali;
  end if;

  if v_requester is not null then
    insert into public.notifications (recipient_id, content_id, type, title, body)
    values (v_requester, v_rec.id, 'ai_evaluation_completed',
            format('AI check finished for %s V%s', v_rec.content_id, v_ver.version_no),
            format('%s/10 · %s hard flags', coalesce(v_eval.overall_score::text, '—'), jsonb_array_length(v_eval.hard_flags)));
  end if;

  return v_eval;
end $$;

-- Returns true when the caller may run an evaluation on this version.
create or replace function public.can_run_script_evaluation(p_version_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active_user()
     and (public.has_permission('script.edit') or public.has_permission('script.approve'))
     and exists (select 1 from public.script_versions where id = p_version_id);
$$;

-- ---------------------------------------------------------------------------
-- resolve_ai_flag(evaluation, flag_index, action, reason)
-- ---------------------------------------------------------------------------
create or replace function public.resolve_ai_flag(p_evaluation_id uuid, p_flag_index int, p_action public.flag_action, p_reason text default null)
returns public.ai_flag_resolutions
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.auth_profile_id();
  v_eval public.ai_evaluations;
  v_flag jsonb;
  v_res public.ai_flag_resolutions;
begin
  if not (public.has_permission('script.edit') or public.has_permission('dm.review') or public.has_permission('production.review')) then
    raise exception 'permission required to resolve flags' using errcode = '42501';
  end if;
  select * into v_eval from public.ai_evaluations where id = p_evaluation_id;
  if v_eval.id is null then raise exception 'evaluation not found' using errcode = 'P0002'; end if;
  v_flag := v_eval.hard_flags -> p_flag_index;
  if v_flag is null then raise exception 'flag not found' using errcode = 'P0002'; end if;
  if p_action = 'dismissed' and coalesce(trim(p_reason), '') = '' then
    raise exception 'a reason is required to dismiss a flag' using errcode = '23514';
  end if;

  insert into public.ai_flag_resolutions (evaluation_id, flag_key, flag_index, action, reason, actor_id)
  values (p_evaluation_id, v_flag ->> 'key', p_flag_index, p_action, nullif(trim(p_reason), ''), v_me)
  on conflict (evaluation_id, flag_index) do update set action = excluded.action, reason = excluded.reason, actor_id = excluded.actor_id, created_at = now()
  returning * into v_res;

  perform public.log_activity(v_eval.content_id, 'ai_flag_' || p_action::text,
    format('%s %s AI flag "%s"', public.actor_name(), p_action, v_flag ->> 'key'),
    null, jsonb_build_object('evaluation_id', p_evaluation_id, 'flag_key', v_flag ->> 'key'), p_reason);
  return v_res;
end $$;

-- ---------------------------------------------------------------------------
-- verify_nepali(content)
-- ---------------------------------------------------------------------------
create or replace function public.verify_nepali(p_content_id uuid, p_note text default null)
returns public.content_records
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.auth_profile_id(); v_rec public.content_records;
begin
  if not exists (select 1 from public.profiles where id = v_me and account_status = 'active' and can_verify_nepali) then
    raise exception 'can_verify_nepali flag required' using errcode = '42501';
  end if;
  update public.content_records set nepali_verification = 'verified', updated_by = v_me
   where id = p_content_id returning * into v_rec;
  if v_rec.id is null then raise exception 'content record not found' using errcode = 'P0002'; end if;
  perform public.log_activity(p_content_id, 'nepali_verified',
    format('%s verified the Nepali text on %s', public.actor_name(), v_rec.content_id), null, null, p_note);
  return v_rec;
end $$;

-- ---------------------------------------------------------------------------
-- View: approval queue for script approvers
-- ---------------------------------------------------------------------------
create or replace view public.v_script_approval_queue with (security_invoker = true) as
select cr.id as content_id, cr.content_id as content_code, cr.title, cr.region_code, cr.priority, cr.dm_owner_id,
       dm.full_name as dm_owner_name, ct.name as content_type,
       sv.id as version_id, sv.version_no, sv.change_summary, sv.created_at as version_created_at,
       au.full_name as version_author,
       ev.id as evaluation_id, ev.overall_score, ev.verdict, jsonb_array_length(ev.hard_flags) as flag_count,
       sh.entered_at as waiting_since,
       (cr.approved_script_version_id is null and exists (select 1 from public.script_approvals sa where sa.content_id = cr.id and sa.decision = 'approved')) as is_reapproval
from public.content_records cr
join public.script_versions sv on sv.id = cr.current_script_version_id
join public.content_types ct on ct.id = cr.content_type_id
left join public.profiles dm on dm.id = cr.dm_owner_id
left join public.profiles au on au.id = sv.created_by
left join lateral (select * from public.ai_evaluations e where e.script_version_id = sv.id and e.evaluation_type = 'script' order by e.created_at desc limit 1) ev on true
left join public.stage_history sh on sh.content_id = cr.id and sh.exited_at is null
where cr.status_key = 'script_approval';

-- Extend the Kanban view with the latest script AI score
create or replace view public.v_script_ai_latest with (security_invoker = true) as
select distinct on (e.content_id) e.content_id, e.overall_score, e.verdict, jsonb_array_length(e.hard_flags) as flag_count, e.created_at
from public.ai_evaluations e where e.evaluation_type = 'script'
order by e.content_id, e.created_at desc;

-- ---------------------------------------------------------------------------
-- RLS and grants
-- ---------------------------------------------------------------------------
alter table public.app_settings enable row level security;
alter table public.script_versions enable row level security;
alter table public.script_approvals enable row level security;
alter table public.ai_evaluations enable row level security;
alter table public.ai_flag_resolutions enable row level security;

create policy app_settings_select on public.app_settings for select to authenticated using (public.is_active_user());
create policy app_settings_admin on public.app_settings for all to authenticated
  using (public.has_permission('admin.reference_data')) with check (public.has_permission('admin.reference_data'));
create policy script_versions_select on public.script_versions for select to authenticated using (public.is_active_user());
create policy script_approvals_select on public.script_approvals for select to authenticated using (public.is_active_user());
create policy ai_evaluations_select on public.ai_evaluations for select to authenticated using (public.is_active_user());
create policy ai_flag_resolutions_select on public.ai_flag_resolutions for select to authenticated using (public.is_active_user());

grant select on public.app_settings, public.script_versions, public.script_approvals, public.ai_evaluations,
  public.ai_flag_resolutions, public.v_script_approval_queue, public.v_script_ai_latest to authenticated;
grant insert, update on public.app_settings to authenticated;

grant execute on function
  public.setting_bool(text, boolean),
  public.latest_script_evaluation(uuid),
  public.create_script_version(uuid, text, text),
  public.mark_version_material(uuid, boolean, text),
  public.submit_script_for_approval(uuid),
  public.approve_script(uuid),
  public.request_script_changes(uuid, text),
  public.can_run_script_evaluation(uuid),
  public.resolve_ai_flag(uuid, int, public.flag_action, text),
  public.verify_nepali(uuid, text)
to authenticated;

revoke execute on function public.record_ai_evaluation(jsonb) from public, anon, authenticated;
grant execute on function public.record_ai_evaluation(jsonb), public.can_run_script_evaluation(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Kanban card: latest script AI score (appended columns keep the view shape)
-- ---------------------------------------------------------------------------
create or replace view public.v_kanban_cards with (security_invoker = true) as
select base.*, ai.overall_score as ai_score, ai.verdict as ai_verdict, ai.flag_count as ai_flag_count
from (
  with last_act as (
    select distinct on (content_id) content_id, created_at, actor_id
    from public.activity_log where content_id is not null
    order by content_id, created_at desc
  ),
  cc as (select content_id, count(*)::int as comment_count from public.comments group by content_id),
  plat as (
    select cp.content_id, array_agg(p.name order by p.sort_order) as platforms
    from public.content_platforms cp join public.platforms p on p.id = cp.platform_id group by cp.content_id
  ),
  diff as (
    select cd.content_id, array_agg(d.name order by d.sort_order) as differentiators
    from public.content_differentiators cd join public.differentiators d on d.id = cd.differentiator_id group by cd.content_id
  ),
  cur as (select content_id, entered_at from public.stage_history where exited_at is null)
  select cr.id, cr.content_id, cr.title, cr.status_key, ws.name as status_name, ws.sort_order as status_order,
         ws.colour_key, ws.group_key, ws.is_terminal,
         cr.priority, cr.region_code, cr.campus_id, cr.program_id, cr.campaign_id,
         ct.name as content_type, ct.medium,
         ob.name as objective,
         coalesce(plat.platforms, '{}'::text[]) as platforms,
         coalesce(diff.differentiators, '{}'::text[]) as differentiators,
         cr.dm_owner_id, dm.full_name as dm_owner_name,
         cr.production_assignee_id, pa.full_name as assignee_name,
         cr.production_folder_url is not null as has_folder,
         cr.script_due, cr.production_due, cr.review_due, cr.target_publish_date,
         case cr.status_key
           when 'script_copy' then cr.script_due
           when 'production' then cr.production_due
           when 'changes_required' then cr.production_due
           when 'dm_review' then cr.review_due
           when 'content_review' then cr.review_due
           else cr.target_publish_date end as due_date,
         (not ws.is_terminal) and coalesce(
           case cr.status_key
             when 'script_copy' then cr.script_due
             when 'production' then cr.production_due
             when 'changes_required' then cr.production_due
             when 'dm_review' then cr.review_due
             when 'content_review' then cr.review_due
             else cr.target_publish_date end < current_date, false) as is_overdue,
         coalesce(cc.comment_count, 0) as comment_count,
         cur.entered_at as stage_entered_at,
         floor(extract(epoch from (now() - cur.entered_at)))::int as seconds_in_stage,
         la.created_at as last_activity_at, lp.full_name as last_activity_by,
         (not ws.is_terminal) and public.working_days_between(coalesce(la.created_at, cr.created_at), now()) >= 3 as is_stalled,
         cr.current_script_version_id is not null as has_script,
         cr.approved_script_version_id is not null as script_approved,
         cr.requires_ai_disclosure, cr.nepali_verification, cr.content_review_required,
         cr.created_at, cr.updated_at
  from public.content_records cr
  join public.workflow_statuses ws on ws.key = cr.status_key
  join public.content_types ct on ct.id = cr.content_type_id
  left join public.objectives ob on ob.id = cr.objective_id
  left join plat on plat.content_id = cr.id
  left join diff on diff.content_id = cr.id
  left join cc on cc.content_id = cr.id
  left join cur on cur.content_id = cr.id
  left join last_act la on la.content_id = cr.id
  left join public.profiles lp on lp.id = la.actor_id
  left join public.profiles dm on dm.id = cr.dm_owner_id
  left join public.profiles pa on pa.id = cr.production_assignee_id
) base
left join public.v_script_ai_latest ai on ai.content_id = base.id;
