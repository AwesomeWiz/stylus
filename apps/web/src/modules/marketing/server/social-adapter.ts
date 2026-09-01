import "server-only";

import { z } from "zod";

import {
  externalResearchLimits,
  socialPlatformSchema,
  type SocialPlatform,
} from "../external-research";
import { getSocialPlatformCapability } from "./social-platform-registry";
import {
  createFashionRelevanceProfile,
  isFashionResearchCandidateRelevant,
} from "./fashion-relevance";
import type {
  AdapterResult,
  ResearchAdapterContext,
  ResearchSourceAdapter,
} from "./research-sources";
import {
  normalizedContentHash,
  normalizeCanonicalUrl,
  normalizePlainText,
  type NormalizedResearchItem,
  type ResearchEvidenceDraft,
} from "./research-sources";

const requestSchema = z
  .object({
    queryTerms: z.array(z.string().min(1).max(80)).min(1).max(5),
    question: z.string().min(10).max(500),
    selectedPlatforms: z
      .array(socialPlatformSchema)
      .min(1)
      .max(externalResearchLimits.socialPlatformsPerRun),
    youtubeChannelIds: z
      .array(z.string().regex(/^UC[A-Za-z0-9_-]{20,30}$/))
      .max(externalResearchLimits.youtubeChannelIdsPerRun),
  })
  .strict();

type SocialRequest = z.infer<typeof requestSchema>;

const socialContentSchema = z
  .object({
    accountDisplayIdentifier: z.string().max(120).nullable(),
    accountId: z.string().min(1).max(120),
    canonicalUrl: z.url().max(1_000),
    caption: z.string().max(20_000).nullable(),
    comments: z
      .array(
        z
          .object({
            nativeId: z.string().min(1).max(120),
            publishedAt: z.iso.datetime().nullable(),
            text: z.string().max(10_000),
          })
          .strict(),
      )
      .max(externalResearchLimits.socialCommentsPerItem),
    competitorId: z.uuid().nullable(),
    durationSeconds: z.number().int().positive().max(86_400).nullable(),
    engagement: z
      .object({
        comments: z.number().int().nonnegative().nullable(),
        likes: z.number().int().nonnegative().nullable(),
        saves: z.number().int().nonnegative().nullable(),
        shares: z.number().int().nonnegative().nullable(),
        views: z.number().int().nonnegative().nullable(),
      })
      .strict(),
    mediaType: z.enum(["POST", "SHORT_VIDEO", "VIDEO", "IMAGE"]),
    nativeContentId: z.string().min(1).max(120),
    platform: socialPlatformSchema,
    publishedAt: z.iso.datetime().nullable(),
    title: z.string().max(300).nullable(),
  })
  .strict();
export type SocialContentInput = z.input<typeof socialContentSchema>;

export interface SocialPlatformTransport {
  readonly platform: SocialPlatform;
  retrieve(
    request: SocialRequest,
    context: ResearchAdapterContext,
  ): Promise<AdapterResult>;
}

