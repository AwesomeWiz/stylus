import "server-only";

import { createHash } from "node:crypto";

import type { z } from "zod";

import { externalResearchLimits } from "../external-research";
import type {
  SourceDiagnosticCategory,
  SourceDiagnosticMetadata,
  SourceFailureCategory,
} from "./safe-fetch";

export type NormalizedResearchItem = {
  adapterId: "hacker-news" | "rss-atom";
  author: string | null;
  canonicalUrl: string | null;
  contentHash: string;
  fetchedAt: string;
  metadata: Record<string, string | number>;
  nativeId: string | null;
  normalizedText: string;
  publishedAt: string | null;
  title: string | null;
};

export type SourceRequestFailure = {
  adapterId: NormalizedResearchItem["adapterId"];
  canonicalUrl: string | null;
  category: SourceFailureCategory;
  diagnosticCategory: SourceDiagnosticCategory;
  metadata: SourceDiagnosticMetadata;
};

export type EmptySourceResult = {
  adapterId: NormalizedResearchItem["adapterId"];
  canonicalUrl: string | null;
  diagnosticCategory: "zero_candidates" | "zero_matching_candidates";
  metadata: SourceDiagnosticMetadata;
};

export type AdapterResult = {
  emptyResults?: EmptySourceResult[];
  failures: SourceRequestFailure[];
  items: NormalizedResearchItem[];
};

export interface ResearchSourceAdapter<TRequest> {
  readonly displayName: string;
  readonly id: NormalizedResearchItem["adapterId"];
  readonly requestSchema: z.ZodType<TRequest>;
  retrieve(
    request: TRequest,
    context: ResearchAdapterContext,
  ): Promise<AdapterResult>;
}

export type ResearchAdapterContext = {
  budget: { consume(bytes: number): void };
  fetchedAt: string;
  requestGate: RequestConcurrencyGate;
  signal: AbortSignal;
};

export class RequestConcurrencyGate {
  #active = 0;
  readonly #waiting: Array<() => void> = [];

  constructor(readonly maximum: number) {}

  async run<T>(operation: () => Promise<T>) {
    if (this.#active >= this.maximum)
      await new Promise<void>((resolve) => this.#waiting.push(resolve));
    this.#active += 1;
    try {
      return await operation();
    } finally {
      this.#active -= 1;
      this.#waiting.shift()?.();
    }
  }
}

export function normalizePlainText(
  value: unknown,
  maximum: number = externalResearchLimits.normalizedItemCharacters,
) {
  if (typeof value !== "string") return "";
  const plain = value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Math.min(Number(code), 0x10ffff)),
    )
    .replace(/\s+/g, " ")
    .trim();
  return plain.slice(0, maximum);
}

export function normalizedContentHash(value: string) {
  return createHash("sha256")
    .update(value.toLocaleLowerCase().replace(/\s+/g, " ").trim(), "utf8")
    .digest("hex");
}

export function matchesQueryTerms(value: string, queryTerms: string[]) {
  const candidateTokens = new Set(searchTokens(value));
  return queryTerms.some((term) =>
    searchTokens(term).some((token) => candidateTokens.has(token)),
  );
}

function searchTokens(value: string) {
  return (
    value
      .normalize("NFKC")
      .toLocaleLowerCase("en-US")
      .match(/[\p{L}\p{N}]+/gu)
      ?.filter((token) => token.length >= 2) ?? []
  );
}

export function normalizeCanonicalUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    )
      return null;
    url.hash = "";
    [...url.searchParams.keys()]
      .filter((key) => /^utm_|^(?:fbclid|gclid)$/i.test(key))
      .forEach((key) => url.searchParams.delete(key));
    return url.toString();
  } catch {
    return null;
  }
}

export function deduplicateResearchItems(items: NormalizedResearchItem[]) {
  const native = new Set<string>();
  const urls = new Set<string>();
  const hashes = new Set<string>();
  const retained: NormalizedResearchItem[] = [];
  let duplicateCount = 0;
  let truncatedCount = 0;
  let normalizedCharacters = 0;
  for (const item of items) {
    const nativeKey = item.nativeId
      ? `${item.adapterId}:${item.nativeId}`
      : null;
    if (
      (nativeKey && native.has(nativeKey)) ||
      (item.canonicalUrl && urls.has(item.canonicalUrl)) ||
      hashes.has(item.contentHash)
    ) {
      duplicateCount += 1;
      continue;
    }
    if (
      retained.length >= externalResearchLimits.retainedItemsPerRun ||
      normalizedCharacters + item.normalizedText.length >
        externalResearchLimits.normalizedTextCharacters
    ) {
      truncatedCount += 1;
      continue;
    }
    if (nativeKey) native.add(nativeKey);
    if (item.canonicalUrl) urls.add(item.canonicalUrl);
    hashes.add(item.contentHash);
    retained.push(item);
    normalizedCharacters += item.normalizedText.length;
  }
  return {
    duplicateCount,
    items: retained,
    normalizedCharacters,
    truncatedCount,
  };
}

export async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  operation: (value: T, index: number) => Promise<R>,
) {
  const output = new Array<R>(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      output[index] = await operation(values[index]!, index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () =>
      worker(),
    ),
  );
  return output;
}
