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
