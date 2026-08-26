"use server";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { serverEnv } from "@/lib/env/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentOrganizationContext } from "@/modules/organizations/server/context";

import {
  initialTeamActionState,
  invitationIdSchema,
  invitationTokenSchema,
  inviteTeamMemberSchema,
  managedMemberRoleSchema,
  memberUserIdSchema,
  type TeamActionState,
} from "./team-schemas";

function invitationSecret() {
  const token = randomBytes(32).toString("base64url");
  return {
    hash: createHash("sha256").update(token).digest("hex"),
    token,
  };
}

function expiration() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

function invitationLink(token: string) {
  return new URL(`/invite/${token}`, serverEnv.NEXT_PUBLIC_SITE_URL).toString();
}

async function managerContext() {
  const context = await getCurrentOrganizationContext();
  if (!context || !["OWNER", "ADMIN"].includes(context.membership.role))
    throw new Error("Organization management permission required");
  return context;
}

export async function inviteTeamMemberAction(
  _state: TeamActionState = initialTeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  void _state;
  const parsed = inviteTeamMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors, status: "error" };
  try {
    const context = await managerContext();
    const secret = invitationSecret();
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("create_organization_invitation", {
      p_email: parsed.data.email,
      p_expires_at: expiration(),
      p_organization_id: context.organization.id,
      p_role: parsed.data.role,
      p_token_hash: secret.hash,
    });
    if (error) {
      const duplicate = error.code === "23505";
      return {
        message: duplicate
          ? "This person is already a member or has a pending invitation."
          : "The invitation could not be created.",
        status: "error",
      };
    }
    revalidatePath("/team");
    return {
      inviteLink: invitationLink(secret.token),
      message: "Invitation created. Copy and share this secure link.",
      status: "success",
    };
  } catch {
    return {
      message: "You do not have permission to invite teammates.",
      status: "error",
    };
  }
}

export async function regenerateInvitationAction(
  _state: TeamActionState = initialTeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  void _state;
  const parsed = invitationIdSchema.safeParse(formData.get("invitationId"));
  if (!parsed.success)
    return { message: "Invitation not found.", status: "error" };
  try {
    const context = await managerContext();
    const secret = invitationSecret();
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("regenerate_organization_invitation", {
      p_expires_at: expiration(),
      p_invitation_id: parsed.data,
      p_organization_id: context.organization.id,
      p_token_hash: secret.hash,
    });
    if (error)
      return {
        message: "The invitation could not be regenerated.",
        status: "error",
      };
    revalidatePath("/team");
    return {
      inviteLink: invitationLink(secret.token),
      message: "A new link was created. The previous link no longer works.",
      status: "success",
    };
  } catch {
    return {
      message: "You do not have permission to regenerate this invitation.",
      status: "error",
    };
  }
}

export async function revokeInvitationAction(formData: FormData) {
  const parsed = invitationIdSchema.safeParse(formData.get("invitationId"));
  if (!parsed.success) return;
  const context = await managerContext();
  const supabase = await createServerSupabaseClient();
  await supabase.rpc("revoke_organization_invitation", {
    p_invitation_id: parsed.data,
    p_organization_id: context.organization.id,
  });
  revalidatePath("/team");
}

export async function updateMemberRoleAction(formData: FormData) {
  const userId = memberUserIdSchema.safeParse(formData.get("userId"));
  const role = managedMemberRoleSchema.safeParse(formData.get("role"));
  if (!userId.success || !role.success) return;
  const context = await managerContext();
  const supabase = await createServerSupabaseClient();
  await supabase.rpc("update_organization_member_role", {
    p_organization_id: context.organization.id,
    p_role: role.data,
    p_user_id: userId.data,
  });
  revalidatePath("/team");
}

export async function removeMemberAction(formData: FormData) {
  const userId = memberUserIdSchema.safeParse(formData.get("userId"));
  if (!userId.success) return;
  const context = await managerContext();
  const supabase = await createServerSupabaseClient();
  await supabase.rpc("remove_organization_member", {
    p_organization_id: context.organization.id,
    p_user_id: userId.data,
  });
  revalidatePath("/team");
}

export async function acceptInvitationAction(formData: FormData) {
  const token = invitationTokenSchema.safeParse(formData.get("token"));
  if (!token.success) redirect("/auth/error");
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("accept_organization_invitation", {
    p_token: token.data,
  });
  if (error || !data) redirect(`/invite/${token.data}?error=invalid` as Route);
  (await cookies()).set("stylus_organization_id", data, {
    httpOnly: true,
    sameSite: "lax",
    secure: serverEnv.NODE_ENV === "production",
  });
  revalidatePath("/", "layout");
  redirect("/team?accepted=1" as Route);
}
