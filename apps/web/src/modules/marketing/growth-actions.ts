"use server";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { mutateGrowth } from "./server/growth-mutations";
import { findGrowthChoices } from "./server/growth-data";

export async function mutateGrowthAction(input: unknown) {
  try {
    return { status: "success", data: await mutateGrowth(input) } as const;
  } catch (error) {
    unstable_rethrow(error);
    const code =
      typeof error === "object" && error && "code" in error
        ? String(error.code)
        : "UNKNOWN";
    return {
      status: "error",
      code,
      message:
        error instanceof z.ZodError
          ? (error.issues[0]?.message ?? "Check the fields.")
          : code === "PT409"
            ? "This record changed or your last request already saved. Reload before editing again."
            : code === "42501"
              ? "This record or link is unavailable. Check membership, role and enabled apps."
              : code === "23505"
                ? "This experiment already has a Learning. Open the existing Learning."
                : code === "22023" || code === "23514"
                  ? "Check the lifecycle, dates and required criteria. Completed results cannot be rewritten."
                  : "The change could not be confirmed. Reload to check before retrying; your text is retained.",
    } as const;
  }
}
export async function findGrowthChoicesAction(input: unknown) {
  try {
    return { status: "success", data: await findGrowthChoices(input) } as const;
  } catch (error) {
    unstable_rethrow(error);
    return {
      status: "error",
      message: "Authorized records could not load. Retry or check access.",
    } as const;
  }
}
