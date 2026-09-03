-- pgTAP: Phase 6 — scheduling per platform, publishing date change logged,
-- publisher may only move Scheduled → Published, disclosure gate, live URLs,
-- archive, notification rules, dashboard cards, calendar items, daily reminders.
begin;
create extension if not exists pgtap with schema extensions;
select plan(41);

create temp table fx (label text primary key, uid uuid, pid uuid);
grant select on fx to authenticated;
create or replace function pg_temp.mk_user(p_label text, p_role_key text, p_team_key text, p_final boolean default false) returns void language plpgsql as $$
declare v_uid uuid := gen_random_uuid(); v_email text := p_label || '@test.local'; v_pid uuid;
begin
  insert into public.profiles (full_name, email, role_id, account_status, is_final_approver)
  select initcap(p_label), v_email, r.id, 'active', p_final from public.roles r where r.key = p_role_key returning id into v_pid;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email, crypt('x', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
  insert into public.team_memberships (team_id, profile_id) select id, v_pid from public.teams where key = p_team_key;
  insert into fx values (p_label, v_uid, v_pid);
end $$;
create or replace function pg_temp.login(p_label text) returns void language plpgsql as $$
declare v_uid uuid; begin select uid into v_uid from fx where label = p_label;
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true); perform set_config('role', 'authenticated', true); end $$;
create or replace function pg_temp.logout() returns void language plpgsql as $$
begin perform set_config('role', 'postgres', true); perform set_config('request.jwt.claims', '', true); end $$;
create or replace function pg_temp.set_stage(p_content uuid, p_status text) returns void language plpgsql as $$
begin
  update public.content_records set status_key = p_status where id = p_content;
  update public.stage_history set exited_at = now() where content_id = p_content and exited_at is null;
  insert into public.stage_history (content_id, status_key) values (p_content, p_status);
end $$;
create or replace function pg_temp.pid(p text) returns uuid language sql as $$ select pid from fx where label = p $$;

select pg_temp.mk_user('siris',  'dm_manager', 'dm');
select pg_temp.mk_user('keshar', 'publisher', 'dm');
select pg_temp.mk_user('sumeej', 'senior_production', 'production');
select pg_temp.mk_user('biraj',  'ceo_final_approver', 'ceo', true);

-- A final-approved record with AI imagery (disclosure required) on two platforms
select pg_temp.login('siris');
create temp table rec as select * from public.create_content_record(jsonb_build_object('title', 'Publish gate', 'region_code', 'NP',
  'content_type_id', (select id from public.content_types where key = 'admission_poster'), 'requires_ai_disclosure', true,
  'target_publish_date', (current_date + 3)::text,
  'platform_ids', jsonb_build_array((select id from public.platforms where key = 'facebook'), (select id from public.platforms where key = 'instagram'))));
grant select on rec to authenticated;
select pg_temp.logout();
select pg_temp.set_stage((select id from rec), 'final_approved');
update public.content_records set dm_owner_id = pg_temp.pid('siris'), production_assignee_id = pg_temp.pid('sumeej') where id = (select id from rec);

-- ---------------------------------------------------------------------------
-- Scheduling
-- ---------------------------------------------------------------------------
select pg_temp.login('keshar');
select throws_like(
  format($$select public.schedule_content('%s', '[{"platform_id":"%s","scheduled_at":"%s"}]'::jsonb)$$,
    (select id from rec), (select id from public.platforms where key = 'facebook'), (now() + interval '1 day')::text),
  '%may not schedule%', 'Publisher cannot schedule (only Scheduled → Published)');
select pg_temp.logout();

select pg_temp.login('siris');
select throws_like(
  format($$select public.move_stage('%s', 'scheduled')$$, (select id from rec)),
  '%own action%', 'final_approved → scheduled is RPC-only');
select is(
  (select status_key from public.schedule_content((select id from rec), jsonb_build_array(
     jsonb_build_object('platform_id', (select id from public.platforms where key = 'facebook'),  'scheduled_at', (current_date + 1 + interval '9 hours')::text, 'publisher_id', pg_temp.pid('keshar'), 'notes', 'morning'),
     jsonb_build_object('platform_id', (select id from public.platforms where key = 'instagram'), 'scheduled_at', (current_date + 1 + interval '10 hours')::text, 'publisher_id', pg_temp.pid('keshar'))))),
  'scheduled', 'Scheduling moves Final Approved → Scheduled');
