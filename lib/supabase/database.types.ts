// Thin layer over the generated Supabase types. Regenerate the base file with
// `pnpm db:types` (needs local Supabase running); never edit database.generated.ts.
import type { Enums, Tables } from "./database.generated";

export type { Database, Json } from "./database.generated";
export type { Tables, Enums };

export type AccountStatus = Enums<"account_status">;
export type WorkStatus = Enums<"work_status">;

export type ProfileRow = Tables<"profiles">;
export type RoleRow = Tables<"roles">;
export type PermissionRow = Tables<"permissions">;
export type RolePermissionRow = Tables<"role_permissions">;
export type TeamRow = Tables<"teams">;
export type TeamMembershipRow = Tables<"team_memberships">;
