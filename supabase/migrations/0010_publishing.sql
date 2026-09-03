-- ============================================================================
-- 0010_publishing.sql — Phase 6: Scheduling, Publishing (with the AI
-- disclosure confirmation), Archive, notification rules, dashboards, calendar,
-- daily reminders. Vault: Scheduled §53, Published §54, Archived §58,
-- Publisher (D3), AI Disclosure at Publish, Dashboards §84–89,
-- Notifications §97, Calendar §91. Plan numbering: "0006_publishing" in the
-- Phase 6 note; the sequence shifted (0006–0009 already used).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Columns on the record
-- ---------------------------------------------------------------------------
alter table public.content_records
  add column published_at timestamptz,
  add column archived_at  timestamptz;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.schedules (
  id           uuid primary key default gen_random_uuid(),
  content_id   uuid not null references public.content_records(id),
  platform_id  uuid not null references public.platforms(id),
  scheduled_at timestamptz not null,
  publisher_id uuid references public.profiles(id),
  campaign_id  uuid references public.campaigns(id),
  notes        text,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id)
);
create unique index schedules_active_platform_idx on public.schedules(content_id, platform_id) where cancelled_at is null;
create index schedules_when_idx on public.schedules(scheduled_at) where cancelled_at is null;
create trigger schedules_set_updated_at before update on public.schedules
  for each row execute function public.set_updated_at();

create table public.published_links (
  id           uuid primary key default gen_random_uuid(),
  content_id   uuid not null references public.content_records(id),
  platform_id  uuid not null references public.platforms(id),
  url          text not null check (url ~* '^https?://'),
  published_at timestamptz not null default now(),
  published_by uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  unique (content_id, platform_id)
);

create table public.publish_confirmations (
  id                      uuid primary key default gen_random_uuid(),
  content_id              uuid not null references public.content_records(id),
  ai_disclosure_required  boolean not null,
  ai_disclosure_confirmed boolean not null,
  confirmed_by            uuid references public.profiles(id),
  confirmed_at            timestamptz not null default now(),
  note                    text,
  created_at              timestamptz not null default now()
);
create index publish_confirmations_content_idx on public.publish_confirmations(content_id, created_at desc);

-- Every in-app notification type, its recipient rule and whether it is on.
-- recipient_rule tokens (comma separated): dm_owner, requester, assignee,
-- production_manager, final_approvers, publishers, perm:<key>, team:<key>,
-- nepali_verifiers, payload (uuid[] under payload.recipients), caller
-- (recipients decided by the calling function).
create table public.notification_rules (
  event_type     text primary key check (event_type ~ '^[a-z_]+$'),
  description    text not null,
  recipient_rule text not null,
  title_template text not null,
  body_template  text,
  is_enabled     boolean not null default true,
  updated_at     timestamptz not null default now()
);
create trigger notification_rules_set_updated_at before update on public.notification_rules
  for each row execute function public.set_updated_at();

insert into public.notification_rules (event_type, description, recipient_rule, title_template, body_template) values
  ('content_requested',        'A new content request was created',                    'caller',           '{content_id} requested: {title}', null),
  ('content_assigned',         'Content assigned to a production person',              'caller',           '{content_id} assigned to you', '{title}'),
  ('task_assigned',            'A production task was assigned',                       'caller',           'Task on {content_id}', '{task}'),
  ('script_ready_for_review',  'A script version was submitted for approval',          'caller',           '{content_id}: script ready for review', '{title}'),
  ('mentioned',                'Someone mentioned you in a comment',                   'caller',           'You were mentioned on {content_id}', null),
  ('stage_production_review',  'Production Review required',                           'caller',           '{content_id} is now in Production Review', '{title}'),
  ('stage_dm_review',          'DM Review required',                                   'caller',           '{content_id} is now in DM Review', '{title}'),
  ('stage_content_review',     'Content Review required',                              'caller',           '{content_id} is now in Content Review', '{title}'),
  ('final_approval_required',  'Final Approval required',                              'caller',           '{content_id}: final approval required', '{title}'),
  ('changes_requested',        'Changes requested at any gate',                        'caller',           '{content_id}: changes requested', null),
  ('re_approval_required',     'Material change after approval',                       'caller',           '{content_id}: re-approval required', null),
  ('reviewer_quorum_met',      'Reviewer quorum reached',                              'caller',           '{content_id}: reviewer quorum met', null),
  ('override_recorded',        'DM override recorded (visible to the CEO)',            'caller',           '{content_id}: override recorded', null),
  ('final_approved',           'Final approval given',                                 'caller',           '{content_id}: final approved', null),
  ('rejected',                 'Rejected at final approval',                           'caller',           '{content_id}: rejected', null),
  ('stage_change',             'Generic stage move (all other stage_* events)',        'caller',           '{content_id} is now in {stage}', '{title}'),
  ('scheduled',                'Content scheduled; the publisher is told',             'publishers',       '{content_id} scheduled for {platform} on {date}', '{title}'),
  ('publishing_date_change',   'A schedule row was changed',                           'publishers,dm_owner', '{content_id}: publishing date changed', '{platform}: {date}'),
  ('unscheduled',              'Content pulled back from Scheduled',                   'publishers,dm_owner', '{content_id} unscheduled', 'Reason: {reason}'),
  ('published',                'Content marked published with live URLs',              'dm_owner,requester,final_approvers', '{content_id} published', '{title}'),
  ('archived',                 'Content archived',                                     'dm_owner,requester', '{content_id} archived', '{reason}'),
  ('task_due_today',           'A production task is due today',                       'payload',          'Task due today on {content_id}', '{task}'),
  ('content_due_today',        'Content is due today in its current stage',            'dm_owner,assignee', '{content_id} due today', '{title} ({stage})'),
  ('content_overdue',          'Content passed its due date',                          'dm_owner,assignee,production_manager', '{content_id} is overdue', '{title} ({stage})'),
  ('content_stalled',          'No activity for three working days',                  'dm_owner,assignee', '{content_id} has stalled', '{title} ({stage})'),
  ('publishing_today',         'Scheduled to publish today',                           'publishers',       '{content_id} publishes today', '{platform} at {date}'),
  ('disclosure_pending',       'AI disclosure confirmation pending at publish',        'publishers',       '{content_id}: AI disclosure confirmation needed', 'Tick the platform AI-content toggle before publishing'),
  ('ai_flags_found',           'AI evaluation finished with hard flags',               'dm_owner,assignee', '{content_id}: AI check found {count} flag(s)', '{title}'),
  ('nepali_verification_requested', 'Nepali verification requested',                  'nepali_verifiers', '{content_id}: Nepali verification requested', '{title}');

