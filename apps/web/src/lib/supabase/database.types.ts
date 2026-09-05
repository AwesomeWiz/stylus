export type OrganizationRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
export type OrganizationInvitationStatus = "PENDING" | "ACCEPTED" | "REVOKED";
export type OrganizationPluginRow = {
  created_at: string;
  disabled_at: string | null;
  enabled: boolean;
  enabled_at: string | null;
  enabled_by: string | null;
  organization_id: string;
  plugin_id: string;
  updated_at: string;
  updated_by: string;
};
export type AIExecutionMode = "DISABLED" | "LOCAL_ONLY" | "REMOTE_ALLOWED";
export type AILogicalTierRecord = "FAST" | "BALANCED" | "REASONING";
export type AIRunStatus =
  "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "TIMED_OUT";
export type AIErrorCategoryRecord =
  | "provider_unavailable"
  | "authentication_failed"
  | "rate_limited"
  | "timeout"
  | "invalid_response"
  | "context_limit"
  | "budget_exceeded"
  | "policy_denied"
  | "cancelled"
  | "unknown";
export type JobStatus =
  | "QUEUED"
  | "SCHEDULED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCEL_REQUESTED"
  | "CANCELLED"
  | "TIMED_OUT"
  | "DEAD_LETTER";
export type JobExecutionClass = "DATABASE" | "SERVERLESS" | "EXTERNAL_WORKER";
export type JobErrorCategory =
  | "validation_failed"
  | "policy_denied"
  | "provider_unavailable"
  | "rate_limited"
  | "timeout"
  | "cancelled"
  | "transient_failure"
  | "permanent_failure"
  | "internal_error";
export type MemoryDomain = "company" | "marketing" | "agency";
export type MemoryKind =
  "FACT" | "DECISION" | "INSIGHT" | "PREFERENCE" | "NOTE";
export type MemoryProvenance = "HUMAN" | "PLUGIN" | "IMPORTED" | "SYSTEM";
export type CompanyStage =
  | "IDEA"
  | "VALIDATION"
  | "PRE_PRODUCT"
  | "MVP"
  | "BETA"
  | "LAUNCHED"
  | "GROWTH";
export type ProductStatus =
  | "CONCEPT"
  | "RESEARCHING"
  | "DESIGNING"
  | "BUILDING"
  | "TESTING"
  | "AVAILABLE";
export type BrandStatus = "UNDECIDED" | "EXPLORING" | "DEFINED";
export type MarketingObjective =
  | "AWARENESS"
  | "TRUST"
  | "AUTHORITY"
  | "AUDIENCE_GROWTH"
  | "COMMUNITY"
  | "WAITLIST"
  | "PRODUCT_EDUCATION"
  | "VALIDATION"
  | "FUTURE_DEMAND";
export type MarketingStage =
  | "NOT_STARTED"
  | "EXPERIMENTING"
  | "BUILDING_AUDIENCE"
  | "CONSISTENT"
  | "SCALING";
export type CompetitorType =
  "DIRECT" | "INDIRECT" | "ALTERNATIVE" | "INSPIRATION";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type NotificationType =
  "TASK_DUE_24H" | "TASK_DUE_1H" | "TASK_DEADLINE" | "BOARD_MENTION";
export type NotificationEntityType =
  "TASK" | "BOARD" | "KNOWLEDGE" | "MARKETING";
export type NotificationChannel = "IN_APP";
export type TaskReminderKind = "DUE_24H" | "DUE_1H" | "DEADLINE";
export type ActivityEventType =
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_ASSIGNED"
  | "TASK_COMPLETED"
  | "TASK_REOPENED"
  | "TASK_CANCELLED"
  | "TASK_COMMENTED"
  | "BOARD_COMMENTED"
  | "MEMORY_CREATED"
  | "MEMORY_UPDATED"
  | "MEMORY_ARCHIVED"
  | "MEMORY_RESTORED"
  | "MARKETING_RECORD_CREATED"
  | "MARKETING_RECORD_UPDATED"
  | "MARKETING_RECORD_ARCHIVED"
  | "MARKETING_RECORD_RESTORED";

export type MarketingReelIdeaStatus = "IDEA" | "DRAFT" | "READY";
export type MarketingCampaignStatus =
  "PLANNING" | "ACTIVE" | "PAUSED" | "COMPLETED";
export type MarketingResearchCategory =
  "CUSTOMER" | "COMPETITOR" | "TREND" | "CONTENT" | "OTHER";
export type MarketingBriefStatus = "DRAFT" | "READY" | "APPROVED";
export type MarketingPerformancePlatform = "INSTAGRAM";
export type MarketingPerformanceContentType = "REEL";
export type MarketingPerformanceSnapshotSource = "MANUAL";
export type MarketingPerformanceHorizon =
  "EARLY" | "SHORT_TERM" | "SEVEN_DAY" | "MATURE";
export type MarketingPerformanceMetric = "SAVE_RATE_BY_REACH";
export type MarketingPerformanceEvidenceStrength =
  "WEAK" | "MODERATE" | "STRONG";
export type MarketingPerformanceEvidenceRole = "BASELINE" | "SEGMENT";
export type MarketingAskCouncilMessageRole = "USER" | "ASSISTANT";
export type MarketingAskCouncilTurnStatus = "PENDING" | "SUCCEEDED" | "FAILED";
export type MarketingReelProcessingStatus =
  | "UPLOADING"
  | "UPLOADED"
  | "QUEUED"
  | "PROCESSING"
  | "ANALYZED"
  | "FAILED"
  | "CANCELLED";
export type MarketingReelAnalysisStatus =
  "QUEUED" | "PROCESSING" | "ANALYZED" | "FAILED" | "CANCELLED" | "BLOCKED";
export type MarketingCreativeCouncilStatus = "RUNNING" | "SUCCEEDED" | "FAILED";
export type MarketingCreativeCouncilStage =
  "HOOK" | "SCRIPT" | "CRITIQUE" | "COMPLETE";
export type MarketingCreativeCouncilStageStatus = "SUCCEEDED" | "FAILED";
export type MarketingStrategicReviewStatus = "RUNNING" | "SUCCEEDED" | "FAILED";
export type MarketingStrategicReviewStage =
  "AUDIENCE" | "BRAND" | "STRATEGY" | "CHALLENGE" | "JUDGE" | "COMPLETE";
export type MarketingStrategicReviewStageStatus = "SUCCEEDED" | "FAILED";
export type MarketingExternalResearchStatus =
  "QUEUED" | "RUNNING" | "SYNTHESIZING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
export type MarketingExternalResearchAdapter =
  | "hacker-news"
  | "rss-atom"
  | "reddit"
  | "fashion-editorial"
  | "social"
  | "web-discovery";
export type MarketingExternalResearchSourceStatus = "SUCCEEDED" | "FAILED";
export type MarketingExternalResearchSourceFailure =
  | "invalid_source"
  | "policy_denied"
  | "rate_limited"
  | "timeout"
  | "transient_failure"
  | "permanent_failure"
  | "invalid_content_type"
  | "oversized_response"
  | "malformed_source"
  | "no_results";

