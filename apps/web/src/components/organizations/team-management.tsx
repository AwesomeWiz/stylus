"use client";

import {
  Check,
  Clipboard,
  MailPlus,
  RefreshCw,
  UserMinus,
  X,
} from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  OrganizationInvitationSummary,
  OrganizationRole,
  OrganizationTeamMember,
} from "@/lib/supabase/database.types";
import { initialTeamActionState } from "@/modules/organizations/team-schemas";
import {
  inviteTeamMemberAction,
  regenerateInvitationAction,
  removeMemberAction,
  revokeInvitationAction,
  updateMemberRoleAction,
} from "@/modules/organizations/team-actions";

export function formatTeamDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function TeamManagement({
  currentRole,
  currentUserId,
  invitations,
  members,
}: {
  currentRole: OrganizationRole;
  currentUserId: string;
  invitations: OrganizationInvitationSummary[];
  members: OrganizationTeamMember[];
}) {
  const canManage = currentRole === "OWNER" || currentRole === "ADMIN";
  return (
    <div className="space-y-8">
      {canManage ? <InviteForm /> : null}
      <section aria-labelledby="members-heading">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold" id="members-heading">
              Members
            </h2>
            <p className="text-muted-foreground text-sm">
              People with access to this organization.
            </p>
          </div>
          <span className="text-muted-foreground text-sm">
            {members.length} total
          </span>
        </div>
        <div className="divide-y rounded-lg border">
          {members.map((member) => {
            const protectedOwner = member.role === "OWNER";
            const adminProtected =
              currentRole === "ADMIN" && member.role === "ADMIN";
            const editable = canManage && !protectedOwner && !adminProtected;
            return (
              <div
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                key={member.member_user_id}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {member.display_name}
                    {member.member_user_id === currentUserId ? " (you)" : ""}
                  </p>
                  <p className="text-muted-foreground truncate text-sm">
                    {member.email}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Joined {formatTeamDate(member.created_at)}
                  </p>
                </div>
                {editable ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <form
                      action={updateMemberRoleAction}
                      className="flex gap-2"
                    >
                      <input
                        name="userId"
                        type="hidden"
                        value={member.member_user_id}
                      />
                      <select
                        aria-label={`Role for ${member.display_name}`}
                        className="bg-background h-9 rounded-md border px-2 text-sm"
                        defaultValue={member.role}
                        name="role"
                      >
                        <option value="MEMBER">Member</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                      <Button className="h-9" type="submit" variant="secondary">
                        Save
                      </Button>
                    </form>
                    <form action={removeMemberAction}>
                      <input
                        name="userId"
                        type="hidden"
                        value={member.member_user_id}
                      />
                      <Button
                        aria-label={`Remove ${member.display_name}`}
                        className="h-9"
                        type="submit"
                        variant="ghost"
                      >
                        <UserMinus aria-hidden="true" className="size-4" />{" "}
                        Remove
                      </Button>
                    </form>
                  </div>
                ) : (
                  <span className="bg-muted rounded-md px-2 py-1 text-xs font-medium">
                    {member.role.toLowerCase()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>
      {canManage ? (
        <section aria-labelledby="invitations-heading">
          <div className="mb-3">
            <h2 className="font-semibold" id="invitations-heading">
              Invitations
            </h2>
            <p className="text-muted-foreground text-sm">
              Pending and recently resolved team invitations.
            </p>
          </div>
          <div className="divide-y rounded-lg border">
            {invitations.length ? (
              invitations.map((invitation) => (
                <div
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                  key={invitation.id}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {invitation.email}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {invitation.role.toLowerCase()} · invited by{" "}
                      {invitation.inviter_name} on{" "}
                      {formatTeamDate(invitation.created_at)} · expires{" "}
                      {formatTeamDate(invitation.expires_at)}
                    </p>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {invitation.status.toLowerCase()}
                  </span>
                  {invitation.status === "PENDING" ? (
                    <div className="flex gap-1">
                      <RegenerateInvitation
                        invitationId={invitation.id}
                        email={invitation.email}
                      />
                      <form action={revokeInvitationAction}>
                        <input
                          name="invitationId"
                          type="hidden"
                          value={invitation.id}
                        />
                        <Button
                          aria-label={`Revoke invitation for ${invitation.email}`}
                          size="icon"
                          type="submit"
                          variant="ghost"
                        >
                          <X aria-hidden="true" className="size-4" />
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground p-6 text-center text-sm">
                No invitations yet.
              </p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function InviteForm() {
  const [state, action] = useActionState(
    inviteTeamMemberAction,
    initialTeamActionState,
  );
  const link = state.inviteLink;
  return (
    <section aria-labelledby="invite-heading" className="border-b pb-8">
      <div className="mb-4">
        <h2
          className="flex items-center gap-2 font-semibold"
          id="invite-heading"
        >
          <MailPlus aria-hidden="true" className="size-4" /> Invite a teammate
        </h2>
        <p className="text-muted-foreground text-sm">
          Create a secure seven-day invitation link for manual sharing.
        </p>
      </div>
      <form
        action={action}
        className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto]"
        noValidate
      >
        <div>
          <Input
            aria-label="Email address"
            name="email"
            placeholder="teammate@company.com"
            type="email"
          />
          {state.fieldErrors?.email?.[0] ? (
            <p className="text-destructive mt-1 text-xs">
              {state.fieldErrors.email[0]}
            </p>
          ) : null}
        </div>
        <select
          aria-label="Initial role"
          className="bg-background h-10 rounded-md border px-3 text-sm"
          defaultValue="MEMBER"
          name="role"
        >
          <option value="MEMBER">Member</option>
          <option value="VIEWER">Viewer</option>
        </select>
        <Button type="submit">Create invitation</Button>
      </form>
      {state.message ? (
        <p
          className={
            state.status === "error"
              ? "text-destructive mt-3 text-sm"
              : "text-muted-foreground mt-3 text-sm"
          }
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
      {link ? (
        <div className="bg-muted mt-3 flex items-center gap-2 rounded-md border p-2">
          <code className="min-w-0 flex-1 truncate px-1 text-xs">{link}</code>
          <InvitationCopyButton aria-label="Copy invitation link" link={link} />
        </div>
      ) : null}
    </section>
  );
}

function RegenerateInvitation({
  email,
  invitationId,
}: {
  email: string;
  invitationId: string;
}) {
  const [state, action] = useActionState(
    regenerateInvitationAction,
    initialTeamActionState,
  );
  return state.inviteLink ? (
    <InvitationCopyButton
      aria-label={`Copy regenerated invitation for ${email}`}
      link={state.inviteLink}
    />
  ) : (
    <form action={action}>
      <input name="invitationId" type="hidden" value={invitationId} />
      <Button
        aria-label={`Regenerate invitation for ${email}`}
        size="icon"
        type="submit"
        variant="ghost"
      >
        <RefreshCw aria-hidden="true" className="size-4" />
      </Button>
    </form>
  );
}

export function InvitationCopyButton({
  "aria-label": ariaLabel,
  link,
}: {
  "aria-label": string;
  link: string;
}) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  return (
    <Button
      aria-label={ariaLabel}
      onClick={async () => {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        if (resetTimer.current) clearTimeout(resetTimer.current);
        resetTimer.current = setTimeout(() => setCopied(false), 1000);
      }}
      size="icon"
      type="button"
      variant="secondary"
    >
      {copied ? (
        <Check aria-hidden="true" className="size-4" data-testid="copy-check" />
      ) : (
        <Clipboard aria-hidden="true" className="size-4" />
      )}
    </Button>
  );
}
