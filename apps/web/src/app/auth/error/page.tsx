import { CircleAlert } from "lucide-react";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";

export default function AuthErrorPage() {
  return (
    <AuthShell
      description="The authentication link is invalid or has expired. Request a new confirmation by creating your account again."
      title="We could not confirm your account"
    >
      <div className="border-destructive/30 bg-destructive/10 mb-5 flex gap-3 rounded-md border px-3 py-3 text-sm leading-5">
        <CircleAlert
          aria-hidden="true"
          className="text-destructive mt-0.5 size-4 shrink-0"
        />
        <p>No account details or credentials were changed.</p>
      </div>
      <Link
        className="bg-card hover:bg-muted inline-flex h-10 w-full items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors"
        href="/signup"
      >
        Return to account creation
      </Link>
    </AuthShell>
  );
}