type MarketingAuditRow = {
  archived_at: string | null;
  created_at: string;
  created_by: string;
  id: string;
  organization_id: string;
  updated_at: string;
  updated_by: string;
};
export type MarketingCompetitorRow = MarketingAuditRow & {
  core_competitor_id: string | null;
  instagram_handle: string | null;
  instagram_profile_url: string | null;
  name: string;
  notes: string | null;
  website_url: string | null;
};
export type MarketingCompetitorSocialProfileRow = MarketingAuditRow & {
  canonical_url: string;
  marketing_competitor_id: string;
  native_account_id: string;
  platform: "INSTAGRAM" | "TIKTOK" | "YOUTUBE" | "PINTEREST";
  status:
    | "AVAILABLE"
    | "UNCONFIGURED"
    | "APPROVAL_REQUIRED"
    | "UNSUPPORTED_FOR_DISCOVERY"
    | "POLICY_DENIED";
};
export type MarketingCampaignRow = MarketingAuditRow & {
  ends_on: string | null;
  name: string;
  notes: string | null;
  objective: string;
  starts_on: string | null;
  status: MarketingCampaignStatus;
};
export type MarketingReelIdeaRow = MarketingAuditRow & {
  call_to_action: string | null;
  campaign_id: string | null;
  concept: string | null;
  content_angle: string | null;
  hook: string | null;
  notes: string | null;
  status: MarketingReelIdeaStatus;
  title: string;
};
export type MarketingResearchRow = MarketingAuditRow & {
  category: MarketingResearchCategory;
  content: string;
  source_label: string | null;
  source_url: string | null;
  title: string;
};
export type MarketingCreativeBriefRow = MarketingAuditRow & {
  call_to_action: string | null;
  campaign_id: string | null;
  core_message: string | null;
  notes: string | null;
  objective: string;
  status: MarketingBriefStatus;
  target_audience: string | null;
  title: string;
  tone_direction: string | null;
  visual_direction: string | null;
};
export type MarketingCompetitorReelRow = MarketingAuditRow & {
  average_scene_duration: number | null;
  cuts_per_minute: number | null;
  duration_seconds: number | null;
  extraction_version: string | null;
  frame_rate: number | null;
  height: number | null;
  marketing_competitor_id: string;
  original_filename: string | null;
  processing_status: MarketingReelProcessingStatus;
  scene_count: number | null;
  scene_timestamps: unknown;
  source_size_bytes: number;
  source_url: string | null;
  storage_path: string;
  width: number | null;
};
export type MarketingCompetitorReelTranscriptRow = {
  created_at: string;
  competitor_reel_id: string;
  duration_seconds: number;
  engine: string;
  id: string;
  language: string | null;
  model: string;
  organization_id: string;
  segments: unknown;
  text: string;
};
export type MarketingCompetitorReelAnalysisRow = {
  ai_run_id: string | null;
  analysis_version: number;
  competitor_reel_id: string;
  completed_at: string | null;
  created_at: string;
  created_by: string;
  error_category: string | null;
  extraction_version: string;
  id: string;
  job_id: string | null;
  organization_id: string;
  schema_version: string;
  status: MarketingReelAnalysisStatus;
  structured_result: unknown;
};
export type MarketingCreativeCouncilRunRow = {
  completed_at: string | null;
  context_snapshot: unknown;
  created_at: string;
  created_by: string;
  current_stage: MarketingCreativeCouncilStage;
  failed_stage: MarketingCreativeCouncilStage | null;
  failure_category: AIErrorCategoryRecord | null;
  id: string;
  idempotency_key: string;
  organization_id: string;
  source_reel_idea_id: string;
  status: MarketingCreativeCouncilStatus;
  workflow_version: string;
};
export type MarketingCreativeCouncilEvidenceRow = {
  analysis_id: string;
  council_run_id: string;
  created_at: string;
  ordinal: number;
  organization_id: string;
  projection: unknown;
};
export type MarketingCreativeCouncilStageRow = {
  ai_run_id: string | null;
  completed_at: string;
  council_run_id: string;
  created_at: string;
  failure_category: AIErrorCategoryRecord | null;
  id: string;
  organization_id: string;
  stage: MarketingCreativeCouncilStage;
  status: MarketingCreativeCouncilStageStatus;
  structured_output: unknown;
};
export type MarketingReelBriefVersionRow = {
  call_to_action: string;
  caption: string;
  council_run_id: string;
  created_at: string;
  created_by: string;
  critique: unknown;
  id: string;
  organization_id: string;
  primary_hook: string;
  schema_version: string;
  script_sections: unknown;
  source_reel_idea_id: string;
  spoken_script: string;
  title: string;
  version_number: number;
  visual_directions: unknown;
};
export type MarketingStrategicReviewRunRow = {
  completed_at: string | null;
  context_snapshot: unknown;
  created_at: string;
  created_by: string;
  current_stage: MarketingStrategicReviewStage;
  failed_stage: MarketingStrategicReviewStage | null;
  failure_category: AIErrorCategoryRecord | null;
  id: string;
  idempotency_key: string;
  organization_id: string;
  plugin_id: "marketing";
  schema_version: "strategic-council-review-v1";
  source_reel_brief_version_id: string;
  source_reel_idea_id: string;
  status: MarketingStrategicReviewStatus;
  workflow_version: "strategic-review-v1";
};
export type MarketingStrategicReviewStageRow = {
  ai_run_id: string | null;
  completed_at: string;
  created_at: string;
  failure_category: AIErrorCategoryRecord | null;
  id: string;
  organization_id: string;
  stage: MarketingStrategicReviewStage;
  status: MarketingStrategicReviewStageStatus;
  strategic_review_run_id: string;
  structured_output: unknown;
};
export type MarketingStrategicCouncilReviewVersionRow = {
  created_at: string;
  created_by: string;
  id: string;
  organization_id: string;
  schema_version: "strategic-council-review-v1";
  source_reel_brief_version_id: string;
  source_reel_idea_id: string;
  strategic_review_run_id: string;
  structured_review: unknown;
  version_number: number;
};
export type MarketingExternalResearchRunRow = {
  completed_at: string | null;
  created_at: string;
  created_by: string;
  dedupe_count: number;
  evidence_count: number;
  failed_source_count: number;
  failure_category: JobErrorCategory | null;
  failure_stage: "retrieval" | "synthesis" | "execution" | null;
  fetched_bytes: number;
  id: string;
  invocation_key: string;
  job_id: string;
  normalized_characters: number;
  organization_id: string;
  partial: boolean;
  request_snapshot: unknown;
  requested_source_count: number;
  retained_item_count: number;
  retrieved_item_count: number;
  started_at: string | null;
  status: MarketingExternalResearchStatus;
  successful_source_count: number;
  synthesis_ai_run_id: string | null;
  warning_categories: string[];
};
export type MarketingExternalResearchSourceRow = {
  adapter: MarketingExternalResearchAdapter;
  author: string | null;
  canonical_url: string | null;
  content_hash: string | null;
  created_at: string;
  failure_category: MarketingExternalResearchSourceFailure | null;
  fetched_at: string;
  id: string;
  native_id: string | null;
  organization_id: string;
  published_at: string | null;
  run_id: string;
  safe_metadata: Record<string, unknown>;
  source_key: string;
  status: MarketingExternalResearchSourceStatus;
  title: string | null;
};
export type MarketingExternalResearchEvidenceRow = {
  author: string | null;
  canonical_url: string | null;
  content_hash: string | null;
  created_at: string;
  evidence_id: string;
  evidence_type:
    | "DISCUSSION"
    | "FEED_ITEM"
    | "HN_STORY"
    | "HN_TEXT"
    | "HN_COMMENT"
    | "ARTICLE_CONTENT"
    | "REDDIT_POST"
    | "REDDIT_COMMENT"
    | "SOCIAL_POST"
    | "SOCIAL_VIDEO"
    | "SOCIAL_CAPTION"
    | "SOCIAL_COMMENT"
    | "SOCIAL_METADATA"
    | "WEB_PAGE";
  excerpt: string;
  fetched_at: string | null;
  id: string;
  native_id: string | null;
  organization_id: string;
  parent_native_id: string | null;
  published_at: string | null;
  run_id: string;
  safe_metadata: Record<string, unknown>;
  source_id: string;
  title: string | null;
};
export type MarketingExternalResearchReportRow = {
  created_at: string;
  created_by: string;
  id: string;
  organization_id: string;
  run_id: string;
  schema_version:
    | "marketing-external-research-report-v1"
    | "marketing-fashion-research-report-v1"
    | "marketing-fashion-social-research-report-v1"
    | "marketing-fashion-web-research-report-v1";
  structured_report: unknown;
  version_number: 1;
};
export type MarketingPublishedContentRow = {
  archived_at: string | null;
  canonical_url: string | null;
  content_opportunity_type: string | null;
  content_type: MarketingPerformanceContentType;
  created_at: string;
  created_by: string;
  duration_seconds: number | null;
  id: string;
  internal_label: string;
  organization_id: string;
  platform: MarketingPerformancePlatform;
  platform_native_id: string | null;
  published_at: string;
  source_reel_brief_version_id: string | null;
  updated_at: string;
  updated_by: string;
};
export type MarketingPerformanceSnapshotRow = {
  average_watch_time_seconds: number | null;
  comments: number | null;
  completion_rate: number | null;
  created_at: string;
  entered_by: string;
  follows: number | null;
  id: string;
  likes: number | null;
  link_clicks: number | null;
  notes: string | null;
  observed_at: string;
  organization_id: string;
  profile_visits: number | null;
  published_content_id: string;
  reach: number | null;
  saves: number | null;
  shares: number | null;
  source_label: string | null;
  source_type: MarketingPerformanceSnapshotSource;
  total_watch_time_seconds: number | null;
  views: number | null;
};
export type MarketingPerformanceLearningRow = {
  algorithm_version: "marketing-performance-learning-v1";
  baseline_sample_count: number;
  baseline_value: number;
  caveats: string[];
  comparison_dimension: "CONTENT_OPPORTUNITY_TYPE";
  content_type: MarketingPerformanceContentType;
  created_at: string;
  created_by: string;
  difference: number;
  evidence_strength: MarketingPerformanceEvidenceStrength;
  generation_key: string;
  id: string;
  metric: MarketingPerformanceMetric;
  observation_horizon: MarketingPerformanceHorizon;
  organization_id: string;
  platform: MarketingPerformancePlatform;
  sample_count: number;
  segment_value: number;
  subject_value: string;
  summary: string;
};
export type MarketingPerformanceLearningEvidenceRow = {
  created_at: string;
  evidence_role: MarketingPerformanceEvidenceRole;
  learning_id: string;
  organization_id: string;
  published_content_id: string;
  snapshot_id: string;
  source_reel_brief_version_id: string | null;
};
export type MarketingAskCouncilConversationRow = {
  archived_at: string | null;
  created_at: string;
  created_by: string;
  id: string;
  organization_id: string;
  title: string;
  updated_at: string;
  workflow_version: "marketing-ask-council-v1";
};
export type MarketingAskCouncilMessageRow = {
  ai_run_id: string | null;
  authored_by: string | null;
  content: string;
  conversation_id: string;
  created_at: string;
  id: string;
  organization_id: string;
  role: MarketingAskCouncilMessageRole;
  structured_output: unknown;
};
export type MarketingAskCouncilTurnRow = {
  assistant_message_id: string | null;
  completed_at: string | null;
  context_snapshot: unknown;
  context_version: "marketing-ask-council-context-v1";
  conversation_id: string;
  created_at: string;
  created_by: string;
  failed_specialist_id: string | null;
  failure_category: AIErrorCategoryRecord | null;
  id: string;
  idempotency_key: string;
  intent: string;
  organization_id: string;
  routing_version: "marketing-ask-council-routing-v1";
  schema_version: "marketing-ask-council-answer-v1";
  selected_specialists: string[];
  status: MarketingAskCouncilTurnStatus;
  user_message_id: string;
  workflow_version: "marketing-ask-council-v1";
};
export type MarketingAskCouncilSpecialistResultRow = {
  ai_run_id: string;
  created_at: string;
  id: string;
  ordinal: number;
  organization_id: string;
  specialist_id: string;
  structured_output: unknown;
  turn_id: string;
};
export type MarketingAskCouncilContextRefRow = {
  created_at: string;
  id: string;
  label: string;
  model_reference_id: string;
  organization_id: string;
  performance_learning_id: string | null;
  reel_brief_version_id: string | null;
  reference_type:
    | "RESEARCH_REPORT"
    | "RESEARCH_EVIDENCE"
    | "PERFORMANCE_LEARNING"
    | "REEL_BRIEF"
    | "STRATEGIC_REVIEW";
  research_evidence_id: string | null;
  research_report_id: string | null;
  snapshot: unknown;
  strategic_review_id: string | null;
  turn_id: string;
};
export type BoardElementType = "TEXT" | "STICKY" | "IMAGE" | "SHAPE" | "ARROW";

