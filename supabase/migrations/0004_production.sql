-- ============================================================================
-- 0004_production.sql — Phase 3: assignment, production tasks, creative
-- versions (Supabase Storage), production review, workload views, person
-- backlog, work status.
-- Rules: assignment cascade is one RPC (§80); workload counts only genuinely
--        active assigned work (§77); Team Board is operational, not HR (§72);
--        all production is human work.
-- ============================================================================

create type public.task_status as enum ('todo','in_progress','done','cancelled');
create type public.assignment_role as enum ('production_assignee','dm_owner');
create type public.creative_kind as enum ('image','video','carousel','thumbnail','other');
create type public.production_decision as enum ('pass','changes');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.production_tasks (
  id           uuid primary key default gen_random_uuid(),
  content_id   uuid not null references public.content_records(id),
  title        text not null check (length(trim(title)) > 0),
  description  text,
  category     text,
  assignee_id  uuid references public.profiles(id),
  created_by   uuid references public.profiles(id),
  status       public.task_status not null default 'todo',
  priority     public.content_priority not null default 'normal',
  start_date   date,
  due_date     date,
  completed_at timestamptz,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index production_tasks_content_idx on public.production_tasks(content_id, sort_order);
create index production_tasks_assignee_idx on public.production_tasks(assignee_id, status);
create trigger production_tasks_set_updated_at before update on public.production_tasks
  for each row execute function public.set_updated_at();

create table public.assignments (
  id            uuid primary key default gen_random_uuid(),
  content_id    uuid not null references public.content_records(id),
  assignee_id   uuid references public.profiles(id),
  assigned_by   uuid references public.profiles(id),
  role          public.assignment_role not null,
  assigned_at   timestamptz not null default now(),
  unassigned_at timestamptz,
  reason        text
);
create index assignments_content_idx on public.assignments(content_id, assigned_at desc);
create index assignments_assignee_idx on public.assignments(assignee_id) where unassigned_at is null;

create table public.creative_versions (
  id           uuid primary key default gen_random_uuid(),
  content_id   uuid not null references public.content_records(id),
  version_no   int not null,
  kind         public.creative_kind not null default 'image',
  storage_path text not null,
  file_name    text not null,
  mime         text,
  size_bytes   bigint,
  width        int,
  height       int,
  duration_s   numeric(8,2),
  uploaded_by  uuid references public.profiles(id),
  note         text,
  created_at   timestamptz not null default now(),
  unique (content_id, version_no),
  unique (storage_path)
);
create index creative_versions_content_idx on public.creative_versions(content_id, version_no desc);

create table public.production_reviews (
  id                  uuid primary key default gen_random_uuid(),
  content_id          uuid not null references public.content_records(id),
  creative_version_id uuid references public.creative_versions(id),
  reviewer_id         uuid not null references public.profiles(id),
  decision            public.production_decision not null,
  checklist           jsonb not null default '{}'::jsonb,
  notes               text,
  created_at          timestamptz not null default now()
);
create index production_reviews_content_idx on public.production_reviews(content_id, created_at desc);

alter table public.content_records
  add constraint content_records_current_creative_fkey
  foreign key (current_creative_version_id) references public.creative_versions(id);
alter table public.ai_evaluations
  add constraint ai_evaluations_creative_version_fkey
  foreign key (creative_version_id) references public.creative_versions(id);

insert into public.app_settings (key, value, description) values
  ('workload_thresholds', '{"low": 2, "normal": 5, "high": 8}', 'Active-work counts: <= low → Low, <= normal → Normal, <= high → High, above → At Risk (§78)'),
  ('production_review_checklist', '["Correct dimensions", "Video quality", "Audio quality", "Subtitles present and timed", "Export quality", "Correct assets used", "Correct version", "Visually complete", "Platform compatible", "Matches the production brief"]', 'Production Review checklist items (§36)');

-- Gate transitions for this phase go through their RPCs
update public.allowed_transitions set rpc_only = true
 where (from_status, to_status) in (('production','production_review'), ('production_review','dm_review'), ('production_review','production'));

-- Realtime for the Team Board
alter publication supabase_realtime add table public.content_records, public.production_tasks, public.profiles;

-- ---------------------------------------------------------------------------
-- Storage: private bucket "creatives"; paths are {content_uuid}/{version}/{file}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('creatives', 'creatives', false, 524288000,
        array['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/quicktime','video/webm','application/pdf'])
on conflict (id) do nothing;

create or replace function public.can_upload_creative(p_content_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active_user() and exists (
    select 1 from public.content_records cr
    where cr.id = p_content_id
      and (public.has_permission('production.assign')
           or public.has_permission('dm.review')
           or (public.has_permission('production.update_own') and cr.production_assignee_id = public.auth_profile_id()))
  );
$$;

create policy creatives_read on storage.objects for select to authenticated
  using (bucket_id = 'creatives' and public.is_active_user());
create policy creatives_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'creatives'
              and public.can_upload_creative(((storage.foldername(name))[1])::uuid));
create policy creatives_update_own on storage.objects for update to authenticated
  using (bucket_id = 'creatives' and owner = auth.uid());

-- ---------------------------------------------------------------------------
-- Workload helpers (§77–78)
-- ---------------------------------------------------------------------------
create or replace function public.workload_status(p_active int)
returns text language sql stable security definer set search_path = public as $$
  select case
    when p_active <= coalesce((select (value ->> 'low')::int from public.app_settings where key = 'workload_thresholds'), 2) then 'low'
    when p_active <= coalesce((select (value ->> 'normal')::int from public.app_settings where key = 'workload_thresholds'), 5) then 'normal'
    when p_active <= coalesce((select (value ->> 'high')::int from public.app_settings where key = 'workload_thresholds'), 8) then 'high'
    else 'at_risk' end;
$$;

-- Active work per person: content in Production / Changes Required where they
-- are the assignee, plus their open tasks on non-terminal content.
create or replace view public.v_active_work with (security_invoker = true) as
select cr.production_assignee_id as profile_id, cr.id as content_id, null::uuid as task_id,
       'content'::text as kind, cr.content_id as content_code, cr.title, cr.status_key,
       kc.status_name, kc.colour_key, kc.due_date, kc.is_overdue, kc.is_stalled, kc.stage_entered_at, kc.seconds_in_stage, cr.priority
from public.content_records cr
join public.v_kanban_cards kc on kc.id = cr.id
where cr.production_assignee_id is not null
  and cr.status_key in ('production', 'changes_required')
union all
select t.assignee_id, t.content_id, t.id, 'task', cr.content_id, t.title, cr.status_key,
       kc.status_name, kc.colour_key, t.due_date, (t.due_date < current_date), kc.is_stalled, kc.stage_entered_at, kc.seconds_in_stage, t.priority
from public.production_tasks t
join public.content_records cr on cr.id = t.content_id
join public.v_kanban_cards kc on kc.id = cr.id
where t.assignee_id is not null
  and t.status in ('todo', 'in_progress')
  and cr.status_key not in ('archived', 'published', 'scheduled', 'final_approved');

create or replace view public.v_workload with (security_invoker = true) as
select p.id as profile_id, p.full_name, p.role_id, r.name as role_name, r.key as role_key, p.work_status, p.photo_url,
       p.last_active_at,
       coalesce(w.active_count, 0) as active_count,
       coalesce(w.overdue_count, 0) as overdue_count,
       coalesce(w.stalled_count, 0) as stalled_count,
       public.workload_status(coalesce(w.active_count, 0)) as workload_status,
       w.current_content_code, w.current_title, w.current_status_name, w.current_colour_key, w.current_due_date, w.current_seconds_in_stage,
       exists (select 1 from public.team_memberships tm join public.teams t on t.id = tm.team_id where tm.profile_id = p.id and t.key = 'production') as in_production,
       exists (select 1 from public.team_memberships tm join public.teams t on t.id = tm.team_id where tm.profile_id = p.id and t.key = 'dm') as in_dm,
       exists (select 1 from public.team_memberships tm join public.teams t on t.id = tm.team_id where tm.profile_id = p.id and t.key = 'content_reviewer') as in_content_reviewer,
       exists (select 1 from public.team_memberships tm join public.teams t on t.id = tm.team_id where tm.profile_id = p.id and t.key = 'ceo') as in_ceo
from public.profiles p
left join public.roles r on r.id = p.role_id
left join lateral (
  select count(*)::int as active_count,
         count(*) filter (where aw.is_overdue)::int as overdue_count,
         count(*) filter (where aw.is_stalled)::int as stalled_count,
         (array_agg(aw.content_code order by aw.is_overdue desc, aw.due_date nulls last))[1] as current_content_code,
         (array_agg(aw.title order by aw.is_overdue desc, aw.due_date nulls last))[1] as current_title,
         (array_agg(aw.status_name order by aw.is_overdue desc, aw.due_date nulls last))[1] as current_status_name,
         (array_agg(aw.colour_key order by aw.is_overdue desc, aw.due_date nulls last))[1] as current_colour_key,
         (array_agg(aw.due_date order by aw.is_overdue desc, aw.due_date nulls last))[1] as current_due_date,
         (array_agg(aw.seconds_in_stage order by aw.is_overdue desc, aw.due_date nulls last))[1] as current_seconds_in_stage
  from public.v_active_work aw where aw.profile_id = p.id
) w on true
where p.account_status = 'active';

create or replace view public.v_unassigned_work with (security_invoker = true) as
select kc.id, kc.content_id, kc.title, kc.content_type, kc.priority, kc.due_date, kc.is_overdue, kc.status_key, kc.status_name, kc.colour_key,
       kc.region_code, kc.dm_owner_name, kc.stage_entered_at, kc.seconds_in_stage
from public.v_kanban_cards kc
where kc.production_assignee_id is null
  and kc.status_key in ('ready_for_production', 'production', 'changes_required');

-- Team Board DM / CEO section stats
create or replace view public.v_dm_stats with (security_invoker = true) as
select p.id as profile_id,
       (select count(*) from public.content_records cr where cr.dm_owner_id = p.id and cr.status_key not in ('archived','published'))::int as active_content,
       (select count(*) from public.content_records cr where cr.dm_owner_id = p.id and cr.status_key = 'script_copy')::int as scripts_waiting,
       (select count(*) from public.content_records cr where cr.status_key = 'dm_review')::int as dm_reviews_waiting,
       (select count(*) from public.content_records cr where cr.dm_owner_id = p.id and cr.status_key = 'changes_required')::int as feedback_requiring_action,
       (select count(*) from public.v_kanban_cards kc where kc.dm_owner_id = p.id and kc.is_overdue)::int as overdue,
       (select count(*) from public.production_tasks t where t.assignee_id = p.id and t.status in ('todo','in_progress'))::int as current_tasks
from public.profiles p where p.account_status = 'active';

create or replace view public.v_ceo_stats with (security_invoker = true) as
select p.id as profile_id,
       (select count(*) from public.content_records cr where cr.status_key = 'final_approval')::int as waiting_final_approval,
       (select count(*) from public.content_records cr where cr.status_key = 'script_approval')::int as waiting_script_approval,
       (select count(*) from public.content_records cr where cr.status_key = 'changes_required')::int as change_requests,
       (select count(*) from public.content_records cr where cr.status_key in ('script_approval','final_approval'))::int as active_approval_work
from public.profiles p where p.account_status = 'active' and p.is_final_approver;

-- ---------------------------------------------------------------------------
-- Person backlog (D5): the five groups for one person, as JSON
-- ---------------------------------------------------------------------------
-- Which permission makes someone the next actor for a stage
create or replace function public.stage_actor_permission(p_status text)
returns text language sql immutable as $$
  select case p_status
    when 'requested' then 'content.edit_concept'
    when 'idea_concept' then 'content.edit_concept'
    when 'script_copy' then 'script.edit'
    when 'script_approval' then 'script.approve'
    when 'ready_for_production' then 'production.assign'
    when 'production' then 'production.update_own'
    when 'production_review' then 'production.review'
    when 'dm_review' then 'dm.review'
    when 'changes_required' then 'production.update_own'
    when 'content_review' then 'review.rate'
    when 'ready_for_final_approval' then 'dm.review'
    when 'final_approval' then 'final.approve'
    when 'final_approved' then 'publish.schedule'
    when 'scheduled' then 'publish.publish'
    else null end;
$$;

create or replace function public.profile_has_permission(p_profile_id uuid, p_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    join public.role_permissions rp on rp.role_id = p.role_id
    join public.permissions perm on perm.id = rp.permission_id
    where p.id = p_profile_id and p.account_status = 'active' and perm.key = p_key
  ) or (p_key like 'admin.%' and exists (select 1 from public.profiles where id = p_profile_id and is_super_admin and account_status = 'active'));
$$;

create or replace function public.person_backlog(p_profile_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_final boolean;
  v_result jsonb;
begin
  if not public.is_active_user() then
    raise exception 'active account required' using errcode = '42501';
  end if;
  select is_final_approver into v_final from public.profiles where id = p_profile_id;

  with cards as (select * from public.v_kanban_cards where status_key <> 'archived'),
  waiting as (
    select c.* from cards c
    where public.stage_actor_permission(c.status_key) is not null
      and (
        -- assignee-specific stages
        (c.status_key in ('production','changes_required') and c.production_assignee_id = p_profile_id)
        -- owner-specific DM stages
        or (c.status_key in ('requested','idea_concept','script_copy','ready_for_final_approval') and (c.dm_owner_id = p_profile_id or (c.dm_owner_id is null and public.profile_has_permission(p_profile_id, public.stage_actor_permission(c.status_key)))))
        -- role-wide stages
        or (c.status_key in ('script_approval','final_approval') and coalesce(v_final, false) and public.profile_has_permission(p_profile_id, public.stage_actor_permission(c.status_key)))
        or (c.status_key in ('ready_for_production','production_review','dm_review','content_review','final_approved','scheduled') and public.profile_has_permission(p_profile_id, public.stage_actor_permission(c.status_key)))
      )
  ),
  assigned as (
    select c.*, 'content'::text as item_kind, null::text as task_title, null::uuid as task_id
    from cards c where c.production_assignee_id = p_profile_id or c.dm_owner_id = p_profile_id
    union all
    select c.*, 'task', t.title, t.id
    from public.production_tasks t join cards c on c.id = t.content_id
    where t.assignee_id = p_profile_id and t.status in ('todo','in_progress')
  ),
  changes_asked as (
    select a.content_id, c.content_code, c.title, a.reason, a.created_at,
           (c.status_key not in ('changes_required')) as is_resolved
    from public.activity_log a
    join (select id, content_id as content_code, title, status_key from public.content_records) c on c.id = a.content_id
    where a.actor_id = p_profile_id and a.event_type in ('status_change','script_changes_requested')
      and (a.new_value ->> 'status' = 'changes_required' or a.event_type = 'script_changes_requested')
    order by a.created_at desc limit 50
  ),
  blocked as (
    select c.* from cards c
    where (c.production_assignee_id = p_profile_id or c.dm_owner_id = p_profile_id)
      and c.id not in (select id from waiting)
      and c.status_key not in ('production','changes_required','archived','published')
  ),
  done as (
    select a.content_id, cr.content_id as content_code, a.event_type, a.description, a.created_at
    from public.activity_log a join public.content_records cr on cr.id = a.content_id
    where a.actor_id = p_profile_id and a.created_at >= now() - interval '14 days'
    order by a.created_at desc limit 50
  )
  select jsonb_build_object(
    'waiting_on_me', coalesce((select jsonb_agg(to_jsonb(w) order by w.due_date nulls last, w.stage_entered_at) from waiting w), '[]'::jsonb),
    'assigned_to_me', coalesce((select jsonb_agg(to_jsonb(a) order by a.due_date nulls last, a.stage_entered_at) from assigned a), '[]'::jsonb),
    'changes_i_asked_for', coalesce((select jsonb_agg(to_jsonb(x)) from changes_asked x), '[]'::jsonb),
    'blocked_by_others', coalesce((select jsonb_agg(to_jsonb(b) order by b.due_date nulls last) from blocked b), '[]'::jsonb),
    'recently_done', coalesce((select jsonb_agg(to_jsonb(d)) from done d), '[]'::jsonb),
    'workload', (select to_jsonb(v) from public.v_workload v where v.profile_id = p_profile_id)
  ) into v_result;
  return v_result;
end $$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
-- assign_production: the whole cascade in one place (§80)
create or replace function public.assign_production(p_content_id uuid, p_assignee_id uuid, p_reason text default null)
returns public.content_records
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.auth_profile_id();
  v_rec public.content_records;
  v_old uuid;
  v_name text;
begin
  if not public.has_permission('production.assign') then
    raise exception 'production.assign permission required' using errcode = '42501';
  end if;
  select * into v_rec from public.content_records where id = p_content_id for update;
  if v_rec.id is null then raise exception 'content record not found' using errcode = 'P0002'; end if;
  if p_assignee_id is not null and not exists (select 1 from public.profiles where id = p_assignee_id and account_status = 'active') then
    raise exception 'assignee must be an active user' using errcode = '22023';
  end if;
  v_old := v_rec.production_assignee_id;
  if v_old is not distinct from p_assignee_id then
    return v_rec;
  end if;
  if v_old is not null and coalesce(trim(p_reason), '') = '' then
    raise exception 'a reason is required to reassign' using errcode = '23514';
  end if;

  update public.assignments set unassigned_at = now()
   where content_id = p_content_id and role = 'production_assignee' and unassigned_at is null;
  if p_assignee_id is not null then
    insert into public.assignments (content_id, assignee_id, assigned_by, role, reason)
    values (p_content_id, p_assignee_id, v_me, 'production_assignee', nullif(trim(p_reason), ''));
  end if;

  update public.content_records
     set production_assignee_id = p_assignee_id,
         production_manager_id = coalesce(production_manager_id, v_me),
         updated_by = v_me
   where id = p_content_id returning * into v_rec;

  select full_name into v_name from public.profiles where id = p_assignee_id;
  perform public.log_activity(p_content_id, case when v_old is null then 'assignment' else 'reassignment' end,
    format('%s assigned %s to %s', public.actor_name(), v_rec.content_id, coalesce(v_name, 'nobody')),
    jsonb_build_object('production_assignee_id', v_old), jsonb_build_object('production_assignee_id', p_assignee_id), p_reason);

  if p_assignee_id is not null then
    perform public.notify(array[p_assignee_id], p_content_id, 'content_assigned',
      format('%s assigned to you', v_rec.content_id), v_rec.title);
    if v_rec.status_key = 'ready_for_production' then
      v_rec := public.move_stage(p_content_id, 'production', null);
    end if;
  end if;
  return v_rec;
end $$;

-- Tasks
create or replace function public.create_task(
  p_content_id uuid, p_title text, p_description text default null, p_category text default null,
  p_assignee_id uuid default null, p_priority public.content_priority default 'normal',
  p_start_date date default null, p_due_date date default null
) returns public.production_tasks
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.auth_profile_id(); v_rec public.content_records; v_task public.production_tasks;
begin
  select * into v_rec from public.content_records where id = p_content_id;
  if v_rec.id is null then raise exception 'content record not found' using errcode = 'P0002'; end if;
  if not (public.has_permission('production.assign') or (public.has_permission('production.update_own') and v_rec.production_assignee_id = v_me)) then
    raise exception 'production.assign permission required' using errcode = '42501';
  end if;
  insert into public.production_tasks (content_id, title, description, category, assignee_id, created_by, priority, start_date, due_date, sort_order)
  values (p_content_id, trim(p_title), p_description, p_category, coalesce(p_assignee_id, v_rec.production_assignee_id), v_me, p_priority, p_start_date, p_due_date,
          coalesce((select max(sort_order) + 1 from public.production_tasks where content_id = p_content_id), 0))
  returning * into v_task;
  perform public.log_activity(p_content_id, 'task_created',
    format('%s created task "%s" on %s', public.actor_name(), v_task.title, v_rec.content_id),
    null, jsonb_build_object('task_id', v_task.id, 'assignee_id', v_task.assignee_id));
  if v_task.assignee_id is not null and v_task.assignee_id <> v_me then
    perform public.notify(array[v_task.assignee_id], p_content_id, 'task_assigned', format('Task on %s: %s', v_rec.content_id, v_task.title), null);
  end if;
  return v_task;
end $$;

create or replace function public.update_task(p_task_id uuid, p jsonb)
returns public.production_tasks
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.auth_profile_id();
  v_task public.production_tasks; v_new public.production_tasks; v_rec public.content_records;
begin
  select * into v_task from public.production_tasks where id = p_task_id for update;
  if v_task.id is null then raise exception 'task not found' using errcode = 'P0002'; end if;
  select * into v_rec from public.content_records where id = v_task.content_id;
  if not (public.has_permission('production.assign')
          or (public.has_permission('production.update_own') and (v_task.assignee_id = v_me or v_rec.production_assignee_id = v_me))) then
    raise exception 'you may only update tasks assigned to you' using errcode = '42501';
  end if;

  update public.production_tasks set
    title       = case when p ? 'title' then coalesce(nullif(trim(p ->> 'title'), ''), title) else title end,
    description = case when p ? 'description' then p ->> 'description' else description end,
    category    = case when p ? 'category' then p ->> 'category' else category end,
    assignee_id = case when p ? 'assignee_id' and public.has_permission('production.assign') then (p ->> 'assignee_id')::uuid else assignee_id end,
    priority    = case when p ? 'priority' then (p ->> 'priority')::public.content_priority else priority end,
    start_date  = case when p ? 'start_date' then (p ->> 'start_date')::date else start_date end,
    due_date    = case when p ? 'due_date' then (p ->> 'due_date')::date else due_date end,
    status      = case when p ? 'status' then (p ->> 'status')::public.task_status else status end,
    completed_at = case when p ? 'status' then (case when (p ->> 'status') = 'done' then coalesce(completed_at, now()) when (p ->> 'status') in ('todo','in_progress') then null else completed_at end) else completed_at end
  where id = p_task_id returning * into v_new;

  if v_new.status is distinct from v_task.status then
    perform public.log_activity(v_rec.id,
      case v_new.status when 'done' then 'task_completed' when 'cancelled' then 'task_cancelled' else 'task_updated' end,
      format('%s marked task "%s" %s on %s', public.actor_name(), v_new.title, replace(v_new.status::text, '_', ' '), v_rec.content_id),
      jsonb_build_object('status', v_task.status), jsonb_build_object('status', v_new.status, 'task_id', v_new.id));
  elsif v_new.assignee_id is distinct from v_task.assignee_id then
    perform public.log_activity(v_rec.id, 'task_updated',
      format('%s reassigned task "%s" on %s', public.actor_name(), v_new.title, v_rec.content_id),
      jsonb_build_object('assignee_id', v_task.assignee_id), jsonb_build_object('assignee_id', v_new.assignee_id, 'task_id', v_new.id));
    if v_new.assignee_id is not null and v_new.assignee_id <> v_me then
      perform public.notify(array[v_new.assignee_id], v_rec.id, 'task_assigned', format('Task on %s: %s', v_rec.content_id, v_new.title), null);
    end if;
  end if;
  return v_new;
end $$;

-- Creative versions: the client uploads to Storage first, then registers.
create or replace function public.register_creative_version(
  p_content_id uuid, p_storage_path text, p_file_name text, p_mime text default null,
  p_size_bytes bigint default null, p_kind public.creative_kind default 'image',
  p_width int default null, p_height int default null, p_duration_s numeric default null, p_note text default null
) returns public.creative_versions
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.auth_profile_id(); v_rec public.content_records; v_no int; v_cv public.creative_versions;
begin
  if not public.can_upload_creative(p_content_id) then
    raise exception 'you may not upload creatives for this record' using errcode = '42501';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'creatives' and name = p_storage_path) then
    raise exception 'file not found in storage; upload it first' using errcode = 'P0002';
  end if;
  select * into v_rec from public.content_records where id = p_content_id for update;
  select coalesce(max(version_no), 0) + 1 into v_no from public.creative_versions where content_id = p_content_id;
  insert into public.creative_versions (content_id, version_no, kind, storage_path, file_name, mime, size_bytes, width, height, duration_s, uploaded_by, note)
  values (p_content_id, v_no, p_kind, p_storage_path, p_file_name, p_mime, p_size_bytes, p_width, p_height, p_duration_s, v_me, nullif(trim(p_note), ''))
  returning * into v_cv;
  update public.content_records set current_creative_version_id = v_cv.id, updated_by = v_me where id = p_content_id;
  perform public.log_activity(p_content_id, 'creative_version_uploaded',
    format('%s uploaded creative V%s (%s) on %s', public.actor_name(), v_no, p_file_name, v_rec.content_id),
    null, jsonb_build_object('creative_version_id', v_cv.id, 'version_no', v_no, 'kind', p_kind));
  -- Creative changed after final approval → Phase 5 banner; recorded now so history is complete.
  if exists (select 1 from public.activity_log where content_id = p_content_id and event_type = 'final_approved') then
    perform public.log_activity(p_content_id, 'creative_changed_after_approval',
      format('Creative V%s uploaded after final approval on %s', v_no, v_rec.content_id), null, jsonb_build_object('creative_version_id', v_cv.id));
  end if;
  return v_cv;
end $$;

-- Submit for production review (assignee or manager); needs a creative version.
create or replace function public.submit_for_production_review(p_content_id uuid)
returns public.content_records
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.auth_profile_id(); v_rec public.content_records;
begin
  select * into v_rec from public.content_records where id = p_content_id for update;
  if v_rec.id is null then raise exception 'content record not found' using errcode = 'P0002'; end if;
  if not (public.has_permission('production.assign') or (public.has_permission('production.update_own') and v_rec.production_assignee_id = v_me)) then
    raise exception 'only the assignee or a production manager can submit for review' using errcode = '42501';
  end if;
  if v_rec.status_key <> 'production' then
    raise exception 'the record must be in Production to submit for review' using errcode = '22023';
  end if;
  if v_rec.current_creative_version_id is null then
    raise exception 'upload a review version before submitting' using errcode = '23514';
  end if;
  if v_rec.production_folder_url is null then
    raise exception 'add the production folder link before submitting' using errcode = '23514';
  end if;
  perform public.log_activity(p_content_id, 'production_submitted',
    format('%s submitted %s for production review', public.actor_name(), v_rec.content_id), null, null);
  v_rec := public.internal_move_stage(p_content_id, 'production_review', null);
  return v_rec;
end $$;

-- Production review: pass → DM review (Phase 4 hooks the AI creative gate here); changes → back to Production with a reason.
create or replace function public.production_review(p_content_id uuid, p_decision public.production_decision, p_checklist jsonb default '{}'::jsonb, p_notes text default null)
returns public.content_records
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.auth_profile_id(); v_rec public.content_records; v_review public.production_reviews;
begin
  if not public.has_permission('production.review') then
    raise exception 'production.review permission required' using errcode = '42501';
  end if;
  select * into v_rec from public.content_records where id = p_content_id for update;
  if v_rec.id is null then raise exception 'content record not found' using errcode = 'P0002'; end if;
  if v_rec.status_key <> 'production_review' then
    raise exception 'the record is not in Production Review' using errcode = '22023';
  end if;
  if p_decision = 'changes' and coalesce(trim(p_notes), '') = '' then
    raise exception 'a reason is required to return work' using errcode = '23514';
  end if;

  insert into public.production_reviews (content_id, creative_version_id, reviewer_id, decision, checklist, notes)
  values (p_content_id, v_rec.current_creative_version_id, v_me, p_decision, coalesce(p_checklist, '{}'::jsonb), nullif(trim(p_notes), ''))
  returning * into v_review;

  perform public.log_activity(p_content_id, 'production_review',
    format('%s %s production review on %s', public.actor_name(), case p_decision when 'pass' then 'passed' else 'returned' end, v_rec.content_id),
    null, jsonb_build_object('review_id', v_review.id, 'decision', p_decision, 'creative_version_id', v_rec.current_creative_version_id),
    case when p_decision = 'changes' then p_notes else null end);

  if p_decision = 'pass' then
    v_rec := public.internal_move_stage(p_content_id, 'dm_review', null);
  else
    v_rec := public.internal_move_stage(p_content_id, 'production', trim(p_notes));
    perform public.notify(coalesce(array[v_rec.production_assignee_id], '{}'), p_content_id, 'changes_requested',
      format('Production changes requested on %s', v_rec.content_id), trim(p_notes));
  end if;
  return v_rec;
end $$;

-- Work status (own)
create or replace function public.set_work_status(p_status public.work_status)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare v_p public.profiles;
begin
  if not public.is_active_user() then raise exception 'active account required' using errcode = '42501'; end if;
  update public.profiles set work_status = p_status, last_active_at = now()
   where auth_user_id = auth.uid() returning * into v_p;
  return v_p;
end $$;

-- ---------------------------------------------------------------------------
-- RLS and grants
-- ---------------------------------------------------------------------------
alter table public.production_tasks enable row level security;
alter table public.assignments enable row level security;
alter table public.creative_versions enable row level security;
alter table public.production_reviews enable row level security;

create policy production_tasks_select on public.production_tasks for select to authenticated using (public.is_active_user());
create policy assignments_select on public.assignments for select to authenticated using (public.is_active_user());
create policy creative_versions_select on public.creative_versions for select to authenticated using (public.is_active_user());
create policy production_reviews_select on public.production_reviews for select to authenticated using (public.is_active_user());

grant select on public.production_tasks, public.assignments, public.creative_versions, public.production_reviews,
  public.v_active_work, public.v_workload, public.v_unassigned_work, public.v_dm_stats, public.v_ceo_stats to authenticated;

grant execute on function
  public.can_upload_creative(uuid),
  public.workload_status(int),
  public.stage_actor_permission(text),
  public.profile_has_permission(uuid, text),
  public.person_backlog(uuid),
  public.assign_production(uuid, uuid, text),
  public.create_task(uuid, text, text, text, uuid, public.content_priority, date, date),
  public.update_task(uuid, jsonb),
  public.register_creative_version(uuid, text, text, text, bigint, public.creative_kind, int, int, numeric, text),
  public.submit_for_production_review(uuid),
  public.production_review(uuid, public.production_decision, jsonb, text),
  public.set_work_status(public.work_status)
to authenticated;
