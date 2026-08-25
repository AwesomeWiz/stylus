"use client";

import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { createOrganizationAction } from "@/modules/organizations/actions";
import { initialOrganizationActionState } from "@/modules/organizations/schemas";

export function OrganizationSetupForm() {
  const [state, action] = useActionState(
    createOrganizationAction,
    initialOrganizationActionState,
  );
  const error = state.fieldErrors?.name?.[0];

  return (
    <form action={action} className="space-y-5" noValidate>
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="name">
          Organization name
        </label>
        <Input
          aria-describedby={error ? "name-error" : "name-hint"}
          aria-invalid={Boolean(error)}
          autoComplete="organization"
          id="name"
          name="name"
          placeholder="Acme"
          required
        />
        {error ? (
          <p className="text-destructive mt-1.5 text-xs" id="name-error">
            {error}
          </p>
        ) : (
          <p className="text-muted-foreground mt-1.5 text-xs" id="name-hint">
            Use the name your team recognizes. You can change it later.
          </p>
        )}
      </div>

      {state.message ? (
        <p
          aria-live="polite"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2.5 text-sm leading-5"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

      <SubmitButton pendingLabel="Creating organization">
        Create organization
      </SubmitButton>
    </form>
  );
}
