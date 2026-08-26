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
export type NotificationEntityType = "TASK" | "BOARD";
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
  | "BOARD_COMMENTED";
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

export type Database = {
  public: {
    Tables: {
      activity_events: {
        Row: ActivityEventRow;
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
      organization_invitations: {
        Row: OrganizationInvitationRow;
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
      list_organization_team: {
        Args: { p_organization_id: string };
        Returns: OrganizationTeamMember[];
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
      set_organization_plugin_enabled: {
        Args: {
          p_enabled: boolean;
          p_organization_id: string;
          p_plugin_id: string;
        };
        Returns: OrganizationPluginRow;
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
      board_element_type: BoardElementType;
      brand_status: BrandStatus;
      company_stage: CompanyStage;
      competitor_type: CompetitorType;
      marketing_objective: MarketingObjective;
      marketing_stage: MarketingStage;
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
