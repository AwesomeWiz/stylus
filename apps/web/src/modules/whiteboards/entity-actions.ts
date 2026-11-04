"use server";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { convertBoardEntity } from "./server/entities";
export async function convertBoardEntityAction(input: unknown) {
  try {
    return {
      status: "success",
      data: await convertBoardEntity(input),
    } as const;
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof z.ZodError)
      return {
        status: "error",
        code: "VALIDATION",
        message: error.issues[0]?.message ?? "Check the preview fields.",
      } as const;
    const code =
      typeof error === "object" && error && "code" in error
        ? String(error.code)
        : "UNKNOWN";
    return {
      status: "error",
      code,
      message:
        code === "PT410"
          ? "The created item is unavailable. No replacement was created."
          : code === "42501"
            ? "This conversion is unavailable. Check your role, selected content and enabled apps."
            : code === "22023"
              ? "The reviewed fields are no longer valid. Close this preview and start a new conversion with current values."
              : "The item could not be confirmed. Retry this conversion to reuse its existing identity.",
    } as const;
  }
}
