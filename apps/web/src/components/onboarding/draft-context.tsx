"use client";
import { createContext, useContext } from "react";
import type { DraftFields } from "@/modules/onboarding/drafts";
export const OnboardingDraftContext = createContext<DraftFields | undefined>(
  undefined,
);
export const OnboardingErrorsContext = createContext<
  Record<string, string[]> | undefined
>(undefined);
export function useOnboardingDraft() {
  return useContext(OnboardingDraftContext);
}
export function useOnboardingErrors() {
  return useContext(OnboardingErrorsContext);
}
