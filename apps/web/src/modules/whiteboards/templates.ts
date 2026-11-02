import type { BoardElementRow } from "@/lib/supabase/database.types";
import { createLocalObject } from "./operations";
import type { boardTemplateValues } from "./schemas";
export type BoardTemplateKey = (typeof boardTemplateValues)[number];
export interface BoardTemplate {
  key: BoardTemplateKey;
  name: string;
  purpose: string;
  sections: readonly string[];
}
/** Bounded native initialization definitions; future providers can use this shape. */
export const boardTemplates: readonly BoardTemplate[] = [
  {
    key: "blank",
    name: "Blank Board",
    purpose: "Start with an open canvas.",
    sections: [],
  },
  {
    key: "brand-moodboard",
    name: "Brand Moodboard",
    purpose: "Align visual references and a selected direction.",
    sections: [
      "References",
      "Palette notes",
      "Type direction",
      "Selected direction",
    ],
  },
  {
    key: "campaign",
    name: "Campaign Board",
    purpose: "Connect an objective, evidence and concepts.",
    sections: [
      "Objective",
      "Audience",
      "Evidence",
      "Concepts",
      "Selected work",
    ],
  },
  {
    key: "reel-storyboard",
    name: "Reel Storyboard",
    purpose: "Plan scenes and production without creating a brief.",
    sections: [
      "Hook · suggested 0–3s",
      "Setup · 3–10s",
      "Value · 10–25s",
      "Payoff · 25–30s",
      "CTA",
    ],
  },
  {
    key: "research-synthesis",
    name: "Research Synthesis",
    purpose: "Separate evidence, interpretation and opportunities.",
    sections: ["Evidence", "Themes", "Contradictions", "Opportunities"],
  },
  {
    key: "competitor-inspiration",
    name: "Competitor Inspiration",
    purpose: "Study patterns and define your differentiation.",
    sections: ["References", "Abstract patterns", "Differentiation"],
  },
  {
    key: "brainstorm",
    name: "Brainstorm / Workshop",
    purpose: "Collect ideas and converge on a decision.",
    sections: ["Prompt", "Ideas", "Grouped themes", "Final selection"],
  },
];
export function boardTemplate(key: string | null | undefined) {
  return boardTemplates.find((entry) => entry.key === key);
}
export function initializeTemplate(
  key: BoardTemplateKey,
  boardId: string,
  organizationId: string,
  userId: string,
) {
  const template = boardTemplate(key);
  if (!template) throw new Error("Choose an available board template.");
  const rows: BoardElementRow[] = [];
  template.sections.forEach((name, index) => {
    const position = { x: (index % 3) * 720, y: Math.floor(index / 3) * 520 };
    const section = createLocalObject(
      "SECTION",
      boardId,
      organizationId,
      userId,
      rows,
      position,
      { content: { title: name, collapsed: false }, z_index: -100 + index },
    );
    rows.push(section);
    rows.push(
      createLocalObject(
        "STICKY",
        boardId,
        organizationId,
        userId,
        rows,
        { x: position.x + 32, y: position.y + 64 },
        {
          parent_id: section.id,
          content: { text: "Add your team's context here." },
        },
      ),
    );
  });
  return rows;
}
