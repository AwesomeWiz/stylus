import "server-only";

import type {
  MarketingResearchIntent,
  SocialPlatform,
  SocialPlatformStatus,
} from "../external-research";

export type SocialPlatformCapability = {
  comments: boolean;
  competitorAccounts: boolean;
  discovery: boolean;
  engagementMetrics: boolean;
  mediaAcquisition: false;
  name: string;
  platform: SocialPlatform;
  reason: string;
  relevantIntents: readonly MarketingResearchIntent[];
  status: SocialPlatformStatus;
};

const socialIntents = [
  "AUDIENCE_PAIN",
  "AUDIENCE_DESIRE",
  "AUDIENCE_LANGUAGE",
  "PURCHASE_OBJECTION",
  "QUESTION_DEMAND",
  "BELIEF_OR_MISCONCEPTION",
  "CONTROVERSY_OR_DEBATE",
  "TREND_SIGNAL",
  "COMPETITOR_SIGNAL",
] as const satisfies readonly MarketingResearchIntent[];

export function listSocialPlatformCapabilities(): SocialPlatformCapability[] {
  return [
    {
      comments: false,
      competitorAccounts: false,
      discovery: false,
      engagementMetrics: false,
      mediaAcquisition: false,
      name: "Instagram",
      platform: "INSTAGRAM",
      reason:
        "Meta professional-account access and public-content App Review are required; no deployment authorization is configured.",
      relevantIntents: socialIntents,
      status: "APPROVAL_REQUIRED",
    },
    {
      comments: false,
      competitorAccounts: false,
      discovery: false,
      engagementMetrics: false,
      mediaAcquisition: false,
      name: "TikTok",
      platform: "TIKTOK",
      reason:
        "TikTok Research Tools are not available for this commercial product use case.",
      relevantIntents: socialIntents,
      status: "UNSUPPORTED_FOR_DISCOVERY",
    },
    {
      comments: true,
      competitorAccounts: true,
      discovery: true,
      engagementMetrics: true,
      mediaAcquisition: false,
      name: "YouTube",
      platform: "YOUTUBE",
      reason:
        "Public discovery is technically available, but immutable evidence needs a compliant 30-day refresh/deletion lifecycle before activation.",
      relevantIntents: socialIntents,
      status: "POLICY_DENIED",
    },
    {
      comments: false,
      competitorAccounts: false,
      discovery: false,
      engagementMetrics: false,
      mediaAcquisition: false,
      name: "Pinterest",
      platform: "PINTEREST",
      reason:
        "Approved Pinterest business OAuth does not provide a configured arbitrary public-listening path.",
      relevantIntents: socialIntents,
      status: "APPROVAL_REQUIRED",
    },
  ];
}

export function getSocialPlatformCapability(platform: SocialPlatform) {
  return listSocialPlatformCapabilities().find(
    (capability) => capability.platform === platform,
  )!;
}
