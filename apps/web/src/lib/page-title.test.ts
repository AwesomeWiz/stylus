import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { conciseTitle, pageTitle } from "./page-title";
const m = vi.hoisted(() => ({
  context: vi.fn(),
  single: vi.fn(),
  eq: vi.fn(),
  is: vi.fn(),
}));
vi.mock("@/modules/onboarding/server/workspace", () => ({
  getWorkspaceContext: m.context,
}));
vi.mock("@/components/whiteboards/board-shell", () => ({
  BoardShell: () => null,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    from: () => {
      const chain = {
        select: () => chain,
        eq: (...args: unknown[]) => {
          m.eq(...args);
          return chain;
        },
        is: (...args: unknown[]) => {
          m.is(...args);
          return chain;
        },
        maybeSingle: m.single,
      };
      return chain;
    },
  }),
}));
import { generateMetadata } from "@/app/whiteboards/[boardId]/page";
beforeEach(() => {
  vi.clearAllMocks();
  m.context.mockResolvedValue({ organization: { id: "tenant-current" } });
  m.single.mockResolvedValue({ data: null, error: null });
});
describe("bounded route metadata", () => {
  it("uses plain concise titles and a stable fallback", () => {
    expect(pageTitle("Launch planning")).toBe("Launch planning — Stylus");
    expect(conciseTitle(" <b>Launch</b>\n planning ")).toBe("Launch planning");
    expect(conciseTitle(" ")).toBe("Board");
    expect(conciseTitle("A".repeat(150))).toHaveLength(80);
  });
  it("resolves Board names only through the current tenant and active RLS row", async () => {
    m.single.mockResolvedValue({
      data: { title: "Authorized launch" },
      error: null,
    });
    expect(
      await generateMetadata({
        params: Promise.resolve({
          boardId: "20000000-0000-4000-8000-000000000001",
        }),
      }),
    ).toEqual({ title: "Authorized launch" });
    expect(m.eq).toHaveBeenCalledWith("organization_id", "tenant-current");
    expect(m.is).toHaveBeenCalledWith("archived_at", null);
    m.single.mockResolvedValue({ data: null, error: null });
    expect(
      await generateMetadata({
        params: Promise.resolve({
          boardId: "20000000-0000-4000-8000-000000000002",
        }),
      }),
    ).toEqual({ title: "Board" });
    m.single.mockClear();
    expect(
      await generateMetadata({
        params: Promise.resolve({ boardId: "invalid-foreign-id" }),
      }),
    ).toEqual({ title: "Board" });
    expect(m.single).not.toHaveBeenCalled();
    m.context.mockRejectedValue(new Error("redirect:/login"));
    await expect(
      generateMetadata({
        params: Promise.resolve({
          boardId: "20000000-0000-4000-8000-000000000001",
        }),
      }),
    ).rejects.toThrow("redirect:/login");
  });
  it("declares metadata for existing primary/public routes without a client title override", () => {
    const read = (p: string) =>
      readFileSync(resolve(process.cwd(), "src", p), "utf8");
    for (const [route, title] of Object.entries({
      "(workspace)": "Home",
      "(workspace)/tasks": "Tasks",
      "(workspace)/whiteboards": "Boards",
      "(workspace)/apps/marketing": "Marketing",
      "(workspace)/settings": "Settings",
      "(workspace)/notes": "Notes",
      login: "Sign in",
      signup: "Create account",
      "onboarding/[step]": "Company setup",
    }))
      expect(read(`app/${route}/page.tsx`)).toContain(`title: "${title}"`);
    expect(read("app/layout.tsx")).toContain('template: "%s — Stylus"');
    expect(read("app/whiteboards/layout.tsx")).toContain('title: "Board"');
    expect(read("components/layout/workspace-chrome.tsx")).not.toContain(
      "document.title",
    );
  });
});
