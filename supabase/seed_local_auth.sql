-- ============================================================================
-- seed_local_auth.sql — LOCAL DEVELOPMENT ONLY.
-- Creates a Supabase Auth user for every seeded profile so the team can be
-- impersonated on `supabase start`. Password for all: Password123!
-- Never run against the hosted project; it is listed only in the local
-- config.toml [db.seed] sql_paths.
-- ============================================================================

do $$
declare
  r record;
  v_uid uuid;
begin
  for r in select id, email, full_name from public.profiles where auth_user_id is null loop
    v_uid := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      r.email, crypt('Password123!', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', r.full_name), now(), now(), '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_uid, v_uid::text,
      jsonb_build_object('sub', v_uid::text, 'email', r.email, 'email_verified', true),
      'email', now(), now(), now()
    );
    -- on_auth_user_created links the profile by e-mail.
  end loop;

  -- Local users skip the invitation e-mail, so mark them active directly.
  update public.profiles set account_status = 'active' where auth_user_id is not null and account_status = 'invitation_pending';
end $$;