select is((select count(*) from public.schedules where content_id = (select id from rec) and cancelled_at is null), 2::bigint, 'Two active schedule rows, one per platform');
select is((select count(*) from public.activity_log where content_id = (select id from rec) and event_type = 'scheduled'), 2::bigint, 'Each schedule row is logged');
select is((select count(*) from public.v_publishing_queue where content_id = (select id from rec)), 2::bigint, 'Publishing queue lists both rows');
select ok((select bool_and(disclosure_pending) from public.v_publishing_queue where content_id = (select id from rec)), 'Queue flags disclosure pending');
select is((select count(*) from public.v_calendar_items where content_id = (select id from rec) and kind = 'scheduled'), 2::bigint, 'Calendar shows both scheduled rows');
select is((select count(*) from public.v_calendar_items where content_id = (select id from rec) and kind = 'target'), 0::bigint, 'Target date hidden once scheduled');

-- Date change without reason is refused; with reason it is logged as publishing_date_change
select throws_like(
  format($$select public.schedule_content('%s', jsonb_build_array(jsonb_build_object('platform_id', '%s', 'scheduled_at', '%s', 'publisher_id', '%s'), jsonb_build_object('platform_id', '%s', 'scheduled_at', '%s', 'publisher_id', '%s')))$$,
    (select id from rec), (select id from public.platforms where key = 'facebook'), (current_date + 2 + interval '9 hours')::text, pg_temp.pid('keshar'),
    (select id from public.platforms where key = 'instagram'), (current_date + 1 + interval '10 hours')::text, pg_temp.pid('keshar')),
  '%reason is required%', 'Changing a publishing date needs a reason');
select lives_ok(
  format($$select public.schedule_content('%s', jsonb_build_array(jsonb_build_object('platform_id', '%s', 'scheduled_at', '%s', 'publisher_id', '%s')), 'Campaign moved a day')$$,
    (select id from rec), (select id from public.platforms where key = 'facebook'), (current_date + 2 + interval '9 hours')::text, pg_temp.pid('keshar')),
  'Re-schedule with a reason');
select is((select count(*) from public.activity_log where content_id = (select id from rec) and event_type = 'publishing_date_change'), 2::bigint,
  'Date change and the removed Instagram row are both logged as publishing_date_change');
select is((select count(*) from public.schedules where content_id = (select id from rec) and cancelled_at is null), 1::bigint, 'Instagram row cancelled, Facebook kept');
select is((select reason from public.activity_log where content_id = (select id from rec) and event_type = 'publishing_date_change' order by created_at limit 1), 'Campaign moved a day', 'Reason stored');
select pg_temp.logout();

select ok(exists (select 1 from public.notifications where recipient_id = pg_temp.pid('keshar') and type = 'scheduled' and content_id = (select id from rec)), 'Publisher notified on schedule');

-- ---------------------------------------------------------------------------
-- Publishing: disclosure gate, URLs, permissions
-- ---------------------------------------------------------------------------
select pg_temp.login('sumeej');
select throws_like(
  format($$select public.publish_content('%s', '[{"platform_id":"%s","url":"https://facebook.com/p/1"}]'::jsonb, true)$$,
    (select id from rec), (select id from public.platforms where key = 'facebook')),
  '%may not publish%', 'Production user cannot publish');
select pg_temp.logout();

select pg_temp.login('keshar');
select throws_like(
  format($$select public.move_stage('%s', 'published')$$, (select id from rec)),
  '%own action%', 'scheduled → published is RPC-only');
select throws_like(
  format($$select public.publish_content('%s', '[{"platform_id":"%s","url":"https://facebook.com/p/1"}]'::jsonb, false)$$,
    (select id from rec), (select id from public.platforms where key = 'facebook')),
  '%AI disclosure confirmation required%', 'Publish blocked without the disclosure confirmation when required');
select throws_like(
  format($$select public.publish_content('%s', '[{"platform_id":"%s","url":"facebook.com/p/1"}]'::jsonb, true)$$,
    (select id from rec), (select id from public.platforms where key = 'facebook')),
  '%http%', 'Live URL must be http(s)');
select throws_like(
  format($$select public.publish_content('%s', '[]'::jsonb, true)$$, (select id from rec)),
  '%at least one live URL%', 'At least one URL');
