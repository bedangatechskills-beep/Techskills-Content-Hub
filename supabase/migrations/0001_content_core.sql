-- ============================================================================
-- 0001_content_core.sql — Phase 1: reference data, Content Record + ID,
-- 16 workflow stages, allowed transitions, activity log, stage history,
-- comments, notifications, Kanban view.
-- Rules: every state change is a security-definer function that appends
--        activity_log and maintains stage_history. Audit tables are
--        insert-only. Reasons mandatory for backward moves, change requests,
--        rejections and stage skips; never for normal forward moves.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.content_medium as enum ('video','static','carousel','caption','thumbnail','story','one_off');
create type public.script_shape as enum ('spoken','copy_spec','caption','shot_list','none');
create type public.content_priority as enum ('low','normal','high','urgent');
create type public.nepali_verification as enum ('not_needed','pending','verified');
create type public.comment_section as enum ('concept','script','production','review','final_approval','general');

-- ---------------------------------------------------------------------------
-- Reference data (Canonical Reference Data, §92–94, §19–21, S1, S2)
-- ---------------------------------------------------------------------------
create table public.regions (
  code text primary key check (code in ('AU','NP')),
  name text not null,
  timezone text not null
);

create table public.campuses (
  id          uuid primary key default gen_random_uuid(),
  region_code text not null references public.regions(code),
  name        text not null,
  phone       text,
  address     text,
  is_generic  boolean not null default false,
  is_active   boolean not null default true,
  unique (region_code, name)
);

