import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getContext: vi.fn(),
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ rpc: mocks.rpc })),
}));
vi.mock("@/modules/organizations/server/context", () => ({
  getCurrentOrganizationContext: mocks.getContext,
}));

import { createWorkerPairingAction, revokeWorkerAction } from "./actions";
import { initialWorkerActionState } from "./schemas";

const organizationId = "10000000-0000-4000-8000-000000000001";
const workerId = "20000000-0000-4000-8000-000000000001";

describe("worker actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getContext.mockResolvedValue({
      membership: { role: "OWNER" },
      organization: { id: organizationId },
    });
    mocks.rpc.mockResolvedValue({ error: null });
  });

  it("creates a one-time pairing token through server-derived context", async () => {
    const form = new FormData();
    form.set("name", "Studio workstation");

    const result = await createWorkerPairingAction(
      initialWorkerActionState,
      form,
    );

    expect(result.status).toBe("success");
    expect(result.pairingToken).toMatch(/^[0-9a-f]{64}$/);
    expect(mocks.rpc).toHaveBeenCalledWith("create_worker_pairing", {
      p_name: "Studio workstation",
      p_organization_id: organizationId,
      p_token_hash_hex: createHash("sha256")
        .update(result.pairingToken!)
        .digest("hex"),
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/workers");
  });

  it("revokes only through the server-derived organization", async () => {
    const form = new FormData();
    form.set("workerId", workerId);

    await expect(
      revokeWorkerAction(initialWorkerActionState, form),
    ).resolves.toEqual({ status: "success", message: "Worker revoked." });
    expect(mocks.rpc).toHaveBeenCalledWith("revoke_worker", {
      p_organization_id: organizationId,
      p_worker_id: workerId,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/workers");
  });

  it.each(["MEMBER", "VIEWER"])(
    "keeps %s unauthorized for pairing and revocation",
    async (role) => {
      mocks.getContext.mockResolvedValue({
        membership: { role },
        organization: { id: organizationId },
      });
      const pairing = new FormData();
      pairing.set("name", "Studio workstation");
      const revocation = new FormData();
      revocation.set("workerId", workerId);

      await expect(
        createWorkerPairingAction(initialWorkerActionState, pairing),
      ).resolves.toEqual({
        status: "error",
        message: "Worker management is not permitted.",
      });
      await expect(
        revokeWorkerAction(initialWorkerActionState, revocation),
      ).resolves.toEqual({
        status: "error",
        message: "Worker revocation is not permitted.",
      });
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );
});
