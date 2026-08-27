import { spawn } from "node:child_process";
import { constants } from "node:fs";
import {
  access,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import type { WorkerApi } from "./api.js";

const MAX_BYTES = 100 * 1024 * 1024;
const MAX_DURATION = 180;
const MAX_NATIVE_OUTPUT_BYTES = 1024 * 1024;
const TRANSCRIPT_TIMEOUT_MS = 600_000;

export interface MediaDependencies {
  ffmpeg: string;
  ffprobe: string;
  whisperCpp: string;
  whisperModelPath: string;
}

interface DependencyDetectionServices {
  access: typeof access;
  run: typeof runFixed;
  stat: typeof stat;
}

export async function detectMediaDependencies(
  environment = process.env,
  services: DependencyDetectionServices = { access, run: runFixed, stat },
): Promise<MediaDependencies | null> {
  const whisperCpp = environment.STYLUS_WORKER_WHISPER_CPP_PATH?.trim();
  const whisperModelPath = environment.STYLUS_WORKER_WHISPER_MODEL_PATH?.trim();
  if (!whisperCpp || !whisperModelPath) return null;
  const dependency = {
    ffmpeg: environment.STYLUS_WORKER_FFMPEG ?? "ffmpeg",
    ffprobe: environment.STYLUS_WORKER_FFPROBE ?? "ffprobe",
    whisperCpp,
    whisperModelPath,
  };
  try {
    await services.run(dependency.ffprobe, ["-version"], 10_000);
    await services.run(dependency.ffmpeg, ["-version"], 10_000);
    await services.access(dependency.whisperModelPath, constants.R_OK);
    const model = await services.stat(dependency.whisperModelPath);
    if (!model.isFile() || model.size < 1) return null;
    const help = await services.run(
      dependency.whisperCpp,
      ["--help"],
      15_000,
      undefined,
      true,
    );
    if (
      !help.includes("--output-json") ||
      !help.includes("--output-file") ||
      !help.includes("--model") ||
      !help.includes("--file")
    )
      return null;
    return dependency;
  } catch {
    return null;
  }
}

export async function extractCompetitorReel(
  input: unknown,
  context: {
    api: WorkerApi;
    dependencies: MediaDependencies;
    jobId: string;
    run?: typeof runFixed;
    signal: AbortSignal;
  },
) {
  if (!input || typeof input !== "object") throw new Error("invalid_media_job");
  const reelId = (input as { reelId?: unknown }).reelId;
  const analysisId = (input as { analysisId?: unknown }).analysisId;
  if (typeof reelId !== "string" || typeof analysisId !== "string")
    throw new Error("invalid_media_job");
  const directory = await mkdtemp(join(tmpdir(), "stylus-reel-"));
  const source = join(directory, "source.mp4");
  const audio = join(directory, "audio.wav");
  const transcriptOutput = join(directory, "transcript");
  const run = context.run ?? runFixed;
  try {
    await context.api.operation("progress", context.jobId, {
      message: "Authorizing source media.",
      progress: 5,
    });
    const authorization = await context.api.mediaAuthorization(context.jobId);
    if (
      authorization.reelId !== reelId ||
      authorization.analysisId !== analysisId
    )
      throw new Error("media_authorization_mismatch");
    await downloadBounded(
      authorization.downloadUrl,
      source,
      authorization.sourceSizeBytes,
      context.signal,
    );
    await context.api.operation("progress", context.jobId, {
      message: "Inspecting MP4 metadata.",
      progress: 20,
    });
    const probe = parseProbe(
      await run(
        context.dependencies.ffprobe,
        [
          "-v",
          "error",
          "-show_entries",
          "format=duration,format_name:stream=codec_type,width,height,r_frame_rate",
          "-of",
          "json",
          source,
        ],
        60_000,
        context.signal,
      ),
    );
    if (probe.durationSeconds > MAX_DURATION)
      throw new Error("media_duration_exceeded");
    await run(
      context.dependencies.ffmpeg,
      [
        "-nostdin",
        "-v",
        "error",
        "-i",
        source,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-y",
        audio,
      ],
      120_000,
      context.signal,
    );
    await context.api.operation("progress", context.jobId, {
      message: "Detecting bounded scene changes.",
      progress: 45,
    });
    const sceneOutput = await run(
      context.dependencies.ffmpeg,
      [
        "-nostdin",
        "-i",
        source,
        "-filter:v",
        "select='gt(scene,0.4)',showinfo",
        "-an",
        "-f",
        "null",
        "-",
      ],
      120_000,
      context.signal,
      true,
    );
    const sceneTimestamps = [...sceneOutput.matchAll(/pts_time:([0-9.]+)/g)]
      .map((match) => Number(match[1]))
      .filter(Number.isFinite)
      .slice(0, 20);
    await context.api.operation("progress", context.jobId, {
      message: "Transcribing audio locally.",
      progress: 65,
    });
    const transcript = await transcribeWithWhisperCpp(
      audio,
      transcriptOutput,
      probe.durationSeconds,
      context.dependencies,
      context.signal,
      { readFile, run, stat },
    );
    const sceneCount = sceneTimestamps.length;
    const result = {
      analysisId,
      averageSceneDuration: probe.durationSeconds / Math.max(1, sceneCount + 1),
      cutsPerMinute: sceneCount / (probe.durationSeconds / 60),
      durationSeconds: probe.durationSeconds,
      extractionVersion: "ffmpeg-whisper-cpp-v1" as const,
      frameRate: probe.frameRate,
      height: probe.height,
      reelId,
      sceneCount,
      sceneTimestamps,
      transcript,
      width: probe.width,
    };
    await context.api.operation("progress", context.jobId, {
      message: "Persisting extraction and interpretation.",
      progress: 85,
    });
    await context.api.persistExtraction(context.jobId, result);
    return {
      analysisId,
      durationSeconds: result.durationSeconds,
      extractionVersion: result.extractionVersion,
      reelId,
    };
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

async function downloadBounded(
  url: string,
  path: string,
  expected: number,
  signal: AbortSignal,
) {
  if (expected < 1 || expected > MAX_BYTES)
    throw new Error("media_size_invalid");
  const response = await fetch(url, { redirect: "error", signal });
  if (!response.ok) throw new Error("media_download_failed");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== expected || bytes.byteLength > MAX_BYTES)
    throw new Error("media_size_mismatch");
  await writeFile(path, bytes);
}

export function parseProbe(raw: string) {
  const value = JSON.parse(raw) as {
    format?: { duration?: string; format_name?: string };
    streams?: Array<{
      codec_type?: string;
      height?: number;
      r_frame_rate?: string;
      width?: number;
    }>;
  };
  const video = value.streams?.find((stream) => stream.codec_type === "video");
  const durationSeconds = Number(value.format?.duration);
  const [numerator = 0, denominator = 1] = String(video?.r_frame_rate ?? "0/1")
    .split("/")
    .map(Number);
  const frameRate = numerator / denominator;
  if (
    !value.format?.format_name?.includes("mp4") ||
    !video?.width ||
    !video.height ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    !Number.isFinite(frameRate) ||
    frameRate <= 0
  )
    throw new Error("invalid_mp4");
  return {
    durationSeconds,
    frameRate,
    height: video.height,
    width: video.width,
  };
}

export async function transcribeWithWhisperCpp(
  audioPath: string,
  outputBasePath: string,
  mediaDurationSeconds: number,
  dependencies: MediaDependencies,
  signal: AbortSignal,
  services: Pick<DependencyDetectionServices, "run" | "stat"> & {
    readFile: typeof readFile;
  } = { readFile, run: runFixed, stat },
) {
  await services.run(
    dependencies.whisperCpp,
    [
      "--model",
      dependencies.whisperModelPath,
      "--file",
      audioPath,
      "--language",
      "auto",
      "--output-json",
      "--output-file",
      outputBasePath,
      "--no-prints",
    ],
    TRANSCRIPT_TIMEOUT_MS,
    signal,
  );
  const outputPath = `${outputBasePath}.json`;
  const output = await services.stat(outputPath);
  if (
    !output.isFile() ||
    output.size < 2 ||
    output.size > MAX_NATIVE_OUTPUT_BYTES
  )
    throw new Error("invalid_transcript");
  return parseTranscript(
    await services.readFile(outputPath, "utf8"),
    basename(dependencies.whisperModelPath),
    mediaDurationSeconds,
  );
}

export function parseTranscript(
  raw: string,
  model: string,
  mediaDurationSeconds: number,
) {
  if (raw.includes("\uFFFD")) throw new Error("invalid_transcript");
  let value: {
    result?: { language?: unknown };
    transcription?: unknown;
  };
  try {
    value = JSON.parse(raw) as typeof value;
  } catch {
    throw new Error("invalid_transcript");
  }
  if (!Array.isArray(value.transcription) || value.transcription.length > 500)
    throw new Error("invalid_transcript");
  let previousStart = -1;
  const segments = value.transcription.map((segment) => {
    const item = segment as {
      offsets?: { from?: unknown; to?: unknown };
      text?: unknown;
    };
    const startMs = item.offsets?.from;
    const endMs = item.offsets?.to;
    if (
      typeof startMs !== "number" ||
      typeof endMs !== "number" ||
      !Number.isFinite(startMs) ||
      !Number.isFinite(endMs) ||
      !Number.isInteger(startMs) ||
      !Number.isInteger(endMs) ||
      startMs < 0 ||
      endMs < startMs ||
      startMs < previousStart ||
      endMs / 1000 > mediaDurationSeconds ||
      typeof item.text !== "string" ||
      item.text.includes("\uFFFD") ||
      !item.text.trim() ||
      item.text.length > 1000
    )
      throw new Error("invalid_transcript");
    previousStart = startMs;
    return {
      end: endMs / 1000,
      start: startMs / 1000,
      text: item.text.trim(),
    };
  });
  const text = segments.map((segment) => segment.text).join(" ");
  if (!text || text.length > 100_000) throw new Error("invalid_transcript");
  const language = value.result?.language;
  return {
    durationSeconds: mediaDurationSeconds,
    engine: "whisper.cpp" as const,
    language:
      typeof language === "string" && /^[a-z][a-z0-9-]{1,19}$/i.test(language)
        ? language
        : null,
    model: model.slice(0, 100),
    segments,
    text,
  };
}

export async function runFixed(
  executable: string,
  args: string[],
  timeoutMs: number,
  signal?: AbortSignal,
  includeStderr = false,
) {
  return new Promise<string>((resolvePromise, reject) => {
    if (signal?.aborted) {
      reject(new Error("native_dependency_cancelled"));
      return;
    }
    const child = spawn(executable, args, {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let stopReason: "cancelled" | "output" | "timeout" | null = null;
    const settle = (error?: Error, output?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolvePromise(output ?? "");
    };
    const append = (target: "stdout" | "stderr", chunk: unknown) => {
      const next = String(chunk);
      const current = target === "stdout" ? stdout : stderr;
      if (
        Buffer.byteLength(current) + Buffer.byteLength(next) >
        MAX_NATIVE_OUTPUT_BYTES
      ) {
        stopReason = "output";
        child.kill();
        return;
      }
      if (target === "stdout") stdout += next;
      else stderr += next;
    };
    child.stdout.on("data", (chunk) => {
      append("stdout", chunk);
    });
    child.stderr.on("data", (chunk) => {
      append("stderr", chunk);
    });
    const abort = () => {
      stopReason = "cancelled";
      child.kill();
    };
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => {
      stopReason = "timeout";
      child.kill();
    }, timeoutMs);
    child.once("error", () => settle(new Error("native_dependency_failed")));
    child.once("close", (code) => {
      if (stopReason === "cancelled")
        settle(new Error("native_dependency_cancelled"));
      else if (stopReason === "timeout")
        settle(new Error("native_dependency_timeout"));
      else if (stopReason === "output")
        settle(new Error("native_output_exceeded"));
      else if (code === 0)
        settle(undefined, includeStderr ? `${stdout}\n${stderr}` : stdout);
      else settle(new Error("native_dependency_failed"));
    });
  });
}