-- ---------------------------------------------------------------------------
-- notify(): honour notification_rules.is_enabled. Callers keep passing explicit
-- recipients; a disabled rule silences the type. stage_* events fall back to
-- the generic stage_change rule.
-- ---------------------------------------------------------------------------
create or replace function public.notification_enabled(p_type text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_enabled from public.notification_rules where event_type = p_type),
    (select is_enabled from public.notification_rules where p_type like 'stage_%' and event_type = 'stage_change'),
    true);
$$;

create or replace function public.notify(
  p_recipients uuid[], p_content_id uuid, p_type text, p_title text, p_body text default null
) returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if not public.notification_enabled(p_type) then return 0; end if;
  insert into public.notifications (recipient_id, content_id, type, title, body)
  select distinct r, p_content_id, p_type, p_title, p_body
  from unnest(coalesce(p_recipients, '{}'::uuid[])) as r
  where r is not null and r is distinct from public.auth_profile_id();
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- Recipients for a rule token list, for one record
create or replace function public.rule_recipients(p_rule text, p_content_id uuid, p_payload jsonb default '{}'::jsonb)
returns uuid[] language plpgsql stable security definer set search_path = public as $$
declare
  v_rec public.content_records;
  v_out uuid[] := '{}';
  v_tok text;
begin
  select * into v_rec from public.content_records where id = p_content_id;
  foreach v_tok in array string_to_array(replace(p_rule, ' ', ''), ',') loop
    v_out := v_out || case
      when v_tok = 'dm_owner'           then coalesce(array[v_rec.dm_owner_id], '{}')
      when v_tok = 'requester'          then coalesce(array[v_rec.requester_id], '{}')
      when v_tok = 'assignee'           then coalesce(array[v_rec.production_assignee_id], '{}')
      when v_tok = 'production_manager' then coalesce(array[v_rec.production_manager_id], '{}')
      when v_tok = 'final_approvers'    then public.final_approvers()
      when v_tok = 'publishers'         then coalesce(
                                             (select array_agg(distinct s.publisher_id) from public.schedules s
                                               where s.content_id = p_content_id and s.cancelled_at is null and s.publisher_id is not null),
                                             public.profiles_with_permission('publish.publish'))
      when v_tok = 'nepali_verifiers'   then coalesce((select array_agg(id) from public.profiles where can_verify_nepali and account_status = 'active'), '{}')
      when v_tok like 'perm:%'          then public.profiles_with_permission(substr(v_tok, 6))
      when v_tok like 'team:%'          then public.team_member_ids(substr(v_tok, 6))
      when v_tok = 'payload'            then coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(coalesce(p_payload -> 'recipients', '[]'::jsonb)) x), '{}')
      else '{}'::uuid[] end;
  end loop;
  return array_remove(v_out, null);
end $$;

-- Rule-driven notification: resolves recipients and renders the templates.
create or replace function public.notify_event(p_event_type text, p_content_id uuid, p_payload jsonb default '{}'::jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_rule public.notification_rules;
  v_rec public.content_records;
  v_stage text;
  v_title text; v_body text;
  v_recipients uuid[];
  k text; v text;
begin
  select * into v_rule from public.notification_rules where event_type = p_event_type;
  if v_rule.event_type is null or not v_rule.is_enabled then return 0; end if;
  select * into v_rec from public.content_records where id = p_content_id;
  select name into v_stage from public.workflow_statuses where key = v_rec.status_key;

  v_title := v_rule.title_template; v_body := v_rule.body_template;
  for k, v in
    select * from jsonb_each_text(
      jsonb_build_object('content_id', v_rec.content_id, 'title', v_rec.title, 'stage', v_stage, 'actor', public.actor_name())
      || coalesce(p_payload, '{}'::jsonb))
  loop
    v_title := replace(v_title, '{' || k || '}', coalesce(v, ''));
    v_body := replace(coalesce(v_body, ''), '{' || k || '}', coalesce(v, ''));
  end loop;
  v_body := nullif(regexp_replace(v_body, '\{[a-z_]+\}', '', 'g'), '');

  if v_rule.recipient_rule = 'caller' then
    v_recipients := coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(coalesce(p_payload -> 'recipients', '[]'::jsonb)) x), '{}');
  else
    v_recipients := public.rule_recipients(v_rule.recipient_rule, p_content_id, p_payload);
  end if;
  return public.notify(v_recipients, p_content_id, p_event_type, v_title, v_body);
end $$;

