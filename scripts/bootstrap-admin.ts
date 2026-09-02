/**
 * One-time bootstrap for a fresh hosted project: invite the first super admin
 * so the rest of the team can be invited from /admin/users.
 *
 *   pnpm bootstrap:admin -- "Full Name" name@techskills.institute
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and
 * NEXT_PUBLIC_APP_URL in the environment (.env.local is loaded).
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const [fullName, emailArg] = process.argv.slice(2);

if (!url || !serviceKey)
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
if (!fullName || !emailArg) throw new Error('usage: pnpm bootstrap:admin -- "Full Name" email');
const email = emailArg.toLowerCase();

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: role, error: roleErr } = await admin
    .from("roles")
    .select("id")
    .eq("key", "super_admin")
    .single();
  if (roleErr) throw roleErr;

  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("profiles")
      .update({ role_id: role.id, is_super_admin: true })
      .eq("id", existing.id);
    if (error) throw error;
    console.log(`Updated existing profile ${existing.id} to super admin.`);
  } else {
    const { error } = await admin.from("profiles").insert({
      full_name: fullName,
      email,
      role_id: role.id,
      is_super_admin: true,
      account_status: "invitation_pending",
    });
    if (error) throw error;
    console.log("Created super admin profile.");
  }

  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${appUrl}/auth/callback?next=/invite`,
  });
  if (inviteErr) {
    console.warn(
      `Invitation not sent: ${inviteErr.message}. If the auth user already exists, use "Send reset" in the app.`,
    );
  } else {
    console.log(`Invitation sent to ${email}.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
