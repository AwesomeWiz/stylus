import "server-only";

import { XMLParser, XMLValidator } from "fast-xml-parser";
import { z } from "zod";

import { externalResearchLimits } from "../external-research";
import {
  matchesQueryTerms,
  normalizedContentHash,
  normalizeCanonicalUrl,
  normalizePlainText,
  type ResearchSourceAdapter,
} from "./research-sources";
import {
  RunByteBudget,
  safeFetchXml,
  SourceRetrievalError,
  type SafeFetchDependencies,
  withSourceRetry,
} from "./safe-fetch";

const requestSchema = z
  .object({
    queryTerms: z.array(z.string().min(1).max(80)).min(1).max(5),
    url: z.url().max(500),
  })
  .strict();

type RssRequest = z.infer<typeof requestSchema>;
type XmlRecord = Record<string, unknown>;

export function createRssAtomAdapter(
  safeFetchDependencies?: SafeFetchDependencies,
  candidateMatcher?: (candidateText: string) => boolean,
): ResearchSourceAdapter<RssRequest> {
  return {
    displayName: "RSS / Atom",
    id: "rss-atom",
    requestSchema,
    async retrieve(request, context) {
      try {
        const loaded = await withSourceRetry(
          () =>
            context.requestGate.run(() =>
              safeFetchXml(
                request.url,
                context.budget as RunByteBudget,
                safeFetchDependencies,
                context.signal,
              ),
            ),
          undefined,
          context.signal,
        );
        const entries = parseFeed(loaded.body);
        const items = entries.flatMap((entry, index) => {
          const title = normalizePlainText(read(entry, "title"), 300);
          const body = normalizePlainText(
            read(entry, "description") ??
              read(entry, "summary") ??
              read(entry, "content") ??
              read(entry, "content:encoded"),
          );
          const normalizedText = normalizePlainText(`${title}\n${body}`);
          if (
            !normalizedText ||
            !(candidateMatcher
              ? candidateMatcher(normalizedText)
              : matchesQueryTerms(normalizedText, request.queryTerms))
          )
            return [];
          const nativeId = normalizePlainText(
            read(entry, "guid") ?? read(entry, "id"),
            500,
          );
          const author =
            normalizePlainText(
              read(entry, "author") ?? read(entry, "dc:creator"),
              120,
            ) || null;
          const canonicalUrl =
            normalizeCanonicalUrl(readLink(entry)) ?? loaded.finalUrl;
          const publishedAt = parsePublishedAt(
            read(entry, "pubDate") ??
              read(entry, "published") ??
              read(entry, "updated") ??
              read(entry, "dc:date"),
          );
          return [
            {
              adapterId: "rss-atom" as const,
              author,
              canonicalUrl,
              contentHash: normalizedContentHash(normalizedText),
              evidence: [
                {
                  author,
                  canonicalUrl,
                  evidenceType: "FEED_ITEM" as const,
                  excerpt: normalizedText,
                  fetchedAt: context.fetchedAt,
                  metadata: { feedUrl: loaded.finalUrl },
                  nativeId: nativeId || `entry-${index + 1}`,
                  parentNativeId: null,
                  publishedAt,
                  title: title || null,
                },
              ],
              fetchedAt: context.fetchedAt,
              metadata: { feedUrl: loaded.finalUrl },
              nativeId: nativeId || `entry-${index + 1}`,
              normalizedText,
              publishedAt,
              title: title || null,
            },
          ];
        });
        const retained = items.slice(
          0,
          externalResearchLimits.retainedItemsPerSource,
        );
        return {
          emptyResults: retained.length
            ? []
            : [
                {
                  adapterId: "rss-atom" as const,
                  canonicalUrl: loaded.finalUrl,
                  diagnosticCategory: entries.length
                    ? ("zero_matching_candidates" as const)
                    : ("zero_candidates" as const),
                  metadata: {
                    candidateCount: entries.length,
                    feedUrl: loaded.finalUrl,
                    matchingCandidateCount: items.length,
                  },
                },
              ],
          failures: [],
          items: retained,
        };
      } catch (error) {
        const failure =
          error instanceof SourceRetrievalError
            ? error
            : new SourceRetrievalError("malformed_source");
        return {
          emptyResults: [],
          failures: [
            {
              adapterId: "rss-atom",
              canonicalUrl: request.url,
              category: failure.category,
              diagnosticCategory: failure.diagnosticCategory,
              metadata: {
                ...failure.diagnosticMetadata,
                feedUrl: request.url,
              },
            },
          ],
          items: [],
        };
      }
    },
  };
}

export function parseFeed(xml: string): XmlRecord[] {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true)
    throw new SourceRetrievalError("malformed_source");
  const parser = new XMLParser({
    attributeNamePrefix: "@",
    ignoreAttributes: false,
    parseTagValue: false,
    processEntities: false,
    textNodeName: "#text",
    trimValues: true,
  });
  const parsed = parser.parse(xml) as XmlRecord;
  const rssRoot = record(parsed.rss);
  const rssChannel = record(rssRoot?.channel);
  const rssItems = rssChannel ? array(rssChannel.item) : [];
  const atomEntries = array(record(parsed.feed)?.entry);
  const entries = [...rssItems, ...atomEntries].filter(isRecord);
  if (!rssChannel && !record(parsed.feed))
    throw new SourceRetrievalError("malformed_source");
  return entries;
}

function record(value: unknown) {
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is XmlRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function array(value: unknown) {
  return Array.isArray(value) ? value : value === undefined ? [] : [value];
}

function read(entry: XmlRecord, key: string): unknown {
  const value = entry[key];
  if (isRecord(value)) return value["#text"] ?? value.name ?? value["@href"];
  if (Array.isArray(value)) return read({ value: value[0] }, "value");
  return value;
}

function readLink(entry: XmlRecord) {
  const value = entry.link;
  if (typeof value === "string") return value;
  const links = array(value).filter(isRecord);
  return (
    links.find((link) => link["@rel"] === "alternate")?.["@href"] ??
    links[0]?.["@href"]
  );
}

function parsePublishedAt(value: unknown) {
  const text = normalizePlainText(value, 100);
  if (!text) return null;
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}
