"use server";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { mutateExecution } from "./server/mutations";
import { getTaskExecution, searchExecution } from "./server/data";
function safeError(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "UNKNOWN";
  const message =
    error instanceof z.ZodError
      ? (error.issues[0]?.message ?? "Check the fields.")
      : code === "42501"
        ? "This work or link is unavailable. Check your membership and role."
        : code === "PT409"
          ? "This record changed or your last request saved. Reload before editing again."
          : code === "23505"
            ? "This prerequisite is already linked."
            : code === "22023" || code === "23514"
              ? "Check the fields. A prerequisite cannot depend on itself or create a cycle; related work is bounded."
              : "The response could not be confirmed. Your text is retained; reload to check before retrying.";
  return { status: "error", message, code } as const;
}
export async function mutateExecutionAction(input: unknown) {
  try {
    return { status: "success", data: await mutateExecution(input) } as const;
  } catch (error) {
    unstable_rethrow(error);
    return safeError(error);
  }
}
export async function readTaskExecutionAction(input: unknown) {
  try {
    return { status: "success", data: await getTaskExecution(input) } as const;
  } catch (error) {
    unstable_rethrow(error);
    return safeError(error);
  }
}
export async function searchExecutionAction(input: unknown) {
  try {
    return { status: "success", data: await searchExecution(input) } as const;
  } catch (error) {
    unstable_rethrow(error);
    return safeError(error);
  }
}
