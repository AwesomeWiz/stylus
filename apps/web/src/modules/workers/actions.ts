"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";
import type { WorkerActionState } from "@/modules/workers/schemas";

export async function createWorkerPairingAction(
  _state: WorkerActionState,
  formData: FormData,
): Promise<WorkerActionState> {
  const name = z.string().trim().min(2).max(80).safeParse(formData.get("name"));
  if (!name.success)
    return {
      status: "error",
      message: "Enter a worker name between 2 and 80 characters.",
    };
  const context = await getCurrentOrganizationContext();
  if (!context || !["OWNER", "ADMIN"].includes(context.membership.role))
    return { status: "error", message: "Worker management is not permitted." };
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("create_worker_pairing", {
    p_name: name.data,
    p_organization_id: context.organization.id,
    p_token_hash_hex: tokenHash,
  });
  if (error)
    return {
      status: "error",
      message: "The pairing request could not be created.",
    };
  revalidatePath("/workers");
  return {
    status: "success",
    message:
      "Pairing code created. It expires in 15 minutes and is shown once.",
    pairingToken: token,
  };
}

export async function revokeWorkerAction(
  _state: WorkerActionState,
  formData: FormData,
): Promise<WorkerActionState> {
  const workerId = z.uuid().safeParse(formData.get("workerId"));
  const context = await getCurrentOrganizationContext();
  if (
    !workerId.success ||
    !context ||
    !["OWNER", "ADMIN"].includes(context.membership.role)
  )
    return { status: "error", message: "Worker revocation is not permitted." };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("revoke_worker", {
    p_organization_id: context.organization.id,
    p_worker_id: workerId.data,
  });
  if (error)
    return { status: "error", message: "Worker revocation is not permitted." };
  revalidatePath("/workers");
  return { status: "success", message: "Worker revoked." };
}