select is(
  (select status_key from public.publish_content((select id from rec),
     jsonb_build_array(jsonb_build_object('platform_id', (select id from public.platforms where key = 'facebook'), 'url', 'https://facebook.com/p/1'),
                       jsonb_build_object('platform_id', (select id from public.platforms where key = 'instagram'), 'url', 'https://instagram.com/p/1')),
     true, 'Toggle set on both')),
  'published', 'Publisher publishes with the confirmation');
select is((select count(*) from public.published_links where content_id = (select id from rec)), 2::bigint, 'Two live URLs stored');
select is((select ai_disclosure_confirmed from public.publish_confirmations where content_id = (select id from rec)), true, 'Disclosure confirmation recorded');
select is((select confirmed_by from public.publish_confirmations where content_id = (select id from rec)), pg_temp.pid('keshar'), 'Confirmation carries the publisher');
select ok((select published_at is not null from public.content_records where id = (select id from rec)), 'published_at set');
select is((select count(*) from public.activity_log where content_id = (select id from rec) and event_type in ('publication', 'ai_disclosure_confirmed')), 2::bigint, 'Publication and disclosure both logged');
select is((select count(*) from public.v_calendar_items where content_id = (select id from rec) and kind = 'published'), 2::bigint, 'Calendar shows published rows');
select throws_like(
  format($$select public.archive_content('%s')$$, (select id from rec)),
  '%may not archive%', 'Publisher cannot archive');
select pg_temp.logout();

select ok(exists (select 1 from public.notifications where recipient_id = pg_temp.pid('siris') and type = 'published' and content_id = (select id from rec)), 'DM owner notified on publish');
select ok(exists (select 1 from public.notifications where recipient_id = pg_temp.pid('biraj') and type = 'published' and content_id = (select id from rec)), 'Final approver notified on publish');

-- ---------------------------------------------------------------------------
-- Archive
-- ---------------------------------------------------------------------------
select pg_temp.login('siris');
select is((select status_key from public.archive_content((select id from rec), 'Campaign over')), 'archived', 'DM Manager archives');
select is((select count(*) from public.activity_log where content_id = (select id from rec) and event_type = 'archived'), 1::bigint, 'Archive logged');
select ok((select archived_at is not null from public.content_records where id = (select id from rec)), 'archived_at set');
select pg_temp.logout();

-- ---------------------------------------------------------------------------
-- Notification rules: a disabled rule silences the type
-- ---------------------------------------------------------------------------
update public.notification_rules set is_enabled = false where event_type = 'mentioned';
select is(public.notify(array[pg_temp.pid('siris')], (select id from rec), 'mentioned', 'x'), 0, 'Disabled rule sends nothing');
update public.notification_rules set is_enabled = true where event_type = 'mentioned';
select is(public.notify(array[pg_temp.pid('siris')], (select id from rec), 'mentioned', 'x'), 1, 'Enabled rule sends');
select is((select count(*) from public.notification_rules), 29::bigint, 'Every event type has a rule row');

-- ---------------------------------------------------------------------------
-- Dashboard cards and daily reminders
-- ---------------------------------------------------------------------------
select pg_temp.login('biraj');
select ok((public.dashboard_cards() ->> 'published_this_month')::int >= 1, 'CEO dashboard counts Published This Month');
select ok(public.dashboard_cards() ? 'waiting_final_approval', 'Dashboard exposes Waiting for Final Approval');
select pg_temp.logout();

-- a second record due today for the reminder run
select pg_temp.login('siris');
create temp table rec2 as select * from public.create_content_record(jsonb_build_object('title', 'Due today', 'region_code', 'AU',
  'content_type_id', (select id from public.content_types where key = 'admission_poster'), 'script_due', current_date::text));
select pg_temp.logout();
select pg_temp.set_stage((select id from rec2), 'script_copy');
update public.content_records set dm_owner_id = pg_temp.pid('siris') where id = (select id from rec2);
select ok((public.run_daily_reminders() ->> 'notifications')::int >= 1, 'Daily reminders send at least the due-today notice');
select ok(exists (select 1 from public.notifications where recipient_id = pg_temp.pid('siris') and type = 'content_due_today' and content_id = (select id from rec2)), 'DM owner gets the due-today reminder');
select is((public.run_daily_reminders() ->> 'notifications')::int, 0, 'Second run the same day sends nothing new');

select * from finish();
rollback;