-- ---------------------------------------------------------------------------
-- Proposed notification additions: AI hard flags, Nepali verification
-- ---------------------------------------------------------------------------
create or replace function public.trg_ai_evaluation_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  -- Creative flags are already notified by record_creative_evaluation (Phase 4); scripts were not.
  v_n := jsonb_array_length(coalesce(new.hard_flags, '[]'::jsonb));
  if v_n > 0 and new.evaluation_type = 'script' then
    perform public.notify_event('ai_flags_found', new.content_id,
      jsonb_build_object('count', v_n, 'kind', new.evaluation_type::text));
  end if;
  return new;
end $$;
create trigger ai_evaluations_notify after insert on public.ai_evaluations
  for each row execute function public.trg_ai_evaluation_notify();

create or replace function public.trg_nepali_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.nepali_verification = 'pending' and (tg_op = 'INSERT' or old.nepali_verification is distinct from 'pending') then
    perform public.notify_event('nepali_verification_requested', new.id, '{}'::jsonb);
  end if;
  return new;
end $$;
create trigger content_records_nepali_notify after insert or update of nepali_verification on public.content_records
  for each row execute function public.trg_nepali_notify();

-- ---------------------------------------------------------------------------
-- Transitions handled by RPCs from here on
-- ---------------------------------------------------------------------------
update public.allowed_transitions set rpc_only = true
 where (from_status, to_status) in (('final_approved','scheduled'), ('scheduled','published'), ('scheduled','final_approved'), ('published','archived'));

-- ---------------------------------------------------------------------------
-- Scheduling (§53)
-- ---------------------------------------------------------------------------
-- p_items: [{platform_id, scheduled_at, publisher_id, campaign_id?, notes?}]
-- Replaces the active schedule: rows for platforms not listed are cancelled,
-- changed rows are logged as publishing_date_change (§63).
create or replace function public.schedule_content(p_content_id uuid, p_items jsonb, p_reason text default null)
returns public.content_records
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.auth_profile_id();
  v_rec public.content_records;
  v_item jsonb;
  v_platform uuid; v_when timestamptz; v_publisher uuid; v_campaign uuid; v_notes text;
  v_existing public.schedules;
  v_keep uuid[] := '{}';
  v_changes int := 0;
  v_platform_name text;
  v_cancelled public.schedules;
