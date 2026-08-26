import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { KnowledgeMemoryRow } from "@/lib/supabase/database.types";

vi.mock("@/modules/memory/actions", () => ({
  createCompanyMemoryAction: vi.fn(async () => ({ status: "success" })),
  setCompanyMemoryArchivedAction: vi.fn(async () => ({ status: "success" })),
  updateCompanyMemoryAction: vi.fn(async () => ({ status: "success" })),
}));

import { MemoryWorkspace } from "./memory-workspace";

afterEach(cleanup);

const memory: KnowledgeMemoryRow = {
  archived_at: null,
  archived_by: null,
  content: "Customers prefer weekly planning.",
  created_at: "2026-08-25T10:00:00Z",
  created_by: "00000000-0000-4000-8000-000000000001",
  domain: "company",
  effective_at: null,
  id: "20000000-0000-4000-8000-000000000001",
  kind: "INSIGHT",
  metadata: {},
  organization_id: "10000000-0000-4000-8000-000000000001",
  plugin_id: null,
  provenance: "HUMAN",
  search_vector: "",
  source_reference: "Interview summary",
  title: "Planning preference",
  updated_at: "2026-08-25T10:00:00Z",
  updated_by: "00000000-0000-4000-8000-000000000001",
};

const companyKnowledge = {
  incompleteSections: [],
  organizationId: memory.organization_id,
  sections: {
    audience: null,
    brand: null,
    competitors: [],
    identity: { companyName: "Stylus" },
    marketing: null,
    positioning: null,
    problem: null,
    product: null,
  },
  source: "canonical_company_profile" as const,
} as never;

describe("Company Memory workspace", () => {
  it("renders provenance, source, filters and lifecycle controls for collaborators", () => {
    render(
      <MemoryWorkspace
        canMutate
        companyKnowledge={companyKnowledge}
        filters={{ archived: false, search: "" }}
        memories={[memory]}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Company memory" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Planning preference")).toBeInTheDocument();
    expect(screen.getByText(/Insight · Company · Human/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Review profile" }),
    ).toHaveAttribute("href", "/company/profile");
  });

  it("keeps VIEWER read-only", () => {
    render(
      <MemoryWorkspace
        canMutate={false}
        companyKnowledge={companyKnowledge}
        filters={{ archived: false, search: "" }}
        memories={[memory]}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Add memory" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Archive" }),
    ).not.toBeInTheDocument();
  });
});
