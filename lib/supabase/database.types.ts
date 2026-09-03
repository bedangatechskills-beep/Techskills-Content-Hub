// Thin layer over the generated Supabase types. Regenerate the base file with
// `pnpm db:types` (needs local Supabase running); never edit database.generated.ts.
import type { Database, Enums, Tables } from "./database.generated";

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

// Phase 1
export type ContentPriority = Enums<"content_priority">;
export type ContentMedium = Enums<"content_medium">;
export type CommentSection = Enums<"comment_section">;
export type NepaliVerification = Enums<"nepali_verification">;

export type ContentRecordRow = Tables<"content_records">;
export type WorkflowStatusRow = Tables<"workflow_statuses">;
export type AllowedTransitionRow = Tables<"allowed_transitions">;
export type ActivityLogRow = Tables<"activity_log">;
export type StageHistoryRow = Tables<"stage_history">;
export type CommentRow = Tables<"comments">;
export type NotificationRow = Tables<"notifications">;
export type RegionRow = Tables<"regions">;
export type CampusRow = Tables<"campuses">;
export type ProgramRow = Tables<"programs">;
export type CampaignRow = Tables<"campaigns">;
export type PlatformRow = Tables<"platforms">;
export type ObjectiveRow = Tables<"objectives">;
export type ContentPillarRow = Tables<"content_pillars">;
export type DifferentiatorRow = Tables<"differentiators">;
export type ContentTypeRow = Tables<"content_types">;
export type ReferenceHandleRow = Tables<"reference_handles">;
export type BrandFactRow = Tables<"brand_facts">;
export type KanbanCardRow = Database["public"]["Views"]["v_kanban_cards"]["Row"];
export type StageDurationRow = Database["public"]["Views"]["v_stage_durations"]["Row"];

// Phase 2
export type ScriptApprovalStatus = Enums<"script_approval_status">;
export type ApprovalDecision = Enums<"approval_decision">;
export type FlagAction = Enums<"flag_action">;
export type ScriptVersionRow = Tables<"script_versions">;
export type ScriptApprovalRow = Tables<"script_approvals">;
export type AiEvaluationRow = Tables<"ai_evaluations">;
export type AiFlagResolutionRow = Tables<"ai_flag_resolutions">;
export type AppSettingRow = Tables<"app_settings">;
export type ScriptApprovalQueueRow = Database["public"]["Views"]["v_script_approval_queue"]["Row"];
export type ScriptAiLatestRow = Database["public"]["Views"]["v_script_ai_latest"]["Row"];

// Phase 3
export type TaskStatus = Enums<"task_status">;
export type CreativeKind = Enums<"creative_kind">;
export type ProductionDecision = Enums<"production_decision">;
export type ProductionTaskRow = Tables<"production_tasks">;
export type AssignmentRow = Tables<"assignments">;
export type CreativeVersionRow = Tables<"creative_versions">;
export type ProductionReviewRow = Tables<"production_reviews">;
export type WorkloadRow = Database["public"]["Views"]["v_workload"]["Row"];
export type UnassignedWorkRow = Database["public"]["Views"]["v_unassigned_work"]["Row"];
export type ActiveWorkRow = Database["public"]["Views"]["v_active_work"]["Row"];
export type DmStatsRow = Database["public"]["Views"]["v_dm_stats"]["Row"];
export type CeoStatsRow = Database["public"]["Views"]["v_ceo_stats"]["Row"];

// Phase 4
export type DmDecision = Enums<"dm_decision">;
export type ChangeSource = Enums<"change_source">;
export type ChangeCategory = Enums<"change_category">;
export type DmReviewRow = Tables<"dm_reviews">;
export type ChangeRequestRow = Tables<"change_requests">;
export type DmReviewQueueRow = Database["public"]["Views"]["v_dm_review_queue"]["Row"];
export type CreativeAiLatestRow = Database["public"]["Views"]["v_creative_ai_latest"]["Row"];

// Phase 5
export type ReviewerDecision = Enums<"reviewer_decision">;
export type OverrideKind = Enums<"override_kind">;
export type FinalDecision = Enums<"final_decision">;
export type ReviewerRatingRow = Tables<"reviewer_ratings">;
export type OverrideRow = Tables<"overrides">;
export type FinalApprovalRow = Tables<"final_approvals">;

// AI queue provider
export type AiRequestStatus = Enums<"ai_request_status">;
export type AiEvaluationRequestRow = Tables<"ai_evaluation_requests">;

// Phase 6
export type ScheduleRow = Tables<"schedules">;
export type PublishedLinkRow = Tables<"published_links">;
export type PublishConfirmationRow = Tables<"publish_confirmations">;
export type NotificationRuleRow = Tables<"notification_rules">;
export type PublishingQueueRow = Database["public"]["Views"]["v_publishing_queue"]["Row"];
export type PublishedLinkViewRow = Database["public"]["Views"]["v_published_links"]["Row"];
export type CalendarItemRow = Database["public"]["Views"]["v_calendar_items"]["Row"];
export type PipelineCountRow = Database["public"]["Views"]["v_pipeline_counts"]["Row"];
export type NeedsAttentionRow = Database["public"]["Views"]["v_needs_attention"]["Row"];
export type ContentMixRow = Database["public"]["Views"]["v_content_mix"]["Row"];
