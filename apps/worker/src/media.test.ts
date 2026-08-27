import { describe, expect, it } from "vitest";

import { parseProbe, parseTranscript } from "./media.js";

describe("fixed competitor Reel extraction parsers", () => {
  it("parses bounded ffprobe MP4 metadata", () => {
    expect(
      parseProbe(
        JSON.stringify({
          format: { duration: "12.5", format_name: "mov,mp4" },
          streams: [
            {
              codec_type: "video",
              height: 1920,
              r_frame_rate: "30/1",
              width: 1080,
            },
          ],
        }),
      ),
    ).toEqual({
      durationSeconds: 12.5,
      frameRate: 30,
      height: 1920,
      width: 1080,
    });
  });
  it("rejects malformed media metadata", () => {
    expect(() => parseProbe("{}")).toThrow("invalid_mp4");
  });
  it("parses bounded helper JSON and rejects malformed output", () => {
    expect(
      parseTranscript(
        JSON.stringify({
          duration: 5,
          language: "en",
          segments: [{ start: 0, end: 1, text: " Hook " }],
          text: "Hook",
        }),
        "base",
      ).segments[0]?.text,
    ).toBe("Hook");
    expect(() => parseTranscript("{}", "base")).toThrow("invalid_transcript");
  });
});
