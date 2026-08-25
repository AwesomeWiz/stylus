export type OrganizationRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

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

export type Database = {
  public: {
    Tables: {
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
    };
    Views: { [_ in never]: never };
    Functions: {
      create_organization: {
        Args: { p_name: string };
        Returns: OrganizationRow;
      };
    };
    Enums: {
      organization_role: OrganizationRole;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