export type BoardRow = {
  archived_at: string | null;
  created_at: string;
  created_by: string;
  id: string;
  organization_id: string;
  title: string;
  updated_at: string;
  updated_by: string;
};

export type BoardElementRow = {
  archived_at: string | null;
  board_id: string;
  content: Record<string, unknown>;
  created_at: string;
  created_by: string;
  element_type: BoardElementType;
  height: number;
  id: string;
  metadata: Record<string, unknown>;
  organization_id: string;
  rotation: number;
  style: Record<string, unknown>;
  updated_at: string;
  updated_by: string;
  width: number;
  x: number;
  y: number;
  z_index: number;
};

export type BoardCommentRow = {
  archived_at: string | null;
  author_id: string;
  board_id: string;
  body: string;
  created_at: string;
  element_id: string | null;
  id: string;
  organization_id: string;
  parent_id: string | null;
  updated_at: string;
};

export type BoardCommentMentionRow = {
  board_id: string;
  comment_id: string;
  created_at: string;
  mentioned_user_id: string;
  organization_id: string;
};

export type OrganizationRow = {
  created_at: string;
  created_by: string;
  id: string;
  name: string;
  updated_at: string;
};

export type MembershipRow = {
  created_at: string;
  organization_id: string;
  role: OrganizationRole;
  removed_at: string | null;
  user_id: string;
};

export type OrganizationAIPolicyRow = {
  allowed_provider_ids: string[];
  created_at: string;
  default_tier: AILogicalTierRecord;
  execution_mode: AIExecutionMode;
  monthly_remote_cost_limit_usd: number | null;
  organization_id: string;
  updated_at: string;
  updated_by: string;
};

