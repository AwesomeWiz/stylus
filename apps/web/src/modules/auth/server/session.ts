import "server-only";

import { cache } from "react";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface AuthenticatedUser {
  displayName: string;
  email: string;
  id: string;
}

export const getAuthenticatedUser = cache(
  async (): Promise<AuthenticatedUser | null> => {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user?.email) {
      return null;
    }

    const fullName = data.user.user_metadata.full_name;

    return {
      displayName:
        typeof fullName === "string" && fullName.trim().length > 0
          ? fullName.trim()
          : data.user.email.split("@")[0] || "Stylus user",
      email: data.user.email,
      id: data.user.id,
    };
  },
);

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new AuthenticationRequiredError();
  }

  return user;
}

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "AuthenticationRequiredError";
  }
}
