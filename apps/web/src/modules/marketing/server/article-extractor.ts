import "server-only";

import { DomUtils, ElementType, parseDocument } from "htmlparser2";

import { externalResearchLimits } from "../external-research";
import { normalizePlainText } from "./research-sources";

const REMOVED_TAGS = new Set([
  "aside",
  "canvas",
  "dialog",
  "footer",
  "form",
  "header",
  "iframe",
  "nav",
  "noscript",
  "script",
  "style",
  "svg",
]);
const CONTENT_TAGS = new Set([
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "li",
  "p",
  "pre",
]);
const BOILERPLATE =
  /(?:^|[-_\s])(advert|banner|cookie|footer|header|menu|nav|newsletter|popup|promo|related|share|sidebar|social)(?:$|[-_\s])/i;
const BOILERPLATE_ROLES = new Set([
  "banner",
  "complementary",
  "contentinfo",
  "dialog",
  "navigation",
]);

export type ExtractedArticle = {
  chunks: string[];
  normalizedCharacters: number;
  title: string | null;
};

export function extractArticleContent(html: string): ExtractedArticle {
  if (html.includes("\0")) throw new Error("Article extraction failed.");
  const document = parseDocument(html, {
    decodeEntities: true,
    lowerCaseAttributeNames: true,
    lowerCaseTags: true,
  });
  const elements = DomUtils.getElementsByTagName(() => true, document.children);
  for (const element of elements) {
    const marker = `${element.attribs.id ?? ""} ${element.attribs.class ?? ""}`;
    if (
      REMOVED_TAGS.has(element.name) ||
      BOILERPLATE.test(marker) ||
      BOILERPLATE_ROLES.has((element.attribs.role ?? "").toLowerCase())
    )
      DomUtils.removeElement(element);
  }

  const title =
    normalizePlainText(
      DomUtils.textContent(
        DomUtils.getElementsByTagName("title", document.children, true, 1),
      ),
      300,
    ) || null;
  const root =
    DomUtils.getElementsByTagName("article", document.children, true, 1)[0] ??
    DomUtils.getElementsByTagName("main", document.children, true, 1)[0] ??
    DomUtils.getElementsByTagName("body", document.children, true, 1)[0] ??
    document;
  const blocks = DomUtils.getElementsByTagName(
    (name) => CONTENT_TAGS.has(name),
    root,
  )
    .filter((element) => !hasContentAncestor(element, root))
    .map((element) =>
      normalizePlainText(
        DomUtils.textContent(element),
        externalResearchLimits.articleNormalizedCharacters,
      ),
    )
    .filter(Boolean);
  const fallback = normalizePlainText(
    DomUtils.textContent(root),
    externalResearchLimits.articleNormalizedCharacters,
  );
  const uniqueBlocks = [...new Set(blocks.length ? blocks : [fallback])].filter(
    Boolean,
  );
  const chunks = chunkArticleBlocks(uniqueBlocks);
  return {
    chunks,
    normalizedCharacters: chunks.reduce(
      (characters, chunk) => characters + chunk.length,
      0,
    ),
    title,
  };
}

export function chunkArticleBlocks(
  blocks: string[],
  maximum = externalResearchLimits.evidenceExcerptCharacters,
  maximumChunks = externalResearchLimits.articleChunksPerStory,
) {
  const chunks: string[] = [];
  let current = "";
  const append = (part: string) => {
    if (!part) return;
    if (!current) {
      current = part;
      return;
    }
    if (current.length + 2 + part.length <= maximum) {
      current += `\n\n${part}`;
      return;
    }
    chunks.push(current);
    current = part;
  };
  for (const block of blocks) {
    if (chunks.length >= maximumChunks) break;
    let remaining = block;
    while (remaining.length > maximum && chunks.length < maximumChunks) {
      if (current) {
        chunks.push(current);
        current = "";
        if (chunks.length >= maximumChunks) break;
      }
      const boundary = splitBoundary(remaining, maximum);
      chunks.push(remaining.slice(0, boundary).trim());
      remaining = remaining.slice(boundary).trim();
    }
    if (chunks.length < maximumChunks) append(remaining);
  }
  if (current && chunks.length < maximumChunks) chunks.push(current);
  return chunks.filter(Boolean).slice(0, maximumChunks);
}

function splitBoundary(value: string, maximum: number) {
  const segment = value.slice(0, maximum + 1);
  const sentence = Math.max(
    segment.lastIndexOf(". "),
    segment.lastIndexOf("? "),
    segment.lastIndexOf("! "),
  );
  if (sentence >= Math.floor(maximum * 0.6)) return sentence + 1;
  const whitespace = segment.lastIndexOf(" ", maximum);
  return whitespace >= Math.floor(maximum * 0.6) ? whitespace : maximum;
}

function hasContentAncestor(
  element: ReturnType<typeof DomUtils.getElementsByTagName>[number],
  root: ReturnType<typeof parseDocument> | typeof element,
) {
  let parent = element.parent;
  while (parent && parent !== root) {
    if (
      ElementType.isTag(parent) &&
      "name" in parent &&
      CONTENT_TAGS.has(parent.name)
    )
      return true;
    parent = parent.parent;
  }
  return false;
}
