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
      activity_log: {
        Row: {
          actor_id: string | null
          content_id: string | null
          created_at: string
          description: string
          event_type: string
          id: string
          metadata: Json
          new_value: Json | null
          previous_value: Json | null
          reason: string | null
          source: string
        }
        Insert: {
          actor_id?: string | null
          content_id?: string | null
          created_at?: string
          description: string
          event_type: string
          id?: string
          metadata?: Json
          new_value?: Json | null
          previous_value?: Json | null
          reason?: string | null
          source?: string
        }
        Update: {
          actor_id?: string | null
          content_id?: string | null
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          metadata?: Json
          new_value?: Json | null
          previous_value?: Json | null
          reason?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      allowed_transitions: {
        Row: {
          from_status: string
          id: string
          is_backward: boolean
          label: string | null
          permission_key: string
          reason_required: boolean
          to_status: string
        }
        Insert: {
          from_status: string
          id?: string
          is_backward?: boolean
          label?: string | null
          permission_key: string
          reason_required?: boolean
          to_status: string
        }
        Update: {
          from_status?: string
          id?: string
          is_backward?: boolean
          label?: string | null
          permission_key?: string
          reason_required?: boolean
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "allowed_transitions_from_status_fkey"
            columns: ["from_status"]
            isOneToOne: false
            referencedRelation: "workflow_statuses"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "allowed_transitions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "allowed_transitions_to_status_fkey"
            columns: ["to_status"]
            isOneToOne: false
            referencedRelation: "workflow_statuses"
            referencedColumns: ["key"]
          },
        ]
      }
      brand_facts: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "brand_facts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          owner_id: string | null
          program_id: string | null
          start_date: string | null
          status: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          owner_id?: string | null
          program_id?: string | null
          start_date?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          owner_id?: string | null
          program_id?: string | null
          start_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      campuses: {
        Row: {
          address: string | null
          id: string
          is_active: boolean
          is_generic: boolean
          name: string
          phone: string | null
          region_code: string
        }
        Insert: {
          address?: string | null
          id?: string
          is_active?: boolean
          is_generic?: boolean
          name: string
          phone?: string | null
          region_code: string
        }
        Update: {
          address?: string | null
          id?: string
          is_active?: boolean
          is_generic?: boolean
          name?: string
          phone?: string | null
          region_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "campuses_region_code_fkey"
            columns: ["region_code"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["code"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          content_id: string
          created_at: string
          edited_at: string | null
          id: string
          is_resolved: boolean
          mentions: string[]
          section: Database["public"]["Enums"]["comment_section"]
        }
        Insert: {
          author_id: string
          body: string
          content_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_resolved?: boolean
          mentions?: string[]
          section?: Database["public"]["Enums"]["comment_section"]
        }
        Update: {
          author_id?: string
          body?: string
          content_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_resolved?: boolean
          mentions?: string[]
          section?: Database["public"]["Enums"]["comment_section"]
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      content_differentiators: {
        Row: {
          content_id: string
          differentiator_id: string
        }
        Insert: {
          content_id: string
          differentiator_id: string
        }
        Update: {
          content_id?: string
          differentiator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_differentiators_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_differentiators_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_differentiators_differentiator_id_fkey"
            columns: ["differentiator_id"]
            isOneToOne: false
            referencedRelation: "differentiators"
            referencedColumns: ["id"]
          },
        ]
      }
      content_id_sequences: {
        Row: {
          last_seq: number
          region_code: string
          yymm: string
        }
        Insert: {
          last_seq?: number
          region_code: string
          yymm: string
        }
        Update: {
          last_seq?: number
          region_code?: string
          yymm?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_id_sequences_region_code_fkey"
            columns: ["region_code"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["code"]
          },
        ]
      }
      content_pillars: {
        Row: {
          human_only: boolean
          id: string
          is_active: boolean
          key: string
          name: string
          sort_order: number
        }
        Insert: {
          human_only?: boolean
          id?: string
          is_active?: boolean
          key: string
          name: string
          sort_order?: number
        }
        Update: {
          human_only?: boolean
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      content_platforms: {
        Row: {
          content_id: string
          platform_id: string
        }
        Insert: {
          content_id: string
          platform_id: string
        }
        Update: {
          content_id?: string
          platform_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_platforms_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_platforms_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_platforms_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      content_records: {
        Row: {
          approved_script_version_id: string | null
          audience_takeaway: string | null
          campaign_id: string | null
          campus_id: string | null
          concept: string | null
          content_id: string
          content_review_required: boolean
          content_type_id: string
          core_message: string | null
          created_at: string
          created_by: string | null
          creative_direction: string | null
          cta: string | null
          current_creative_version_id: string | null
          current_script_version_id: string | null
          description: string | null
          dm_owner_id: string | null
          hook: string | null
          id: string
          min_reviewer_responses: number
          nepali_verification: Database["public"]["Enums"]["nepali_verification"]
          objective_id: string | null
          pillar_id: string | null
          priority: Database["public"]["Enums"]["content_priority"]
          production_assignee_id: string | null
          production_due: string | null
          production_folder_url: string | null
          production_manager_id: string | null
          program_id: string | null
          reference_notes: string | null
          region_code: string
          request_type: string | null
          requester_id: string | null
          requesting_team_id: string | null
          requires_ai_disclosure: boolean
          review_due: string | null
          script_due: string | null
          secondary_objective_id: string | null
          status_key: string
          target_audience: string | null
          target_publish_date: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approved_script_version_id?: string | null
          audience_takeaway?: string | null
          campaign_id?: string | null
          campus_id?: string | null
          concept?: string | null
          content_id: string
          content_review_required?: boolean
          content_type_id: string
          core_message?: string | null
          created_at?: string
          created_by?: string | null
          creative_direction?: string | null
          cta?: string | null
          current_creative_version_id?: string | null
          current_script_version_id?: string | null
          description?: string | null
          dm_owner_id?: string | null
          hook?: string | null
          id?: string
          min_reviewer_responses?: number
          nepali_verification?: Database["public"]["Enums"]["nepali_verification"]
          objective_id?: string | null
          pillar_id?: string | null
          priority?: Database["public"]["Enums"]["content_priority"]
          production_assignee_id?: string | null
          production_due?: string | null
          production_folder_url?: string | null
          production_manager_id?: string | null
          program_id?: string | null
          reference_notes?: string | null
          region_code: string
          request_type?: string | null
          requester_id?: string | null
          requesting_team_id?: string | null
          requires_ai_disclosure?: boolean
          review_due?: string | null
          script_due?: string | null
          secondary_objective_id?: string | null
          status_key?: string
          target_audience?: string | null
          target_publish_date?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approved_script_version_id?: string | null
          audience_takeaway?: string | null
          campaign_id?: string | null
          campus_id?: string | null
          concept?: string | null
          content_id?: string
          content_review_required?: boolean
          content_type_id?: string
          core_message?: string | null
          created_at?: string
          created_by?: string | null
          creative_direction?: string | null
          cta?: string | null
          current_creative_version_id?: string | null
          current_script_version_id?: string | null
          description?: string | null
          dm_owner_id?: string | null
          hook?: string | null
          id?: string
          min_reviewer_responses?: number
          nepali_verification?: Database["public"]["Enums"]["nepali_verification"]
          objective_id?: string | null
          pillar_id?: string | null
          priority?: Database["public"]["Enums"]["content_priority"]
          production_assignee_id?: string | null
          production_due?: string | null
          production_folder_url?: string | null
          production_manager_id?: string | null
          program_id?: string | null
          reference_notes?: string | null
          region_code?: string
          request_type?: string | null
          requester_id?: string | null
          requesting_team_id?: string | null
          requires_ai_disclosure?: boolean
          review_due?: string | null
          script_due?: string | null
          secondary_objective_id?: string | null
          status_key?: string
          target_audience?: string | null
          target_publish_date?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_records_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_content_type_id_fkey"
            columns: ["content_type_id"]
            isOneToOne: false
            referencedRelation: "content_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_dm_owner_id_fkey"
            columns: ["dm_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "content_pillars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_production_assignee_id_fkey"
            columns: ["production_assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_production_manager_id_fkey"
            columns: ["production_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_region_code_fkey"
            columns: ["region_code"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "content_records_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_requesting_team_id_fkey"
            columns: ["requesting_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_secondary_objective_id_fkey"
            columns: ["secondary_objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_status_key_fkey"
            columns: ["status_key"]
            isOneToOne: false
            referencedRelation: "workflow_statuses"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "content_records_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_types: {
        Row: {
          id: string
          is_active: boolean
          key: string
          medium: Database["public"]["Enums"]["content_medium"]
          name: string
          script_shape: Database["public"]["Enums"]["script_shape"]
          sort_order: number
        }
        Insert: {
          id?: string
          is_active?: boolean
          key: string
          medium: Database["public"]["Enums"]["content_medium"]
          name: string
          script_shape: Database["public"]["Enums"]["script_shape"]
          sort_order?: number
        }
        Update: {
          id?: string
          is_active?: boolean
          key?: string
          medium?: Database["public"]["Enums"]["content_medium"]
          name?: string
          script_shape?: Database["public"]["Enums"]["script_shape"]
          sort_order?: number
        }
        Relationships: []
      }
      differentiators: {
        Row: {
          id: string
          is_active: boolean
          key: string
          name: string
          sort_order: number
        }
        Insert: {
          id?: string
          is_active?: boolean
          key: string
          name: string
          sort_order?: number
        }
        Update: {
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          content_id: string | null
          created_at: string
          id: string
          is_read: boolean
          recipient_id: string
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          content_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id: string
          title: string
          type: string
        }
        Update: {
          body?: string | null
          content_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      objectives: {
        Row: {
          id: string
          is_active: boolean
          key: string
          name: string
          sort_order: number
        }
        Insert: {
          id?: string
          is_active?: boolean
          key: string
          name: string
          sort_order?: number
        }
        Update: {
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
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
      platforms: {
        Row: {
          id: string
          is_active: boolean
          key: string
          name: string
          sort_order: number
        }
        Insert: {
          id?: string
          is_active?: boolean
          key: string
          name: string
          sort_order?: number
        }
        Update: {
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          sort_order?: number
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
      programs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          location: string | null
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          status?: string
        }
        Relationships: []
      }
      reference_handles: {
        Row: {
          handle: string
          id: string
          is_active: boolean
          note: string | null
          platform_id: string
          region_code: string
        }
        Insert: {
          handle: string
          id?: string
          is_active?: boolean
          note?: string | null
          platform_id: string
          region_code: string
        }
        Update: {
          handle?: string
          id?: string
          is_active?: boolean
          note?: string | null
          platform_id?: string
          region_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_handles_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reference_handles_region_code_fkey"
            columns: ["region_code"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["code"]
          },
        ]
      }
      regions: {
        Row: {
          code: string
          name: string
          timezone: string
        }
        Insert: {
          code: string
          name: string
          timezone: string
        }
        Update: {
          code?: string
          name?: string
          timezone?: string
        }
        Relationships: []
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
      stage_history: {
        Row: {
          content_id: string
          duration_seconds: number | null
          entered_at: string
          entered_by: string | null
          exited_at: string | null
          exited_by: string | null
          id: string
          status_key: string
        }
        Insert: {
          content_id: string
          duration_seconds?: number | null
          entered_at?: string
          entered_by?: string | null
          exited_at?: string | null
          exited_by?: string | null
          id?: string
          status_key: string
        }
        Update: {
          content_id?: string
          duration_seconds?: number | null
          entered_at?: string
          entered_by?: string | null
          exited_at?: string | null
          exited_by?: string | null
          id?: string
          status_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_history_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_history_exited_by_fkey"
            columns: ["exited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_history_status_key_fkey"
            columns: ["status_key"]
            isOneToOne: false
            referencedRelation: "workflow_statuses"
            referencedColumns: ["key"]
          },
        ]
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
      workflow_statuses: {
        Row: {
          colour_key: string
          group_key: string
          is_terminal: boolean
          key: string
          name: string
          sort_order: number
        }
        Insert: {
          colour_key: string
          group_key: string
          is_terminal?: boolean
          key: string
          name: string
          sort_order: number
        }
        Update: {
          colour_key?: string
          group_key?: string
          is_terminal?: boolean
          key?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      v_kanban_cards: {
        Row: {
          assignee_name: string | null
          campaign_id: string | null
          campus_id: string | null
          colour_key: string | null
          comment_count: number | null
          content_id: string | null
          content_review_required: boolean | null
          content_type: string | null
          created_at: string | null
          differentiators: string[] | null
          dm_owner_id: string | null
          dm_owner_name: string | null
          due_date: string | null
          group_key: string | null
          has_folder: boolean | null
          has_script: boolean | null
          id: string | null
          is_overdue: boolean | null
          is_stalled: boolean | null
          is_terminal: boolean | null
          last_activity_at: string | null
          last_activity_by: string | null
          medium: Database["public"]["Enums"]["content_medium"] | null
          nepali_verification:
            | Database["public"]["Enums"]["nepali_verification"]
            | null
          objective: string | null
          platforms: string[] | null
          priority: Database["public"]["Enums"]["content_priority"] | null
          production_assignee_id: string | null
          production_due: string | null
          program_id: string | null
          region_code: string | null
          requires_ai_disclosure: boolean | null
          review_due: string | null
          script_approved: boolean | null
          script_due: string | null
          seconds_in_stage: number | null
          stage_entered_at: string | null
          status_key: string | null
          status_name: string | null
          status_order: number | null
          target_publish_date: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_records_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_dm_owner_id_fkey"
            columns: ["dm_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_production_assignee_id_fkey"
            columns: ["production_assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_region_code_fkey"
            columns: ["region_code"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "content_records_status_key_fkey"
            columns: ["status_key"]
            isOneToOne: false
            referencedRelation: "workflow_statuses"
            referencedColumns: ["key"]
          },
        ]
      }
      v_stage_durations: {
        Row: {
          content_code: string | null
          content_id: string | null
          duration_seconds: number | null
          entered_at: string | null
          entered_by: string | null
          exited_at: string | null
          exited_by: string | null
          id: string | null
          is_current: boolean | null
          sort_order: number | null
          status_key: string | null
          status_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stage_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_history_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_history_exited_by_fkey"
            columns: ["exited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_history_status_key_fkey"
            columns: ["status_key"]
            isOneToOne: false
            referencedRelation: "workflow_statuses"
            referencedColumns: ["key"]
          },
        ]
      }
    }
    Functions: {
      actor_name: { Args: never; Returns: string }
      add_comment: {
        Args: {
          p_body: string
          p_content_id: string
          p_mentions?: string[]
          p_section: Database["public"]["Enums"]["comment_section"]
        }
        Returns: {
          author_id: string
          body: string
          content_id: string
          created_at: string
          edited_at: string | null
          id: string
          is_resolved: boolean
          mentions: string[]
          section: Database["public"]["Enums"]["comment_section"]
        }
        SetofOptions: {
          from: "*"
          to: "comments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
      available_transitions: {
        Args: { p_content_id: string }
        Returns: {
          is_backward: boolean
          label: string
          reason_required: boolean
          to_name: string
          to_status: string
        }[]
      }
      create_content_record: {
        Args: { p: Json }
        Returns: {
          approved_script_version_id: string | null
          audience_takeaway: string | null
          campaign_id: string | null
          campus_id: string | null
          concept: string | null
          content_id: string
          content_review_required: boolean
          content_type_id: string
          core_message: string | null
          created_at: string
          created_by: string | null
          creative_direction: string | null
          cta: string | null
          current_creative_version_id: string | null
          current_script_version_id: string | null
          description: string | null
          dm_owner_id: string | null
          hook: string | null
          id: string
          min_reviewer_responses: number
          nepali_verification: Database["public"]["Enums"]["nepali_verification"]
          objective_id: string | null
          pillar_id: string | null
          priority: Database["public"]["Enums"]["content_priority"]
          production_assignee_id: string | null
          production_due: string | null
          production_folder_url: string | null
          production_manager_id: string | null
          program_id: string | null
          reference_notes: string | null
          region_code: string
          request_type: string | null
          requester_id: string | null
          requesting_team_id: string | null
          requires_ai_disclosure: boolean
          review_due: string | null
          script_due: string | null
          secondary_objective_id: string | null
          status_key: string
          target_audience: string | null
          target_publish_date: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "content_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
      edit_comment: {
        Args: { p_body: string; p_comment_id: string }
        Returns: {
          author_id: string
          body: string
          content_id: string
          created_at: string
          edited_at: string | null
          id: string
          is_resolved: boolean
          mentions: string[]
          section: Database["public"]["Enums"]["comment_section"]
        }
        SetofOptions: {
          from: "*"
          to: "comments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      final_approvers: { Args: never; Returns: string[] }
      has_permission: { Args: { p_key: string }; Returns: boolean }
      in_team: { Args: { p_team_key: string }; Returns: boolean }
      is_active_user: { Args: never; Returns: boolean }
      is_final_approver: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      log_activity: {
        Args: {
          p_content_id: string
          p_description: string
          p_event_type: string
          p_metadata?: Json
          p_new?: Json
          p_previous?: Json
          p_reason?: string
        }
        Returns: string
      }
      mark_notifications_read: { Args: { p_ids?: string[] }; Returns: number }
      move_stage: {
        Args: { p_content_id: string; p_reason?: string; p_to_status: string }
        Returns: {
          approved_script_version_id: string | null
          audience_takeaway: string | null
          campaign_id: string | null
          campus_id: string | null
          concept: string | null
          content_id: string
          content_review_required: boolean
          content_type_id: string
          core_message: string | null
          created_at: string
          created_by: string | null
          creative_direction: string | null
          cta: string | null
          current_creative_version_id: string | null
          current_script_version_id: string | null
          description: string | null
          dm_owner_id: string | null
          hook: string | null
          id: string
          min_reviewer_responses: number
          nepali_verification: Database["public"]["Enums"]["nepali_verification"]
          objective_id: string | null
          pillar_id: string | null
          priority: Database["public"]["Enums"]["content_priority"]
          production_assignee_id: string | null
          production_due: string | null
          production_folder_url: string | null
          production_manager_id: string | null
          program_id: string | null
          reference_notes: string | null
          region_code: string
          request_type: string | null
          requester_id: string | null
          requesting_team_id: string | null
          requires_ai_disclosure: boolean
          review_due: string | null
          script_due: string | null
          secondary_objective_id: string | null
          status_key: string
          target_audience: string | null
          target_publish_date: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "content_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      my_access: { Args: never; Returns: Json }
      next_content_id: { Args: { p_region_code: string }; Returns: string }
      notify: {
        Args: {
          p_body?: string
          p_content_id: string
          p_recipients: string[]
          p_title: string
          p_type: string
        }
        Returns: number
      }
      person_can: {
        Args: { p_content_id: string; p_permission: string }
        Returns: boolean
      }
      profiles_with_permission: {
        Args: { p_permission: string }
        Returns: string[]
      }
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
      resolve_comment: {
        Args: { p_comment_id: string; p_resolved?: boolean }
        Returns: {
          author_id: string
          body: string
          content_id: string
          created_at: string
          edited_at: string | null
          id: string
          is_resolved: boolean
          mentions: string[]
          section: Database["public"]["Enums"]["comment_section"]
        }
        SetofOptions: {
          from: "*"
          to: "comments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      team_member_ids: { Args: { p_team_key: string }; Returns: string[] }
      update_content_fields: {
        Args: { p: Json; p_content_id: string }
        Returns: {
          approved_script_version_id: string | null
          audience_takeaway: string | null
          campaign_id: string | null
          campus_id: string | null
          concept: string | null
          content_id: string
          content_review_required: boolean
          content_type_id: string
          core_message: string | null
          created_at: string
          created_by: string | null
          creative_direction: string | null
          cta: string | null
          current_creative_version_id: string | null
          current_script_version_id: string | null
          description: string | null
          dm_owner_id: string | null
          hook: string | null
          id: string
          min_reviewer_responses: number
          nepali_verification: Database["public"]["Enums"]["nepali_verification"]
          objective_id: string | null
          pillar_id: string | null
          priority: Database["public"]["Enums"]["content_priority"]
          production_assignee_id: string | null
          production_due: string | null
          production_folder_url: string | null
          production_manager_id: string | null
          program_id: string | null
          reference_notes: string | null
          region_code: string
          request_type: string | null
          requester_id: string | null
          requesting_team_id: string | null
          requires_ai_disclosure: boolean
          review_due: string | null
          script_due: string | null
          secondary_objective_id: string | null
          status_key: string
          target_audience: string | null
          target_publish_date: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "content_records"
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
      working_days_between: {
        Args: { p_from: string; p_to: string }
        Returns: number
      }
    }
    Enums: {
      account_status:
        | "active"
        | "invitation_pending"
        | "disabled"
        | "archived_demo"
      comment_section:
        | "concept"
        | "script"
        | "production"
        | "review"
        | "final_approval"
        | "general"
      content_medium:
        | "video"
        | "static"
        | "carousel"
        | "caption"
        | "thumbnail"
        | "story"
        | "one_off"
      content_priority: "low" | "normal" | "high" | "urgent"
      nepali_verification: "not_needed" | "pending" | "verified"
      script_shape: "spoken" | "copy_spec" | "caption" | "shot_list" | "none"
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
      comment_section: [
        "concept",
        "script",
        "production",
        "review",
        "final_approval",
        "general",
      ],
      content_medium: [
        "video",
        "static",
        "carousel",
        "caption",
        "thumbnail",
        "story",
        "one_off",
      ],
      content_priority: ["low", "normal", "high", "urgent"],
      nepali_verification: ["not_needed", "pending", "verified"],
      script_shape: ["spoken", "copy_spec", "caption", "shot_list", "none"],
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

