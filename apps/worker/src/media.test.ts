import { access, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  detectMediaDependencies,
  extractCompetitorReel,
  parseProbe,
  parseTranscript,
  runFixed,
  transcribeWithWhisperCpp,
  type MediaDependencies,
} from "./media.js";

const dependencies: MediaDependencies = {
  ffmpeg: "fixed-ffmpeg",
  ffprobe: "fixed-ffprobe",
  whisperCpp: "C:\\approved\\whisper-cli.exe",
  whisperModelPath: "C:\\models\\ggml-base.bin",
};

const whisperJson = JSON.stringify({
  result: { language: "en" },
  transcription: [
    { offsets: { from: 0, to: 1250 }, text: " Hook " },
    { offsets: { from: 1250, to: 2500 }, text: "Value" },
  ],
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

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

  it("maps whisper.cpp JSON offsets and language into the existing contract", () => {
    expect(parseTranscript(whisperJson, "ggml-base.bin", 3)).toEqual({
      durationSeconds: 3,
      engine: "whisper.cpp",
      language: "en",
      model: "ggml-base.bin",
      segments: [
        { end: 1.25, start: 0, text: "Hook" },
        { end: 2.5, start: 1.25, text: "Value" },
      ],
      text: "Hook Value",
    });
  });

  it("handles untrusted language safely and rejects malformed output", () => {
    const invalidLanguage = JSON.stringify({
      result: { language: "../../secret" },
      transcription: [{ offsets: { from: 0, to: 500 }, text: "Safe" }],
    });
    expect(parseTranscript(invalidLanguage, "base.bin", 1).language).toBeNull();
    expect(() => parseTranscript("{}", "base.bin", 1)).toThrow(
      "invalid_transcript",
    );
    expect(() => parseTranscript("not-json", "base.bin", 1)).toThrow(
      "invalid_transcript",
    );
  });

  it.each([
    ["negative", { from: -1, to: 10 }],
    ["reversed", { from: 20, to: 10 }],
    ["outside media", { from: 0, to: 1001 }],
  ])("rejects %s timestamps", (_name, offsets) => {
    expect(() =>
      parseTranscript(
        JSON.stringify({
          transcription: [{ offsets, text: "Unsafe" }],
        }),
        "base.bin",
        1,
      ),
    ).toThrow("invalid_transcript");
  });

  it("rejects excessive segment and transcript output", () => {
    expect(() =>
      parseTranscript(
        JSON.stringify({
          transcription: Array.from({ length: 501 }, () => ({
            offsets: { from: 0, to: 1 },
            text: "x",
          })),
        }),
        "base.bin",
        1,
      ),
    ).toThrow("invalid_transcript");
    expect(() =>
      parseTranscript(
        JSON.stringify({
          transcription: Array.from({ length: 101 }, (_, index) => ({
            offsets: { from: index, to: index + 1 },
            text: "x".repeat(1000),
          })),
        }),
        "base.bin",
        1,
      ),
    ).toThrow("invalid_transcript");
  });
});

