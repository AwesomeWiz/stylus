"use client";
import { mutateExecutionAction } from "@/modules/execution/actions";
export async function saveExecution(input: unknown) {
  try {
    return await mutateExecutionAction(input);
  } catch {
    return {
      status: "error",
      code: "TRANSPORT",
      message:
        "The server response was interrupted. Your text is retained. Reload to check whether it saved before retrying.",
    } as const;
  }
}