begin
  if not public.has_permission('publish.schedule') then
    raise exception 'you may not schedule content' using errcode = '42501';
  end if;
  select * into v_rec from public.content_records where id = p_content_id for update;
  if v_rec.id is null then raise exception 'content record not found' using errcode = 'P0002'; end if;
  if v_rec.status_key not in ('final_approved', 'scheduled') then
    raise exception 'only Final Approved content can be scheduled (currently %)', v_rec.status_key using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'at least one platform schedule is required' using errcode = '23514';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_platform  := (v_item ->> 'platform_id')::uuid;
    v_when      := (v_item ->> 'scheduled_at')::timestamptz;
    v_publisher := nullif(v_item ->> 'publisher_id', '')::uuid;
    v_campaign  := coalesce(nullif(v_item ->> 'campaign_id', '')::uuid, v_rec.campaign_id);
    v_notes     := nullif(trim(coalesce(v_item ->> 'notes', '')), '');
    if v_platform is null or v_when is null then
      raise exception 'each schedule row needs a platform and a date/time' using errcode = '23514';
    end if;
    if not exists (select 1 from public.platforms where id = v_platform and is_active) then
      raise exception 'unknown or inactive platform' using errcode = '23503';
    end if;
    if v_publisher is not null and not exists (
      select 1 from public.profiles p join public.role_permissions rp on rp.role_id = p.role_id
      join public.permissions pm on pm.id = rp.permission_id
      where p.id = v_publisher and p.account_status = 'active' and pm.key = 'publish.publish') then
      raise exception 'the publisher must be an active user who may publish' using errcode = '23514';
    end if;
    select name into v_platform_name from public.platforms where id = v_platform;

    select * into v_existing from public.schedules
     where content_id = p_content_id and platform_id = v_platform and cancelled_at is null;
    if v_existing.id is null then
      insert into public.schedules (content_id, platform_id, scheduled_at, publisher_id, campaign_id, notes, created_by)
      values (p_content_id, v_platform, v_when, v_publisher, v_campaign, v_notes, v_me)
      returning * into v_existing;
      v_changes := v_changes + 1;
      perform public.log_activity(p_content_id, 'scheduled',
        format('%s scheduled %s for %s on %s', public.actor_name(), v_rec.content_id, v_platform_name, to_char(v_when at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC'),
        null, jsonb_build_object('platform_id', v_platform, 'scheduled_at', v_when, 'publisher_id', v_publisher), p_reason,
        jsonb_build_object('schedule_id', v_existing.id));
      perform public.notify(coalesce(array[v_publisher], public.profiles_with_permission('publish.publish')), p_content_id, 'scheduled',
        format('%s scheduled for %s on %s', v_rec.content_id, v_platform_name, to_char(v_when at time zone 'UTC', 'DD Mon HH24:MI') || ' UTC'), v_rec.title);
    elsif v_existing.scheduled_at is distinct from v_when or v_existing.publisher_id is distinct from v_publisher
          or v_existing.campaign_id is distinct from v_campaign or v_existing.notes is distinct from v_notes then
      if v_existing.scheduled_at is distinct from v_when and coalesce(trim(p_reason), '') = '' then
        raise exception 'a reason is required to change a publishing date' using errcode = '23514';
      end if;
      perform public.log_activity(p_content_id, 'publishing_date_change',
        format('%s changed the %s schedule of %s', public.actor_name(), v_platform_name, v_rec.content_id),
        jsonb_build_object('scheduled_at', v_existing.scheduled_at, 'publisher_id', v_existing.publisher_id, 'notes', v_existing.notes),
        jsonb_build_object('scheduled_at', v_when, 'publisher_id', v_publisher, 'notes', v_notes), p_reason,
        jsonb_build_object('schedule_id', v_existing.id, 'platform_id', v_platform));
      update public.schedules set scheduled_at = v_when, publisher_id = v_publisher, campaign_id = v_campaign, notes = v_notes
       where id = v_existing.id;
      v_changes := v_changes + 1;
      perform public.notify(array_remove(array[v_publisher, v_existing.publisher_id, v_rec.dm_owner_id], null), p_content_id, 'publishing_date_change',
        format('%s: publishing date changed', v_rec.content_id),
        format('%s: %s. Reason: %s', v_platform_name, to_char(v_when at time zone 'UTC', 'DD Mon HH24:MI') || ' UTC', coalesce(p_reason, '—')));
    end if;
    v_keep := v_keep || v_existing.id;
  end loop;

  for v_cancelled in
    select * from public.schedules where content_id = p_content_id and cancelled_at is null and not (id = any (v_keep))
  loop
    select name into v_platform_name from public.platforms where id = v_cancelled.platform_id;
    update public.schedules set cancelled_at = now(), cancelled_by = v_me where id = v_cancelled.id;
    perform public.log_activity(p_content_id, 'publishing_date_change',
      format('%s removed the %s schedule of %s', public.actor_name(), v_platform_name, v_rec.content_id),
      jsonb_build_object('scheduled_at', v_cancelled.scheduled_at, 'platform_id', v_cancelled.platform_id), null, p_reason,
      jsonb_build_object('schedule_id', v_cancelled.id, 'cancelled', true));
    v_changes := v_changes + 1;
  end loop;

  if v_rec.status_key = 'final_approved' then
    v_rec := public.internal_move_stage(p_content_id, 'scheduled', p_reason);
  else
    select * into v_rec from public.content_records where id = p_content_id;
  end if;
  return v_rec;
end $$;

-- Pull a record back from Scheduled (backward move: reason required)
create or replace function public.unschedule_content(p_content_id uuid, p_reason text)
returns public.content_records
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.auth_profile_id(); v_rec public.content_records; v_publishers uuid[];
begin
  if not public.has_permission('publish.schedule') then
    raise exception 'you may not change schedules' using errcode = '42501';
  end if;
  select * into v_rec from public.content_records where id = p_content_id for update;
  if v_rec.status_key <> 'scheduled' then
    raise exception 'only Scheduled content can be unscheduled' using errcode = '22023';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'a reason is required to unschedule' using errcode = '23514';
  end if;
  select array_agg(distinct publisher_id) into v_publishers from public.schedules where content_id = p_content_id and cancelled_at is null and publisher_id is not null;
  update public.schedules set cancelled_at = now(), cancelled_by = v_me where content_id = p_content_id and cancelled_at is null;
  perform public.log_activity(p_content_id, 'unscheduled', format('%s unscheduled %s', public.actor_name(), v_rec.content_id), null, null, p_reason);
  perform public.notify(coalesce(v_publishers, '{}') || coalesce(array[v_rec.dm_owner_id], '{}'), p_content_id, 'unscheduled',
    format('%s unscheduled', v_rec.content_id), 'Reason: ' || p_reason);
  return public.internal_move_stage(p_content_id, 'final_approved', p_reason);
end $$;

-- ---------------------------------------------------------------------------
-- Publishing (§54) with the AI disclosure confirmation
-- ---------------------------------------------------------------------------
-- p_links: [{platform_id, url}] — at least one; every URL must be http(s).
create or replace function public.publish_content(
  p_content_id uuid, p_links jsonb, p_disclosure_confirmed boolean default false,
  p_note text default null, p_published_at timestamptz default now()
) returns public.content_records
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.auth_profile_id();
  v_rec public.content_records;
  v_link jsonb; v_platform uuid; v_url text; v_n int := 0;
  v_summary jsonb := '[]'::jsonb;
begin
  if not public.has_permission('publish.publish') then
    raise exception 'you may not publish content' using errcode = '42501';
  end if;
  select * into v_rec from public.content_records where id = p_content_id for update;
  if v_rec.id is null then raise exception 'content record not found' using errcode = 'P0002'; end if;
  if v_rec.status_key <> 'scheduled' then
    raise exception 'only Scheduled content can be published (currently %)', v_rec.status_key using errcode = '22023';
  end if;
  if v_rec.requires_ai_disclosure and not coalesce(p_disclosure_confirmed, false) then
    raise exception 'AI disclosure confirmation required: this creative contains AI imagery. Confirm the platform AI-content toggle was set before publishing.'
      using errcode = '23514';
  end if;
  if jsonb_typeof(p_links) <> 'array' or jsonb_array_length(p_links) = 0 then
    raise exception 'at least one live URL is required' using errcode = '23514';
  end if;
  if p_published_at > now() + interval '5 minutes' then
    raise exception 'the publish time cannot be in the future' using errcode = '23514';
  end if;

  for v_link in select * from jsonb_array_elements(p_links) loop
    v_platform := (v_link ->> 'platform_id')::uuid;
    v_url := trim(coalesce(v_link ->> 'url', ''));
    if v_platform is null or v_url = '' then continue; end if;
    if v_url !~* '^https?://' then
      raise exception 'live URL must start with http:// or https:// (%)', v_url using errcode = '23514';
    end if;
    insert into public.published_links (content_id, platform_id, url, published_at, published_by)
    values (p_content_id, v_platform, v_url, p_published_at, v_me)
    on conflict (content_id, platform_id) do update set url = excluded.url, published_at = excluded.published_at, published_by = excluded.published_by;
    v_n := v_n + 1;
    v_summary := v_summary || jsonb_build_object('platform', (select name from public.platforms where id = v_platform), 'url', v_url);
  end loop;
  if v_n = 0 then raise exception 'at least one live URL is required' using errcode = '23514'; end if;

  insert into public.publish_confirmations (content_id, ai_disclosure_required, ai_disclosure_confirmed, confirmed_by, note)
  values (p_content_id, v_rec.requires_ai_disclosure, coalesce(p_disclosure_confirmed, false), v_me, nullif(trim(coalesce(p_note, '')), ''));

  update public.content_records set published_at = p_published_at, updated_by = v_me where id = p_content_id;

  perform public.log_activity(p_content_id, 'publication',
    format('%s published %s on %s platform(s)', public.actor_name(), v_rec.content_id, v_n),
    null, jsonb_build_object('links', v_summary, 'published_at', p_published_at), p_note,
    jsonb_build_object('ai_disclosure_required', v_rec.requires_ai_disclosure, 'ai_disclosure_confirmed', coalesce(p_disclosure_confirmed, false)));
  if v_rec.requires_ai_disclosure then
    perform public.log_activity(p_content_id, 'ai_disclosure_confirmed',
      format('%s confirmed the platform AI-content disclosure for %s', public.actor_name(), v_rec.content_id),
      null, jsonb_build_object('confirmed', true), null, '{}'::jsonb);
  end if;
  perform public.notify_event('published', p_content_id, '{}'::jsonb);
  return public.internal_move_stage(p_content_id, 'published', null);
end $$;

-- ---------------------------------------------------------------------------
-- Archive (§58) — DM Manager (publish.schedule) or an administrator
-- ---------------------------------------------------------------------------
create or replace function public.archive_content(p_content_id uuid, p_reason text default null)
returns public.content_records
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.auth_profile_id(); v_rec public.content_records;
begin
  if not (public.has_permission('publish.schedule') or public.has_permission('admin.users')) then
    raise exception 'you may not archive content' using errcode = '42501';
  end if;
  select * into v_rec from public.content_records where id = p_content_id for update;
  if v_rec.id is null then raise exception 'content record not found' using errcode = 'P0002'; end if;
  if v_rec.status_key <> 'published' then
    raise exception 'only Published content can be archived from here (currently %)', v_rec.status_key using errcode = '22023';
  end if;
  update public.content_records set archived_at = now(), updated_by = v_me where id = p_content_id;
  perform public.log_activity(p_content_id, 'archived', format('%s archived %s', public.actor_name(), v_rec.content_id), null, null, p_reason);
  perform public.notify_event('archived', p_content_id, jsonb_build_object('reason', coalesce(p_reason, '')));
  return public.internal_move_stage(p_content_id, 'archived', p_reason);
end $$;

-- ---------------------------------------------------------------------------
-- Notification RPCs
-- ---------------------------------------------------------------------------
create or replace function public.mark_notification_read(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.notifications set is_read = true where id = p_id and recipient_id = public.auth_profile_id();
$$;
create or replace function public.mark_all_notifications_read()
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  update public.notifications set is_read = true where recipient_id = public.auth_profile_id() and not is_read;
  get diagnostics v = row_count; return v;
end $$;
create or replace function public.unread_notification_count()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.notifications where recipient_id = public.auth_profile_id() and not is_read;
$$;

-- ---------------------------------------------------------------------------
-- Views: publishing queue, published, calendar, pipeline, needs attention
-- ---------------------------------------------------------------------------
create or replace view public.v_publishing_queue with (security_invoker = true) as
select s.id as schedule_id, s.content_id, cr.content_id as content_code, cr.title, cr.status_key, cr.region_code, cr.priority,
       s.platform_id, p.name as platform, s.scheduled_at, s.publisher_id, pub.full_name as publisher_name,
       s.campaign_id, c.name as campaign, s.notes,
       cr.requires_ai_disclosure,
       cr.requires_ai_disclosure and not exists (
         select 1 from public.publish_confirmations pc where pc.content_id = cr.id and pc.ai_disclosure_confirmed) as disclosure_pending,
       cr.dm_owner_id, dm.full_name as dm_owner_name,
       cr.current_creative_version_id,
       (s.scheduled_at at time zone 'UTC')::date as scheduled_date
from public.schedules s
join public.content_records cr on cr.id = s.content_id
join public.platforms p on p.id = s.platform_id
left join public.profiles pub on pub.id = s.publisher_id
left join public.profiles dm on dm.id = cr.dm_owner_id
left join public.campaigns c on c.id = s.campaign_id
where s.cancelled_at is null and cr.status_key = 'scheduled';

create or replace view public.v_published_links with (security_invoker = true) as
select pl.id, pl.content_id, cr.content_id as content_code, cr.title, cr.status_key, cr.region_code,
       pl.platform_id, p.name as platform, pl.url, pl.published_at, pl.published_by, pub.full_name as published_by_name,
       ct.name as content_type, cr.program_id, cr.campaign_id, cr.objective_id
from public.published_links pl
join public.content_records cr on cr.id = pl.content_id
join public.platforms p on p.id = pl.platform_id
join public.content_types ct on ct.id = cr.content_type_id
left join public.profiles pub on pub.id = pl.published_by;

-- One row per date a record appears on the calendar (§91): scheduled rows per
-- platform, published rows per platform, and the target publish date for
-- everything not yet scheduled. Cards link to the record.
create or replace view public.v_calendar_items with (security_invoker = true) as
select 'scheduled'::text as kind, s.id as item_id, cr.id as content_id, cr.content_id as content_code, cr.title,
       cr.status_key, ws.name as status_name, ws.colour_key,
       (s.scheduled_at at time zone 'UTC')::date as on_date, s.scheduled_at as at_time,
       s.platform_id, p.name as platform, cr.program_id, cr.campaign_id, cr.objective_id, cr.content_type_id, ct.medium::text as format,
       cr.dm_owner_id, cr.production_assignee_id, cr.region_code, cr.requires_ai_disclosure
from public.schedules s
join public.content_records cr on cr.id = s.content_id
join public.workflow_statuses ws on ws.key = cr.status_key
join public.platforms p on p.id = s.platform_id
join public.content_types ct on ct.id = cr.content_type_id
where s.cancelled_at is null and cr.status_key = 'scheduled'
union all
select 'published', pl.id, cr.id, cr.content_id, cr.title, cr.status_key, ws.name, ws.colour_key,
       (pl.published_at at time zone 'UTC')::date, pl.published_at,
       pl.platform_id, p.name, cr.program_id, cr.campaign_id, cr.objective_id, cr.content_type_id, ct.medium::text,
       cr.dm_owner_id, cr.production_assignee_id, cr.region_code, cr.requires_ai_disclosure
from public.published_links pl
join public.content_records cr on cr.id = pl.content_id
join public.workflow_statuses ws on ws.key = cr.status_key
join public.platforms p on p.id = pl.platform_id
join public.content_types ct on ct.id = cr.content_type_id
union all
select 'target', cr.id, cr.id, cr.content_id, cr.title, cr.status_key, ws.name, ws.colour_key,
       cr.target_publish_date, null::timestamptz,
       null::uuid, null::text, cr.program_id, cr.campaign_id, cr.objective_id, cr.content_type_id, ct.medium::text,
       cr.dm_owner_id, cr.production_assignee_id, cr.region_code, cr.requires_ai_disclosure
from public.content_records cr
join public.workflow_statuses ws on ws.key = cr.status_key
join public.content_types ct on ct.id = cr.content_type_id
where cr.target_publish_date is not null and cr.status_key not in ('scheduled', 'published', 'archived');

create or replace view public.v_pipeline_counts with (security_invoker = true) as
select ws.key as status_key, ws.name, ws.sort_order, ws.colour_key, ws.group_key, ws.is_terminal,
       (select count(*) from public.content_records cr where cr.status_key = ws.key)::int as count,
       (select count(*) from public.v_kanban_cards kc where kc.status_key = ws.key and kc.is_overdue)::int as overdue_count
from public.workflow_statuses ws
order by ws.sort_order;

create or replace view public.v_needs_attention with (security_invoker = true) as
select kc.id, kc.content_id as content_code, kc.title, kc.status_key, kc.status_name, kc.colour_key, kc.priority,
       kc.due_date, kc.dm_owner_id, kc.dm_owner_name, kc.production_assignee_id, kc.assignee_name, kc.region_code,
       a.reason_key, a.reason_label, a.sort_rank
from public.v_kanban_cards kc
cross join lateral (
  values
    ('overdue',   'Overdue',                      1, kc.is_overdue),
    ('stalled',   'No activity for 3 working days', 2, kc.is_stalled),
    ('hard_flags','Open AI hard flags',           3, coalesce(kc.creative_open_flags, 0) > 0 or (kc.status_key in ('script_copy','script_approval') and coalesce(kc.ai_flag_count, 0) > 0)),
    ('nepali',    'Nepali verification pending',  4, kc.nepali_verification = 'pending'),
    ('disclosure','AI disclosure confirmation pending', 5, kc.status_key = 'scheduled' and kc.requires_ai_disclosure)
) as a(reason_key, reason_label, sort_rank, hit)
where a.hit and not kc.is_terminal and kc.status_key not in ('published');

-- ---------------------------------------------------------------------------
-- Dashboard cards for the signed-in user (§84–89). One function, one round
-- trip; the page picks which cards to show by permission.
-- ---------------------------------------------------------------------------
create or replace function public.dashboard_cards()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := public.auth_profile_id();
  v_today date := current_date;
  v_out jsonb;
  v_threshold numeric := public.setting_numeric('reviewer_threshold', 4.0);
begin
  if not public.is_active_user() then
    raise exception 'active account required' using errcode = '42501';
  end if;
  select jsonb_build_object(
    -- top cards (§84)
    'due_today',            (select count(*) from public.v_kanban_cards kc where kc.due_date = v_today and not kc.is_terminal and kc.status_key <> 'published'),
    'overdue',              (select count(*) from public.v_kanban_cards kc where kc.is_overdue),
    'waiting_my_review',
        (case when public.has_permission('script.approve') then (select count(*) from public.content_records where status_key = 'script_approval') else 0 end)
      + (case when public.has_permission('production.review') then (select count(*) from public.content_records where status_key = 'production_review') else 0 end)
      + (case when public.has_permission('dm.review') then (select count(*) from public.content_records where status_key = 'dm_review') else 0 end)
      + (case when public.has_permission('review.rate') then (select count(*) from public.content_records cr where cr.status_key = 'content_review'
             and not exists (select 1 from public.reviewer_ratings rr where rr.content_id = cr.id and rr.reviewer_id = v_me and rr.creative_version_id is not distinct from cr.current_creative_version_id)) else 0 end)
      + (case when public.is_final_approver() then (select count(*) from public.content_records where status_key = 'final_approval') else 0 end),
    'waiting_final_approval', (select count(*) from public.content_records where status_key = 'final_approval'),
    'unassigned_work',      (select count(*) from public.v_unassigned_work),
    'publishing_this_week', (select count(distinct content_id) from public.v_publishing_queue where scheduled_date >= v_today and scheduled_date < v_today + 7),
    'published_this_month', (select count(*) from public.content_records where published_at >= date_trunc('month', now()) and status_key in ('published','archived')),
    -- CEO (§85)
    'ready_for_final_approval', (select count(*) from public.content_records where status_key = 'ready_for_final_approval'),
    'changes_requested',    (select count(*) from public.content_records where status_key = 'changes_required'),
    'reviewer_issues',      (select count(distinct rr.content_id) from public.reviewer_ratings rr join public.content_records cr on cr.id = rr.content_id
                               where cr.status_key in ('content_review','ready_for_final_approval','final_approval')
                                 and rr.creative_version_id is not distinct from cr.current_creative_version_id
                                 and (rr.decision <> 'recommend_approval' or rr.average < v_threshold)),
    -- DM Manager (§86)
    'concepts',             (select count(*) from public.content_records where status_key in ('requested','idea_concept')),
    'scripts',              (select count(*) from public.content_records where status_key = 'script_copy'),
    'script_feedback',      (select count(*) from public.content_records cr join public.script_versions sv on sv.id = cr.current_script_version_id
                               where cr.status_key = 'script_copy' and sv.approval_status::text = 'changes_requested'),
    'dm_review_waiting',    (select count(*) from public.content_records where status_key = 'dm_review'),
    'changes_assigned_dm',  (select count(distinct c.content_id) from public.change_requests c join public.teams t on t.id = c.assigned_team_id where not c.is_resolved and t.key = 'dm'),
    'reviewer_feedback',    (select count(distinct rr.content_id) from public.reviewer_ratings rr join public.content_records cr on cr.id = rr.content_id where cr.status_key = 'content_review'),
    -- Production Manager (§87)
    'production_in_progress', (select count(*) from public.content_records where status_key = 'production'),
    'overdue_production',   (select count(*) from public.v_kanban_cards kc where kc.is_overdue and kc.status_key in ('production','changes_required','ready_for_production')),
    'production_review',    (select count(*) from public.content_records where status_key = 'production_review'),
    'changes_assigned_production', (select count(distinct c.content_id) from public.change_requests c join public.teams t on t.id = c.assigned_team_id where not c.is_resolved and t.key = 'production'),
    -- Production user (§88)
    'my_tasks',             (select count(*) from public.v_active_work aw where aw.profile_id = v_me),
    'my_due_today',         (select count(*) from public.v_active_work aw where aw.profile_id = v_me and aw.due_date = v_today),
    'my_changes_requested', (select count(*) from public.content_records where production_assignee_id = v_me and status_key = 'changes_required'),
    'my_upcoming',          (select count(*) from public.v_active_work aw where aw.profile_id = v_me and aw.due_date > v_today and aw.due_date <= v_today + 7),
    'my_waiting_review',    (select count(*) from public.content_records where production_assignee_id = v_me and status_key in ('production_review','dm_review')),
    'my_recently_completed',(select count(*) from public.production_tasks t where t.assignee_id = v_me and t.status = 'done' and t.completed_at >= now() - interval '14 days'),
    -- Content Reviewer (§89)
    'my_reviews',           (select count(*) from public.content_records cr where cr.status_key = 'content_review'
                               and not exists (select 1 from public.reviewer_ratings rr where rr.content_id = cr.id and rr.reviewer_id = v_me and rr.creative_version_id is not distinct from cr.current_creative_version_id)),
    're_review_required',   (select count(*) from public.content_records cr where cr.status_key = 'content_review'
                               and exists (select 1 from public.reviewer_ratings rr where rr.content_id = cr.id and rr.reviewer_id = v_me)
                               and not exists (select 1 from public.reviewer_ratings rr where rr.content_id = cr.id and rr.reviewer_id = v_me and rr.creative_version_id is not distinct from cr.current_creative_version_id)),
    'my_recently_reviewed', (select count(*) from public.reviewer_ratings rr where rr.reviewer_id = v_me and rr.created_at >= now() - interval '14 days'),
    -- Publisher (D3)
    'publishing_today',     (select count(distinct content_id) from public.v_publishing_queue where scheduled_date = v_today),
    'disclosure_pending',   (select count(distinct content_id) from public.v_publishing_queue where disclosure_pending),
    'recently_published',   (select count(*) from public.content_records where published_at >= now() - interval '14 days'),
    -- gate stat tile (proposed in Dashboards)
    'ai_pass_rate',         (select round(100.0 * count(*) filter (where jsonb_array_length(hard_flags) = 0) / nullif(count(*), 0))
                               from public.ai_evaluations where created_at >= date_trunc('month', now())),
    'ai_top_flags',         (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'count', n) order by n desc), '[]'::jsonb)
                               from (select f ->> 'key' as k, count(*) as n from public.ai_evaluations e, jsonb_array_elements(e.hard_flags) f
                                     where e.created_at >= date_trunc('month', now()) group by 1 order by 2 desc limit 3) x)
  ) into v_out;
  return v_out;
