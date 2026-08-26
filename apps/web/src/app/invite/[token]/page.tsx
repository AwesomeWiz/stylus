import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { getAuthenticatedUser } from "@/modules/auth/server/session";
import { acceptInvitationAction } from "@/modules/organizations/team-actions";
import { invitationTokenSchema } from "@/modules/organizations/team-schemas";
import { getInvitationPreview } from "@/modules/organizations/server/team-data";

export default async function InvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const parsed = invitationTokenSchema.safeParse((await params).token);
  if (!parsed.success) notFound();
  const [preview, user] = await Promise.all([
    getInvitationPreview(parsed.data),
    getAuthenticatedUser(),
  ]);
  if (!preview)
    return (
      <AuthShell
        description="This invitation is invalid, expired, revoked, or already used."
        title="Invitation unavailable"
      >
        <Link
          className="bg-primary text-primary-foreground inline-flex h-9 w-full items-center justify-center rounded-md px-3 text-sm font-medium"
          href="/login"
        >
          Return to sign in
        </Link>
      </AuthShell>
    );
  const returnPath = `/invite/${parsed.data}`;
  return (
    <AuthShell
      description={`You were invited to join ${preview.organization_name} as a ${preview.role.toLowerCase()}. Sign in with the invited email address.`}
      title={`Join ${preview.organization_name}`}
    >
      {(await searchParams).error ? (
        <p className="text-destructive mb-4 text-sm" role="alert">
          This invitation can only be accepted by the invited email address.
        </p>
      ) : null}
      {user ? (
        <form action={acceptInvitationAction} className="space-y-4">
          <input name="token" type="hidden" value={parsed.data} />
          <p className="text-muted-foreground text-sm">
            Signed in as{" "}
            <strong className="text-foreground">{user.email}</strong>
          </p>
          <Button className="w-full" type="submit">
            Accept invitation
          </Button>
        </form>
      ) : (
        <div className="grid gap-3">
          <Link
            className="bg-primary text-primary-foreground inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium"
            href={`/login?next=${encodeURIComponent(returnPath)}` as Route}
          >
            Sign in to accept
          </Link>
          <Link
            className="bg-card text-foreground inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium"
            href={`/signup?next=${encodeURIComponent(returnPath)}` as Route}
          >
            Create an account
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
