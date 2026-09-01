import "server-only";

import { listFashionEditorialSources } from "./fashion-research-source-registry";
import { normalizeCanonicalUrl } from "./research-sources";
import { validatePublicHttpsUrl } from "./safe-fetch";

export const webSourceClasses = [
  "FASHION_EDITORIAL",
  "BRAND_CONTENT",
  "RETAIL_CONTENT",
  "CONSUMER_DISCUSSION",
  "FORUM_OR_QA",
  "PRODUCT_REVIEW",
  "BUYING_GUIDE",
  "NEWS_OR_ANALYSIS",
  "OTHER_WEB",
] as const;

export type WebSourceClass = (typeof webSourceClasses)[number];

const deniedDomains = [
  "ajio.com",
  "amazon.com",
  "amazon.in",
  "asos.com",
  "flipkart.com",
  "hm.com",
  "instagram.com",
  "myntra.com",
  "pinterest.com",
  "reddit.com",
  "tiktok.com",
  "youtube.com",
  "zara.com",
];

const deniedPath =
  /(?:^|\/)(?:account|auth|cart|checkout|login|oauth|orders?|signin|signup)(?:\/|$)|\.(?:7z|apk|bin|dmg|exe|iso|msi|rar|tar|zip)(?:$|[?#])/i;

export function applyDiscoveredWebUrlPolicy(rawUrl: string) {
  const normalized = normalizeCanonicalUrl(rawUrl);
  if (!normalized) return null;
  let url: URL;
  try {
    url = validatePublicHttpsUrl(normalized);
  } catch {
    return null;
  }
  const hostname = normalizedHostname(url.hostname);
  if (
    deniedDomains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    ) ||
    deniedPath.test(`${url.pathname}${url.search}`)
  )
    return null;
  return url.toString();
}

export function classifyWebSource(rawUrl: string): WebSourceClass {
  const url = new URL(rawUrl);
  const hostname = normalizedHostname(url.hostname);
  const path = url.pathname.toLocaleLowerCase("en-US");
  if (
    listFashionEditorialSources().some(
      (source) => normalizedHostname(source.canonicalDomain) === hostname,
    )
  )
    return "FASHION_EDITORIAL";
  if (/(?:^|\.)(?:quora|stackexchange|stackoverflow)\.com$/.test(hostname))
    return "FORUM_OR_QA";
  if (/(?:forum|community|discussion)/i.test(`${hostname}${path}`))
    return "CONSUMER_DISCUSSION";
  if (/(?:review|ratings?)/i.test(path)) return "PRODUCT_REVIEW";
  if (/(?:buying-guide|buyers-guide|how-to-buy|best-)/i.test(path))
    return "BUYING_GUIDE";
  if (/(?:^|\/)(?:collections?|products?|shop|store)(?:\/|$)/i.test(path))
    return "RETAIL_CONTENT";
  if (/(?:help|faq|fit-guide|size-guide|sizing-guide)/i.test(path))
    return "BRAND_CONTENT";
  if (/(?:^|\/)(?:blog|journal|stories)(?:\/|$)/i.test(path))
    return "BRAND_CONTENT";
  if (/(?:news|analysis|report|insight)/i.test(path)) return "NEWS_OR_ANALYSIS";
  return "OTHER_WEB";
}

export function isRobotsPathAllowed(
  robotsText: string,
  targetUrl: string,
  userAgent = "StylusExternalResearch",
) {
  const groups: Array<{
    agents: string[];
    rules: Array<{ allow: boolean; pattern: string }>;
  }> = [];
  let current: (typeof groups)[number] | null = null;
  let sawRule = false;
  for (const rawLine of robotsText.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 1) continue;
    const field = line.slice(0, separator).trim().toLocaleLowerCase("en-US");
    const value = line.slice(separator + 1).trim();
    if (field === "user-agent") {
      if (!current || sawRule) {
        current = { agents: [], rules: [] };
        groups.push(current);
        sawRule = false;
      }
      current.agents.push(value.toLocaleLowerCase("en-US"));
      continue;
    }
    if (!current || (field !== "allow" && field !== "disallow")) continue;
    sawRule = true;
    if (value) current.rules.push({ allow: field === "allow", pattern: value });
  }
  const agent = userAgent.toLocaleLowerCase("en-US");
  const exact = groups.filter((group) =>
    group.agents.some(
      (candidate) => agent.includes(candidate) && candidate !== "*",
    ),
  );
  const selected = exact.length
    ? exact
    : groups.filter((group) => group.agents.includes("*"));
  const path = `${new URL(targetUrl).pathname}${new URL(targetUrl).search}`;
  const matches = selected
    .flatMap((group) => group.rules)
    .filter((rule) => robotsPatternMatches(rule.pattern, path))
    .sort(
      (left, right) =>
        right.pattern.length - left.pattern.length ||
        Number(right.allow) - Number(left.allow),
    );
  return matches[0]?.allow ?? true;
}

function robotsPatternMatches(pattern: string, path: string) {
  const anchored = pattern.endsWith("$");
  const source = pattern
    .replace(/\$$/, "")
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replaceAll("*", ".*");
  return new RegExp(`^${source}${anchored ? "$" : ""}`).test(path);
}

function normalizedHostname(value: string) {
  return value.toLocaleLowerCase("en-US").replace(/^www\./, "");
}
