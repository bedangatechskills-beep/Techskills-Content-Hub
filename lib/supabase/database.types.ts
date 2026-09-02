// Hand-written for Phase 0. Regenerate once Docker is available:
//   pnpm db:types   (supabase gen types typescript --local > lib/supabase/database.types.ts)
// Keep the shape identical to the generator's output so the swap is a no-op.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AccountStatus = "active" | "invitation_pending" | "disabled" | "archived_demo";
export type WorkStatus =
  | "available"
  | "working"
  | "reviewing"
  | "editing"
  | "recording"
  | "meeting"
  | "waiting_for_feedback"
  | "waiting_for_approval"
  | "deadline_risk"
  | "away"
  | "offline";

export type ProfileRow = {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string;
  photo_url: string | null;
  job_title: string | null;
  role_id: string | null;
  account_status: AccountStatus;
  work_status: WorkStatus;
  primary_team_id: string | null;
  is_final_approver: boolean;
  is_super_admin: boolean;
  can_verify_nepali: boolean;
  last_login_at: string | null;
  last_active_at: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
};

export type RoleRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
};

export type PermissionRow = {
  id: string;
  key: string;
  description: string | null;
};

export type RolePermissionRow = {
  role_id: string;
  permission_id: string;
};

export type TeamRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  supervisor_id: string | null;
  is_active: boolean;
  created_at: string;
};

export type TeamMembershipRow = {
  team_id: string;
  profile_id: string;
  added_at: string;
  added_by: string | null;
};

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      roles: Table<RoleRow>;
      permissions: Table<PermissionRow>;
      role_permissions: Table<RolePermissionRow>;
      teams: Table<TeamRow>;
      team_memberships: Table<TeamMembershipRow>;
    };
    Views: Record<string, never>;
    Functions: {
      my_access: { Args: Record<string, never>; Returns: Json };
      has_permission: { Args: { p_key: string }; Returns: boolean };
      is_active_user: { Args: Record<string, never>; Returns: boolean };
      is_final_approver: { Args: Record<string, never>; Returns: boolean };
      is_super_admin: { Args: Record<string, never>; Returns: boolean };
      in_team: { Args: { p_team_key: string }; Returns: boolean };
      admin_create_profile: {
        Args: {
          p_full_name: string;
          p_email: string;
          p_role_key: string;
          p_job_title?: string | null;
          p_team_keys?: string[];
        };
        Returns: ProfileRow;
      };
      admin_update_profile: {
        Args: {
          p_profile_id: string;
          p_full_name?: string | null;
          p_email?: string | null;
          p_job_title?: string | null;
          p_role_key?: string | null;
          p_primary_team_key?: string | null;
          p_team_keys?: string[] | null;
        };
        Returns: ProfileRow;
      };
      admin_set_final_approver: {
        Args: { p_profile_id: string; p_value: boolean };
        Returns: ProfileRow;
      };
      admin_set_super_admin: {
        Args: { p_profile_id: string; p_value: boolean };
        Returns: ProfileRow;
      };
      admin_set_can_verify_nepali: {
        Args: { p_profile_id: string; p_value: boolean };
        Returns: ProfileRow;
      };
      disable_user: { Args: { p_profile_id: string }; Returns: ProfileRow };
      reactivate_user: { Args: { p_profile_id: string }; Returns: ProfileRow };
      admin_upsert_team: {
        Args: {
          p_key: string;
          p_name: string;
          p_description?: string | null;
          p_supervisor_id?: string | null;
          p_is_active?: boolean;
        };
        Returns: TeamRow;
      };
      admin_set_team_members: {
        Args: { p_team_id: string; p_profile_ids: string[] };
        Returns: TeamMembershipRow[];
      };
      update_own_profile: {
        Args: {
          p_full_name?: string | null;
          p_photo_url?: string | null;
          p_job_title?: string | null;
          p_work_status?: WorkStatus | null;
        };
        Returns: ProfileRow;
      };
    };
    Enums: {
      account_status: AccountStatus;
      work_status: WorkStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