end $$;

-- Content mix: active records by content type (Dashboards "Content Mix")
create or replace view public.v_content_mix with (security_invoker = true) as
select ct.id as content_type_id, ct.name, ct.medium::text as medium,
       count(cr.id) filter (where cr.status_key not in ('archived'))::int as active_count,
       count(cr.id) filter (where cr.status_key in ('published','archived'))::int as published_count
from public.content_types ct
left join public.content_records cr on cr.content_type_id = ct.id
group by ct.id, ct.name, ct.medium, ct.sort_order
order by ct.sort_order;

-- ---------------------------------------------------------------------------
-- Daily reminders (§97): due today, overdue, stalled, publishing today,
-- disclosure pending. Idempotent per recipient, record and day.
-- ---------------------------------------------------------------------------
create or replace function public.run_daily_reminders()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_today date := current_date;
  r record;
  v_n int := 0;
begin
  if current_user not in ('postgres','service_role','supabase_admin') and not public.has_permission('admin.reference_data') then
    raise exception 'service-only' using errcode = '42501';
  end if;

  for r in select kc.* from public.v_kanban_cards kc where kc.due_date = v_today and not kc.is_terminal and kc.status_key <> 'published' loop
    if not exists (select 1 from public.notifications n where n.content_id = r.id and n.type = 'content_due_today' and n.created_at::date = v_today) then
      v_n := v_n + public.notify_event('content_due_today', r.id, '{}'::jsonb);
    end if;
  end loop;
  for r in select kc.* from public.v_kanban_cards kc where kc.is_overdue loop
    if not exists (select 1 from public.notifications n where n.content_id = r.id and n.type = 'content_overdue' and n.created_at::date = v_today) then
      v_n := v_n + public.notify_event('content_overdue', r.id, '{}'::jsonb);
    end if;
  end loop;
  for r in select kc.* from public.v_kanban_cards kc where kc.is_stalled loop
    if not exists (select 1 from public.notifications n where n.content_id = r.id and n.type = 'content_stalled' and n.created_at::date = v_today) then
      v_n := v_n + public.notify_event('content_stalled', r.id, '{}'::jsonb);
    end if;
  end loop;
  for r in select t.*, cr.content_id as code from public.production_tasks t join public.content_records cr on cr.id = t.content_id
           where t.due_date = v_today and t.status in ('todo','in_progress') and t.assignee_id is not null loop
    if not exists (select 1 from public.notifications n where n.content_id = r.content_id and n.recipient_id = r.assignee_id and n.type = 'task_due_today' and n.created_at::date = v_today and n.body = r.title) then
      v_n := v_n + public.notify_event('task_due_today', r.content_id, jsonb_build_object('task', r.title, 'recipients', jsonb_build_array(r.assignee_id)));
    end if;
  end loop;
  for r in select * from public.v_publishing_queue q where q.scheduled_date = v_today loop
    if not exists (select 1 from public.notifications n where n.content_id = r.content_id and n.type = 'publishing_today' and n.created_at::date = v_today and n.body like r.platform || '%') then
      v_n := v_n + public.notify_event('publishing_today', r.content_id,
        jsonb_build_object('platform', r.platform, 'date', to_char(r.scheduled_at at time zone 'UTC', 'HH24:MI') || ' UTC',
                           'recipients', case when r.publisher_id is null then '[]'::jsonb else jsonb_build_array(r.publisher_id) end));
    end if;
    if r.disclosure_pending and not exists (select 1 from public.notifications n where n.content_id = r.content_id and n.type = 'disclosure_pending' and n.created_at::date = v_today) then
      v_n := v_n + public.notify_event('disclosure_pending', r.content_id, '{}'::jsonb);
    end if;
  end loop;
  return jsonb_build_object('date', v_today, 'notifications', v_n);
