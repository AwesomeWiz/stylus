"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteOrganizationAction } from "@/modules/organizations/settings-actions";
import { initialDeleteOrganizationState } from "@/modules/organizations/settings-schemas";

export function DeleteOrganizationPanel({
  organizationName,
}: {
  organizationName: string;
}) {
  const [state, action] = useActionState(
    deleteOrganizationAction,
    initialDeleteOrganizationState,
  );
  const [open, setOpen] = useState(false);
  return (
    <section
      aria-labelledby="delete-organization-heading"
      className="border-destructive/35 bg-destructive/5 rounded-lg border p-5"
    >
      <div className="flex gap-3">
        <Trash2 aria-hidden="true" className="text-destructive mt-0.5 size-5" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold" id="delete-organization-heading">
            Delete organization
          </h2>
          <p className="text-muted-foreground mt-1 text-sm leading-6">
            Permanently deletes this organization and its Stylus data. Team
            members and their accounts are not deleted.
          </p>
          <Button
            className="mt-4"
            onClick={() => setOpen(true)}
            type="button"
            variant="destructive"
          >
            Delete organization
          </Button>
          <Dialog
            description="This permanently removes the organization and its Stylus workspace data. This cannot be undone."
            onOpenChange={setOpen}
            open={open}
            title={`Delete ${organizationName}?`}
          >
            <form action={action} className="space-y-4 p-5">
              <label
                className="block text-sm font-medium"
                htmlFor="confirmationName"
              >
                Type <span className="font-semibold">{organizationName}</span>{" "}
                to confirm
              </label>
              <Input
                autoComplete="off"
                id="confirmationName"
                name="confirmationName"
                placeholder={organizationName}
              />
              {state.message ? (
                <p className="text-destructive text-sm" role="alert">
                  {state.message}
                </p>
              ) : null}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  onClick={() => setOpen(false)}
                  type="button"
                  variant="secondary"
                >
                  Cancel
                </Button>
                <div className="[&_button]:bg-destructive [&_button]:text-destructive-foreground [&_button]:hover:bg-destructive/90 [&_button]:w-full sm:[&_button]:w-auto">
                  <SubmitButton pendingLabel="Deleting organization…">
                    Delete permanently
                  </SubmitButton>
                </div>
              </div>
            </form>
          </Dialog>
        </div>
      </div>
    </section>
  );
}
