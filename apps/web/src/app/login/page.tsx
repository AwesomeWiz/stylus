import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getAuthenticatedUser } from "@/modules/auth/server/session";

export default async function LoginPage() {
  if (await getAuthenticatedUser()) {
    redirect("/");
  }

  return (
    <AuthShell
      description="Use your work email and password to continue to your workspace."
      title="Sign in to Stylus"
    >
      <AuthForm mode="login" />
    </AuthShell>
  );
}