end $$;

-- pg_cron: every morning at 21:00 UTC (07:00 Sydney / 02:45 Kathmandu), so the
-- reminders are waiting when both offices start. Skipped where pg_cron is not
-- installable (plain Postgres in CI).
do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron not available: daily reminders must be triggered by run_daily_reminders() from outside';
    return;
  end;
  perform cron.unschedule(jobid) from cron.job where jobname = 'content-hub-daily-reminders';
  perform cron.schedule('content-hub-daily-reminders', '0 21 * * *', $cron$select public.run_daily_reminders()$cron$);
end $$;

insert into public.app_settings (key, value, description) values
  ('daily_reminder_cron', '"0 21 * * *"', 'When run_daily_reminders() fires (UTC). 21:00 UTC = 07:00 Sydney / 02:45 Kathmandu'),
  ('publish_time_zone', '"Australia/Sydney"', 'Display time zone for schedules on the calendar and publishing queue')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Realtime for the bell
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.notifications;

-- ---------------------------------------------------------------------------
-- RLS and grants
-- ---------------------------------------------------------------------------
alter table public.schedules enable row level security;
alter table public.published_links enable row level security;
alter table public.publish_confirmations enable row level security;
alter table public.notification_rules enable row level security;
create policy schedules_select on public.schedules for select to authenticated using (public.is_active_user());
create policy published_links_select on public.published_links for select to authenticated using (public.is_active_user());
create policy publish_confirmations_select on public.publish_confirmations for select to authenticated using (public.is_active_user());
create policy notification_rules_select on public.notification_rules for select to authenticated using (public.is_active_user());
create policy notification_rules_admin on public.notification_rules for update to authenticated
  using (public.has_permission('admin.reference_data')) with check (public.has_permission('admin.reference_data'));

grant select on public.schedules, public.published_links, public.publish_confirmations, public.notification_rules,
  public.v_publishing_queue, public.v_published_links, public.v_calendar_items, public.v_pipeline_counts,
  public.v_needs_attention, public.v_content_mix to authenticated;
grant update (is_enabled) on public.notification_rules to authenticated;
grant execute on function
  public.schedule_content(uuid, jsonb, text),
  public.unschedule_content(uuid, text),
  public.publish_content(uuid, jsonb, boolean, text, timestamptz),
  public.archive_content(uuid, text),
  public.mark_notification_read(uuid),
  public.mark_all_notifications_read(),
  public.unread_notification_count(),
  public.dashboard_cards(),
  public.run_daily_reminders()
to authenticated;
revoke execute on function public.notify_event(text, uuid, jsonb), public.rule_recipients(text, uuid, jsonb), public.notification_enabled(text) from public, anon, authenticated;
