import { z } from "zod";

import { pluginIdSchema } from "@/core/plugins/public";

export const pluginEnablementSchema = z.object({
  enabled: z.enum(["true", "false"]).transform((value) => value === "true"),
  pluginId: pluginIdSchema,
});
