import { describe, expect, it } from "vitest";

import {
  assertCanManageOnboarding,
  OnboardingMutationDeniedError,
} from "./authorization";

describe("onboarding authorization", () => {
  it.each(["OWNER", "ADMIN"] as const)(
    "allows %s to manage company data",
    (role) => {
      expect(() => assertCanManageOnboarding(role)).not.toThrow();
    },
  );

  it.each(["MEMBER", "VIEWER"] as const)("rejects %s mutations", (role) => {
    expect(() => assertCanManageOnboarding(role)).toThrow(
      OnboardingMutationDeniedError,
    );
  });
});
