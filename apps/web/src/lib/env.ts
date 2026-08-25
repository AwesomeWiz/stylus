import { z } from "zod";

const serverEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
});

export const env = serverEnvironmentSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
});
