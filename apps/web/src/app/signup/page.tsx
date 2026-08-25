import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getAuthenticatedUser } from "@/modules/auth/server/session";

export default async function SignupPage() {
  if (await getAuthenticatedUser()) {
    redirect("/");
  }

  return (
    <AuthShell
      description="Create your account, then set up the organization your team will share."
      title="Create your account"
    >
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
