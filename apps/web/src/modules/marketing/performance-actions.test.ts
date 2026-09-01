import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  derive: vi.fn(),
  revalidate: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.context,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("./server/performance", () => ({
  deriveAndPersistPerformanceLearnings: mocks.derive,
}));

import {
  addPerformanceSnapshotAction,
  derivePerformanceLearningsAction,
  registerPublishedContentAction,
  setPublishedContentArchivedAction,
} from "./performance-actions";
import { initialPerformanceActionState } from "./performance-learning";

const organizationId = "10000000-0000-4000-8000-000000000001";
const actorId = "20000000-0000-4000-8000-000000000001";

describe("TASK-018 Performance Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.context.mockResolvedValue({
      membership: { role: "MEMBER" },
      organization: { id: organizationId },
      user: { id: actorId },
    });
    mocks.rpc.mockResolvedValue({ data: {}, error: null });
    mocks.derive.mockResolvedValue({ candidateCount: 1, createdCount: 1 });
  });

  it.each(["OWNER", "ADMIN", "MEMBER"] as const)(
    "registers publication for %s with server-derived tenant and exact optional classification",
    async (role) => {
      mocks.context.mockResolvedValue({
        membership: { role },
        organization: { id: organizationId },
        user: { id: actorId },
      });
      const result = await registerPublishedContentAction(
        initialPerformanceActionState,
        publicationForm(),
      );
      expect(result.status).toBe("success");
      expect(mocks.rpc).toHaveBeenCalledWith(
        "register_marketing_published_content",
        {
          p_canonical_url: "https://instagram.com/reel/example",
          p_content_opportunity_type: "MYTH_BUSTING",
          p_duration_seconds: 30,
          p_internal_label: "Sizing myth Reel",
          p_organization_id: organizationId,
          p_platform_native_id: "native-1",
          p_published_at: "2026-01-01T00:00:00.000Z",
          p_source_reel_brief_version_id:
            "30000000-0000-4000-8000-000000000001",
        },
      );
      expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain("forged");
    },
  );

  it("allows an unclassified publication without inventing a category", async () => {
    const form = publicationForm();
    form.set("contentOpportunityType", "");
    await registerPublishedContentAction(initialPerformanceActionState, form);
    expect(mocks.rpc.mock.calls[0]?.[1].p_content_opportunity_type).toBeNull();
  });

  it("preserves blank as unavailable and supplied zero in snapshot RPC input", async () => {
    const form = snapshotForm();
    form.set("views", "");
    form.set("likes", "0");
    const result = await addPerformanceSnapshotAction(
      initialPerformanceActionState,
      form,
    );
    expect(result.status).toBe("success");
    expect(mocks.rpc).toHaveBeenCalledWith(
      "add_marketing_performance_snapshot",
      expect.objectContaining({
        p_likes: 0,
        p_organization_id: organizationId,
        p_published_content_id: "40000000-0000-4000-8000-000000000001",
        p_views: null,
      }),
    );
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain("forged");
  });

  it("rejects VIEWER before any publication, snapshot, archive, or derive mutation", async () => {
    mocks.context.mockResolvedValue({
      membership: { role: "VIEWER" },
      organization: { id: organizationId },
      user: { id: actorId },
    });
    await expect(
      registerPublishedContentAction(
        initialPerformanceActionState,
        publicationForm(),
      ),
    ).resolves.toMatchObject({ status: "error" });
    await expect(
      addPerformanceSnapshotAction(
        initialPerformanceActionState,
        snapshotForm(),
      ),
    ).resolves.toMatchObject({ status: "error" });
    await expect(
      derivePerformanceLearningsAction(
        initialPerformanceActionState,
        new FormData(),
      ),
    ).resolves.toMatchObject({ status: "error" });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.derive).not.toHaveBeenCalled();
  });

  it("archives only the selected record inside server-derived organization context", async () => {
    const form = new FormData();
    form.set("publishedContentId", "40000000-0000-4000-8000-000000000001");
    form.set("archived", "true");
    form.set("organizationId", "forged");
    await setPublishedContentArchivedAction(
      initialPerformanceActionState,
      form,
    );
    expect(mocks.rpc).toHaveBeenCalledWith(
      "set_marketing_published_content_archived",
      {
        p_archived: true,
        p_content_id: "40000000-0000-4000-8000-000000000001",
        p_organization_id: organizationId,
      },
    );
  });

  it("derives synchronously without accepting browser tenant, actor, model, or workflow inputs", async () => {
    const form = new FormData();
    form.set("organizationId", "forged");
    form.set("actorId", "forged");
    form.set("providerId", "forged");
    form.set("councilRunId", "forged");
    const result = await derivePerformanceLearningsAction(
      initialPerformanceActionState,
      form,
    );
    expect(result).toMatchObject({ createdCount: 1, status: "success" });
    expect(mocks.derive).toHaveBeenCalledExactlyOnceWith({
      actorId,
      organizationId,
    });
    expect(JSON.stringify(mocks.derive.mock.calls)).not.toContain("forged");
  });
});

function publicationForm() {
  const form = new FormData();
  form.set("canonicalUrl", "https://instagram.com/reel/example");
  form.set("contentOpportunityType", "MYTH_BUSTING");
  form.set("durationSeconds", "30");
  form.set("internalLabel", "Sizing myth Reel");
  form.set("platformNativeId", "native-1");
  form.set("publishedAt", "2026-01-01T00:00:00.000Z");
  form.set("sourceReelBriefVersionId", "30000000-0000-4000-8000-000000000001");
  form.set("organizationId", "forged");
  form.set("actorId", "forged");
  return form;
}

function snapshotForm() {
  const form = new FormData();
  for (const name of [
    "averageWatchTimeSeconds",
    "comments",
    "completionRate",
    "follows",
    "likes",
    "linkClicks",
    "profileVisits",
    "reach",
    "saves",
    "shares",
    "totalWatchTimeSeconds",
    "views",
  ])
    form.set(name, "");
  form.set("likes", "1");
  form.set("notes", "");
  form.set("observedAt", "2026-01-08T00:00:00.000Z");
  form.set("publishedContentId", "40000000-0000-4000-8000-000000000001");
  form.set("sourceLabel", "Manual QA");
  form.set("organizationId", "forged");
  form.set("actorId", "forged");
  return form;
}
