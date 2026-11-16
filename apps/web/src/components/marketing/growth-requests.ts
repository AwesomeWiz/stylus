"use client";
import {
  mutateGrowthAction,
  findGrowthChoicesAction,
} from "@/modules/marketing/growth-actions";
/** Transport uncertainty is not proof a mutation failed. Keep fields and stable IDs. */
export async function saveGrowth(input: unknown) {
  try {
    return await mutateGrowthAction(input);
  } catch {
    return {
      status: "error",
      code: "TRANSPORT",
      message:
        "The server response was interrupted. Your text is retained. Reload to check whether it saved before retrying; existing conversion and promotion identities are reused.",
    } as const;
  }
}
export async function searchGrowth(input: unknown) {
  try {
    return await findGrowthChoicesAction(input);
  } catch {
    return {
      status: "error",
      message:
        "Records could not load. Check your connection and retry the search.",
    } as const;
  }
}
