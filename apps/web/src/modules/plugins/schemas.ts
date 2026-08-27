import { z } from "zod";

import { pluginIdSchema } from "@/core/plugins/public";

export interface PluginActionState {
  message?: string;
  status: "idle" | "error" | "success";
}

export const initialPluginActionState: PluginActionState = { status: "idle" };

export const pluginEnablementSchema = z.object({
  enabled: z.enum(["true", "false"]).transform((value) => value === "true"),
  pluginId: pluginIdSchema,
});
