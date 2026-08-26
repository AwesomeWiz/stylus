import { z } from "zod";

const emailSchema = z
  .email("Enter a valid email address.")
  .max(254, "Email address is too long.")
  .transform((email) => email.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be 128 characters or fewer.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const signupSchema = z.object({
  email: emailSchema,
  fullName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name must be 80 characters or fewer."),
  password: passwordSchema,
});

export type AuthFieldErrors = Partial<
  Record<"email" | "fullName" | "password", string[]>
>;

export interface AuthActionState {
  fieldErrors?: AuthFieldErrors;
  message?: string;
  status: "idle" | "error" | "success";
}

export const initialAuthActionState: AuthActionState = { status: "idle" };

export function safeAuthReturnPath(value: FormDataEntryValue | string | null) {
  if (typeof value !== "string") return null;
  return /^\/invite\/[A-Za-z0-9_-]{40,200}$/.test(value) ? value : null;
}
