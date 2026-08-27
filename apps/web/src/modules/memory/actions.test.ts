import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getContext: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
  unstableRethrow: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createClient,
}));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.getContext,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  unstable_rethrow: mocks.unstableRethrow,
}));

import {
  createCompanyMemoryAction,
  setCompanyMemoryArchivedAction,
  updateCompanyMemoryAction,
} from "./actions";
import { initialMemoryActionState } from "./schemas";

const organizationId = "10000000-0000-4000-8000-000000000001";
const memoryId = "20000000-0000-4000-8000-000000000001";

function memoryForm() {
  const form = new FormData();
  form.set("title", "Validated customer preference");
  form.set("content", "Customers prefer a focused weekly planning view.");
  form.set("kind", "INSIGHT");
  form.set("sourceReference", "Customer interview summary");
  return form;
}

describe("company memory actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({ data: {}, error: null });
    mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
    mocks.getContext.mockResolvedValue({
      membership: { role: "MEMBER" },
      organization: { id: organizationId },
      user: { id: "00000000-0000-4000-8000-000000000001" },
    });
    mocks.redirect.mockImplementation((path) => {
      throw new Error(`redirect:${path}`);
    });
    mocks.unstableRethrow.mockImplementation((error) => {
      if (error instanceof Error && error.message.startsWith("redirect:"))
        throw error;
    });
  });

  it("creates human company memory with server-derived organization scope", async () => {
    const form = memoryForm();
    form.set("organizationId", "90000000-0000-4000-8000-000000000009");
    form.set("pluginId", "web-agency");
    form.set("provenance", "SYSTEM");
    await expect(
      createCompanyMemoryAction(initialMemoryActionState, form),
    ).resolves.toEqual({ status: "success" });
    expect(mocks.rpc).toHaveBeenCalledWith("create_company_memory", {
      p_content: "Customers prefer a focused weekly planning view.",
      p_effective_at: null,
      p_kind: "INSIGHT",
      p_organization_id: organizationId,
      p_source_reference: "Customer interview summary",
      p_title: "Validated customer preference",
    });
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain("web-agency");
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain("SYSTEM");
  });

  it("keeps VIEWER read-only", async () => {
    mocks.getContext.mockResolvedValue({
      membership: { role: "VIEWER" },
      organization: { id: organizationId },
      user: { id: "00000000-0000-4000-8000-000000000001" },
    });
    await expect(
      createCompanyMemoryAction(initialMemoryActionState, memoryForm()),
    ).resolves.toMatchObject({ status: "error" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("validates before loading identity or advancing lifecycle", async () => {
    const form = memoryForm();
    form.set("content", "");
    const result = await createCompanyMemoryAction(
      initialMemoryActionState,
      form,
    );
    expect(result.status).toBe("error");
    expect(mocks.getContext).not.toHaveBeenCalled();
  });

  it("updates and archives only the requested row in the current organization", async () => {
    const update = memoryForm();
    update.set("memoryId", memoryId);
    await updateCompanyMemoryAction(initialMemoryActionState, update);
    const archive = new FormData();
    archive.set("memoryId", memoryId);
    archive.set("archived", "true");
    await setCompanyMemoryArchivedAction(initialMemoryActionState, archive);
    expect(mocks.rpc).toHaveBeenNthCalledWith(
      1,
      "update_company_memory",
      expect.objectContaining({
        p_memory_id: memoryId,
        p_organization_id: organizationId,
      }),
    );
    expect(mocks.rpc).toHaveBeenNthCalledWith(
      2,
      "set_company_memory_archived",
      {
        p_archived: true,
        p_memory_id: memoryId,
        p_organization_id: organizationId,
      },
    );
  });
});
