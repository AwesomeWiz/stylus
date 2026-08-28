import { definePlugin } from "@/core/plugins/public";
import { competitorReelExtractJob } from "./competitor-reel-extract";

export const marketingPlugin = definePlugin({
  jobDefinitions: [competitorReelExtractJob],
  manifest: {
    capabilities: [
      "marketing.overview.read",
      "marketing.competitors.read",
      "marketing.competitors.write",
      "marketing.competitor-reels.analyze",
      "marketing.reels.read",
      "marketing.reels.write",
      "marketing.campaigns.read",
      "marketing.campaigns.write",
      "marketing.research.read",
      "marketing.research.write",
      "marketing.briefs.read",
      "marketing.briefs.write",
    ],
    category: "business",
    description:
      "Plan campaigns, capture Reel ideas, competitors, research, and creative briefs.",
    eventSubscriptions: [],
    icon: "megaphone",
    id: "marketing",
    memoryDomains: ["company", "marketing"],
    name: "Marketing",
    navigation: [
      {
        icon: "megaphone",
        label: "Overview",
        order: 100,
        route: "/apps/marketing",
      },
      {
        icon: "megaphone",
        label: "Competitors",
        order: 110,
        route: "/apps/marketing/competitors",
      },
      {
        icon: "megaphone",
        label: "Reel Ideas",
        order: 120,
        route: "/apps/marketing/reel-ideas",
      },
      {
        icon: "megaphone",
        label: "Campaigns",
        order: 130,
        route: "/apps/marketing/campaigns",
      },
      {
        icon: "megaphone",
        label: "Research",
        order: 140,
        route: "/apps/marketing/research",
      },
      {
        icon: "megaphone",
        label: "Creative Briefs",
        order: 150,
        route: "/apps/marketing/creative-briefs",
      },
    ],
    permissions: [
      "marketing.overview.read",
      "marketing.competitors.read",
      "marketing.competitors.write",
      "marketing.competitor-reels.analyze",
      "marketing.reels.read",
      "marketing.reels.write",
      "marketing.campaigns.read",
      "marketing.campaigns.write",
      "marketing.research.read",
      "marketing.research.write",
      "marketing.briefs.read",
      "marketing.briefs.write",
    ],
    tools: [],
    version: "0.1.0",
  },
});
