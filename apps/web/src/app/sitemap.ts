import type { MetadataRoute } from "next";
import { serverEnv } from "@/lib/env/server";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: new URL("/about", serverEnv.NEXT_PUBLIC_SITE_URL).href }];
}