describe("whisper.cpp execution boundary", () => {
  it("uses fixed worker configuration, generated WAV input, and controlled output", async () => {
    const run = vi.fn().mockResolvedValue("");
    const transcript = await transcribeWithWhisperCpp(
      "C:\\temp\\audio.wav",
      "C:\\temp\\transcript",
      3,
      dependencies,
      new AbortController().signal,
      {
        readFile: vi.fn().mockResolvedValue(whisperJson),
        run,
        stat: vi.fn().mockResolvedValue({ isFile: () => true, size: 500 }),
      } as never,
    );
    expect(run).toHaveBeenCalledWith(
      "C:\\approved\\whisper-cli.exe",
      [
        "--model",
        "C:\\models\\ggml-base.bin",
        "--file",
        "C:\\temp\\audio.wav",
        "--language",
        "auto",
        "--output-json",
        "--output-file",
        "C:\\temp\\transcript",
        "--no-prints",
      ],
      600_000,
      expect.any(AbortSignal),
    );
    expect(transcript.model).toBe("ggml-base.bin");
  });

  it("rejects an oversized JSON sidecar before reading it", async () => {
    const readOutput = vi.fn();
    await expect(
      transcribeWithWhisperCpp(
        "audio.wav",
        "output",
        3,
        dependencies,
        new AbortController().signal,
        {
          readFile: readOutput,
          run: vi.fn().mockResolvedValue(""),
          stat: vi.fn().mockResolvedValue({
            isFile: () => true,
            size: 1024 * 1024 + 1,
          }),
        } as never,
      ),
    ).rejects.toThrow("invalid_transcript");
    expect(readOutput).not.toHaveBeenCalled();
  });

  it("terminates fixed native processes on timeout and cancellation", async () => {
    await expect(
      runFixed(process.execPath, ["-e", "setInterval(() => {}, 1000)"], 25),
    ).rejects.toThrow("native_dependency_timeout");
    const controller = new AbortController();
    const running = runFixed(
      process.execPath,
      ["-e", "setInterval(() => {}, 1000)"],
      5_000,
      controller.signal,
    );
    controller.abort();
    await expect(running).rejects.toThrow("native_dependency_cancelled");
  });

  it("uses shell-free spawn in the repository-owned process boundary", async () => {
    const source = await readFile(
      new URL("./media.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain("shell: false");
    expect(source).not.toContain("cmd.exe");
    expect(source).not.toContain("powershell");
    expect(source).not.toMatch(/console\.(log|error)/);
  });
});

describe("temporary artifact lifecycle", () => {
  it("removes MP4, WAV, and JSON output after extraction", async () => {
    let controlledDirectory = "";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3]))),
    );
    const run = vi.fn(async (executable: string, args: string[]) => {
      if (executable === dependencies.ffprobe) {
        controlledDirectory = dirname(args.at(-1) ?? "");
        return JSON.stringify({
          format: { duration: "3", format_name: "mp4" },
          streams: [
            {
              codec_type: "video",
              height: 1920,
              r_frame_rate: "30/1",
              width: 1080,
            },
          ],
        });
      }
      if (executable === dependencies.whisperCpp) {
        const outputBase = args[args.indexOf("--output-file") + 1];
        await writeFile(`${outputBase}.json`, whisperJson);
      }
      return "";
    });
    const api = {
      mediaAuthorization: vi.fn().mockResolvedValue({
        analysisId: "analysis",
        downloadUrl: "https://signed.invalid/source",
        reelId: "reel",
        sourceSizeBytes: 3,
      }),
      operation: vi.fn().mockResolvedValue({}),
      persistExtraction: vi.fn().mockResolvedValue({}),
    };
    await expect(
      extractCompetitorReel(
        { analysisId: "analysis", reelId: "reel" },
        {
          api: api as never,
          dependencies,
          jobId: "job",
          run,
          signal: new AbortController().signal,
        },
      ),
    ).resolves.toMatchObject({ analysisId: "analysis", reelId: "reel" });
    expect(api.persistExtraction).toHaveBeenCalledOnce();
    await expect(access(controlledDirectory)).rejects.toThrow();
  });
});

describe("Marketing capability prerequisites", () => {
  const environment = {
    STYLUS_WORKER_WHISPER_CPP_PATH: "fixed-whisper",
    STYLUS_WORKER_WHISPER_MODEL_PATH: "fixed-model",
  };

  it("requires explicit executable and model configuration", async () => {
    await expect(detectMediaDependencies({})).resolves.toBeNull();
  });

  it("advertises media support only after every fixed prerequisite passes", async () => {
    const services = successfulServices();
    await expect(
      detectMediaDependencies(environment, services as never),
    ).resolves.toEqual({
      ffmpeg: "ffmpeg",
      ffprobe: "ffprobe",
      whisperCpp: "fixed-whisper",
      whisperModelPath: "fixed-model",
    });
    expect(services.run).toHaveBeenLastCalledWith(
      "fixed-whisper",
      ["--help"],
      15_000,
      undefined,
      true,
    );
  });

  it.each(["missing model", "blocked executable", "incompatible CLI"])(
    "disables media support for %s",
    async (failure) => {
      const services = successfulServices();
      if (failure === "missing model")
        services.access.mockRejectedValue(new Error("missing"));
      if (failure === "blocked executable")
        services.run.mockRejectedValue(new Error("blocked"));
      if (failure === "incompatible CLI")
        services.run.mockResolvedValue("unrelated help");
      await expect(
        detectMediaDependencies(environment, services as never),
      ).resolves.toBeNull();
    },
  );
});

function successfulServices() {
  return {
    access: vi.fn().mockResolvedValue(undefined),
    run: vi
      .fn()
      .mockResolvedValueOnce("ffprobe")
      .mockResolvedValueOnce("ffmpeg")
      .mockResolvedValue("--model --file --output-json --output-file"),
    stat: vi.fn().mockResolvedValue({ isFile: () => true, size: 42 }),
  };
}
