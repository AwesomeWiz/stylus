import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  finalize: vi.fn(),
  upload: vi.fn(),
}));
vi.mock("@/modules/marketing/reel-actions", () => ({
  createCompetitorReelUploadAction: mocks.create,
  finalizeCompetitorReelUploadAction: mocks.finalize,
  requestCompetitorReelAnalysisAction: vi.fn(),
  setCompetitorReelArchivedAction: vi.fn(),
}));
vi.mock("@/modules/jobs/actions", () => ({ cancelJobAction: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: () => ({
    storage: { from: () => ({ upload: mocks.upload }) },
  }),
}));

import { CompetitorReels } from "./competitor-reels";

describe("competitor Reel upload UX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.create.mockResolvedValue({
      reelId: "reel",
      status: "success",
      storagePath: "org/reel/source.mp4",
    });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.finalize.mockResolvedValue({
      message: "Reel uploaded.",
      status: "success",
    });
  });
  it("opens a native MP4 picker for collaborators and uploads the exact selected file", async () => {
    const { container } = render(
      <CompetitorReels
        analyses={[]}
        competitorId="10000000-0000-4000-8000-000000000001"
        reels={[]}
        role="MEMBER"
        transcripts={[]}
      />,
    );
    const file = new File(["video"], "sample.mp4", { type: "video/mp4" });
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [file] },
    });
    await waitFor(() =>
      expect(mocks.upload).toHaveBeenCalledWith(
        "org/reel/source.mp4",
        file,
        expect.objectContaining({ contentType: "video/mp4", upsert: false }),
      ),
    );
    expect(await screen.findByText("Reel uploaded.")).toBeInTheDocument();
  });
  it("keeps VIEWER read-only", () => {
    const { container } = render(
      <CompetitorReels
        analyses={[]}
        competitorId="10000000-0000-4000-8000-000000000001"
        reels={[]}
        role="VIEWER"
        transcripts={[]}
      />,
    );
    expect(container.querySelector("button")).toBeNull();
  });
  it("rejects non-MP4 before any network operation", async () => {
    const { container } = render(
      <CompetitorReels
        analyses={[]}
        competitorId="10000000-0000-4000-8000-000000000001"
        reels={[]}
        role="MEMBER"
        transcripts={[]}
      />,
    );
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: {
        files: [new File(["x"], "bad.mov", { type: "video/quicktime" })],
      },
    });
    expect(
      await screen.findByText("Choose an MP4 no larger than 100 MiB."),
    ).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
