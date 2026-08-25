"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { loginAction, signupAction } from "@/modules/auth/actions";
import { initialAuthActionState } from "@/modules/auth/schemas";

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const isSignup = mode === "signup";
  const [state, action] = useActionState(
    isSignup ? signupAction : loginAction,
    initialAuthActionState,
  );

  return (
    <form action={action} className="space-y-5" noValidate>
      {isSignup ? (
        <Field
          autoComplete="name"
          error={state.fieldErrors?.fullName?.[0]}
          label="Full name"
          name="fullName"
          placeholder="Alex Morgan"
        />
      ) : null}

      <Field
        autoComplete="email"
        error={state.fieldErrors?.email?.[0]}
        label="Email address"
        name="email"
        placeholder="you@company.com"
        type="email"
      />

      <Field
        autoComplete={isSignup ? "new-password" : "current-password"}
        error={state.fieldErrors?.password?.[0]}
        hint={isSignup ? "Use at least 8 characters." : undefined}
        label="Password"
        name="password"
        type="password"
      />

      {state.message ? (
        <p
          aria-live="polite"
          className={
            state.status === "success"
              ? "border-success/30 bg-success/10 text-foreground rounded-md border px-3 py-2.5 text-sm leading-5"
              : "border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2.5 text-sm leading-5"
          }
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}

      <SubmitButton pendingLabel={isSignup ? "Creating account" : "Signing in"}>
        {isSignup ? "Create account" : "Sign in"}
      </SubmitButton>

      <p className="text-muted-foreground text-center text-sm">
        {isSignup ? "Already have an account?" : "New to Stylus?"}{" "}
        <Link
          className="text-foreground font-medium underline-offset-4 hover:underline"
          href={isSignup ? "/login" : "/signup"}
        >
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}

interface FieldProps {
  autoComplete: string;
  error?: string;
  hint?: string;
  label: string;
  name: string;
  placeholder?: string;
  type?: "email" | "password" | "text";
}

function Field({
  autoComplete,
  error,
  hint,
  label,
  name,
  placeholder,
  type = "text",
}: FieldProps) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium" htmlFor={name}>
        {label}
      </label>
      <Input
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        id={name}
        name={name}
        placeholder={placeholder}
        required
        type={type}
      />
      {error ? (
        <p className="text-destructive mt-1.5 text-xs" id={errorId}>
          {error}
        </p>
      ) : hint ? (
        <p className="text-muted-foreground mt-1.5 text-xs" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
