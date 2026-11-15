import { z } from "zod";

/** Configuration leak prevention only; Supabase still verifies every credential. */
function browserKey(value: string) {
  if (/^sb_publishable_[\w-]+$/.test(value)) return true;
  try {
    const parts = value.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(
      atob(parts[1]!.replaceAll("-", "+").replaceAll("_", "/")),
    );
    return payload?.role === "anon";
  } catch {
    return false;
  }
}

function publicHttpUrl(value: string) {
  const url = new URL(value);
  return (
    ["http:", "https:"].includes(url.protocol) &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash
  );
}

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().refine((value) => {
    const url = new URL(value);
    return publicHttpUrl(value) && url.pathname === "/";
  }, "NEXT_PUBLIC_SITE_URL must be a credential-free HTTP(S) origin."),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(20, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required.")
    .max(8192)
    .refine(
      browserKey,
      "Use a publishable key or legacy anon key, never a service-role/secret key.",
    ),
  NEXT_PUBLIC_SUPABASE_URL: z
    .url()
    .refine(
      publicHttpUrl,
      "NEXT_PUBLIC_SUPABASE_URL must be a credential-free HTTP(S) URL.",
    ),
});

export function parsePublicEnvironment(input: unknown) {
  return publicEnvironmentSchema.parse(input);
}

export const publicEnv = parsePublicEnvironment({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
});