export type AIRunRow = {
  actor_id: string;
  capability: string;
  completed_at: string | null;
  duration_ms: number | null;
  error_category: AIErrorCategoryRecord | null;
  estimated_cost_usd: number | null;
  id: string;
  input_tokens: number | null;
  is_remote: boolean | null;
  memory_domains: string[];
  operation: string;
  organization_id: string;
  output_tokens: number | null;
  parent_run_id: string | null;
  plugin_id: string | null;
  provider_id: string | null;
  requested_tier: AILogicalTierRecord;
  selected_model_id: string | null;
  started_at: string;
  status: AIRunStatus;
  total_tokens: number | null;
  trace_metadata: Record<string, unknown>;
};

export type KnowledgeMemoryRow = {
  archived_at: string | null;
  archived_by: string | null;
  content: string;
  created_at: string;
  created_by: string | null;
  domain: MemoryDomain;
  effective_at: string | null;
  id: string;
  kind: MemoryKind;
  metadata: Record<string, unknown>;
  organization_id: string;
  plugin_id: string | null;
  provenance: MemoryProvenance;
  search_vector: string;
  source_reference: string | null;
  title: string;
  updated_at: string;
  updated_by: string | null;
};

export type JobRow = {
  attempt_count: number;
  cancellation_requested_at: string | null;
  cancelled_at: string | null;
  capability: string;
  claimant_id: string | null;
  completed_at: string | null;
  concurrency_group: string | null;
  created_at: string;
  created_by: string;
  duration_ms: number | null;
  error_category: JobErrorCategory | null;
  execution_class: JobExecutionClass;
  heartbeat_at: string | null;
  id: string;
  idempotency_key: string | null;
  input_metadata: Record<string, unknown>;
  job_type: string;
  lease_expires_at: string | null;
  max_attempts: number;
  next_attempt_at: string;
  organization_id: string;
  parent_job_id: string | null;
  plugin_id: string | null;
  priority: number;
  progress: number;
  progress_message: string | null;
  progress_updated_at: string | null;
  result_metadata: Record<string, unknown> | null;
  scheduled_at: string;
  started_at: string | null;
  status: JobStatus;
  timeout_seconds: number;
};

export type JobDefinitionRow = {
  capability: string;
  concurrency_group: string | null;
  execution_class: JobExecutionClass;
  idempotency_mode: "NONE" | "OPTIONAL" | "REQUIRED";
  job_type: string;
  max_attempts: number;
  plugin_id: string | null;
  priority: number;
  timeout_seconds: number;
};

export type OrganizationInvitationRow = {
  accepted_at: string | null;
  accepted_by: string | null;
  created_at: string;
  email: string;
  expires_at: string;
  id: string;
  invited_by: string;
  organization_id: string;
  revoked_at: string | null;
  role: OrganizationRole;
  status: OrganizationInvitationStatus;
  token_hash: string;
  updated_at: string;
};

export type OrganizationTeamMember = {
  created_at: string;
  display_name: string;
  email: string;
  member_user_id: string;
  role: OrganizationRole;
};

export type OrganizationInvitationSummary = Pick<
  OrganizationInvitationRow,
  | "accepted_at"
  | "created_at"
  | "email"
  | "expires_at"
  | "id"
  | "role"
  | "status"
> & { inviter_name: string };

export type OrganizationInvitationPreview = {
  expires_at: string;
  organization_name: string;
  role: OrganizationRole;
};

export type CompanyProfileRow = {
  affected_audience: string | null;
  company_name: string;
  core_capabilities: string[];
  core_insight: string | null;
  created_at: string;
  created_by: string;
  current_alternatives: string[];
  desired_perception: string | null;
  differentiators: string[];
  industry: string;
  instagram: string | null;
  key_promise: string | null;
  near_term_objective: string | null;
  organization_id: string;
  positioning_category: string | null;
  positioning_difference: string | null;
  primary_market: string | null;
  problem_importance: string | null;
  problem_statement: string | null;
  product_concept: string | null;
  product_status: ProductStatus | null;
  reasons_to_believe: string[];
  short_description: string;
  stage: CompanyStage;
  startup_idea: string | null;
  status_quo: string | null;
  updated_at: string;
  updated_by: string;
  value_proposition: string | null;
  website: string | null;
};

export type AudienceProfileRow = {
  attention_channels: string[];
  characteristics: string[];
  created_at: string;
  created_by: string;
  description: string;
  goals: string[];
  id: string;
  is_primary: boolean;
  motivations: string[];
  name: string;
  objections: string[];
  organization_id: string;
  pain_points: string[];
  updated_at: string;
  updated_by: string;
};

export type BrandProfileRow = {
  avoid: string[];
  communication_traits: string[];
  created_at: string;
  created_by: string;
  desired_emotions: string[];
  emphasize: string[];
  organization_id: string;
  personality_traits: string[];
  primary_colors: string[];
  status: BrandStatus;
  tone_of_voice: string[];
  updated_at: string;
  updated_by: string;
  visual_direction: string | null;
};

export type MarketingProfileRow = {
  content_focus: string[];
  created_at: string;
  created_by: string;
  desired_audience_action: string | null;
  notes: string | null;
  organization_id: string;
  primary_channels: string[];
  primary_objective: MarketingObjective;
  secondary_objectives: MarketingObjective[];
  stage: MarketingStage;
  updated_at: string;
  updated_by: string;
};

export type CompetitorRow = {
  archived_at: string | null;
  created_at: string;
  created_by: string;
  id: string;
  instagram: string | null;
  name: string;
  organization_id: string;
  relevance: string | null;
  short_description: string | null;
  type: CompetitorType;
  updated_at: string;
  updated_by: string;
  website: string | null;
};

export type OnboardingProgressRow = {
  completed_at: string | null;
  created_at: string;
  current_step: number;
  organization_id: string;
  started_by: string;
  updated_at: string;
  updated_by: string;
};

export type TaskRow = {
  assignee_id: string | null;
  completed_at: string | null;
  created_at: string;
  created_by: string;
  description: string | null;
  due_at: string | null;
  id: string;
  organization_id: string;
  priority: TaskPriority;
  scheduled_at: string | null;
  status: TaskStatus;
  title: string;
  updated_at: string;
  updated_by: string;
};

export type TaskCommentRow = {
  body: string;
  created_at: string;
  created_by: string;
  id: string;
  organization_id: string;
  task_id: string;
};

export type NotificationRow = {
  body: string;
  created_at: string;
  entity_id: string | null;
  entity_type: NotificationEntityType | null;
  id: string;
  organization_id: string;
  read_at: string | null;
  recipient_id: string;
  title: string;
  type: NotificationType;
};

export type ActivityEventRow = {
  actor_id: string;
  created_at: string;
  entity_id: string;
  entity_type: NotificationEntityType;
  event_type: ActivityEventType;
  id: string;
  metadata: Record<string, unknown>;
  organization_id: string;
};

export type TaskReminderDeliveryRow = {
  channel: NotificationChannel;
  deadline_at: string;
  id: string;
  notification_id: string | null;
  organization_id: string;
  processed_at: string;
  recipient_id: string;
  reminder_kind: TaskReminderKind;
  task_id: string;
};

export type TaskMember = {
  display_name: string;
  member_user_id: string;
  role: OrganizationRole;
};

type AuditedInsert = {
  created_by: string;
  organization_id: string;
  updated_by: string;
};

type MarketingInsert<T extends MarketingAuditRow> = Omit<
  T,
  "archived_at" | "created_at" | "id" | "updated_at"
> &
  Partial<Pick<T, "archived_at" | "id">>;
type MarketingUpdate<T extends MarketingAuditRow> = Partial<
  Omit<T, "created_at" | "created_by" | "id" | "organization_id">
