import { describe, expect, it } from "vitest";

import type {
  AudienceProfileRow,
  BrandProfileRow,
  CompanyProfileRow,
  MarketingProfileRow,
} from "@/lib/supabase/database.types";

import { composeCompanyKnowledge } from "./company-knowledge";

const organizationId = "10000000-0000-4000-8000-000000000001";

describe("canonical Company Knowledge composition", () => {
  it("reads structured context without creating memory copies", () => {
    const company = {
      company_name: "Stylus",
      industry: "Productivity",
      primary_market: "Startup teams",
      short_description: "A shared startup operating system.",
      stage: "MVP",
      affected_audience: "Founding teams",
      core_insight: "Context fragmentation slows execution.",
      current_alternatives: ["Disconnected tools"],
      problem_importance: "High",
      problem_statement: "Startup context is fragmented.",
      startup_idea: "One shared operating environment.",
      core_capabilities: ["Collaboration"],
      product_concept: "Startup OS",
      differentiators: ["Scoped AI"],
      near_term_objective: "Private beta",
      product_status: "BUILDING",
      value_proposition: "Keep team context connected.",
      positioning_category: "Startup operating system",
      desired_perception: "Trusted",
      positioning_difference: "Human-controlled AI",
      key_promise: "Shared operational context",
      reasons_to_believe: ["Organization isolation"],
      status_quo: "Many disconnected apps",
    } as CompanyProfileRow;
    const result = composeCompanyKnowledge({
      audience: {
        name: "Founders",
        description: "Small startup teams",
      } as AudienceProfileRow,
      brand: { status: "DEFINED", tone_of_voice: ["Clear"] } as BrandProfileRow,
      company,
      competitors: [],
      marketing: {
        primary_objective: "AWARENESS",
        stage: "EXPERIMENTING",
      } as MarketingProfileRow,
      organizationId,
    });
    expect(result.source).toBe("canonical_company_profile");
    expect(result.organizationId).toBe(organizationId);
    expect(result.sections.identity?.companyName).toBe("Stylus");
    expect(result.sections.product?.concept).toBe("Startup OS");
    expect(result).not.toHaveProperty("memories");
  });

  it("is safe and explicit when onboarding sections are incomplete", () => {
    const result = composeCompanyKnowledge({
      audience: null,
      brand: null,
      company: null,
      competitors: [],
      marketing: null,
      organizationId,
    });
    expect(result.sections.identity).toBeNull();
    expect(result.sections.audience).toBeNull();
    expect(result.sections.competitors).toEqual([]);
    expect(result.incompleteSections).toEqual(
      expect.arrayContaining([
        "identity",
        "audience",
        "brand",
        "marketing",
        "product",
      ]),
    );
  });
});
