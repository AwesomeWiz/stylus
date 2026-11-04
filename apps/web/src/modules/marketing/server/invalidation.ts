import "server-only";
import { revalidatePath } from "next/cache";
/** The same domain dependencies apply to ordinary forms and explicit Board creation. */
export function invalidateMarketingRecord(path: string) {
  revalidatePath(path);
  revalidatePath("/apps/marketing");
  revalidatePath("/activity");
}
