import { z } from "zod";

export const invitationEmailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .max(254, "Email address is too long.")
  .transform((email) => email.toLowerCase());

export const inviteTeamMemberSchema = z.object({
  email: invitationEmailSchema,
  role: z.enum(["MEMBER", "VIEWER"]),
});

export const invitationIdSchema = z.uuid();
export const invitationTokenSchema = z
  .string()
  .min(40)
  .max(200)
  .regex(/^[A-Za-z0-9_-]+$/);
export const managedMemberRoleSchema = z.enum(["MEMBER", "VIEWER"]);
export const memberUserIdSchema = z.uuid();

export interface TeamActionState {
  fieldErrors?: Partial<Record<"email" | "role", string[]>>;
  inviteLink?: string;
  message?: string;
  status: "idle" | "error" | "success";
}

export const initialTeamActionState: TeamActionState = { status: "idle" };
