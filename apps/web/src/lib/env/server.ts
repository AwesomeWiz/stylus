import "server-only";

import { z } from "zod";

import { publicEnv } from "./public";

const serverEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
});

export const serverEnv = {
  ...publicEnv,
  ...serverEnvironmentSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
  }),
};
