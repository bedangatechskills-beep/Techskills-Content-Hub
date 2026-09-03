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
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
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
            referencedRelation: "v_content_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "activity_log_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "activity_log_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_final_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "activity_log_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "activity_log_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_unassigned_work"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_evaluations: {
        Row: {
          category_scores: Json
          content_id: string
          created_at: string
          creative_version_id: string | null
          duration_ms: number | null
          evaluation_type: Database["public"]["Enums"]["ai_evaluation_type"]
          hard_flags: Json
          id: string
          input_hash: string
          model: string
          overall_score: number | null
          prompt_version: string
          provider: string
          raw_response: Json | null
          recommendations: Json
          requested_by: string | null
          script_version_id: string | null
          summary: string | null
          verdict: string | null
        }
        Insert: {
          category_scores?: Json
          content_id: string
          created_at?: string
          creative_version_id?: string | null
          duration_ms?: number | null
          evaluation_type: Database["public"]["Enums"]["ai_evaluation_type"]
          hard_flags?: Json
          id?: string
          input_hash: string
          model: string
          overall_score?: number | null
          prompt_version: string
          provider: string
          raw_response?: Json | null
          recommendations?: Json
          requested_by?: string | null
          script_version_id?: string | null
          summary?: string | null
          verdict?: string | null
        }
        Update: {
          category_scores?: Json
          content_id?: string
          created_at?: string
          creative_version_id?: string | null
          duration_ms?: number | null
          evaluation_type?: Database["public"]["Enums"]["ai_evaluation_type"]
          hard_flags?: Json
          id?: string
          input_hash?: string
          model?: string
          overall_score?: number | null
          prompt_version?: string
          provider?: string
          raw_response?: Json | null
          recommendations?: Json
          requested_by?: string | null
          script_version_id?: string | null
          summary?: string | null
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_evaluations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_evaluations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_content_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "ai_evaluations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "ai_evaluations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_final_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "ai_evaluations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_evaluations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "ai_evaluations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_unassigned_work"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_evaluations_creative_version_fkey"
            columns: ["creative_version_id"]
            isOneToOne: false
            referencedRelation: "creative_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_evaluations_creative_version_fkey"
            columns: ["creative_version_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["creative_version_id"]
          },
          {
            foreignKeyName: "ai_evaluations_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_evaluations_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ai_evaluations_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ai_evaluations_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ai_evaluations_script_version_id_fkey"
            columns: ["script_version_id"]
            isOneToOne: false
            referencedRelation: "script_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_evaluations_script_version_id_fkey"
            columns: ["script_version_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["version_id"]
          },
        ]
      }
      ai_flag_resolutions: {
        Row: {
          action: Database["public"]["Enums"]["flag_action"]
          actor_id: string
          created_at: string
          evaluation_id: string
          flag_index: number
          flag_key: string
          id: string
          reason: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["flag_action"]
          actor_id: string
          created_at?: string
          evaluation_id: string
          flag_index: number
          flag_key: string
          id?: string
          reason?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["flag_action"]
          actor_id?: string
          created_at?: string
          evaluation_id?: string
          flag_index?: number
          flag_key?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_flag_resolutions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_flag_resolutions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ai_flag_resolutions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ai_flag_resolutions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ai_flag_resolutions_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "ai_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_flag_resolutions_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "v_creative_ai_latest"
            referencedColumns: ["evaluation_id"]
          },
          {
            foreignKeyName: "ai_flag_resolutions_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["evaluation_id"]
          },
          {
            foreignKeyName: "ai_flag_resolutions_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["evaluation_id"]
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
          rpc_only: boolean
          to_status: string
        }
        Insert: {
          from_status: string
          id?: string
          is_backward?: boolean
          label?: string | null
          permission_key: string
          reason_required?: boolean
          rpc_only?: boolean
          to_status: string
        }
        Update: {
          from_status?: string
          id?: string
          is_backward?: boolean
          label?: string | null
          permission_key?: string
          reason_required?: boolean
          rpc_only?: boolean
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
      app_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assignee_id: string | null
          content_id: string
          id: string
          reason: string | null
          role: Database["public"]["Enums"]["assignment_role"]
          unassigned_at: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assignee_id?: string | null
          content_id: string
          id?: string
          reason?: string | null
          role: Database["public"]["Enums"]["assignment_role"]
          unassigned_at?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assignee_id?: string | null
          content_id?: string
          id?: string
          reason?: string | null
          role?: Database["public"]["Enums"]["assignment_role"]
          unassigned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "assignments_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "assignments_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "assignments_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "assignments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_content_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "assignments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "assignments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_final_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "assignments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "assignments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_unassigned_work"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "brand_facts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "brand_facts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "brand_facts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
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
            foreignKeyName: "campaigns_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "campaigns_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "campaigns_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
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
      change_requests: {
        Row: {
          assigned_team_id: string | null
          assigned_user_id: string | null
          category: Database["public"]["Enums"]["change_category"]
          content_id: string
          created_at: string
          description: string
          id: string
          is_resolved: boolean
          requested_by: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          revision_no: number
          source: Database["public"]["Enums"]["change_source"]
        }
        Insert: {
          assigned_team_id?: string | null
          assigned_user_id?: string | null
          category?: Database["public"]["Enums"]["change_category"]
          content_id: string
          created_at?: string
          description: string
          id?: string
          is_resolved?: boolean
          requested_by: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          revision_no?: number
          source: Database["public"]["Enums"]["change_source"]
        }
        Update: {
          assigned_team_id?: string | null
          assigned_user_id?: string | null
          category?: Database["public"]["Enums"]["change_category"]
          content_id?: string
          created_at?: string
          description?: string
          id?: string
          is_resolved?: boolean
          requested_by?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          revision_no?: number
          source?: Database["public"]["Enums"]["change_source"]
        }
        Relationships: [
          {
            foreignKeyName: "change_requests_assigned_team_id_fkey"
            columns: ["assigned_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "change_requests_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "change_requests_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "change_requests_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_content_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "change_requests_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "change_requests_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_final_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "change_requests_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "change_requests_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_unassigned_work"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "change_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "change_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "change_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "change_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "change_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
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
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
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
            referencedRelation: "v_content_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "comments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "comments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_final_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "comments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "comments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_unassigned_work"
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
            referencedRelation: "v_content_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "content_differentiators_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "content_differentiators_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_final_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "content_differentiators_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_differentiators_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "content_differentiators_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_unassigned_work"
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
            referencedRelation: "v_content_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "content_platforms_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "content_platforms_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_final_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "content_platforms_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_platforms_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "content_platforms_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_unassigned_work"
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
          approved_creative_version_id: string | null
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
          approved_creative_version_id?: string | null
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
          approved_creative_version_id?: string | null
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
            foreignKeyName: "content_records_approved_creative_version_id_fkey"
            columns: ["approved_creative_version_id"]
            isOneToOne: false
            referencedRelation: "creative_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_approved_creative_version_id_fkey"
            columns: ["approved_creative_version_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["creative_version_id"]
          },
          {
            foreignKeyName: "content_records_approved_script_fkey"
            columns: ["approved_script_version_id"]
            isOneToOne: false
            referencedRelation: "script_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_approved_script_fkey"
            columns: ["approved_script_version_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["version_id"]
          },
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
            foreignKeyName: "content_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_records_current_creative_fkey"
            columns: ["current_creative_version_id"]
            isOneToOne: false
            referencedRelation: "creative_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_current_creative_fkey"
            columns: ["current_creative_version_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["creative_version_id"]
          },
          {
            foreignKeyName: "content_records_current_script_fkey"
            columns: ["current_script_version_id"]
            isOneToOne: false
            referencedRelation: "script_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_current_script_fkey"
            columns: ["current_script_version_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["version_id"]
          },
          {
            foreignKeyName: "content_records_dm_owner_id_fkey"
            columns: ["dm_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_dm_owner_id_fkey"
            columns: ["dm_owner_id"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_records_dm_owner_id_fkey"
            columns: ["dm_owner_id"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_records_dm_owner_id_fkey"
            columns: ["dm_owner_id"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
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
            foreignKeyName: "content_records_production_assignee_id_fkey"
            columns: ["production_assignee_id"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_records_production_assignee_id_fkey"
            columns: ["production_assignee_id"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_records_production_assignee_id_fkey"
            columns: ["production_assignee_id"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_records_production_manager_id_fkey"
            columns: ["production_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_production_manager_id_fkey"
            columns: ["production_manager_id"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_records_production_manager_id_fkey"
            columns: ["production_manager_id"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_records_production_manager_id_fkey"
            columns: ["production_manager_id"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
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
            foreignKeyName: "content_records_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_records_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_records_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
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
          {
            foreignKeyName: "content_records_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_records_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_records_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
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
      creative_versions: {
        Row: {
          content_id: string
          created_at: string
          duration_s: number | null
          file_name: string
          height: number | null
          id: string
          is_material_change: boolean | null
          kind: Database["public"]["Enums"]["creative_kind"]
          material_reason: string | null
          mime: string | null
          note: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
          version_no: number
          width: number | null
        }
        Insert: {
          content_id: string
          created_at?: string
          duration_s?: number | null
          file_name: string
          height?: number | null
          id?: string
          is_material_change?: boolean | null
          kind?: Database["public"]["Enums"]["creative_kind"]
          material_reason?: string | null
          mime?: string | null
          note?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
          version_no: number
          width?: number | null
        }
        Update: {
          content_id?: string
          created_at?: string
          duration_s?: number | null
          file_name?: string
          height?: number | null
          id?: string
          is_material_change?: boolean | null
          kind?: Database["public"]["Enums"]["creative_kind"]
          material_reason?: string | null
          mime?: string | null
          note?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
          version_no?: number
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creative_versions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_versions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_content_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "creative_versions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "creative_versions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_final_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "creative_versions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_versions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "creative_versions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_unassigned_work"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "creative_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "creative_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
          },
        ]
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
      dm_reviews: {
        Row: {
          checklist: Json
          content_id: string
          created_at: string
          creative_version_id: string | null
          decision: Database["public"]["Enums"]["dm_decision"]
          feedback: string | null
          id: string
          reviewer_id: string
          scores: Json | null
        }
        Insert: {
          checklist?: Json
          content_id: string
          created_at?: string
          creative_version_id?: string | null
          decision: Database["public"]["Enums"]["dm_decision"]
          feedback?: string | null
          id?: string
          reviewer_id: string
          scores?: Json | null
        }
        Update: {
          checklist?: Json
          content_id?: string
          created_at?: string
          creative_version_id?: string | null
          decision?: Database["public"]["Enums"]["dm_decision"]
          feedback?: string | null
          id?: string
          reviewer_id?: string
          scores?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dm_reviews_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_reviews_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_content_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "dm_reviews_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "dm_reviews_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_final_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "dm_reviews_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_reviews_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "dm_reviews_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_unassigned_work"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_reviews_creative_version_id_fkey"
            columns: ["creative_version_id"]
            isOneToOne: false
            referencedRelation: "creative_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_reviews_creative_version_id_fkey"
            columns: ["creative_version_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["creative_version_id"]
          },
          {
            foreignKeyName: "dm_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "dm_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "dm_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      final_approvals: {
        Row: {
          approver_id: string
          checklist_snapshot: Json
          content_id: string
          created_at: string
          creative_version_id: string | null
          decision: Database["public"]["Enums"]["final_decision"]
          id: string
          override_reason: string | null
          reason: string | null
          script_version_id: string | null
        }
        Insert: {
          approver_id: string
          checklist_snapshot?: Json
          content_id: string
          created_at?: string
          creative_version_id?: string | null
          decision: Database["public"]["Enums"]["final_decision"]
          id?: string
          override_reason?: string | null
          reason?: string | null
          script_version_id?: string | null
        }
        Update: {
          approver_id?: string
          checklist_snapshot?: Json
          content_id?: string
          created_at?: string
          creative_version_id?: string | null
          decision?: Database["public"]["Enums"]["final_decision"]
          id?: string
          override_reason?: string | null
          reason?: string | null
          script_version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "final_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "final_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "final_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "final_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "final_approvals_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "final_approvals_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_content_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "final_approvals_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "final_approvals_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_final_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "final_approvals_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "final_approvals_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "final_approvals_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_unassigned_work"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "final_approvals_creative_version_id_fkey"
            columns: ["creative_version_id"]
            isOneToOne: false
            referencedRelation: "creative_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "final_approvals_creative_version_id_fkey"
            columns: ["creative_version_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["creative_version_id"]
          },
          {
            foreignKeyName: "final_approvals_script_version_id_fkey"
            columns: ["script_version_id"]
            isOneToOne: false
            referencedRelation: "script_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "final_approvals_script_version_id_fkey"
            columns: ["script_version_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["version_id"]
          },
        ]
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
            referencedRelation: "v_content_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "notifications_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "notifications_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_final_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "notifications_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "notifications_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_unassigned_work"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
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
      overrides: {
        Row: {
          actor_id: string
          content_id: string
          created_at: string
          creative_version_id: string | null
          id: string
          kind: Database["public"]["Enums"]["override_kind"]
          reason: string
          snapshot: Json
        }
        Insert: {
          actor_id: string
          content_id: string
          created_at?: string
          creative_version_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["override_kind"]
          reason: string
          snapshot?: Json
        }
        Update: {
          actor_id?: string
          content_id?: string
          created_at?: string
          creative_version_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["override_kind"]
          reason?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "overrides_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overrides_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "overrides_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "overrides_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "overrides_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overrides_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_content_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "overrides_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "overrides_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_final_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "overrides_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overrides_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "overrides_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_unassigned_work"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overrides_creative_version_id_fkey"
            columns: ["creative_version_id"]
            isOneToOne: false
            referencedRelation: "creative_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overrides_creative_version_id_fkey"
            columns: ["creative_version_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["creative_version_id"]
          },
        ]
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
      production_reviews: {
        Row: {
          checklist: Json
          content_id: string
          created_at: string
          creative_version_id: string | null
          decision: Database["public"]["Enums"]["production_decision"]
          id: string
          notes: string | null
          reviewer_id: string
        }
        Insert: {
          checklist?: Json
          content_id: string
          created_at?: string
          creative_version_id?: string | null
          decision: Database["public"]["Enums"]["production_decision"]
          id?: string
          notes?: string | null
          reviewer_id: string
        }
        Update: {
          checklist?: Json
          content_id?: string
          created_at?: string
          creative_version_id?: string | null
          decision?: Database["public"]["Enums"]["production_decision"]
          id?: string
          notes?: string | null
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_reviews_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_reviews_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_content_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "production_reviews_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "production_reviews_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_final_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "production_reviews_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_reviews_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "production_reviews_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_unassigned_work"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_reviews_creative_version_id_fkey"
            columns: ["creative_version_id"]
            isOneToOne: false
            referencedRelation: "creative_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_reviews_creative_version_id_fkey"
            columns: ["creative_version_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["creative_version_id"]
          },
          {
            foreignKeyName: "production_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "production_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "production_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      production_tasks: {
        Row: {
          assignee_id: string | null
          category: string | null
          completed_at: string | null
          content_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["content_priority"]
          sort_order: number
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          category?: string | null
          completed_at?: string | null
          content_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["content_priority"]
          sort_order?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          category?: string | null
          completed_at?: string | null
          content_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["content_priority"]
          sort_order?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "production_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "production_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "production_tasks_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_tasks_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_content_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "production_tasks_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "production_tasks_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_final_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "production_tasks_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_tasks_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "production_tasks_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_unassigned_work"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "production_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "production_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
          },
        ]
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
            foreignKeyName: "profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
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
      reviewer_ratings: {
        Row: {
          average: number
          comment: string | null
          content_id: string
          created_at: string
          creative_version_id: string | null
          decision: Database["public"]["Enums"]["reviewer_decision"]
          id: string
          reviewer_id: string
          scores: Json
        }
        Insert: {
          average: number
          comment?: string | null
          content_id: string
          created_at?: string
          creative_version_id?: string | null
          decision: Database["public"]["Enums"]["reviewer_decision"]
          id?: string
          reviewer_id: string
          scores: Json
        }
        Update: {
          average?: number
          comment?: string | null
          content_id?: string
          created_at?: string
          creative_version_id?: string | null
          decision?: Database["public"]["Enums"]["reviewer_decision"]
          id?: string
          reviewer_id?: string
          scores?: Json
        }
        Relationships: [
          {
            foreignKeyName: "reviewer_ratings_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviewer_ratings_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_content_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "reviewer_ratings_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "reviewer_ratings_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_final_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "reviewer_ratings_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviewer_ratings_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "reviewer_ratings_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_unassigned_work"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviewer_ratings_creative_version_id_fkey"
            columns: ["creative_version_id"]
            isOneToOne: false
            referencedRelation: "creative_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviewer_ratings_creative_version_id_fkey"
            columns: ["creative_version_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["creative_version_id"]
          },
          {
            foreignKeyName: "reviewer_ratings_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviewer_ratings_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "reviewer_ratings_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "reviewer_ratings_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
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
      script_approvals: {
        Row: {
          approver_id: string
          content_id: string
          created_at: string
          decision: Database["public"]["Enums"]["approval_decision"]
          id: string
          reason: string | null
          script_version_id: string
        }
        Insert: {
          approver_id: string
          content_id: string
          created_at?: string
          decision: Database["public"]["Enums"]["approval_decision"]
          id?: string
          reason?: string | null
          script_version_id: string
        }
        Update: {
          approver_id?: string
          content_id?: string
          created_at?: string
          decision?: Database["public"]["Enums"]["approval_decision"]
          id?: string
          reason?: string | null
          script_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "script_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "script_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "script_approvals_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_approvals_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_content_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "script_approvals_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "script_approvals_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_final_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "script_approvals_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_approvals_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "script_approvals_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_unassigned_work"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_approvals_script_version_id_fkey"
            columns: ["script_version_id"]
            isOneToOne: false
            referencedRelation: "script_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_approvals_script_version_id_fkey"
            columns: ["script_version_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["version_id"]
          },
        ]
      }
      script_versions: {
        Row: {
          approval_status: Database["public"]["Enums"]["script_approval_status"]
          body: string
          change_summary: string | null
          content_id: string
          created_at: string
          created_by: string | null
          id: string
          is_material_change: boolean | null
          material_reason: string | null
          script_shape: Database["public"]["Enums"]["script_shape"]
          version_no: number
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["script_approval_status"]
          body: string
          change_summary?: string | null
          content_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_material_change?: boolean | null
          material_reason?: string | null
          script_shape?: Database["public"]["Enums"]["script_shape"]
          version_no: number
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["script_approval_status"]
          body?: string
          change_summary?: string | null
          content_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_material_change?: boolean | null
          material_reason?: string | null
          script_shape?: Database["public"]["Enums"]["script_shape"]
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "script_versions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_versions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_content_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "script_versions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "script_versions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_final_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "script_versions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_versions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "script_versions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_unassigned_work"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "script_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "script_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
          },
        ]
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
            referencedRelation: "v_content_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "stage_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "stage_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_final_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "stage_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "stage_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_unassigned_work"
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
            foreignKeyName: "stage_history_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "stage_history_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "stage_history_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "stage_history_exited_by_fkey"
            columns: ["exited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_history_exited_by_fkey"
            columns: ["exited_by"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "stage_history_exited_by_fkey"
            columns: ["exited_by"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "stage_history_exited_by_fkey"
            columns: ["exited_by"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
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
            foreignKeyName: "team_memberships_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "team_memberships_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "team_memberships_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "team_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "team_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "team_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
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
          {
            foreignKeyName: "teams_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "teams_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "teams_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
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
      v_active_work: {
        Row: {
          colour_key: string | null
          content_code: string | null
          content_id: string | null
          due_date: string | null
          is_overdue: boolean | null
          is_stalled: boolean | null
          kind: string | null
          priority: Database["public"]["Enums"]["content_priority"] | null
          profile_id: string | null
          seconds_in_stage: number | null
          stage_entered_at: string | null
          status_key: string | null
          status_name: string | null
          task_id: string | null
          title: string | null
        }
        Relationships: []
      }
      v_ceo_stats: {
        Row: {
          active_approval_work: number | null
          change_requests: number | null
          profile_id: string | null
          waiting_final_approval: number | null
          waiting_script_approval: number | null
        }
        Insert: {
          active_approval_work?: never
          change_requests?: never
          profile_id?: string | null
          waiting_final_approval?: never
          waiting_script_approval?: never
        }
        Update: {
          active_approval_work?: never
          change_requests?: never
          profile_id?: string | null
          waiting_final_approval?: never
          waiting_script_approval?: never
        }
        Relationships: []
      }
      v_content_review_queue: {
        Row: {
          content_code: string | null
          content_id: string | null
          content_type: string | null
          creative_version_no: number | null
          current_creative_version_id: string | null
          dm_owner_name: string | null
          due_date: string | null
          is_overdue: boolean | null
          min_reviewer_responses: number | null
          priority: Database["public"]["Enums"]["content_priority"] | null
          rated_by_me: boolean | null
          re_review_required: boolean | null
          region_code: string | null
          responses: number | null
          seconds_in_stage: number | null
          stage_entered_at: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_records_current_creative_fkey"
            columns: ["current_creative_version_id"]
            isOneToOne: false
            referencedRelation: "creative_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_current_creative_fkey"
            columns: ["current_creative_version_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["creative_version_id"]
          },
          {
            foreignKeyName: "content_records_region_code_fkey"
            columns: ["region_code"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["code"]
          },
        ]
      }
      v_creative_ai_latest: {
        Row: {
          content_id: string | null
          created_at: string | null
          creative_version_id: string | null
          evaluation_id: string | null
          flag_count: number | null
          open_flag_count: number | null
          overall_score: number | null
          verdict: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_evaluations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_evaluations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_content_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "ai_evaluations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "ai_evaluations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_final_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "ai_evaluations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_evaluations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "ai_evaluations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_unassigned_work"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_evaluations_creative_version_fkey"
            columns: ["creative_version_id"]
            isOneToOne: false
            referencedRelation: "creative_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_evaluations_creative_version_fkey"
            columns: ["creative_version_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["creative_version_id"]
          },
        ]
      }
      v_dm_review_queue: {
        Row: {
          assignee_name: string | null
          content_code: string | null
          content_id: string | null
          content_review_required: boolean | null
          content_type: string | null
          creative_kind: Database["public"]["Enums"]["creative_kind"] | null
          creative_version_id: string | null
          creative_version_no: number | null
          dm_owner_id: string | null
          dm_owner_name: string | null
          due_date: string | null
          evaluation_id: string | null
          file_name: string | null
          flag_count: number | null
          is_overdue: boolean | null
          loop_count: number | null
          medium: Database["public"]["Enums"]["content_medium"] | null
          nepali_verification:
            | Database["public"]["Enums"]["nepali_verification"]
            | null
          open_flag_count: number | null
          overall_score: number | null
          priority: Database["public"]["Enums"]["content_priority"] | null
          region_code: string | null
          requires_ai_disclosure: boolean | null
          seconds_in_stage: number | null
          stage_entered_at: string | null
          title: string | null
          verdict: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_records_dm_owner_id_fkey"
            columns: ["dm_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_dm_owner_id_fkey"
            columns: ["dm_owner_id"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_records_dm_owner_id_fkey"
            columns: ["dm_owner_id"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_records_dm_owner_id_fkey"
            columns: ["dm_owner_id"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_records_region_code_fkey"
            columns: ["region_code"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["code"]
          },
        ]
      }
      v_dm_stats: {
        Row: {
          active_content: number | null
          current_tasks: number | null
          dm_reviews_waiting: number | null
          feedback_requiring_action: number | null
          overdue: number | null
          profile_id: string | null
          scripts_waiting: number | null
        }
        Insert: {
          active_content?: never
          current_tasks?: never
          dm_reviews_waiting?: never
          feedback_requiring_action?: never
          overdue?: never
          profile_id?: string | null
          scripts_waiting?: never
        }
        Update: {
          active_content?: never
          current_tasks?: never
          dm_reviews_waiting?: never
          feedback_requiring_action?: never
          overdue?: never
          profile_id?: string | null
          scripts_waiting?: never
        }
        Relationships: []
      }
      v_final_approval_queue: {
        Row: {
          assignee_name: string | null
          content_code: string | null
          content_id: string | null
          content_review_required: boolean | null
          content_type: string | null
          creative_ai_score: number | null
          creative_ai_verdict: string | null
          creative_open_flags: number | null
          dm_owner_name: string | null
          is_overdue: boolean | null
          is_reapproval: boolean | null
          open_change_requests: number | null
          override_count: number | null
          prior_approvals: number | null
          priority: Database["public"]["Enums"]["content_priority"] | null
          region_code: string | null
          seconds_in_stage: number | null
          stage_entered_at: string | null
          target_publish_date: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_records_region_code_fkey"
            columns: ["region_code"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["code"]
          },
        ]
      }
      v_kanban_cards: {
        Row: {
          ai_flag_count: number | null
          ai_score: number | null
          ai_verdict: string | null
          assignee_name: string | null
          campaign_id: string | null
          campus_id: string | null
          colour_key: string | null
          comment_count: number | null
          content_id: string | null
          content_review_required: boolean | null
          content_type: string | null
          created_at: string | null
          creative_ai_score: number | null
          creative_ai_verdict: string | null
          creative_open_flags: number | null
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
          open_change_requests: number | null
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
            foreignKeyName: "content_records_dm_owner_id_fkey"
            columns: ["dm_owner_id"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_records_dm_owner_id_fkey"
            columns: ["dm_owner_id"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_records_dm_owner_id_fkey"
            columns: ["dm_owner_id"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_records_production_assignee_id_fkey"
            columns: ["production_assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_production_assignee_id_fkey"
            columns: ["production_assignee_id"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_records_production_assignee_id_fkey"
            columns: ["production_assignee_id"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_records_production_assignee_id_fkey"
            columns: ["production_assignee_id"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
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
      v_script_ai_latest: {
        Row: {
          content_id: string | null
          created_at: string | null
          flag_count: number | null
          overall_score: number | null
          verdict: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_evaluations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_evaluations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_content_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "ai_evaluations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "ai_evaluations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_final_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "ai_evaluations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_evaluations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "ai_evaluations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_unassigned_work"
            referencedColumns: ["id"]
          },
        ]
      }
      v_script_approval_queue: {
        Row: {
          change_summary: string | null
          content_code: string | null
          content_id: string | null
          content_type: string | null
          dm_owner_id: string | null
          dm_owner_name: string | null
          evaluation_id: string | null
          flag_count: number | null
          is_reapproval: boolean | null
          overall_score: number | null
          priority: Database["public"]["Enums"]["content_priority"] | null
          region_code: string | null
          title: string | null
          verdict: string | null
          version_author: string | null
          version_created_at: string | null
          version_id: string | null
          version_no: number | null
          waiting_since: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_records_dm_owner_id_fkey"
            columns: ["dm_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_records_dm_owner_id_fkey"
            columns: ["dm_owner_id"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_records_dm_owner_id_fkey"
            columns: ["dm_owner_id"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_records_dm_owner_id_fkey"
            columns: ["dm_owner_id"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "content_records_region_code_fkey"
            columns: ["region_code"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["code"]
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
            referencedRelation: "v_content_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "stage_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_dm_review_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "stage_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_final_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "stage_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_script_approval_queue"
            referencedColumns: ["content_id"]
          },
          {
            foreignKeyName: "stage_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "v_unassigned_work"
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
            foreignKeyName: "stage_history_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "stage_history_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "stage_history_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "stage_history_exited_by_fkey"
            columns: ["exited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_history_exited_by_fkey"
            columns: ["exited_by"]
            isOneToOne: false
            referencedRelation: "v_ceo_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "stage_history_exited_by_fkey"
            columns: ["exited_by"]
            isOneToOne: false
            referencedRelation: "v_dm_stats"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "stage_history_exited_by_fkey"
            columns: ["exited_by"]
            isOneToOne: false
            referencedRelation: "v_workload"
            referencedColumns: ["profile_id"]
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
      v_unassigned_work: {
        Row: {
          colour_key: string | null
          content_id: string | null
          content_type: string | null
          dm_owner_name: string | null
          due_date: string | null
          id: string | null
          is_overdue: boolean | null
          priority: Database["public"]["Enums"]["content_priority"] | null
          region_code: string | null
          seconds_in_stage: number | null
          stage_entered_at: string | null
          status_key: string | null
          status_name: string | null
          title: string | null
        }
        Relationships: [
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
      v_workload: {
        Row: {
          active_count: number | null
          current_colour_key: string | null
          current_content_code: string | null
          current_due_date: string | null
          current_seconds_in_stage: number | null
          current_status_name: string | null
          current_title: string | null
          full_name: string | null
          in_ceo: boolean | null
          in_content_reviewer: boolean | null
          in_dm: boolean | null
          in_production: boolean | null
          last_active_at: string | null
          overdue_count: number | null
          photo_url: string | null
          profile_id: string | null
          role_id: string | null
          role_key: string | null
          role_name: string | null
          stalled_count: number | null
          work_status: Database["public"]["Enums"]["work_status"] | null
          workload_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
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
      approve_script: {
        Args: { p_version_id: string }
        Returns: {
          approved_creative_version_id: string | null
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
      assert_admin: { Args: never; Returns: undefined }
      assign_production: {
        Args: { p_assignee_id: string; p_content_id: string; p_reason?: string }
        Returns: {
          approved_creative_version_id: string | null
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
      can_run_creative_evaluation: {
        Args: { p_version_id: string }
        Returns: boolean
      }
      can_run_script_evaluation: {
        Args: { p_version_id: string }
        Returns: boolean
      }
      can_upload_creative: { Args: { p_content_id: string }; Returns: boolean }
      complete_content_review: {
        Args: { p_content_id: string; p_skip_reason?: string }
        Returns: {
          approved_creative_version_id: string | null
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
      create_content_record: {
        Args: { p: Json }
        Returns: {
          approved_creative_version_id: string | null
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
      create_script_version: {
        Args: {
          p_body: string
          p_change_summary?: string
          p_content_id: string
        }
        Returns: {
          approval_status: Database["public"]["Enums"]["script_approval_status"]
          body: string
          change_summary: string | null
          content_id: string
          created_at: string
          created_by: string | null
          id: string
          is_material_change: boolean | null
          material_reason: string | null
          script_shape: Database["public"]["Enums"]["script_shape"]
          version_no: number
        }
        SetofOptions: {
          from: "*"
          to: "script_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_task: {
        Args: {
          p_assignee_id?: string
          p_category?: string
          p_content_id: string
          p_description?: string
          p_due_date?: string
          p_priority?: Database["public"]["Enums"]["content_priority"]
          p_start_date?: string
          p_title: string
        }
        Returns: {
          assignee_id: string | null
          category: string | null
          completed_at: string | null
          content_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["content_priority"]
          sort_order: number
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "production_tasks"
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
      dm_review: {
        Args: {
          p_checklist?: Json
          p_content_id: string
          p_decision: Database["public"]["Enums"]["dm_decision"]
          p_feedback?: string
          p_items?: Json
          p_scores?: Json
        }
        Returns: {
          approved_creative_version_id: string | null
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
      final_approval_checklist: {
        Args: { p_content_id: string }
        Returns: Json
      }
      final_approve: {
        Args: { p_content_id: string; p_override_reason?: string }
        Returns: {
          approved_creative_version_id: string | null
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
      final_approvers: { Args: never; Returns: string[] }
      final_reject: {
        Args: { p_content_id: string; p_reason: string }
        Returns: {
          approved_creative_version_id: string | null
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
      final_request_changes: {
        Args: { p_content_id: string; p_items?: Json; p_reason: string }
        Returns: {
          approved_creative_version_id: string | null
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
      gate_status: { Args: { p_content_id: string }; Returns: Json }
      has_permission: { Args: { p_key: string }; Returns: boolean }
      in_team: { Args: { p_team_key: string }; Returns: boolean }
      internal_move_stage: {
        Args: { p_content_id: string; p_reason?: string; p_to_status: string }
        Returns: {
          approved_creative_version_id: string | null
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
      is_active_user: { Args: never; Returns: boolean }
      is_final_approver: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      latest_creative_evaluation: {
        Args: { p_version_id: string }
        Returns: {
          category_scores: Json
          content_id: string
          created_at: string
          creative_version_id: string | null
          duration_ms: number | null
          evaluation_type: Database["public"]["Enums"]["ai_evaluation_type"]
          hard_flags: Json
          id: string
          input_hash: string
          model: string
          overall_score: number | null
          prompt_version: string
          provider: string
          raw_response: Json | null
          recommendations: Json
          requested_by: string | null
          script_version_id: string | null
          summary: string | null
          verdict: string | null
        }
        SetofOptions: {
          from: "*"
          to: "ai_evaluations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      latest_script_evaluation: {
        Args: { p_version_id: string }
        Returns: {
          category_scores: Json
          content_id: string
          created_at: string
          creative_version_id: string | null
          duration_ms: number | null
          evaluation_type: Database["public"]["Enums"]["ai_evaluation_type"]
          hard_flags: Json
          id: string
          input_hash: string
          model: string
          overall_score: number | null
          prompt_version: string
          provider: string
          raw_response: Json | null
          recommendations: Json
          requested_by: string | null
          script_version_id: string | null
          summary: string | null
          verdict: string | null
        }
        SetofOptions: {
          from: "*"
          to: "ai_evaluations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
      mark_creative_material: {
        Args: {
          p_creative_version_id: string
          p_is_material: boolean
          p_reason: string
        }
        Returns: {
          content_id: string
          created_at: string
          duration_s: number | null
          file_name: string
          height: number | null
          id: string
          is_material_change: boolean | null
          kind: Database["public"]["Enums"]["creative_kind"]
          material_reason: string | null
          mime: string | null
          note: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
          version_no: number
          width: number | null
        }
        SetofOptions: {
          from: "*"
          to: "creative_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_notifications_read: { Args: { p_ids?: string[] }; Returns: number }
      mark_version_material: {
        Args: {
          p_is_material: boolean
          p_reason?: string
          p_version_id: string
        }
        Returns: {
          approval_status: Database["public"]["Enums"]["script_approval_status"]
          body: string
          change_summary: string | null
          content_id: string
          created_at: string
          created_by: string | null
          id: string
          is_material_change: boolean | null
          material_reason: string | null
          script_shape: Database["public"]["Enums"]["script_shape"]
          version_no: number
        }
        SetofOptions: {
          from: "*"
          to: "script_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      move_stage: {
        Args: { p_content_id: string; p_reason?: string; p_to_status: string }
        Returns: {
          approved_creative_version_id: string | null
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
      person_backlog: { Args: { p_profile_id: string }; Returns: Json }
      person_can: {
        Args: { p_content_id: string; p_permission: string }
        Returns: boolean
      }
      production_review: {
        Args: {
          p_checklist?: Json
          p_content_id: string
          p_decision: Database["public"]["Enums"]["production_decision"]
          p_notes?: string
        }
        Returns: {
          approved_creative_version_id: string | null
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
      profile_has_permission: {
        Args: { p_key: string; p_profile_id: string }
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
      record_ai_evaluation: {
        Args: { p: Json }
        Returns: {
          category_scores: Json
          content_id: string
          created_at: string
          creative_version_id: string | null
          duration_ms: number | null
          evaluation_type: Database["public"]["Enums"]["ai_evaluation_type"]
          hard_flags: Json
          id: string
          input_hash: string
          model: string
          overall_score: number | null
          prompt_version: string
          provider: string
          raw_response: Json | null
          recommendations: Json
          requested_by: string | null
          script_version_id: string | null
          summary: string | null
          verdict: string | null
        }
        SetofOptions: {
          from: "*"
          to: "ai_evaluations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_creative_evaluation: {
        Args: { p: Json }
        Returns: {
          category_scores: Json
          content_id: string
          created_at: string
          creative_version_id: string | null
          duration_ms: number | null
          evaluation_type: Database["public"]["Enums"]["ai_evaluation_type"]
          hard_flags: Json
          id: string
          input_hash: string
          model: string
          overall_score: number | null
          prompt_version: string
          provider: string
          raw_response: Json | null
          recommendations: Json
          requested_by: string | null
          script_version_id: string | null
          summary: string | null
          verdict: string | null
        }
        SetofOptions: {
          from: "*"
          to: "ai_evaluations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_dm_override: {
        Args: { p_content_id: string; p_reason: string }
        Returns: {
          actor_id: string
          content_id: string
          created_at: string
          creative_version_id: string | null
          id: string
          kind: Database["public"]["Enums"]["override_kind"]
          reason: string
          snapshot: Json
        }
        SetofOptions: {
          from: "*"
          to: "overrides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      register_creative_version: {
        Args: {
          p_content_id: string
          p_duration_s?: number
          p_file_name: string
          p_height?: number
          p_kind?: Database["public"]["Enums"]["creative_kind"]
          p_mime?: string
          p_note?: string
          p_size_bytes?: number
          p_storage_path: string
          p_width?: number
        }
        Returns: {
          content_id: string
          created_at: string
          duration_s: number | null
          file_name: string
          height: number | null
          id: string
          is_material_change: boolean | null
          kind: Database["public"]["Enums"]["creative_kind"]
          material_reason: string | null
          mime: string | null
          note: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
          version_no: number
          width: number | null
        }
        SetofOptions: {
          from: "*"
          to: "creative_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reopen_change_request: {
        Args: { p_reason: string; p_request_id: string }
        Returns: {
          assigned_team_id: string | null
          assigned_user_id: string | null
          category: Database["public"]["Enums"]["change_category"]
          content_id: string
          created_at: string
          description: string
          id: string
          is_resolved: boolean
          requested_by: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          revision_no: number
          source: Database["public"]["Enums"]["change_source"]
        }
        SetofOptions: {
          from: "*"
          to: "change_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_script_changes: {
        Args: { p_reason: string; p_version_id: string }
        Returns: {
          approved_creative_version_id: string | null
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
      resolve_ai_flag: {
        Args: {
          p_action: Database["public"]["Enums"]["flag_action"]
          p_evaluation_id: string
          p_flag_index: number
          p_reason?: string
        }
        Returns: {
          action: Database["public"]["Enums"]["flag_action"]
          actor_id: string
          created_at: string
          evaluation_id: string
          flag_index: number
          flag_key: string
          id: string
          reason: string | null
        }
        SetofOptions: {
          from: "*"
          to: "ai_flag_resolutions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_change_request: {
        Args: { p_note?: string; p_request_id: string }
        Returns: {
          assigned_team_id: string | null
          assigned_user_id: string | null
          category: Database["public"]["Enums"]["change_category"]
          content_id: string
          created_at: string
          description: string
          id: string
          is_resolved: boolean
          requested_by: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          revision_no: number
          source: Database["public"]["Enums"]["change_source"]
        }
        SetofOptions: {
          from: "*"
          to: "change_requests"
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
      reviewer_summary: { Args: { p_content_id: string }; Returns: Json }
      route_changes_required: {
        Args: { p_content_id: string; p_target?: string }
        Returns: {
          approved_creative_version_id: string | null
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
      set_content_review_required: {
        Args: {
          p_content_id: string
          p_min_responses?: number
          p_reason?: string
          p_required: boolean
        }
        Returns: {
          approved_creative_version_id: string | null
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
      set_work_status: {
        Args: { p_status: Database["public"]["Enums"]["work_status"] }
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
      setting_bool: {
        Args: { p_default?: boolean; p_key: string }
        Returns: boolean
      }
      setting_numeric: {
        Args: { p_default: number; p_key: string }
        Returns: number
      }
      stage_actor_permission: { Args: { p_status: string }; Returns: string }
      submit_for_final_approval: {
        Args: { p_content_id: string }
        Returns: {
          approved_creative_version_id: string | null
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
      submit_for_production_review: {
        Args: { p_content_id: string }
        Returns: {
          approved_creative_version_id: string | null
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
      submit_reviewer_rating: {
        Args: {
          p_comment?: string
          p_content_id: string
          p_decision: Database["public"]["Enums"]["reviewer_decision"]
          p_scores: Json
        }
        Returns: {
          average: number
          comment: string | null
          content_id: string
          created_at: string
          creative_version_id: string | null
          decision: Database["public"]["Enums"]["reviewer_decision"]
          id: string
          reviewer_id: string
          scores: Json
        }
        SetofOptions: {
          from: "*"
          to: "reviewer_ratings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_script_for_approval: {
        Args: { p_version_id: string }
        Returns: {
          approved_creative_version_id: string | null
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
      team_member_ids: { Args: { p_team_key: string }; Returns: string[] }
      update_content_fields: {
        Args: { p: Json; p_content_id: string }
        Returns: {
          approved_creative_version_id: string | null
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
      update_task: {
        Args: { p: Json; p_task_id: string }
        Returns: {
          assignee_id: string | null
          category: string | null
          completed_at: string | null
          content_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["content_priority"]
          sort_order: number
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "production_tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verify_nepali: {
        Args: { p_content_id: string; p_note?: string }
        Returns: {
          approved_creative_version_id: string | null
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
      working_days_between: {
        Args: { p_from: string; p_to: string }
        Returns: number
      }
      workload_status: { Args: { p_active: number }; Returns: string }
    }
    Enums: {
      account_status:
        | "active"
        | "invitation_pending"
        | "disabled"
        | "archived_demo"
      ai_evaluation_type: "script" | "creative"
      approval_decision: "approved" | "changes_requested"
      assignment_role: "production_assignee" | "dm_owner"
      change_category: "production" | "script_message" | "other"
      change_source:
        | "dm_review"
        | "final_approval"
        | "content_review"
        | "production_review"
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
      creative_kind: "image" | "video" | "carousel" | "thumbnail" | "other"
      dm_decision: "approved" | "changes_requested"
      final_decision: "approved" | "changes_requested" | "rejected"
      flag_action: "resolved" | "dismissed"
      nepali_verification: "not_needed" | "pending" | "verified"
      override_kind:
        | "reviewer_quorum"
        | "reviewer_threshold"
        | "reviewer_recommendation"
        | "hard_flags"
      production_decision: "pass" | "changes"
      reviewer_decision:
        | "recommend_approval"
        | "recommend_with_changes"
        | "not_ready"
      script_approval_status:
        | "draft"
        | "submitted"
        | "approved"
        | "superseded"
        | "changes_requested"
      script_shape: "spoken" | "copy_spec" | "caption" | "shot_list" | "none"
      task_status: "todo" | "in_progress" | "done" | "cancelled"
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
      ai_evaluation_type: ["script", "creative"],
      approval_decision: ["approved", "changes_requested"],
      assignment_role: ["production_assignee", "dm_owner"],
      change_category: ["production", "script_message", "other"],
      change_source: [
        "dm_review",
        "final_approval",
        "content_review",
        "production_review",
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
      creative_kind: ["image", "video", "carousel", "thumbnail", "other"],
      dm_decision: ["approved", "changes_requested"],
      final_decision: ["approved", "changes_requested", "rejected"],
      flag_action: ["resolved", "dismissed"],
      nepali_verification: ["not_needed", "pending", "verified"],
      override_kind: [
        "reviewer_quorum",
        "reviewer_threshold",
        "reviewer_recommendation",
        "hard_flags",
      ],
      production_decision: ["pass", "changes"],
      reviewer_decision: [
        "recommend_approval",
        "recommend_with_changes",
        "not_ready",
      ],
      script_approval_status: [
        "draft",
        "submitted",
        "approved",
        "superseded",
        "changes_requested",
      ],
      script_shape: ["spoken", "copy_spec", "caption", "shot_list", "none"],
      task_status: ["todo", "in_progress", "done", "cancelled"],
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