>;

export type Database = {
  public: {
    Tables: {
      activity_events: {
        Row: ActivityEventRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      ai_runs: {
        Row: AIRunRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      audience_profiles: {
        Row: AudienceProfileRow;
        Insert: AuditedInsert &
          Pick<AudienceProfileRow, "description" | "is_primary" | "name"> &
          Partial<
            Pick<
              AudienceProfileRow,
              | "attention_channels"
              | "characteristics"
              | "goals"
              | "id"
              | "motivations"
              | "objections"
              | "pain_points"
            >
          >;
        Update: Partial<AudienceProfileRow>;
        Relationships: [];
      };
      board_elements: {
        Row: BoardElementRow;
        Insert: Pick<
          BoardElementRow,
          | "board_id"
          | "content"
          | "created_by"
          | "element_type"
          | "height"
          | "metadata"
          | "organization_id"
          | "style"
          | "updated_by"
          | "width"
          | "x"
          | "y"
          | "z_index"
        > &
          Partial<Pick<BoardElementRow, "id" | "rotation">>;
        Update: Partial<
          Pick<
            BoardElementRow,
            | "archived_at"
            | "content"
            | "height"
            | "metadata"
            | "rotation"
            | "style"
            | "updated_by"
            | "width"
            | "x"
            | "y"
            | "z_index"
          >
        >;
        Relationships: [];
      };
      board_comments: {
        Row: BoardCommentRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      board_comment_mentions: {
        Row: BoardCommentMentionRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      boards: {
        Row: BoardRow;
        Insert: Pick<
          BoardRow,
          "created_by" | "organization_id" | "title" | "updated_by"
        > &
          Partial<Pick<BoardRow, "id">>;
        Update: Partial<Pick<BoardRow, "archived_at" | "title" | "updated_by">>;
        Relationships: [];
      };
      brand_profiles: {
        Row: BrandProfileRow;
        Insert: AuditedInsert &
          Partial<
            Omit<
              BrandProfileRow,
              keyof AuditedInsert | "created_at" | "updated_at"
            >
          >;
        Update: Partial<BrandProfileRow>;
        Relationships: [];
      };
      company_profiles: {
        Row: CompanyProfileRow;
        Insert: AuditedInsert &
          Pick<
            CompanyProfileRow,
            "company_name" | "industry" | "short_description" | "stage"
          > &
          Partial<
            Omit<
              CompanyProfileRow,
              | keyof AuditedInsert
              | "company_name"
              | "industry"
              | "short_description"
              | "stage"
              | "created_at"
              | "updated_at"
            >
          >;
        Update: Partial<CompanyProfileRow>;
        Relationships: [];
      };
      competitors: {
        Row: CompetitorRow;
        Insert: AuditedInsert &
          Pick<CompetitorRow, "name" | "type"> &
          Partial<
            Omit<
              CompetitorRow,
              | keyof AuditedInsert
              | "name"
              | "type"
              | "created_at"
              | "updated_at"
            >
          >;
        Update: Partial<CompetitorRow>;
        Relationships: [];
      };
      knowledge_memories: {
        Row: KnowledgeMemoryRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      jobs: {
        Row: JobRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      job_definitions: {
        Row: JobDefinitionRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      memberships: {
        Row: MembershipRow;
        Insert: {
          created_at?: string;
          organization_id: string;
          role?: OrganizationRole;
          removed_at?: string | null;
          user_id: string;
        };
        Update: {
          role?: OrganizationRole;
          removed_at?: string | null;
        };
        Relationships: [];
      };
      marketing_competitors: {
        Row: MarketingCompetitorRow;
        Insert: MarketingInsert<MarketingCompetitorRow>;
        Update: MarketingUpdate<MarketingCompetitorRow>;
        Relationships: [];
      };
      marketing_competitor_social_profiles: {
        Row: MarketingCompetitorSocialProfileRow;
        Insert: MarketingInsert<MarketingCompetitorSocialProfileRow>;
        Update: MarketingUpdate<MarketingCompetitorSocialProfileRow>;
        Relationships: [];
      };
      marketing_campaigns: {
        Row: MarketingCampaignRow;
        Insert: MarketingInsert<MarketingCampaignRow>;
        Update: MarketingUpdate<MarketingCampaignRow>;
        Relationships: [];
      };
      marketing_reel_ideas: {
        Row: MarketingReelIdeaRow;
        Insert: MarketingInsert<MarketingReelIdeaRow>;
        Update: MarketingUpdate<MarketingReelIdeaRow>;
        Relationships: [];
      };
      marketing_research: {
        Row: MarketingResearchRow;
        Insert: MarketingInsert<MarketingResearchRow>;
        Update: MarketingUpdate<MarketingResearchRow>;
        Relationships: [];
      };
      marketing_creative_briefs: {
        Row: MarketingCreativeBriefRow;
        Insert: MarketingInsert<MarketingCreativeBriefRow>;
        Update: MarketingUpdate<MarketingCreativeBriefRow>;
        Relationships: [];
      };
      marketing_competitor_reels: {
        Row: MarketingCompetitorReelRow;
        Insert: MarketingInsert<MarketingCompetitorReelRow>;
        Update: MarketingUpdate<MarketingCompetitorReelRow>;
        Relationships: [];
      };
      marketing_competitor_reel_transcripts: {
        Row: MarketingCompetitorReelTranscriptRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      marketing_competitor_reel_analyses: {
        Row: MarketingCompetitorReelAnalysisRow;
        Insert: never;
        Update: Partial<MarketingCompetitorReelAnalysisRow>;
        Relationships: [];
      };
      marketing_creative_council_runs: {
        Row: MarketingCreativeCouncilRunRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      marketing_creative_council_evidence: {
        Row: MarketingCreativeCouncilEvidenceRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      marketing_creative_council_stages: {
        Row: MarketingCreativeCouncilStageRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      marketing_reel_brief_versions: {
        Row: MarketingReelBriefVersionRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      marketing_strategic_review_runs: {
        Row: MarketingStrategicReviewRunRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      marketing_strategic_review_stages: {
        Row: MarketingStrategicReviewStageRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      marketing_strategic_council_review_versions: {
        Row: MarketingStrategicCouncilReviewVersionRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      marketing_external_research_runs: {
        Row: MarketingExternalResearchRunRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      marketing_external_research_sources: {
        Row: MarketingExternalResearchSourceRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      marketing_external_research_evidence: {
        Row: MarketingExternalResearchEvidenceRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      marketing_external_research_reports: {
        Row: MarketingExternalResearchReportRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      marketing_published_content: {
        Row: MarketingPublishedContentRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      marketing_performance_snapshots: {
        Row: MarketingPerformanceSnapshotRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      marketing_performance_learnings: {
        Row: MarketingPerformanceLearningRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      marketing_performance_learning_evidence: {
        Row: MarketingPerformanceLearningEvidenceRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      marketing_ask_council_conversations: {
        Row: MarketingAskCouncilConversationRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      marketing_ask_council_messages: {
        Row: MarketingAskCouncilMessageRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      marketing_ask_council_turns: {
        Row: MarketingAskCouncilTurnRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      marketing_ask_council_specialist_results: {
        Row: MarketingAskCouncilSpecialistResultRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      marketing_ask_council_context_refs: {
        Row: MarketingAskCouncilContextRefRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      organization_invitations: {
        Row: OrganizationInvitationRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      organization_ai_policies: {
        Row: OrganizationAIPolicyRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      organization_plugins: {
        Row: OrganizationPluginRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      notifications: {
        Row: NotificationRow;
        Insert: never;
        Update: Pick<NotificationRow, "read_at">;
        Relationships: [];
      };
      marketing_profiles: {
        Row: MarketingProfileRow;
        Insert: AuditedInsert &
          Pick<MarketingProfileRow, "primary_objective"> &
          Partial<
            Omit<
              MarketingProfileRow,
              | keyof AuditedInsert
              | "primary_objective"
              | "created_at"
              | "updated_at"
            >
          >;
        Update: Partial<MarketingProfileRow>;
        Relationships: [];
      };
      onboarding_progress: {
        Row: OnboardingProgressRow;
        Insert: Pick<
          OnboardingProgressRow,
          "organization_id" | "started_by" | "updated_by"
        > &
          Partial<Pick<OnboardingProgressRow, "completed_at" | "current_step">>;
        Update: Partial<OnboardingProgressRow>;
        Relationships: [];
      };
      organizations: {
        Row: OrganizationRow;
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_comments: {
        Row: TaskCommentRow;
        Insert: Pick<
          TaskCommentRow,
          "body" | "created_by" | "organization_id" | "task_id"
        > &
          Partial<Pick<TaskCommentRow, "id">>;
        Update: never;
        Relationships: [];
      };
      task_reminder_deliveries: {
        Row: TaskReminderDeliveryRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      tasks: {
        Row: TaskRow;
        Insert: Pick<
          TaskRow,
          "created_by" | "organization_id" | "title" | "updated_by"
        > &
          Partial<
            Pick<
              TaskRow,
              | "assignee_id"
              | "description"
              | "due_at"
              | "priority"
              | "scheduled_at"
              | "status"
            >
          >;
        Update: Partial<
          Pick<
            TaskRow,
            | "assignee_id"
            | "description"
            | "due_at"
            | "priority"
            | "scheduled_at"
            | "status"
            | "title"
            | "updated_by"
          >
        >;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      delete_owned_organization: {
        Args: {
          p_confirmation_name: string;
          p_organization_id: string;
        };
        Returns: undefined;
      };
      register_marketing_published_content: {
        Args: {
          p_canonical_url?: string | null;
          p_content_opportunity_type?: string | null;
          p_duration_seconds?: number | null;
          p_internal_label: string;
          p_organization_id: string;
          p_platform_native_id?: string | null;
          p_published_at: string;
          p_source_reel_brief_version_id?: string | null;
        };
        Returns: MarketingPublishedContentRow;
      };
      set_marketing_published_content_archived: {
        Args: {
          p_archived: boolean;
          p_content_id: string;
          p_organization_id: string;
        };
        Returns: MarketingPublishedContentRow;
      };
      add_marketing_performance_snapshot: {
        Args: {
          p_average_watch_time_seconds?: number | null;
          p_comments?: number | null;
          p_completion_rate?: number | null;
          p_follows?: number | null;
          p_likes?: number | null;
          p_link_clicks?: number | null;
          p_notes?: string | null;
          p_observed_at: string;
          p_organization_id: string;
          p_profile_visits?: number | null;
          p_published_content_id: string;
          p_reach?: number | null;
          p_saves?: number | null;
          p_shares?: number | null;
          p_source_label?: string | null;
          p_total_watch_time_seconds?: number | null;
          p_views?: number | null;
        };
        Returns: MarketingPerformanceSnapshotRow;
      };
      create_marketing_performance_learning: {
        Args: {
          p_actor_id: string;
          p_caveats: string[];
          p_content_type: MarketingPerformanceContentType;
          p_evidence: unknown[];
          p_horizon: MarketingPerformanceHorizon;
          p_metric: MarketingPerformanceMetric;
          p_organization_id: string;
          p_platform: MarketingPerformancePlatform;
          p_subject_value: string;
          p_summary: string;
        };
        Returns: string | null;
      };
      start_marketing_ask_council_turn: {
        Args: {
          p_actor_id: string;
          p_context_refs: unknown[];
          p_context_snapshot: Record<string, unknown>;
          p_conversation_id: string | null;
          p_idempotency_key: string;
          p_intent: string;
          p_organization_id: string;
          p_question: string;
          p_selected_specialists: string[];
        };
        Returns: unknown;
      };
      record_marketing_ask_council_specialist: {
        Args: {
          p_actor_id: string;
          p_ai_run_id: string;
          p_ordinal: number;
          p_organization_id: string;
          p_specialist_id: string;
          p_structured_output: Record<string, unknown>;
          p_turn_id: string;
        };
        Returns: undefined;
      };
      complete_marketing_ask_council_turn: {
        Args: {
          p_actor_id: string;
          p_ai_run_id: string;
          p_answer: Record<string, unknown>;
          p_organization_id: string;
          p_turn_id: string;
        };
        Returns: unknown;
      };
      fail_marketing_ask_council_turn: {
        Args: {
          p_actor_id: string;
          p_ai_run_id?: string | null;
          p_failed_specialist_id?: string | null;
          p_failure_category: AIErrorCategoryRecord;
          p_organization_id: string;
          p_turn_id: string;
        };
        Returns: undefined;
      };
      set_marketing_ask_council_conversation_archived: {
        Args: {
          p_archived: boolean;
          p_conversation_id: string;
          p_organization_id: string;
        };
        Returns: MarketingAskCouncilConversationRow;
      };
      start_marketing_creative_council_run: {
        Args: {
          p_actor_id: string;
          p_context_snapshot: Record<string, unknown>;
          p_evidence: unknown[];
          p_idempotency_key: string;
          p_organization_id: string;
          p_source_reel_idea_id: string;
        };
        Returns: unknown;
      };
      record_marketing_creative_council_stage: {
        Args: {
          p_actor_id: string;
          p_ai_run_id: string;
          p_organization_id: string;
          p_run_id: string;
          p_stage: MarketingCreativeCouncilStage;
          p_structured_output: Record<string, unknown>;
        };
        Returns: undefined;
      };
      complete_marketing_creative_council_run: {
        Args: {
          p_actor_id: string;
          p_ai_run_id: string;
          p_critique: Record<string, unknown>;
          p_organization_id: string;
          p_run_id: string;
        };
        Returns: unknown;
      };
      fail_marketing_creative_council_run: {
        Args: {
          p_actor_id: string;
          p_ai_run_id: string | null;
          p_failure_category: AIErrorCategoryRecord;
          p_organization_id: string;
          p_run_id: string;
          p_stage: MarketingCreativeCouncilStage;
        };
        Returns: undefined;
      };
      start_marketing_strategic_review: {
        Args: {
          p_actor_id: string;
          p_context_snapshot: Record<string, unknown>;
          p_idempotency_key: string;
          p_organization_id: string;
          p_source_reel_brief_version_id: string;
        };
        Returns: unknown;
      };
      record_marketing_strategic_review_stage: {
        Args: {
          p_actor_id: string;
          p_ai_run_id: string;
          p_organization_id: string;
          p_run_id: string;
          p_stage: MarketingStrategicReviewStage;
          p_structured_output: Record<string, unknown>;
        };
        Returns: undefined;
      };
      complete_marketing_strategic_review: {
        Args: {
          p_actor_id: string;
          p_ai_run_id: string;
          p_organization_id: string;
          p_review: Record<string, unknown>;
          p_run_id: string;
        };
        Returns: unknown;
      };
      fail_marketing_strategic_review: {
        Args: {
          p_actor_id: string;
          p_ai_run_id: string | null;
          p_failure_category: AIErrorCategoryRecord;
          p_organization_id: string;
          p_run_id: string;
          p_stage: MarketingStrategicReviewStage;
        };
        Returns: undefined;
      };
      enqueue_competitor_reel_analysis: {
        Args: { p_organization_id: string; p_reel_id: string };
        Returns: MarketingCompetitorReelAnalysisRow;
      };
      worker_authorize_reel_media: {
        Args: { p_credential: string; p_job_id: string };
        Returns: Record<string, unknown>;
      };
      worker_persist_reel_extraction: {
        Args: {
          p_credential: string;
          p_job_id: string;
          p_payload: Record<string, unknown>;
        };
        Returns: Record<string, unknown>;
      };
      start_marketing_reel_ai_run: {
        Args: {
          p_capability: string;
          p_id: string;
          p_job_id: string;
          p_operation: string;
          p_requested_tier: AILogicalTierRecord;
          p_trace_metadata: Record<string, unknown>;
        };
        Returns: AIRunRow;
      };
      complete_marketing_reel_ai_run: {
        Args: {
          p_duration_ms: number;
          p_error_category: AIErrorCategoryRecord | null;
          p_estimated_cost_usd: number | null;
          p_id: string;
          p_input_tokens: number | null;
          p_is_remote: boolean | null;
          p_job_id: string;
          p_output_tokens: number | null;
          p_provider_id: string | null;
          p_selected_model_id: string | null;
          p_status: AIRunStatus;
          p_total_tokens: number | null;
          p_trace_metadata: Record<string, unknown>;
        };
        Returns: AIRunRow;
      };
      enqueue_marketing_external_research: {
        Args: {
          p_actor_id: string;
          p_invocation_key: string;
          p_organization_id: string;
          p_request_snapshot: Record<string, unknown>;
        };
        Returns: unknown;
      };
      begin_marketing_external_research: {
        Args: { p_job_id: string; p_run_id: string };
        Returns: undefined;
      };
      record_marketing_external_research_retrieval: {
        Args: {
          p_dedupe_count: number;
          p_evidence: unknown[];
          p_fetched_bytes: number;
          p_job_id: string;
          p_normalized_characters: number;
          p_partial: boolean;
          p_retrieved_count: number;
          p_run_id: string;
          p_sources: unknown[];
          p_warning_categories: string[];
        };
        Returns: undefined;
      };
      start_marketing_external_research_ai_run: {
        Args: {
          p_capability: string;
          p_id: string;
          p_job_id: string;
          p_operation: string;
          p_requested_tier: AILogicalTierRecord;
          p_trace_metadata: Record<string, unknown>;
        };
        Returns: AIRunRow;
      };
      complete_marketing_external_research_ai_run: {
        Args: {
          p_duration_ms: number;
          p_error_category: AIErrorCategoryRecord | null;
          p_estimated_cost_usd: number | null;
          p_id: string;
          p_input_tokens: number | null;
          p_is_remote: boolean | null;
          p_job_id: string;
          p_output_tokens: number | null;
          p_provider_id: string | null;
          p_selected_model_id: string | null;
          p_status: AIRunStatus;
          p_total_tokens: number | null;
          p_trace_metadata: Record<string, unknown>;
        };
        Returns: AIRunRow;
      };
      complete_marketing_external_research: {
        Args: {
          p_ai_run_id: string;
          p_job_id: string;
          p_report: Record<string, unknown>;
          p_run_id: string;
        };
        Returns: string;
      };
      fail_marketing_external_research: {
        Args: {
          p_failure_category: JobErrorCategory;
          p_failure_stage: "retrieval" | "synthesis" | "execution";
          p_job_id: string;
          p_run_id: string;
        };
        Returns: undefined;
      };
      claim_next_job: {
        Args: {
          p_execution_class: JobExecutionClass;
          p_executor_id: string;
          p_lease_seconds?: number;
        };
        Returns: JobRow | null;
      };
      claim_serverless_job: {
        Args: {
          p_executor_id: string;
          p_job_id: string;
          p_lease_seconds?: number;
        };
        Returns: JobRow | null;
      };
      heartbeat_job: {
        Args: {
          p_executor_id: string;
          p_job_id: string;
          p_lease_seconds?: number;
        };
        Returns: JobRow;
      };
      report_job_progress: {
        Args: {
          p_executor_id: string;
          p_job_id: string;
          p_message: string;
          p_progress: number;
        };
        Returns: JobRow;
      };
      complete_job: {
        Args: {
          p_executor_id: string;
          p_job_id: string;
          p_result_metadata: Record<string, unknown>;
        };
        Returns: JobRow;
      };
      report_job_failure: {
        Args: {
          p_error_category: JobErrorCategory;
          p_executor_id: string;
          p_job_id: string;
          p_retryable: boolean;
        };
        Returns: JobRow;
      };
      accept_organization_invitation: {
        Args: { p_token: string };
        Returns: string;
      };
      create_organization_invitation: {
        Args: {
          p_email: string;
          p_expires_at: string;
          p_organization_id: string;
          p_role: OrganizationRole;
          p_token_hash: string;
        };
        Returns: string;
      };
      archive_board_comment: {
        Args: { p_comment_id: string };
        Returns: BoardCommentRow;
      };
      advance_onboarding_progress: {
        Args: {
          p_completed_step: number;
          p_organization_id: string;
        };
        Returns: number;
      };
      create_organization: {
        Args: { p_name: string };
        Returns: OrganizationRow;
      };
      create_worker_pairing: {
        Args: {
          p_name: string;
          p_organization_id: string;
          p_token_hash_hex: string;
        };
        Returns: string;
      };
      list_organization_workers: {
        Args: { p_organization_id: string };
        Returns: Array<{
          advertised_capabilities: string[];
          authorized_capabilities: string[];
          created_at: string;
          id: string;
          last_seen_at: string | null;
          name: string;
          platform: string;
          revoked_at: string | null;
          version: string | null;
        }>;
      };
      pair_windows_worker: {
        Args: {
          p_capabilities: string[];
          p_platform: string;
          p_token: string;
          p_version: string;
        };
        Returns: Record<string, unknown>;
      };
      revoke_worker: {
        Args: { p_organization_id: string; p_worker_id: string };
        Returns: undefined;
      };
      worker_claim_job: {
        Args: { p_capabilities: string[]; p_credential: string };
        Returns: JobRow | null;
      };
      worker_heartbeat: {
        Args: {
          p_capabilities: string[];
          p_credential: string;
          p_version: string;
        };
        Returns: Record<string, unknown>;
      };
      worker_job_operation: {
        Args: {
          p_credential: string;
          p_job_id: string;
          p_operation: string;
          p_payload?: Record<string, unknown>;
        };
        Returns: JobRow;
      };
      enqueue_job: {
        Args: {
          p_capability: string;
          p_concurrency_group: string | null;
          p_execution_class: JobExecutionClass;
          p_idempotency_key: string | null;
          p_input_metadata: Record<string, unknown>;
          p_job_type: string;
          p_max_attempts: number;
          p_organization_id: string;
          p_plugin_id: string | null;
          p_priority: number;
          p_scheduled_at: string | null;
          p_timeout_seconds: number;
        };
        Returns: JobRow;
      };
      complete_ai_run: {
        Args: {
          p_duration_ms: number;
          p_error_category: AIErrorCategoryRecord | null;
          p_estimated_cost_usd: number | null;
          p_id: string;
          p_input_tokens: number | null;
          p_is_remote: boolean | null;
          p_organization_id: string;
          p_output_tokens: number | null;
          p_provider_id: string | null;
          p_selected_model_id: string | null;
          p_status: AIRunStatus;
          p_total_tokens: number | null;
          p_trace_metadata: Record<string, unknown>;
        };
        Returns: AIRunRow;
      };
      create_board_comment: {
        Args: {
          p_board_id: string;
          p_body: string;
          p_element_id: string | null;
          p_mentioned_user_ids?: string[];
          p_parent_id: string | null;
        };
        Returns: BoardCommentRow;
      };
      list_organization_task_members: {
        Args: { p_organization_id: string };
        Returns: TaskMember[];
      };
      list_organization_invitations: {
        Args: { p_organization_id: string };
        Returns: OrganizationInvitationSummary[];
      };
      get_organization_ai_remote_spend: {
        Args: { p_organization_id: string; p_since: string };
        Returns: number;
      };
      list_organization_team: {
        Args: { p_organization_id: string };
        Returns: OrganizationTeamMember[];
      };
      create_company_memory: {
        Args: {
          p_content: string;
          p_effective_at?: string | null;
          p_kind: MemoryKind;
          p_organization_id: string;
          p_source_reference?: string | null;
          p_title: string;
        };
        Returns: KnowledgeMemoryRow;
      };
      search_company_memories: {
        Args: {
          p_include_archived?: boolean;
          p_kinds?: MemoryKind[] | null;
          p_limit?: number;
          p_organization_id: string;
          p_provenance?: MemoryProvenance[] | null;
          p_search?: string | null;
        };
        Returns: KnowledgeMemoryRow[];
      };
      set_company_memory_archived: {
        Args: {
          p_archived: boolean;
          p_memory_id: string;
          p_organization_id: string;
        };
        Returns: KnowledgeMemoryRow;
      };
      update_company_memory: {
        Args: {
          p_content: string;
          p_effective_at?: string | null;
          p_kind: MemoryKind;
          p_memory_id: string;
          p_organization_id: string;
          p_source_reference?: string | null;
          p_title: string;
        };
        Returns: KnowledgeMemoryRow;
      };
      mark_all_notifications_read: {
        Args: { p_organization_id: string };
        Returns: number;
      };
      mark_notification_read: {
        Args: { p_notification_id: string; p_organization_id: string };
        Returns: boolean;
      };
      process_task_reminders: {
        Args: { p_now?: string };
        Returns: number;
      };
      preview_organization_invitation: {
        Args: { p_token: string };
        Returns: OrganizationInvitationPreview[];
      };
      regenerate_organization_invitation: {
        Args: {
          p_expires_at: string;
          p_invitation_id: string;
          p_organization_id: string;
          p_token_hash: string;
        };
        Returns: string;
      };
      remove_organization_member: {
        Args: { p_organization_id: string; p_user_id: string };
        Returns: boolean;
      };
      request_job_cancellation: {
        Args: { p_job_id: string; p_organization_id: string };
        Returns: JobRow;
      };
      retry_job: {
        Args: { p_job_id: string; p_organization_id: string };
        Returns: JobRow;
      };
      set_organization_plugin_enabled: {
        Args: {
          p_enabled: boolean;
          p_organization_id: string;
          p_plugin_id: string;
        };
        Returns: OrganizationPluginRow;
      };
      set_organization_ai_policy: {
        Args: {
          p_allowed_provider_ids: string[];
          p_default_tier: AILogicalTierRecord;
          p_execution_mode: AIExecutionMode;
          p_monthly_remote_cost_limit_usd: number | null;
          p_organization_id: string;
        };
        Returns: OrganizationAIPolicyRow;
      };
      start_ai_run: {
        Args: {
          p_capability: string;
          p_id: string;
          p_memory_domains: string[];
          p_operation: string;
          p_organization_id: string;
          p_parent_run_id: string | null;
          p_plugin_id: string | null;
          p_requested_tier: AILogicalTierRecord;
          p_trace_metadata: Record<string, unknown>;
        };
        Returns: AIRunRow;
      };
      revoke_organization_invitation: {
        Args: { p_invitation_id: string; p_organization_id: string };
        Returns: string;
      };
      update_organization_member_role: {
        Args: {
          p_organization_id: string;
          p_role: OrganizationRole;
          p_user_id: string;
        };
        Returns: MembershipRow;
      };
    };
    Enums: {
      activity_event_type: ActivityEventType;
      ai_error_category: AIErrorCategoryRecord;
      ai_execution_mode: AIExecutionMode;
      ai_logical_tier: AILogicalTierRecord;
      ai_run_status: AIRunStatus;
      board_element_type: BoardElementType;
      brand_status: BrandStatus;
      company_stage: CompanyStage;
      competitor_type: CompetitorType;
      marketing_objective: MarketingObjective;
      marketing_stage: MarketingStage;
      marketing_brief_status: MarketingBriefStatus;
      marketing_campaign_status: MarketingCampaignStatus;
      marketing_creative_council_stage: MarketingCreativeCouncilStage;
      marketing_creative_council_stage_status: MarketingCreativeCouncilStageStatus;
      marketing_creative_council_status: MarketingCreativeCouncilStatus;
      marketing_strategic_review_stage: MarketingStrategicReviewStage;
      marketing_strategic_review_stage_status: MarketingStrategicReviewStageStatus;
      marketing_strategic_review_status: MarketingStrategicReviewStatus;
      marketing_external_research_status: MarketingExternalResearchStatus;
      marketing_external_research_adapter: MarketingExternalResearchAdapter;
      marketing_external_research_source_status: MarketingExternalResearchSourceStatus;
      marketing_external_research_source_failure: MarketingExternalResearchSourceFailure;
      marketing_reel_idea_status: MarketingReelIdeaStatus;
      marketing_research_category: MarketingResearchCategory;
      marketing_performance_platform: MarketingPerformancePlatform;
      marketing_performance_content_type: MarketingPerformanceContentType;
      marketing_performance_snapshot_source: MarketingPerformanceSnapshotSource;
      marketing_performance_horizon: MarketingPerformanceHorizon;
      marketing_performance_metric: MarketingPerformanceMetric;
      marketing_performance_evidence_strength: MarketingPerformanceEvidenceStrength;
      marketing_performance_evidence_role: MarketingPerformanceEvidenceRole;
      marketing_ask_council_message_role: MarketingAskCouncilMessageRole;
      marketing_ask_council_turn_status: MarketingAskCouncilTurnStatus;
      job_error_category: JobErrorCategory;
      job_execution_class: JobExecutionClass;
      job_status: JobStatus;
      memory_domain: MemoryDomain;
      memory_kind: MemoryKind;
      memory_provenance: MemoryProvenance;
      notification_entity_type: NotificationEntityType;
      notification_channel: NotificationChannel;
      notification_type: NotificationType;
      organization_role: OrganizationRole;
      organization_invitation_status: OrganizationInvitationStatus;
      product_status: ProductStatus;
      task_priority: TaskPriority;
      task_reminder_kind: TaskReminderKind;
      task_status: TaskStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
