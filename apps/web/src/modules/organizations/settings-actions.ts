"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";

import {
  deleteOrganizationSchema,
  initialDeleteOrganizationState,
  type DeleteOrganizationState,
} from "./settings-schemas";

type StoredOrganizationObjects = {
  boardImages: string[];
  reelMedia: string[];
};

async function listStoredOrganizationObjects(
  organizationId: string,
): Promise<StoredOrganizationObjects> {
  const service = createServiceSupabaseClient();
  const [elements, reels] = await Promise.all([
    service
      .from("board_elements")
      .select("metadata")
      .eq("organization_id", organizationId),
    service
      .from("marketing_competitor_reels")
      .select("storage_path")
      .eq("organization_id", organizationId),
  ]);
  if (elements.error || reels.error)
    throw new Error("Organization storage inventory could not be prepared.");

  return {
    boardImages: [
      ...new Set(
        (elements.data ?? []).flatMap(({ metadata }) => {
          const path = (metadata as Record<string, unknown>).storagePath;
          return typeof path === "string" &&
            path.startsWith(`${organizationId}/`)
            ? [path]
            : [];
        }),
      ),
    ],
    reelMedia: [
      ...new Set(
        (reels.data ?? [])
          .map(({ storage_path }) => storage_path)
          .filter((path) => path.startsWith(`${organizationId}/`)),
      ),
    ],
  };
}

async function removeStoredOrganizationObjects(
  objects: StoredOrganizationObjects,
) {
  const service = createServiceSupabaseClient();
  const operations = [];
  if (objects.boardImages.length)
    operations.push(
      service.storage.from("board-images").remove(objects.boardImages),
    );
  if (objects.reelMedia.length)
    operations.push(
      service.storage.from("marketing-reel-media").remove(objects.reelMedia),
    );
  const results = await Promise.all(operations);
  if (results.some(({ error }) => error))
    console.error("Organization deletion left inaccessible storage objects", {
      boardImageCount: objects.boardImages.length,
      reelMediaCount: objects.reelMedia.length,
    });
}

export async function deleteOrganizationAction(
  _state: DeleteOrganizationState = initialDeleteOrganizationState,
  formData: FormData,
): Promise<DeleteOrganizationState> {
  void _state;
  const parsed = deleteOrganizationSchema.safeParse({
    confirmationName: formData.get("confirmationName"),
  });
  if (!parsed.success)
    return { message: parsed.error.issues[0]?.message, status: "error" };

  try {
    const context = await getCurrentOrganizationContext();
    if (!context || context.membership.role !== "OWNER")
      return {
        message: "Only the organization owner can delete this organization.",
        status: "error",
      };
    if (parsed.data.confirmationName !== context.organization.name)
      return {
        message: "The organization name does not match.",
        status: "error",
      };

    // Inventory exact tenant-owned objects before the transactional database delete.
    const storedObjects = await listStoredOrganizationObjects(
      context.organization.id,
    );
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("delete_owned_organization", {
      p_confirmation_name: parsed.data.confirmationName,
      p_organization_id: context.organization.id,
    });
    if (error)
      return {
        message: "The organization could not be deleted.",
        status: "error",
      };

    await removeStoredOrganizationObjects(storedObjects);
    (await cookies()).delete("stylus_organization_id");
    revalidatePath("/", "layout");
  } catch {
    return {
      message: "The organization could not be deleted.",
      status: "error",
    };
  }

  redirect("/organization/new");
}
