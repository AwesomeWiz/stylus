import type { PluginMemoryDomain } from "@/core/plugins/public";
import type { KnowledgeMemoryRow } from "@/lib/supabase/database.types";
import type { CompanyKnowledge } from "@/modules/memory/company-knowledge";

export interface AIKnowledgeContextRequest {
  domains: readonly PluginMemoryDomain[];
  limit?: number;
  search?: string;
}

export interface AIKnowledgeContextResult {
  company: CompanyKnowledge | null;
  domains: PluginMemoryDomain[];
  memories: KnowledgeMemoryRow[];
}
