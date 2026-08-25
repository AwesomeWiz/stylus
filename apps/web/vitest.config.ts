import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "server-only": new URL("./src/test/server-only.ts", import.meta.url)
        .pathname,
    },
  },
  test: {
    env: {
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        "sb_publishable_test_value_for_verification",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    },
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
