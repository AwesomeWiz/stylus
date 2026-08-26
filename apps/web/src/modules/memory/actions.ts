"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";

import { assertCanMutateCompanyMemory } from "./authorization";
import {
  createMemorySchema,
  memoryLifecycleSchema,
  type MemoryActionState,
  updateMemorySchema,
} from "./schemas";

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

function fields(formData: FormData) {
  return {
    content: value(formData, "content"),
    kind: value(formData, "kind"),
    sourceReference: value(formData, "sourceReference"),
    title: value(formData, "title"),
  };
}

function errorState(error: unknown): MemoryActionState {
  if (error && typeof error === "object" && "flatten" in error) {
    const flattened = (
      error as { flatten(): { fieldErrors: Record<string, string[]> } }
    ).flatten();
    return { fieldErrors: flattened.fieldErrors, status: "error" };
  }
  return {
    message: "Company memory could not be saved. Please try again.",
    status: "error",
  };
}

async function mutationContext() {
  const current = await getCurrentOrganizationContext();
  if (!current) redirect("/organization/new");
  assertCanMutateCompanyMemory(current.membership.role);
  return current;
}

export async function createCompanyMemoryAction(
  _previousState: MemoryActionState,
  formData: FormData,
): Promise<MemoryActionState> {
  try {
    const parsed = createMemorySchema.parse(fields(formData));
    const current = await mutationContext();
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("create_company_memory", {
      p_content: parsed.content,
      p_effective_at: null,
      p_kind: parsed.kind,
      p_organization_id: current.organization.id,
      p_source_reference: parsed.sourceReference || null,
      p_title: parsed.title,
    });
    if (error) throw error;
  } catch (error) {
    unstable_rethrow(error);
    return errorState(error);
  }
  revalidatePath("/memory");
  revalidatePath("/activity");
  return { status: "success" };
}

export async function updateCompanyMemoryAction(
  _previousState: MemoryActionState,
  formData: FormData,
): Promise<MemoryActionState> {
  try {
    const parsed = updateMemorySchema.parse({
      ...fields(formData),
      memoryId: value(formData, "memoryId"),
    });
    const current = await mutationContext();
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("update_company_memory", {
      p_content: parsed.content,
      p_effective_at: null,
      p_kind: parsed.kind,
      p_memory_id: parsed.memoryId,
      p_organization_id: current.organization.id,
      p_source_reference: parsed.sourceReference || null,
      p_title: parsed.title,
    });
    if (error) throw error;
  } catch (error) {
    unstable_rethrow(error);
    return errorState(error);
  }
  revalidatePath("/memory");
  revalidatePath("/activity");
  return { status: "success" };
}

export async function setCompanyMemoryArchivedAction(
  _previousState: MemoryActionState,
  formData: FormData,
): Promise<MemoryActionState> {
  try {
    const parsed = memoryLifecycleSchema.parse({
      archived: value(formData, "archived"),
      memoryId: value(formData, "memoryId"),
    });
    const current = await mutationContext();
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("set_company_memory_archived", {
      p_archived: parsed.archived,
      p_memory_id: parsed.memoryId,
      p_organization_id: current.organization.id,
    });
    if (error) throw error;
  } catch (error) {
    unstable_rethrow(error);
    return errorState(error);
  }
  revalidatePath("/memory");
  revalidatePath("/activity");
  return { status: "success" };
}
