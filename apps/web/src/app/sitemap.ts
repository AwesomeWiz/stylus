import type { MetadataRoute } from "next";
import { serverEnv } from "@/lib/env/server";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/about"].map((path) => ({
    url: new URL(path, serverEnv.NEXT_PUBLIC_SITE_URL).href,
  }));
}
