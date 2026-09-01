import { describe, expect, it } from "vitest";

import {
  applyDiscoveredWebUrlPolicy,
  classifyWebSource,
  isRobotsPathAllowed,
} from "./web-source-policy";

describe("discovered web URL and robots policy", () => {
  it.each([
    "http://example.com/story",
    "https://user:password@example.com/story",
    "https://localhost/story",
    "https://127.0.0.1/story",
    "https://reddit.com/r/fashion/comments/1",
    "https://youtube.com/watch?v=1",
    "https://amazon.com/product",
    "https://example.com/account/orders",
    "https://example.com/archive.zip",
  ])("rejects prohibited discovered URL %s", (url) => {
    expect(applyDiscoveredWebUrlPolicy(url)).toBeNull();
  });

  it("normalizes safe public HTTPS URLs and removes tracking", () => {
    expect(
      applyDiscoveredWebUrlPolicy(
        "https://Example.com/article?utm_source=test&topic=fit#section",
      ),
    ).toBe("https://example.com/article?topic=fit");
  });

  it.each([
    ["https://www.vogue.com/article/sizing", "FASHION_EDITORIAL"],
    ["https://example.com/community/fit", "CONSUMER_DISCUSSION"],
    ["https://example.com/product/reviews", "PRODUCT_REVIEW"],
    ["https://example.com/buying-guide/denim", "BUYING_GUIDE"],
    ["https://example.com/products/denim", "RETAIL_CONTENT"],
    ["https://example.com/help/size-guide", "BRAND_CONTENT"],
    ["https://example.com/journal/materials", "BRAND_CONTENT"],
    ["https://example.com/analysis/returns", "NEWS_OR_ANALYSIS"],
    ["https://example.com/story", "OTHER_WEB"],
  ] as const)("classifies %s as %s", (url, sourceClass) => {
    expect(classifyWebSource(url)).toBe(sourceClass);
  });

  it("honors the most specific robots rule and allow ties", () => {
    const robots = `
      User-agent: *
      Disallow: /private
      Allow: /private/public
      Disallow: /*?download=*
    `;
    expect(
      isRobotsPathAllowed(robots, "https://example.com/private/story"),
    ).toBe(false);
    expect(
      isRobotsPathAllowed(robots, "https://example.com/private/public/story"),
    ).toBe(true);
    expect(
      isRobotsPathAllowed(robots, "https://example.com/story?download=pdf"),
    ).toBe(false);
    expect(isRobotsPathAllowed(robots, "https://example.com/story")).toBe(true);
  });

  it("prefers the Stylus-specific robots group over wildcard rules", () => {
    const robots = `
      User-agent: *
      Allow: /
      User-agent: StylusExternalResearch
      Disallow: /
    `;
    expect(isRobotsPathAllowed(robots, "https://example.com/story")).toBe(
      false,
    );
  });
});