export function normalizeSocialContent(input: {
  content: SocialContentInput;
  fetchedAt: string;
  queryTerms: string[];
  question: string;
}): NormalizedResearchItem | null {
  const content = socialContentSchema.parse(input.content);
  const canonicalUrl = allowedSocialCanonicalUrl(
    content.platform,
    content.canonicalUrl,
  );
  if (!canonicalUrl) return null;
  const title = normalizePlainText(content.title, 300);
  const caption = normalizePlainText(
    content.caption,
    externalResearchLimits.evidenceExcerptCharacters,
  );
  const profile = createFashionRelevanceProfile({
    explicitTerms: input.queryTerms,
    question: input.question,
  });
  if (!isFashionResearchCandidateRelevant(`${title}\n${caption}`, profile))
    return null;
  const baseMetadata: Record<string, string | number | boolean> = {
    accountId: content.accountId,
    mediaType: content.mediaType,
    modality: caption ? "CAPTION" : "METADATA",
    platform: content.platform,
    ...(content.competitorId ? { competitorId: content.competitorId } : {}),
    ...(content.durationSeconds
      ? { durationSeconds: content.durationSeconds }
      : {}),
  };
  const metrics = Object.fromEntries(
    Object.entries(content.engagement).filter((entry) => entry[1] !== null),
  ) as Record<string, number>;
  const primaryExcerpt = caption || title;
  if (!primaryExcerpt) return null;
  const evidence: ResearchEvidenceDraft[] = [
    {
      author: content.accountDisplayIdentifier,
      canonicalUrl,
      evidenceType: caption ? "SOCIAL_CAPTION" : "SOCIAL_METADATA",
      excerpt: primaryExcerpt,
      fetchedAt: input.fetchedAt,
      metadata: { ...baseMetadata, ...metrics },
      nativeId: content.nativeContentId,
      parentNativeId: null,
      publishedAt: content.publishedAt,
      title: title || null,
    },
  ];
  for (const comment of content.comments) {
    const excerpt = normalizePlainText(
      comment.text,
      externalResearchLimits.socialCommentCharacters,
    );
    if (!excerpt || !isFashionResearchCandidateRelevant(excerpt, profile))
      continue;
    evidence.push({
      author: null,
      canonicalUrl,
      evidenceType: "SOCIAL_COMMENT",
      excerpt: excerpt.slice(0, 1_500),
      fetchedAt: input.fetchedAt,
      metadata: {
        accountId: content.accountId,
        depth: 0,
        modality: "COMMENT",
        platform: content.platform,
        ...(content.competitorId ? { competitorId: content.competitorId } : {}),
      },
      nativeId: comment.nativeId,
      parentNativeId: content.nativeContentId,
      publishedAt: comment.publishedAt,
      title: null,
    });
  }
  const normalizedText = normalizePlainText(
    evidence.map((item) => item.excerpt).join("\n\n"),
    externalResearchLimits.enrichedItemCharacters,
  );
  return {
    adapterId: "social",
    author: content.accountDisplayIdentifier,
    canonicalUrl,
    contentHash: normalizedContentHash(normalizedText),
    evidence,
    fetchedAt: input.fetchedAt,
    metadata: {
      accountId: content.accountId,
      platform: content.platform,
      retainedComments: evidence.length - 1,
      sourceRequest: `social:${content.platform}`,
    },
    nativeId: `${content.platform}:${content.nativeContentId}`,
    normalizedText,
    publishedAt: content.publishedAt,
    title: title || null,
  };
}

function allowedSocialCanonicalUrl(platform: SocialPlatform, rawUrl: string) {
  const normalized = normalizeCanonicalUrl(rawUrl);
  if (!normalized) return null;
  const host = new URL(normalized).hostname.toLocaleLowerCase("en-US");
  const allowed: Record<SocialPlatform, readonly string[]> = {
    INSTAGRAM: ["instagram.com", "www.instagram.com"],
    PINTEREST: ["pinterest.com", "www.pinterest.com"],
    TIKTOK: ["tiktok.com", "www.tiktok.com"],
    YOUTUBE: ["youtube.com", "www.youtube.com", "youtu.be"],
  };
  return allowed[platform].includes(host) ? normalized : null;
}

export function createSocialAdapter(
  transports: readonly SocialPlatformTransport[] = [],
): ResearchSourceAdapter<SocialRequest> {
  const byPlatform = new Map(
    transports.map((transport) => [transport.platform, transport]),
  );
  return {
    displayName: "Social intelligence",
    id: "social",
    requestSchema,
    async retrieve(request, context) {
      const outcomes = await Promise.all(
        request.selectedPlatforms.map(async (platform) => {
          const transport = byPlatform.get(platform);
          if (transport) return transport.retrieve(request, context);
          const capability = getSocialPlatformCapability(platform);
          return {
            emptyResults: [],
            failures: [
              {
                adapterId: "social" as const,
                canonicalUrl: canonicalPlatformUrl(platform),
                category: "policy_denied" as const,
                diagnosticCategory: "source_unavailable" as const,
                metadata: {
                  platform,
                  platformStatus: capability.status,
                },
              },
            ],
            items: [],
          };
        }),
      );
      return {
        emptyResults: outcomes.flatMap((outcome) => outcome.emptyResults ?? []),
        failures: outcomes.flatMap((outcome) => outcome.failures),
        items: outcomes
          .flatMap((outcome) => outcome.items)
          .slice(0, externalResearchLimits.socialVideosPerRun),
      };
    },
  };
}

function canonicalPlatformUrl(platform: SocialPlatform) {
  const urls: Record<SocialPlatform, string> = {
    INSTAGRAM: "https://www.instagram.com",
    PINTEREST: "https://www.pinterest.com",
    TIKTOK: "https://www.tiktok.com",
    YOUTUBE: "https://www.youtube.com",
  };
  return urls[platform];
}
