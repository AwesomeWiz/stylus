import { describe, it, expect } from "vitest";
import {
  validIntegrationOrigin,
  callbackUrl,
  integrationEnvironmentSchema,
} from "./config";
describe("optional integration configuration", () => {
  it("accepts an empty provider configuration", () => {
    expect(integrationEnvironmentSchema.parse({})).toEqual({});
  });
  it.each([
    "http://localhost:3000",
    "http://127.0.0.1:3000/",
    "http://[::1]:3000",
    "https://stylus.example/",
  ])("supports exact secure or loopback origin %s", (value) => {
    expect(validIntegrationOrigin(value)).toBe(true);
  });
  it.each([
    "http://stylus.example/",
    "https://user:secret@stylus.example/",
    "https://stylus.example/?next=external",
    "https://stylus.example/#fragment",
    "https://stylus.example/unconfigured-prefix",
    "javascript:alert(1)",
  ])("rejects unsafe callback origin %s", (value) => {
    expect(validIntegrationOrigin(value)).toBe(false);
  });
  it("uses only the canonical callback path without caller redirects", () => {
    expect(callbackUrl("google-drive")).toBe(
      "http://localhost:3000/integrations/google-drive/callback",
    );
  });
});
