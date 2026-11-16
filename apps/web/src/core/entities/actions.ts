"use server";
import { unstable_rethrow } from "next/navigation";
import { getEntityProvenance } from "@/plugins";
export async function loadEntityProvenance(input: unknown) {
  try {
    return {
      status: "success",
      links: await getEntityProvenance(input),
    } as const;
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", links: [] } as const;
  }
}