create table public.programs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  status      text not null default 'active',
  description text,
  location    text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.campaigns (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  program_id uuid references public.programs(id),
  start_date date,
  end_date   date,
  owner_id   uuid references public.profiles(id),
  status     text not null default 'planned',
  notes      text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.platforms (
  id        uuid primary key default gen_random_uuid(),
  key       text not null unique check (key ~ '^[a-z_]+$'),
  name      text not null,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table public.objectives (
  id        uuid primary key default gen_random_uuid(),
  key       text not null unique check (key ~ '^[a-z_]+$'),
  name      text not null,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table public.content_pillars (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique check (key ~ '^[a-z_]+$'),
  name       text not null,
  is_active  boolean not null default true,
  human_only boolean not null default false,   -- synthetic humans banned (Student Success/Journey/Creator)
  sort_order int not null default 0
);

create table public.differentiators (
  id        uuid primary key default gen_random_uuid(),
  key       text not null unique check (key ~ '^[a-z_]+$'),
  name      text not null,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table public.content_types (
  id           uuid primary key default gen_random_uuid(),
  key          text not null unique check (key ~ '^[a-z_]+$'),
  name         text not null,
  medium       public.content_medium not null,
  script_shape public.script_shape not null,
  is_active    boolean not null default true,
  sort_order   int not null default 0
);

create table public.reference_handles (
  id          uuid primary key default gen_random_uuid(),
  region_code text not null references public.regions(code),
  platform_id uuid not null references public.platforms(id),
  handle      text not null,
  is_active   boolean not null default true,
  note        text,
  unique (region_code, platform_id, handle)
);

create table public.brand_facts (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

-- ---------------------------------------------------------------------------
-- Workflow definition (Workflow Spine, Kanban Permissions, S3)
-- ---------------------------------------------------------------------------
create table public.workflow_statuses (
  key         text primary key check (key ~ '^[a-z_]+$'),
  name        text not null,
  sort_order  int not null unique,
  colour_key  text not null,
  group_key   text not null,
  is_terminal boolean not null default false
);

create table public.allowed_transitions (
  id              uuid primary key default gen_random_uuid(),
  from_status     text not null references public.workflow_statuses(key),
  to_status       text not null references public.workflow_statuses(key),
  permission_key  text not null references public.permissions(key),
  reason_required boolean not null default false,
  is_backward     boolean not null default false,
  label           text,
  unique (from_status, to_status, permission_key)
);

-- ---------------------------------------------------------------------------
-- Content Record (§102) — the one master record
-- ---------------------------------------------------------------------------
create table public.content_id_sequences (
  region_code text not null references public.regions(code),
  yymm        text not null check (yymm ~ '^[0-9]{4}$'),
  last_seq    int not null default 0,
  primary key (region_code, yymm)
);

create table public.content_records (
  id                          uuid primary key default gen_random_uuid(),
  content_id                  text not null unique,
  title                       text not null check (length(trim(title)) > 0),
  description                 text,
  request_type                text,
  requester_id                uuid references public.profiles(id),
  requesting_team_id          uuid references public.teams(id),
  program_id                  uuid references public.programs(id),
  campaign_id                 uuid references public.campaigns(id),
  region_code                 text not null references public.regions(code),
  campus_id                   uuid references public.campuses(id),
  content_type_id             uuid not null references public.content_types(id),
  objective_id                uuid references public.objectives(id),
  secondary_objective_id      uuid references public.objectives(id),
  pillar_id                   uuid references public.content_pillars(id),
  target_audience             text,
  concept                     text,
  hook                        text,
  core_message                text,
  audience_takeaway           text,
  cta                         text,
  creative_direction          text,
  reference_notes             text,
  status_key                  text not null references public.workflow_statuses(key) default 'requested',
  priority                    public.content_priority not null default 'normal',
  dm_owner_id                 uuid references public.profiles(id),
  production_manager_id       uuid references public.profiles(id),
  production_assignee_id      uuid references public.profiles(id),
  current_script_version_id   uuid,      -- fk added in Phase 2
  approved_script_version_id  uuid,      -- fk added in Phase 2
  current_creative_version_id uuid,      -- fk added in Phase 3
  production_folder_url       text,
  script_due                  date,
  production_due              date,
  review_due                  date,
  target_publish_date         date,
  requires_ai_disclosure      boolean not null default false,
  nepali_verification         public.nepali_verification not null default 'not_needed',
  content_review_required     boolean not null default false,
  min_reviewer_responses      int not null default 2 check (min_reviewer_responses between 1 and 10),
  created_by                  uuid references public.profiles(id),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  updated_by                  uuid references public.profiles(id)
);

create index content_records_status_idx on public.content_records(status_key);
create index content_records_region_idx on public.content_records(region_code);
create index content_records_program_idx on public.content_records(program_id);
create index content_records_campaign_idx on public.content_records(campaign_id);
create index content_records_dm_owner_idx on public.content_records(dm_owner_id);
create index content_records_assignee_idx on public.content_records(production_assignee_id);

create table public.content_platforms (
  content_id  uuid not null references public.content_records(id) on delete cascade,
  platform_id uuid not null references public.platforms(id),
  primary key (content_id, platform_id)
);

create table public.content_differentiators (
  content_id        uuid not null references public.content_records(id) on delete cascade,
  differentiator_id uuid not null references public.differentiators(id),
  primary key (content_id, differentiator_id)
);

-- ---------------------------------------------------------------------------
-- Audit: activity log (§103) and stage history (§104). Insert-only.
-- ---------------------------------------------------------------------------
create table public.activity_log (
  id             uuid primary key default gen_random_uuid(),
  content_id     uuid references public.content_records(id),
  actor_id       uuid references public.profiles(id),
  event_type     text not null,
  description    text not null,
  previous_value jsonb,
  new_value      jsonb,
  reason         text,
  source         text not null default 'app',
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);
create index activity_log_content_idx on public.activity_log(content_id, created_at desc);

create table public.stage_history (
  id               uuid primary key default gen_random_uuid(),
  content_id       uuid not null references public.content_records(id),
  status_key       text not null references public.workflow_statuses(key),
  entered_at       timestamptz not null default now(),
  exited_at        timestamptz,
  duration_seconds int generated always as (
    case when exited_at is null then null
         else greatest(0, floor(extract(epoch from (exited_at - entered_at)))::int) end
  ) stored,
  entered_by       uuid references public.profiles(id),
  exited_by        uuid references public.profiles(id)
);
create index stage_history_content_idx on public.stage_history(content_id, entered_at desc);
create unique index stage_history_one_open_idx on public.stage_history(content_id) where exited_at is null;

-- ---------------------------------------------------------------------------
-- Comments (§90) and notifications (§97)
-- ---------------------------------------------------------------------------
create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  content_id  uuid not null references public.content_records(id),
  section     public.comment_section not null default 'general',
  author_id   uuid not null references public.profiles(id),
  body        text not null check (length(trim(body)) > 0),
  mentions    uuid[] not null default '{}',
  is_resolved boolean not null default false,
  edited_at   timestamptz,
  created_at  timestamptz not null default now()
);
create index comments_content_idx on public.comments(content_id, created_at);

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id),
  content_id   uuid references public.content_records(id),
  type         text not null,
  title        text not null,
  body         text,
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications(recipient_id, is_read, created_at desc);

-- updated_at
create trigger content_records_set_updated_at
  before update on public.content_records
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Internal helpers (not granted to authenticated; called from definer RPCs)
-- ---------------------------------------------------------------------------
create or replace function public.log_activity(
  p_content_id uuid, p_event_type text, p_description text,
  p_previous jsonb default null, p_new jsonb default null,
  p_reason text default null, p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.activity_log (content_id, actor_id, event_type, description, previous_value, new_value, reason, metadata)
  values (p_content_id, public.auth_profile_id(), p_event_type, p_description, p_previous, p_new, nullif(trim(p_reason), ''), coalesce(p_metadata, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.notify(
  p_recipients uuid[], p_content_id uuid, p_type text, p_title text, p_body text default null
) returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  insert into public.notifications (recipient_id, content_id, type, title, body)
  select distinct r, p_content_id, p_type, p_title, p_body
  from unnest(coalesce(p_recipients, '{}'::uuid[])) as r
  where r is not null and r is distinct from public.auth_profile_id();
  get diagnostics v_count = row_count;
  return v_count;
end $$;

create or replace function public.actor_name()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select full_name from public.profiles where auth_user_id = auth.uid()), 'System');
$$;

-- Working days between two timestamps (Mon–Fri), used for stalled detection.
create or replace function public.working_days_between(p_from timestamptz, p_to timestamptz)
returns int language sql immutable as $$
  select count(*)::int
  from generate_series(p_from::date + 1, p_to::date, interval '1 day') d
  where extract(isodow from d) < 6;
$$;

-- Recipients who hold a role key or a flag
create or replace function public.profiles_with_permission(p_permission text)
returns uuid[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct p.id), '{}'::uuid[])
  from public.profiles p
  join public.role_permissions rp on rp.role_id = p.role_id
  join public.permissions perm on perm.id = rp.permission_id
  where p.account_status = 'active' and perm.key = p_permission;
$$;

create or replace function public.final_approvers()
returns uuid[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(id), '{}'::uuid[]) from public.profiles where account_status = 'active' and is_final_approver;
$$;

create or replace function public.team_member_ids(p_team_key text)
returns uuid[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(tm.profile_id), '{}'::uuid[])
  from public.team_memberships tm
  join public.teams t on t.id = tm.team_id
  join public.profiles p on p.id = tm.profile_id
  where t.key = p_team_key and p.account_status = 'active';
$$;

-- ---------------------------------------------------------------------------
-- Content ID: TS-{region}-{yymm}-{seq:000}, month from the region's timezone
-- ---------------------------------------------------------------------------
create or replace function public.next_content_id(p_region_code text)
returns text language plpgsql security definer set search_path = public as $$
declare v_tz text; v_yymm text; v_seq int;
begin
  select timezone into v_tz from public.regions where code = p_region_code;
  if v_tz is null then
    raise exception 'unknown region %', p_region_code using errcode = '22023';
  end if;
  v_yymm := to_char(now() at time zone v_tz, 'YYMM');
  insert into public.content_id_sequences (region_code, yymm, last_seq)
  values (p_region_code, v_yymm, 1)
  on conflict (region_code, yymm) do update set last_seq = public.content_id_sequences.last_seq + 1
  returning last_seq into v_seq;
  return format('TS-%s-%s-%s', p_region_code, v_yymm, lpad(v_seq::text, 3, '0'));
end $$;

-- ---------------------------------------------------------------------------
-- create_content_record(payload)
-- ---------------------------------------------------------------------------
create or replace function public.create_content_record(p jsonb)
returns public.content_records
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.auth_profile_id();
  v_rec public.content_records;
  v_region text := upper(trim(p ->> 'region_code'));
  v_team_id uuid;
begin
  if not public.has_permission('content.create') then
    raise exception 'content.create permission required' using errcode = '42501';
  end if;
  if coalesce(trim(p ->> 'title'), '') = '' then
    raise exception 'title is required' using errcode = '22023';
  end if;
  if (p ->> 'content_type_id') is null then
    raise exception 'content type is required (choose "One-off" if nothing fits)' using errcode = '22023';
  end if;

  select id into v_team_id from public.teams where key = (p ->> 'requesting_team_key');
  if v_team_id is null and (p ->> 'requesting_team_id') is not null then
    v_team_id := (p ->> 'requesting_team_id')::uuid;
  end if;

  insert into public.content_records (
    content_id, title, description, request_type, requester_id, requesting_team_id,
    program_id, campaign_id, region_code, campus_id, content_type_id,
    objective_id, secondary_objective_id, pillar_id, target_audience,
    concept, hook, core_message, audience_takeaway, cta, creative_direction, reference_notes,
    priority, dm_owner_id, target_publish_date, script_due, production_due, review_due,
    requires_ai_disclosure, content_review_required, created_by, updated_by
  ) values (
    public.next_content_id(v_region),
    trim(p ->> 'title'), p ->> 'description', p ->> 'request_type', v_me, v_team_id,
    (p ->> 'program_id')::uuid, (p ->> 'campaign_id')::uuid, v_region, (p ->> 'campus_id')::uuid, (p ->> 'content_type_id')::uuid,
    (p ->> 'objective_id')::uuid, (p ->> 'secondary_objective_id')::uuid, (p ->> 'pillar_id')::uuid, p ->> 'target_audience',
    p ->> 'concept', p ->> 'hook', p ->> 'core_message', p ->> 'audience_takeaway', p ->> 'cta', p ->> 'creative_direction', p ->> 'reference_notes',
    coalesce((p ->> 'priority')::public.content_priority, 'normal'),
    case when public.in_team('dm') then v_me else null end,
    (p ->> 'target_publish_date')::date, (p ->> 'script_due')::date, (p ->> 'production_due')::date, (p ->> 'review_due')::date,
    coalesce((p ->> 'requires_ai_disclosure')::boolean, false),
    coalesce((p ->> 'content_review_required')::boolean, false),
    v_me, v_me
  ) returning * into v_rec;

  insert into public.content_platforms (content_id, platform_id)
  select v_rec.id, x::uuid from jsonb_array_elements_text(coalesce(p -> 'platform_ids', '[]'::jsonb)) x;

  insert into public.content_differentiators (content_id, differentiator_id)
  select v_rec.id, x::uuid from jsonb_array_elements_text(coalesce(p -> 'differentiator_ids', '[]'::jsonb)) x;

  insert into public.stage_history (content_id, status_key, entered_by) values (v_rec.id, v_rec.status_key, v_me);

  perform public.log_activity(v_rec.id, 'created',
    format('%s created %s "%s"', public.actor_name(), v_rec.content_id, v_rec.title),
    null, to_jsonb(v_rec));

  perform public.notify(public.profiles_with_permission('content.edit_concept'), v_rec.id, 'content_requested',
    format('New request %s', v_rec.content_id), v_rec.title);

  return v_rec;
end $$;

-- ---------------------------------------------------------------------------
-- available_transitions(content) — what the caller may do from here (UI hint;
-- move_stage re-checks everything).
-- ---------------------------------------------------------------------------
create or replace function public.available_transitions(p_content_id uuid)
returns table (to_status text, to_name text, reason_required boolean, is_backward boolean, label text)
language sql stable security definer set search_path = public as $$
  select distinct on (t.to_status)
         t.to_status, ws.name,
         (t.reason_required
           or (t.from_status = 'dm_review' and t.to_status = 'ready_for_final_approval' and cr.content_review_required)) as reason_required,
         t.is_backward, t.label
  from public.content_records cr
  join public.allowed_transitions t on t.from_status = cr.status_key
  join public.workflow_statuses ws on ws.key = t.to_status
  where cr.id = p_content_id
    and public.is_active_user()
    and public.has_permission(t.permission_key)
    and (t.to_status <> 'final_approved' or public.is_final_approver())
  order by t.to_status, t.is_backward, t.reason_required;
$$;

-- ---------------------------------------------------------------------------
-- move_stage(content, to_status, reason)
-- ---------------------------------------------------------------------------
create or replace function public.move_stage(p_content_id uuid, p_to_status text, p_reason text default null)
returns public.content_records
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.auth_profile_id();
  v_rec public.content_records;
  v_from text;
  v_tr public.allowed_transitions;
  v_reason_required boolean;
  v_from_name text; v_to_name text;
  v_recipients uuid[] := '{}';
begin
  if not public.is_active_user() then
    raise exception 'active account required' using errcode = '42501';
  end if;

  select * into v_rec from public.content_records where id = p_content_id for update;
  if v_rec.id is null then
    raise exception 'content record not found' using errcode = 'P0002';
  end if;
  v_from := v_rec.status_key;

  if v_from = p_to_status then
    raise exception 'content is already in stage %', p_to_status using errcode = '22023';
  end if;

  select t.* into v_tr
  from public.allowed_transitions t
  where t.from_status = v_from and t.to_status = p_to_status and public.has_permission(t.permission_key)
  order by t.reason_required, t.is_backward
  limit 1;

  if v_tr.id is null then
    if exists (select 1 from public.allowed_transitions where from_status = v_from and to_status = p_to_status) then
      raise exception 'your role may not move content from % to %', v_from, p_to_status using errcode = '42501';
    end if;
    raise exception 'moving from % to % is not an allowed transition', v_from, p_to_status using errcode = '22023';
  end if;

  if p_to_status = 'final_approved' and not public.is_final_approver() then
    raise exception 'only a Final Approver may move content to Final Approved' using errcode = '42501';
  end if;

  v_reason_required := v_tr.reason_required
    or (v_from = 'dm_review' and p_to_status = 'ready_for_final_approval' and v_rec.content_review_required);
  if v_reason_required and coalesce(trim(p_reason), '') = '' then
    raise exception 'a reason is required for this move' using errcode = '23514';
  end if;

  select name into v_from_name from public.workflow_statuses where key = v_from;
  select name into v_to_name from public.workflow_statuses where key = p_to_status;

  update public.stage_history
     set exited_at = now(), exited_by = v_me
   where content_id = p_content_id and exited_at is null;
  insert into public.stage_history (content_id, status_key, entered_by) values (p_content_id, p_to_status, v_me);

  update public.content_records
     set status_key = p_to_status, updated_by = v_me
   where id = p_content_id
  returning * into v_rec;

  perform public.log_activity(p_content_id, 'status_change',
    format('%s moved %s %s → %s', public.actor_name(), v_rec.content_id, v_from_name, v_to_name),
    jsonb_build_object('status', v_from), jsonb_build_object('status', p_to_status),
    p_reason,
    jsonb_build_object('is_backward', v_tr.is_backward, 'transition_label', v_tr.label));

  -- Minimal next-actor notifications (rule table arrives in Phase 6).
  v_recipients := case p_to_status
    when 'idea_concept'             then coalesce(array[v_rec.dm_owner_id], '{}') || public.profiles_with_permission('content.edit_concept')
    when 'script_copy'              then coalesce(array[v_rec.dm_owner_id], '{}') || public.profiles_with_permission('script.edit')
    when 'script_approval'          then public.final_approvers()
    when 'ready_for_production'     then coalesce(array[v_rec.production_manager_id], '{}') || public.profiles_with_permission('production.assign')
    when 'production'               then coalesce(array[v_rec.production_assignee_id], '{}')
    when 'production_review'        then coalesce(array[v_rec.production_manager_id], '{}') || public.profiles_with_permission('production.review')
    when 'dm_review'                then coalesce(array[v_rec.dm_owner_id], '{}') || public.profiles_with_permission('dm.review')
    when 'changes_required'         then coalesce(array[v_rec.production_assignee_id, v_rec.production_manager_id, v_rec.dm_owner_id], '{}')
    when 'content_review'           then public.team_member_ids('content_reviewer')
    when 'ready_for_final_approval' then coalesce(array[v_rec.dm_owner_id], '{}') || public.profiles_with_permission('dm.review')
    when 'final_approval'           then public.final_approvers()
    when 'final_approved'           then coalesce(array[v_rec.dm_owner_id], '{}') || public.profiles_with_permission('publish.schedule')
    when 'scheduled'                then public.profiles_with_permission('publish.publish')
    when 'published'                then coalesce(array[v_rec.dm_owner_id, v_rec.requester_id], '{}')
    else '{}'::uuid[] end;

  perform public.notify(v_recipients, p_content_id, 'stage_' || p_to_status,
    format('%s is now in %s', v_rec.content_id, v_to_name),
    case when v_tr.is_backward then 'Moved back. Reason: ' || p_reason else v_rec.title end);

  return v_rec;
end $$;

-- ---------------------------------------------------------------------------
-- update_content_fields(content, patch) — permission by field group, logs diffs
-- ---------------------------------------------------------------------------
create or replace function public.update_content_fields(p_content_id uuid, p jsonb)
returns public.content_records
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.auth_profile_id();
  v_old public.content_records;
  v_new public.content_records;
  v_concept_keys text[] := array['title','description','request_type','program_id','campaign_id','campus_id','content_type_id',
    'objective_id','secondary_objective_id','pillar_id','target_audience','concept','hook','core_message','audience_takeaway',
    'cta','creative_direction','reference_notes','dm_owner_id','platform_ids','differentiator_ids',
    'content_review_required','min_reviewer_responses','requires_ai_disclosure','target_publish_date','script_due','review_due','priority'];
  v_production_keys text[] := array['production_manager_id','production_assignee_id','production_folder_url','production_due','priority'];
  v_touched_concept boolean := false;
  v_touched_production boolean := false;
  k text;
  v_changed text[] := '{}';
begin
  select * into v_old from public.content_records where id = p_content_id for update;
  if v_old.id is null then raise exception 'content record not found' using errcode = 'P0002'; end if;

  for k in select jsonb_object_keys(p) loop
    if k = any(v_concept_keys) then v_touched_concept := true; end if;
    if k = any(v_production_keys) then v_touched_production := true; end if;
    if not (k = any(v_concept_keys) or k = any(v_production_keys)) then
      raise exception 'field % cannot be edited through this action', k using errcode = '22023';
    end if;
  end loop;

  -- Permission: concept-group needs content.edit_concept; production-group needs
  -- production.assign; priority/dates are allowed for either. The record's own
  -- production assignee may update the folder URL.
  if v_touched_concept and not public.has_permission('content.edit_concept') then
    -- allow if every touched key is also a production key and caller has production.assign
    if not (public.has_permission('production.assign')
            and not exists (select 1 from jsonb_object_keys(p) kk where not (kk = any(v_production_keys)))) then
      raise exception 'content.edit_concept permission required' using errcode = '42501';
    end if;
  end if;
  if v_touched_production and not (public.has_permission('production.assign') or public.has_permission('content.edit_concept')) then
    if not (v_old.production_assignee_id = v_me and public.has_permission('production.update_own')
            and not exists (select 1 from jsonb_object_keys(p) kk where kk <> 'production_folder_url')) then
      raise exception 'production.assign permission required' using errcode = '42501';
    end if;
  end if;

  update public.content_records set
    title                   = case when p ? 'title' then coalesce(nullif(trim(p ->> 'title'), ''), title) else title end,
    description             = case when p ? 'description' then p ->> 'description' else description end,
    request_type            = case when p ? 'request_type' then p ->> 'request_type' else request_type end,
    program_id              = case when p ? 'program_id' then (p ->> 'program_id')::uuid else program_id end,
    campaign_id             = case when p ? 'campaign_id' then (p ->> 'campaign_id')::uuid else campaign_id end,
    campus_id               = case when p ? 'campus_id' then (p ->> 'campus_id')::uuid else campus_id end,
    content_type_id         = case when p ? 'content_type_id' then coalesce((p ->> 'content_type_id')::uuid, content_type_id) else content_type_id end,
    objective_id            = case when p ? 'objective_id' then (p ->> 'objective_id')::uuid else objective_id end,
    secondary_objective_id  = case when p ? 'secondary_objective_id' then (p ->> 'secondary_objective_id')::uuid else secondary_objective_id end,
    pillar_id               = case when p ? 'pillar_id' then (p ->> 'pillar_id')::uuid else pillar_id end,
    target_audience         = case when p ? 'target_audience' then p ->> 'target_audience' else target_audience end,
    concept                 = case when p ? 'concept' then p ->> 'concept' else concept end,
    hook                    = case when p ? 'hook' then p ->> 'hook' else hook end,
    core_message            = case when p ? 'core_message' then p ->> 'core_message' else core_message end,
    audience_takeaway       = case when p ? 'audience_takeaway' then p ->> 'audience_takeaway' else audience_takeaway end,
    cta                     = case when p ? 'cta' then p ->> 'cta' else cta end,
    creative_direction      = case when p ? 'creative_direction' then p ->> 'creative_direction' else creative_direction end,
    reference_notes         = case when p ? 'reference_notes' then p ->> 'reference_notes' else reference_notes end,
    dm_owner_id             = case when p ? 'dm_owner_id' then (p ->> 'dm_owner_id')::uuid else dm_owner_id end,
    production_manager_id   = case when p ? 'production_manager_id' then (p ->> 'production_manager_id')::uuid else production_manager_id end,
    production_assignee_id  = case when p ? 'production_assignee_id' then (p ->> 'production_assignee_id')::uuid else production_assignee_id end,
    production_folder_url   = case when p ? 'production_folder_url' then nullif(trim(p ->> 'production_folder_url'), '') else production_folder_url end,
    priority                = case when p ? 'priority' then (p ->> 'priority')::public.content_priority else priority end,
    script_due              = case when p ? 'script_due' then (p ->> 'script_due')::date else script_due end,
    production_due          = case when p ? 'production_due' then (p ->> 'production_due')::date else production_due end,
    review_due              = case when p ? 'review_due' then (p ->> 'review_due')::date else review_due end,
    target_publish_date     = case when p ? 'target_publish_date' then (p ->> 'target_publish_date')::date else target_publish_date end,
    requires_ai_disclosure  = case when p ? 'requires_ai_disclosure' then coalesce((p ->> 'requires_ai_disclosure')::boolean, requires_ai_disclosure) else requires_ai_disclosure end,
    content_review_required = case when p ? 'content_review_required' then coalesce((p ->> 'content_review_required')::boolean, content_review_required) else content_review_required end,
    min_reviewer_responses  = case when p ? 'min_reviewer_responses' then coalesce((p ->> 'min_reviewer_responses')::int, min_reviewer_responses) else min_reviewer_responses end,
    updated_by              = v_me
  where id = p_content_id
  returning * into v_new;

  if p ? 'platform_ids' then
    delete from public.content_platforms where content_id = p_content_id
      and platform_id not in (select x::uuid from jsonb_array_elements_text(p -> 'platform_ids') x);
    insert into public.content_platforms (content_id, platform_id)
    select p_content_id, x::uuid from jsonb_array_elements_text(p -> 'platform_ids') x
    on conflict do nothing;
    v_changed := v_changed || 'platforms';
  end if;
  if p ? 'differentiator_ids' then
    delete from public.content_differentiators where content_id = p_content_id
      and differentiator_id not in (select x::uuid from jsonb_array_elements_text(p -> 'differentiator_ids') x);
    insert into public.content_differentiators (content_id, differentiator_id)
    select p_content_id, x::uuid from jsonb_array_elements_text(p -> 'differentiator_ids') x
    on conflict do nothing;
    v_changed := v_changed || 'differentiators';
  end if;

  -- Specific audit events (§63) then a general one for the rest.
  if v_new.priority is distinct from v_old.priority then
    perform public.log_activity(p_content_id, 'priority_change',
      format('%s changed priority of %s from %s to %s', public.actor_name(), v_new.content_id, v_old.priority, v_new.priority),
      jsonb_build_object('priority', v_old.priority), jsonb_build_object('priority', v_new.priority));
  end if;
  if v_new.production_folder_url is distinct from v_old.production_folder_url then
    perform public.log_activity(p_content_id, 'folder_link_change',
      format('%s %s the production folder link on %s', public.actor_name(),
             case when v_old.production_folder_url is null then 'added' else 'changed' end, v_new.content_id),
      jsonb_build_object('production_folder_url', v_old.production_folder_url), jsonb_build_object('production_folder_url', v_new.production_folder_url));
  end if;
  if v_new.production_assignee_id is distinct from v_old.production_assignee_id then
    perform public.log_activity(p_content_id, case when v_old.production_assignee_id is null then 'assignment' else 'reassignment' end,
      format('%s assigned %s to %s', public.actor_name(), v_new.content_id,
             coalesce((select full_name from public.profiles where id = v_new.production_assignee_id), 'nobody')),
      jsonb_build_object('production_assignee_id', v_old.production_assignee_id), jsonb_build_object('production_assignee_id', v_new.production_assignee_id));
    if v_new.production_assignee_id is not null then
      perform public.notify(array[v_new.production_assignee_id], p_content_id, 'content_assigned',
        format('%s assigned to you', v_new.content_id), v_new.title);
    end if;
  end if;
  if v_new.dm_owner_id is distinct from v_old.dm_owner_id or v_new.production_manager_id is distinct from v_old.production_manager_id then
    perform public.log_activity(p_content_id, 'assignment',
      format('%s changed owners on %s', public.actor_name(), v_new.content_id),
      jsonb_build_object('dm_owner_id', v_old.dm_owner_id, 'production_manager_id', v_old.production_manager_id),
      jsonb_build_object('dm_owner_id', v_new.dm_owner_id, 'production_manager_id', v_new.production_manager_id));
  end if;
  if (v_new.script_due, v_new.production_due, v_new.review_due, v_new.target_publish_date)
     is distinct from (v_old.script_due, v_old.production_due, v_old.review_due, v_old.target_publish_date) then
    perform public.log_activity(p_content_id, 'due_date_change',
      format('%s changed due dates on %s', public.actor_name(), v_new.content_id),
      jsonb_build_object('script_due', v_old.script_due, 'production_due', v_old.production_due, 'review_due', v_old.review_due, 'target_publish_date', v_old.target_publish_date),
      jsonb_build_object('script_due', v_new.script_due, 'production_due', v_new.production_due, 'review_due', v_new.review_due, 'target_publish_date', v_new.target_publish_date));
  end if;

  select array_agg(kk) into v_changed
  from (
    select kk from jsonb_object_keys(p) kk
    where kk not in ('priority','production_folder_url','production_assignee_id','dm_owner_id','production_manager_id',
                     'script_due','production_due','review_due','target_publish_date')
    union all select unnest(v_changed)
  ) s;
  if coalesce(cardinality(v_changed), 0) > 0 then
    perform public.log_activity(p_content_id, 'fields_updated',
      format('%s updated %s on %s', public.actor_name(), array_to_string(v_changed, ', '), v_new.content_id),
      (select jsonb_object_agg(kk, to_jsonb(v_old) -> kk) from unnest(v_changed) kk where to_jsonb(v_old) ? kk),
      (select jsonb_object_agg(kk, to_jsonb(v_new) -> kk) from unnest(v_changed) kk where to_jsonb(v_new) ? kk),
      null, jsonb_build_object('fields', v_changed));
  end if;

  return v_new;
end $$;

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------
create or replace function public.add_comment(p_content_id uuid, p_section public.comment_section, p_body text, p_mentions uuid[] default '{}')
returns public.comments
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.auth_profile_id(); v_c public.comments; v_cid text;
begin
  if not public.is_active_user() then raise exception 'active account required' using errcode = '42501'; end if;
  if not exists (select 1 from public.content_records where id = p_content_id) then
    raise exception 'content record not found' using errcode = 'P0002';
  end if;
  insert into public.comments (content_id, section, author_id, body, mentions)
  values (p_content_id, coalesce(p_section, 'general'), v_me, trim(p_body), coalesce(p_mentions, '{}'))
  returning * into v_c;
  select content_id into v_cid from public.content_records where id = p_content_id;
  perform public.log_activity(p_content_id, 'comment',
    format('%s commented on %s (%s)', public.actor_name(), v_cid, v_c.section),
    null, jsonb_build_object('comment_id', v_c.id, 'section', v_c.section), null,
    jsonb_build_object('comment_id', v_c.id));
  perform public.notify(v_c.mentions, p_content_id, 'mentioned',
    format('%s mentioned you on %s', public.actor_name(), v_cid), left(v_c.body, 200));
  return v_c;
end $$;

create or replace function public.edit_comment(p_comment_id uuid, p_body text)
returns public.comments
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.auth_profile_id(); v_c public.comments;
begin
  select * into v_c from public.comments where id = p_comment_id;
  if v_c.id is null then raise exception 'comment not found' using errcode = 'P0002'; end if;
  if v_c.author_id <> v_me then raise exception 'you can only edit your own comments' using errcode = '42501'; end if;
  if v_c.created_at < now() - interval '15 minutes' then
    raise exception 'comments can only be edited within 15 minutes' using errcode = '42501';
  end if;
  update public.comments set body = trim(p_body), edited_at = now() where id = p_comment_id returning * into v_c;
  return v_c;
end $$;

create or replace function public.resolve_comment(p_comment_id uuid, p_resolved boolean default true)
returns public.comments
language plpgsql security definer set search_path = public as $$
declare v_c public.comments;
begin
  if not public.is_active_user() then raise exception 'active account required' using errcode = '42501'; end if;
  update public.comments set is_resolved = p_resolved where id = p_comment_id returning * into v_c;
  if v_c.id is null then raise exception 'comment not found' using errcode = 'P0002'; end if;
  return v_c;
end $$;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns int language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.auth_profile_id(); v_n int;
begin
  update public.notifications set is_read = true
   where recipient_id = v_me and is_read = false and (p_ids is null or id = any(p_ids));
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- UI hint (content-scoped rules arrive with later phases)
create or replace function public.person_can(p_content_id uuid, p_permission text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_permission(p_permission);
$$;

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------
create or replace view public.v_stage_durations with (security_invoker = true) as
select sh.id, sh.content_id, cr.content_id as content_code, sh.status_key, ws.name as status_name, ws.sort_order,
       sh.entered_at, sh.exited_at,
       coalesce(sh.duration_seconds, floor(extract(epoch from (now() - sh.entered_at)))::int) as duration_seconds,
       sh.exited_at is null as is_current, sh.entered_by, sh.exited_by
from public.stage_history sh
join public.content_records cr on cr.id = sh.content_id
join public.workflow_statuses ws on ws.key = sh.status_key;

create or replace view public.v_kanban_cards with (security_invoker = true) as
with last_act as (
  select distinct on (content_id) content_id, created_at, actor_id
  from public.activity_log where content_id is not null
  order by content_id, created_at desc
),
cc as (
  select content_id, count(*)::int as comment_count from public.comments group by content_id
),
plat as (
  select cp.content_id, array_agg(p.name order by p.sort_order) as platforms
  from public.content_platforms cp join public.platforms p on p.id = cp.platform_id group by cp.content_id
),
diff as (
  select cd.content_id, array_agg(d.name order by d.sort_order) as differentiators
  from public.content_differentiators cd join public.differentiators d on d.id = cd.differentiator_id group by cd.content_id
),
cur as (
  select content_id, entered_at from public.stage_history where exited_at is null
)
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
left join public.profiles pa on pa.id = cr.production_assignee_id;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.regions enable row level security;
alter table public.campuses enable row level security;
alter table public.programs enable row level security;
alter table public.campaigns enable row level security;
alter table public.platforms enable row level security;
alter table public.objectives enable row level security;
alter table public.content_pillars enable row level security;
alter table public.differentiators enable row level security;
alter table public.content_types enable row level security;
alter table public.reference_handles enable row level security;
alter table public.brand_facts enable row level security;
alter table public.workflow_statuses enable row level security;
alter table public.allowed_transitions enable row level security;
alter table public.content_id_sequences enable row level security;
alter table public.content_records enable row level security;
alter table public.content_platforms enable row level security;
alter table public.content_differentiators enable row level security;
alter table public.activity_log enable row level security;
alter table public.stage_history enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;

-- Reference data: read for active users; direct write only with admin.reference_data
do $$
declare t text;
begin
  foreach t in array array['regions','campuses','programs','campaigns','platforms','objectives','content_pillars',
                            'differentiators','content_types','reference_handles','brand_facts'] loop
    execute format('create policy %I_select on public.%I for select to authenticated using (public.is_active_user())', t, t);
    execute format('create policy %I_admin_write on public.%I for all to authenticated using (public.has_permission(''admin.reference_data'')) with check (public.has_permission(''admin.reference_data''))', t, t);
  end loop;
end $$;

create policy workflow_statuses_select on public.workflow_statuses for select to authenticated using (public.is_active_user());
create policy allowed_transitions_select on public.allowed_transitions for select to authenticated using (public.is_active_user());
create policy allowed_transitions_admin on public.allowed_transitions for all to authenticated
  using (public.has_permission('admin.reference_data')) with check (public.has_permission('admin.reference_data'));

-- Content and audit: read all; every write goes through RPCs (no direct policies)
create policy content_records_select on public.content_records for select to authenticated using (public.is_active_user());
create policy content_platforms_select on public.content_platforms for select to authenticated using (public.is_active_user());
create policy content_differentiators_select on public.content_differentiators for select to authenticated using (public.is_active_user());
create policy activity_log_select on public.activity_log for select to authenticated using (public.is_active_user());
create policy stage_history_select on public.stage_history for select to authenticated using (public.is_active_user());
create policy comments_select on public.comments for select to authenticated using (public.is_active_user());
create policy notifications_select_own on public.notifications for select to authenticated
  using (public.is_active_user() and recipient_id = public.auth_profile_id());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant select on public.regions, public.campuses, public.programs, public.campaigns, public.platforms, public.objectives,
  public.content_pillars, public.differentiators, public.content_types, public.reference_handles, public.brand_facts,
  public.workflow_statuses, public.allowed_transitions, public.content_records, public.content_platforms,
  public.content_differentiators, public.activity_log, public.stage_history, public.comments, public.notifications,
  public.v_stage_durations, public.v_kanban_cards to authenticated;

grant insert, update, delete on public.campuses, public.programs, public.campaigns, public.platforms, public.objectives,
  public.content_pillars, public.differentiators, public.content_types, public.reference_handles, public.brand_facts,
  public.allowed_transitions to authenticated;

grant execute on function
  public.create_content_record(jsonb),
  public.available_transitions(uuid),
  public.move_stage(uuid, text, text),
  public.update_content_fields(uuid, jsonb),
  public.add_comment(uuid, public.comment_section, text, uuid[]),
  public.edit_comment(uuid, text),
  public.resolve_comment(uuid, boolean),
  public.mark_notifications_read(uuid[]),
  public.person_can(uuid, text),
  public.working_days_between(timestamptz, timestamptz)
to authenticated;

-- ---------------------------------------------------------------------------
-- System seed: regions, campuses, platforms, objectives, pillars,
-- differentiators, content types, handles, statuses, transitions
-- ---------------------------------------------------------------------------
insert into public.regions (code, name, timezone) values
  ('AU', 'Australia', 'Australia/Sydney'),
  ('NP', 'Nepal', 'Asia/Kathmandu');

insert into public.campuses (region_code, name, is_generic) values
  ('AU', 'Perth', false), ('AU', 'Melbourne', false), ('AU', 'North Strathfield', false), ('AU', 'Rockdale', false),
  ('AU', 'Generic (AU)', true),
  ('NP', 'Kathmandu', false), ('NP', 'Generic (NP)', true);

insert into public.platforms (key, name, sort_order) values
  ('facebook', 'Facebook', 1), ('instagram', 'Instagram', 2), ('tiktok', 'TikTok', 3), ('linkedin', 'LinkedIn', 4), ('youtube', 'YouTube', 5);

insert into public.objectives (key, name, sort_order) values
  ('reach', 'Reach', 1), ('gain_followers', 'Gain Followers', 2), ('education', 'Education', 3), ('authority', 'Authority', 4),
  ('differentiation', 'Differentiation', 5), ('trust', 'Trust', 6), ('social_proof', 'Social Proof', 7),
  ('lead_generation', 'Lead Generation', 8), ('career_counselling', 'Career Counselling', 9), ('conversion', 'Conversion', 10),
  ('community_retention', 'Community / Retention', 11);

insert into public.content_pillars (key, name, human_only, sort_order) values
  ('growth_reels', 'Growth Reels', false, 1), ('technical_education', 'Technical Education', false, 2),
  ('career_education', 'Career Education', false, 3), ('professional_communication', 'Professional Communication', false, 4),
  ('student_journey', 'Student Journey', true, 5), ('student_creator', 'Student Creator Videos', true, 6),
  ('projects_portfolios', 'Projects & Portfolios', false, 7), ('student_success', 'Student Success', true, 8),
  ('mentor_founder', 'Mentor / Founder Content', false, 9), ('why_techskills', 'Why TechSkills', false, 10),
  ('program_promotion', 'Program Promotion', false, 11), ('campus_culture', 'Campus / Culture', false, 12),
  ('events', 'Events', false, 13), ('paid_advertising', 'Paid Advertising', false, 14);

insert into public.differentiators (key, name, sort_order) values
  ('real_world_skills', 'Real-world technical skills', 1), ('real_projects', 'Real applications / projects', 2),
  ('portfolio', 'Portfolio development', 3), ('professional_communication', 'Professional communication', 4),
  ('pronunciation', 'Pronunciation improvement', 5), ('presentation', 'Presentation skills', 6),
  ('professional_presence', 'Professional presence', 7), ('personal_branding', 'Personal branding', 8),
  ('student_social_portfolio', 'Student social-media portfolio', 9), ('resume', 'Resume preparation', 10),
  ('interview', 'Interview preparation', 11), ('confidence', 'Confidence development', 12),
  ('workplace_readiness', 'Workplace readiness', 13), ('career_guidance', 'Career guidance', 14),
  ('internship_support', 'Internship support', 15), ('first_job_support', 'First-job support', 16),
  ('australian_experience', 'Australian experience', 17), ('student_results', 'Student results', 18),
  ('ongoing_career_support', 'Ongoing career support', 19);

insert into public.content_types (key, name, medium, script_shape, sort_order) values
  -- video (S14: eight formats, all human-produced)
  ('reel', 'Reel / short vertical video', 'video', 'spoken', 1),
  ('explainer_video', 'Explainer / tutorial video', 'video', 'spoken', 2),
  ('testimonial_video', 'Student testimonial video', 'video', 'spoken', 3),
  ('mentor_talk', 'Mentor / founder talk', 'video', 'spoken', 4),
  ('student_creator_video', 'Student creator video', 'video', 'spoken', 5),
  ('event_recap_video', 'Event recap video', 'video', 'shot_list', 6),
  ('campus_tour_video', 'Campus / culture video', 'video', 'shot_list', 7),
  ('long_form_video', 'Long-form YouTube video', 'video', 'spoken', 8),
  -- static
  ('admission_poster', 'Admission poster', 'static', 'copy_spec', 20),
  ('event_promo', 'Event promo', 'static', 'copy_spec', 21),
  ('countdown', 'Countdown', 'static', 'copy_spec', 22),
  ('brand_poster', 'Brand poster', 'static', 'copy_spec', 23),
  ('testimonial_card', 'Testimonial card', 'static', 'copy_spec', 24),
  ('carousel', 'Carousel / infographic', 'carousel', 'copy_spec', 25),
  ('milestone_banner', 'Milestone banner', 'static', 'copy_spec', 26),
  ('thumbnail', 'Thumbnail', 'thumbnail', 'copy_spec', 27),
  ('story_cut', 'Story cut', 'story', 'caption', 28),
  ('caption', 'Caption', 'caption', 'caption', 29),
  ('ad_copy', 'Ad copy', 'caption', 'copy_spec', 30),
  ('one_off', 'One-off', 'one_off', 'none', 99);

insert into public.reference_handles (region_code, platform_id, handle, is_active, note)
select v.region, p.id, v.handle, v.active, v.note
from (values
  ('AU', 'instagram', '@techskills.institute', true,  'Active AU handle'),
  ('AU', 'tiktok',    '@techskills.institute', true,  'Active AU handle'),
  ('NP', 'instagram', '@techskills.nepal',     true,  'Active NP handle'),
  ('AU', 'instagram', '@techskillsitcareer',   false, 'RETIRED — its appearance on any asset is a defect'),
  ('NP', 'instagram', '@techskillsitcareer',   false, 'RETIRED — its appearance on any asset is a defect')
) as v(region, platform_key, handle, active, note)
join public.platforms p on p.key = v.platform_key;

insert into public.brand_facts (key, value) values
  ('taglines', '["Your IT Career Begins Here", "Zero to Hero", "Hands-On Experience. Real Labs. Real Skills. Real Results.", "Book a Free Career Consultation"]'),
  ('palette', '{}'), ('fonts', '{}'), ('logo_rules', '{}'), ('voice', '{}');

insert into public.workflow_statuses (key, name, sort_order, colour_key, group_key, is_terminal) values
  ('requested',                'Requested / Planned',       1,  'grey',       'planning',        false),
  ('idea_concept',             'Idea & Concept',            2,  'blue',       'concept',         false),
  ('script_copy',              'Script / Copy',             3,  'lavender',   'script',          false),
  ('script_approval',          'Script Approval',           4,  'lavender',   'script',          false),
  ('ready_for_production',     'Ready for Production',      5,  'cyan',       'production_ready',false),
  ('production',               'Production',                6,  'brand_blue', 'production',      false),
  ('production_review',        'Production Review',         7,  'amber',      'review',          false),
  ('dm_review',                'DM / Brand Review',         8,  'amber',      'review',          false),
  ('changes_required',         'Changes Required',          9,  'orange',     'changes',         false),
  ('content_review',           'Content Review',            10, 'indigo',     'content_review',  false),
  ('ready_for_final_approval', 'Ready for Final Approval',  11, 'purple',     'final_approval',  false),
  ('final_approval',           'Final Approval',            12, 'purple',     'final_approval',  false),
  ('final_approved',           'Final Approved',            13, 'green',      'approved',        false),
  ('scheduled',                'Scheduled',                 14, 'teal',       'scheduled',       false),
  ('published',                'Published',                 15, 'dark_green', 'published',       false),
  ('archived',                 'Archived',                  16, 'slate',      'archived',        true);

insert into public.allowed_transitions (from_status, to_status, permission_key, reason_required, is_backward, label) values
  -- intake and concept (DM leads, Production collaborates)
  ('requested', 'idea_concept', 'content.edit_concept', false, false, 'Start concept'),
  ('requested', 'archived', 'content.edit_concept', true, false, 'Decline request'),
  ('idea_concept', 'script_copy', 'script.edit', false, false, 'Start script'),
  ('idea_concept', 'requested', 'content.edit_concept', true, true, 'Back to request'),
  -- script gate
  ('script_copy', 'script_approval', 'script.submit', false, false, 'Submit for script approval'),
  ('script_copy', 'idea_concept', 'script.edit', true, true, 'Back to concept'),
  ('script_approval', 'ready_for_production', 'script.approve', false, false, 'Approve script'),
  ('script_approval', 'script_copy', 'script.approve', true, true, 'Request script changes'),
  -- production
  ('ready_for_production', 'production', 'production.assign', false, false, 'Assign and start production'),
  ('ready_for_production', 'script_copy', 'production.assign', true, true, 'Back to script'),
  ('production', 'production_review', 'production.update_own', false, false, 'Submit for production review'),
  ('production', 'production_review', 'production.assign', false, false, 'Submit for production review'),
  ('production_review', 'dm_review', 'production.review', false, false, 'Pass production review'),
  ('production_review', 'production', 'production.review', true, true, 'Return to production'),
  -- DM / brand review and the revision loop
  ('dm_review', 'changes_required', 'dm.review', true, true, 'Request changes'),
  ('dm_review', 'content_review', 'dm.review', false, false, 'Send to content review'),
  ('dm_review', 'ready_for_final_approval', 'dm.review', false, false, 'Ready for final approval'),
  ('changes_required', 'production', 'production.assign', false, false, 'Rework in production'),
  ('changes_required', 'production', 'dm.review', false, false, 'Rework in production'),
  ('changes_required', 'script_copy', 'script.edit', false, false, 'Rework the script'),
  -- content review
  ('content_review', 'ready_for_final_approval', 'dm.review', false, false, 'Reviews complete'),
  ('content_review', 'changes_required', 'dm.review', true, true, 'Request changes'),
  -- final approval
  ('ready_for_final_approval', 'final_approval', 'dm.review', false, false, 'Submit for final approval'),
  ('ready_for_final_approval', 'changes_required', 'dm.review', true, true, 'Request changes'),
  ('final_approval', 'final_approved', 'final.approve', false, false, 'Final approve'),
  ('final_approval', 'changes_required', 'final.approve', true, true, 'Request changes'),
  ('final_approval', 'archived', 'final.approve', true, false, 'Reject'),
  -- publishing
  ('final_approved', 'scheduled', 'publish.schedule', false, false, 'Schedule'),
  ('final_approved', 'changes_required', 'dm.review', true, true, 'Reopen for changes'),
  ('scheduled', 'published', 'publish.publish', false, false, 'Mark published'),
  ('scheduled', 'final_approved', 'publish.schedule', true, true, 'Unschedule'),
  ('published', 'archived', 'publish.schedule', false, false, 'Archive');
