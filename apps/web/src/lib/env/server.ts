import "server-only";

import { z } from "zod";

import { publicEnv } from "./public";

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.url().optional(),
);
const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);
const optionalNonnegativeNumber = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : Number(value)),
  z.number().finite().nonnegative().optional(),
);

const serverEnvironmentSchema = z.object({
  CRON_SECRET: optionalString,
  NODE_ENV: z.enum(["development", "test", "production"]),
  STYLUS_AI_OLLAMA_BASE_URL: optionalUrl,
  STYLUS_AI_OLLAMA_MODEL: optionalString,
  STYLUS_AI_OPENAI_COMPATIBLE_API_KEY: optionalString,
  STYLUS_AI_OPENAI_COMPATIBLE_BASE_URL: optionalUrl,
  STYLUS_AI_OPENAI_COMPATIBLE_MODEL: optionalString,
  STYLUS_AI_REMOTE_INPUT_USD_PER_MILLION: optionalNonnegativeNumber,
  STYLUS_AI_REMOTE_OUTPUT_USD_PER_MILLION: optionalNonnegativeNumber,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
});

export function parseServerEnvironment(input: unknown) {
  return serverEnvironmentSchema.parse(input);
}

export const serverEnv = {
  ...publicEnv,
  ...parseServerEnvironment({
    CRON_SECRET: process.env.CRON_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    STYLUS_AI_OLLAMA_BASE_URL: process.env.STYLUS_AI_OLLAMA_BASE_URL,
    STYLUS_AI_OLLAMA_MODEL: process.env.STYLUS_AI_OLLAMA_MODEL,
    STYLUS_AI_OPENAI_COMPATIBLE_API_KEY:
      process.env.STYLUS_AI_OPENAI_COMPATIBLE_API_KEY,
    STYLUS_AI_OPENAI_COMPATIBLE_BASE_URL:
      process.env.STYLUS_AI_OPENAI_COMPATIBLE_BASE_URL,
    STYLUS_AI_OPENAI_COMPATIBLE_MODEL:
      process.env.STYLUS_AI_OPENAI_COMPATIBLE_MODEL,
    STYLUS_AI_REMOTE_INPUT_USD_PER_MILLION:
      process.env.STYLUS_AI_REMOTE_INPUT_USD_PER_MILLION,
    STYLUS_AI_REMOTE_OUTPUT_USD_PER_MILLION:
      process.env.STYLUS_AI_REMOTE_OUTPUT_USD_PER_MILLION,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }),
};
