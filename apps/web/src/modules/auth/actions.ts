"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { serverEnv } from "@/lib/env/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { getLoginErrorMessage, getSignupErrorMessage } from "./errors";
import {
  loginSchema,
  safeAuthReturnPath,
  signupSchema,
  type AuthActionState,
} from "./schemas";

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const returnPath = safeAuthReturnPath(formData.get("next"));

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      status: "error",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { message: getLoginErrorMessage(error), status: "error" };
  }

  revalidatePath("/", "layout");
  redirect((returnPath ?? "/") as Route);
}

export async function signupAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    password: formData.get("password"),
  });
  const returnPath = safeAuthReturnPath(formData.get("next"));

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      status: "error",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: new URL(
        returnPath
          ? `/auth/confirm?next=${encodeURIComponent(returnPath)}`
          : "/auth/confirm",
        serverEnv.NEXT_PUBLIC_SITE_URL,
      ).toString(),
    },
    password: parsed.data.password,
  });

  if (error) {
    return { message: getSignupErrorMessage(error), status: "error" };
  }

  if (!data.session) {
    return {
      message:
        "Check your email to confirm your account, then return to sign in.",
      status: "success",
    };
  }

  revalidatePath("/", "layout");
  redirect((returnPath ?? "/organization/new") as Route);
}

export async function logoutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
