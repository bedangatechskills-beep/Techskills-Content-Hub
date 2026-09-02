export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      permissions: {
        Row: {
          description: string | null
          id: string
          key: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          auth_user_id: string | null
          can_verify_nepali: boolean
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          is_final_approver: boolean
          is_super_admin: boolean
          job_title: string | null
          last_active_at: string | null
          last_login_at: string | null
          photo_url: string | null
          primary_team_id: string | null
          role_id: string | null
          updated_at: string
          work_status: Database["public"]["Enums"]["work_status"]
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          auth_user_id?: string | null
          can_verify_nepali?: boolean
          created_at?: string
          created_by?: string | null
          email: string
          full_name: string
          id?: string
          is_final_approver?: boolean
          is_super_admin?: boolean
          job_title?: string | null
          last_active_at?: string | null
          last_login_at?: string | null
          photo_url?: string | null
          primary_team_id?: string | null
          role_id?: string | null
          updated_at?: string
          work_status?: Database["public"]["Enums"]["work_status"]
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          auth_user_id?: string | null
          can_verify_nepali?: boolean
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string
          id?: string
          is_final_approver?: boolean
          is_super_admin?: boolean
          job_title?: string | null
          last_active_at?: string | null
          last_login_at?: string | null
          photo_url?: string | null
          primary_team_id?: string | null
          role_id?: string | null
          updated_at?: string
          work_status?: Database["public"]["Enums"]["work_status"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_primary_team_id_fkey"
            columns: ["primary_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          key: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key?: string
          name?: string
        }
        Relationships: []
      }
      team_memberships: {
        Row: {
          added_at: string
          added_by: string | null
          profile_id: string
          team_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          profile_id: string
          team_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          profile_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          supervisor_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          supervisor_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          supervisor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_profile: {
        Args: {
          p_email: string
          p_full_name: string
          p_job_title?: string
          p_role_key: string
          p_team_keys?: string[]
        }
        Returns: {
          account_status: Database["public"]["Enums"]["account_status"]
          auth_user_id: string | null
          can_verify_nepali: boolean
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          is_final_approver: boolean
          is_super_admin: boolean
          job_title: string | null
          last_active_at: string | null
          last_login_at: string | null
          photo_url: string | null
          primary_team_id: string | null
          role_id: string | null
          updated_at: string
          work_status: Database["public"]["Enums"]["work_status"]
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_can_verify_nepali: {
        Args: { p_profile_id: string; p_value: boolean }
        Returns: {
          account_status: Database["public"]["Enums"]["account_status"]
          auth_user_id: string | null
          can_verify_nepali: boolean
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          is_final_approver: boolean
          is_super_admin: boolean
          job_title: string | null
          last_active_at: string | null
          last_login_at: string | null
          photo_url: string | null
          primary_team_id: string | null
          role_id: string | null
          updated_at: string
          work_status: Database["public"]["Enums"]["work_status"]
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_final_approver: {
        Args: { p_profile_id: string; p_value: boolean }
        Returns: {
          account_status: Database["public"]["Enums"]["account_status"]
          auth_user_id: string | null
          can_verify_nepali: boolean
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          is_final_approver: boolean
          is_super_admin: boolean
          job_title: string | null
          last_active_at: string | null
          last_login_at: string | null
          photo_url: string | null
          primary_team_id: string | null
          role_id: string | null
          updated_at: string
          work_status: Database["public"]["Enums"]["work_status"]
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_super_admin: {
        Args: { p_profile_id: string; p_value: boolean }
        Returns: {
          account_status: Database["public"]["Enums"]["account_status"]
          auth_user_id: string | null
          can_verify_nepali: boolean
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          is_final_approver: boolean
          is_super_admin: boolean
          job_title: string | null
          last_active_at: string | null
          last_login_at: string | null
          photo_url: string | null
          primary_team_id: string | null
          role_id: string | null
          updated_at: string
          work_status: Database["public"]["Enums"]["work_status"]
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_team_members: {
        Args: { p_profile_ids: string[]; p_team_id: string }
        Returns: {
          added_at: string
          added_by: string | null
          profile_id: string
          team_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "team_memberships"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_update_profile: {
        Args: {
          p_email?: string
          p_full_name?: string
          p_job_title?: string
          p_primary_team_key?: string
          p_profile_id: string
          p_role_key?: string
          p_team_keys?: string[]
        }
        Returns: {
          account_status: Database["public"]["Enums"]["account_status"]
          auth_user_id: string | null
          can_verify_nepali: boolean
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          is_final_approver: boolean
          is_super_admin: boolean
          job_title: string | null
          last_active_at: string | null
          last_login_at: string | null
          photo_url: string | null
          primary_team_id: string | null
          role_id: string | null
          updated_at: string
          work_status: Database["public"]["Enums"]["work_status"]
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_upsert_team: {
        Args: {
          p_description?: string
          p_is_active?: boolean
          p_key: string
          p_name: string
          p_supervisor_id?: string
        }
        Returns: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          supervisor_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "teams"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assert_admin: { Args: never; Returns: undefined }
      auth_profile: {
        Args: never
        Returns: {
          account_status: Database["public"]["Enums"]["account_status"]
          auth_user_id: string | null
          can_verify_nepali: boolean
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          is_final_approver: boolean
          is_super_admin: boolean
          job_title: string | null
          last_active_at: string | null
          last_login_at: string | null
          photo_url: string | null
          primary_team_id: string | null
          role_id: string | null
          updated_at: string
          work_status: Database["public"]["Enums"]["work_status"]
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      auth_profile_id: { Args: never; Returns: string }
      disable_user: {
        Args: { p_profile_id: string }
        Returns: {
          account_status: Database["public"]["Enums"]["account_status"]
          auth_user_id: string | null
          can_verify_nepali: boolean
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          is_final_approver: boolean
          is_super_admin: boolean
          job_title: string | null
          last_active_at: string | null
          last_login_at: string | null
          photo_url: string | null
          primary_team_id: string | null
          role_id: string | null
          updated_at: string
          work_status: Database["public"]["Enums"]["work_status"]
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_permission: { Args: { p_key: string }; Returns: boolean }
      in_team: { Args: { p_team_key: string }; Returns: boolean }
      is_active_user: { Args: never; Returns: boolean }
      is_final_approver: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      my_access: { Args: never; Returns: Json }
      reactivate_user: {
        Args: { p_profile_id: string }
        Returns: {
          account_status: Database["public"]["Enums"]["account_status"]
          auth_user_id: string | null
          can_verify_nepali: boolean
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          is_final_approver: boolean
          is_super_admin: boolean
          job_title: string | null
          last_active_at: string | null
          last_login_at: string | null
          photo_url: string | null
          primary_team_id: string | null
          role_id: string | null
          updated_at: string
          work_status: Database["public"]["Enums"]["work_status"]
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_own_profile: {
        Args: {
          p_full_name?: string
          p_job_title?: string
          p_photo_url?: string
          p_work_status?: Database["public"]["Enums"]["work_status"]
        }
        Returns: {
          account_status: Database["public"]["Enums"]["account_status"]
          auth_user_id: string | null
          can_verify_nepali: boolean
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          is_final_approver: boolean
          is_super_admin: boolean
          job_title: string | null
          last_active_at: string | null
          last_login_at: string | null
          photo_url: string | null
          primary_team_id: string | null
          role_id: string | null
          updated_at: string
          work_status: Database["public"]["Enums"]["work_status"]
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      account_status:
        | "active"
        | "invitation_pending"
        | "disabled"
        | "archived_demo"
      work_status:
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
        | "offline"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_status: [
        "active",
        "invitation_pending",
        "disabled",
        "archived_demo",
      ],
      work_status: [
        "available",
        "working",
        "reviewing",
        "editing",
        "recording",
        "meeting",
        "waiting_for_feedback",
        "waiting_for_approval",
        "deadline_risk",
        "away",
        "offline",
      ],
    },
  },
} as const

