"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  AuthenticationRequiredError,
  requireAuthenticatedUser,
} from "@/modules/auth/server/session";

import {
  createOrganizationSchema,
  type OrganizationActionState,
} from "./schemas";

export async function createOrganizationAction(
  _previousState: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  const parsed = createOrganizationSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      status: "error",
    };
  }

  try {
    await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect("/login");
    }
    throw error;
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("create_organization", {
    p_name: parsed.data.name,
  });

  if (error) {
    return {
      message: "We could not create your organization. Please try again.",
      status: "error",
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}
