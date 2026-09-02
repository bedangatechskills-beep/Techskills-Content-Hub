// admin-users — the only place the service role touches Supabase Auth.
// Every action first runs the matching Postgres RPC *as the caller*, so
// permission checks and profile writes stay in the database. Only after the
// RPC succeeds does the function use auth.admin for the e-mail or ban step.
//
// Actions: invite · resend_invite · send_reset · disable · reactivate
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

type Action = "invite" | "resend_invite" | "send_reset" | "disable" | "reactivate";

interface Body {
  action: Action;
  redirectBase?: string; // e.g. https://hub.example.com — where auth links land
  // invite
  full_name?: string;
  email?: string;
  role_key?: string;
  job_title?: string | null;
  team_keys?: string[];
  // resend_invite / send_reset / disable / reactivate
  profile_id?: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEFAULT_APP_URL = Deno.env.get("APP_URL") ?? "http://localhost:3000";

// ~100 years. Supabase has no permanent ban flag; this is the convention.
const BAN_FOREVER = "876000h";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "missing Authorization" }, 401);

  // Client acting as the caller: RPCs enforce has_permission('admin.users').
  const asCaller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  // Service-role client: auth.admin only.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  const appUrl = (body.redirectBase ?? DEFAULT_APP_URL).replace(/\/$/, "");

  try {
    switch (body.action) {
      case "invite": {
        if (!body.full_name || !body.email || !body.role_key) {
          return json({ error: "full_name, email and role_key are required" }, 400);
        }
        const { data: profile, error } = await asCaller.rpc("admin_create_profile", {
          p_full_name: body.full_name,
          p_email: body.email,
          p_role_key: body.role_key,
          p_job_title: body.job_title ?? null,
          p_team_keys: body.team_keys ?? [],
        });
        if (error) return json({ error: error.message }, rpcStatus(error.code));

        const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(profile.email, {
          data: { full_name: profile.full_name, profile_id: profile.id },
          redirectTo: `${appUrl}/auth/callback?next=/invite`,
        });
        if (inviteError) {
          // Profile exists; admin can resend from the UI.
          return json({ profile, warning: `profile created but invitation failed: ${inviteError.message}` }, 207);
        }
        return json({ profile });
      }

      case "resend_invite": {
        const profile = await loadProfile(asCaller, body.profile_id);
        if (!profile) return json({ error: "profile not found" }, 404);
        if (profile.account_status !== "invitation_pending") {
          return json({ error: "profile is not awaiting an invitation" }, 409);
        }
        // Once an auth user exists Supabase refuses a second invite, so send a
        // password-setup link through the recovery flow instead.
        const { error } = profile.auth_user_id
          ? await admin.auth.resetPasswordForEmail(profile.email, {
              redirectTo: `${appUrl}/auth/callback?next=/invite`,
            })
          : await admin.auth.admin.inviteUserByEmail(profile.email, {
              data: { full_name: profile.full_name, profile_id: profile.id },
              redirectTo: `${appUrl}/auth/callback?next=/invite`,
            });
        if (error) return json({ error: error.message }, 502);
        return json({ ok: true });
      }

      case "send_reset": {
        const profile = await loadProfile(asCaller, body.profile_id);
        if (!profile) return json({ error: "profile not found" }, 404);
        const { error } = await admin.auth.resetPasswordForEmail(profile.email, {
          redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
        });
        if (error) return json({ error: error.message }, 502);
        return json({ ok: true });
      }

      case "disable": {
        if (!body.profile_id) return json({ error: "profile_id required" }, 400);
        const { data: profile, error } = await asCaller.rpc("disable_user", { p_profile_id: body.profile_id });
        if (error) return json({ error: error.message }, rpcStatus(error.code));
        if (profile.auth_user_id) {
          // Ban stops new sessions and token refresh; the app's proxy also
          // signs out any live session whose profile is no longer active.
          const { error: banError } = await admin.auth.admin.updateUserById(profile.auth_user_id, {
            ban_duration: BAN_FOREVER,
          });
          if (banError) return json({ profile, warning: `disabled but auth ban failed: ${banError.message}` }, 207);
        }
        return json({ profile });
      }

      case "reactivate": {
        if (!body.profile_id) return json({ error: "profile_id required" }, 400);
        const { data: profile, error } = await asCaller.rpc("reactivate_user", { p_profile_id: body.profile_id });
        if (error) return json({ error: error.message }, rpcStatus(error.code));
        if (profile.auth_user_id) {
          const { error: unbanError } = await admin.auth.admin.updateUserById(profile.auth_user_id, {
            ban_duration: "none",
          });
          if (unbanError) return json({ profile, warning: `reactivated but auth unban failed: ${unbanError.message}` }, 207);
        }
        return json({ profile });
      }

      default:
        return json({ error: `unknown action` }, 400);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

async function loadProfile(client: ReturnType<typeof createClient>, id?: string) {
  if (!id) return null;
  const { data } = await client
    .from("profiles")
    .select("id, email, full_name, account_status, auth_user_id")
    .eq("id", id)
    .maybeSingle();
  return data as
    | { id: string; email: string; full_name: string; account_status: string; auth_user_id: string | null }
    | null;
}

function rpcStatus(code?: string): number {
  if (code === "42501") return 403;
  if (code === "P0002") return 404;
  if (code === "23505") return 409;
  if (code === "22023") return 400;
  return 400;
}
