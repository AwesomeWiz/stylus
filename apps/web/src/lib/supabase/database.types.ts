export type OrganizationRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
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
  user_id: string;
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
          user_id: string;
        };
        Update: {
          role?: OrganizationRole;
        };
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
      list_organization_task_members: {
        Args: { p_organization_id: string };
        Returns: TaskMember[];
      };
    };
    Enums: {
      brand_status: BrandStatus;
      company_stage: CompanyStage;
      competitor_type: CompetitorType;
      marketing_objective: MarketingObjective;
      marketing_stage: MarketingStage;
      organization_role: OrganizationRole;
      product_status: ProductStatus;
      task_priority: TaskPriority;
      task_status: TaskStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
