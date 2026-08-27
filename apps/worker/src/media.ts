import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { WorkerApi } from "./api.js";

const MAX_BYTES = 100 * 1024 * 1024;
const MAX_DURATION = 180;
const HELPER = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../scripts/transcribe.py",
);

export interface MediaDependencies {
  ffmpeg: string;
  ffprobe: string;
  python: string;
  whisperModel: string;
}

export async function detectMediaDependencies(
  environment = process.env,
): Promise<MediaDependencies | null> {
  const dependency = {
    ffmpeg: environment.STYLUS_WORKER_FFMPEG ?? "ffmpeg",
    ffprobe: environment.STYLUS_WORKER_FFPROBE ?? "ffprobe",
    python: environment.STYLUS_WORKER_PYTHON ?? "python",
    whisperModel: environment.STYLUS_WORKER_WHISPER_MODEL ?? "base",
  };
  try {
    await runFixed(dependency.ffprobe, ["-version"], 10_000);
    await runFixed(dependency.ffmpeg, ["-version"], 10_000);
    await runFixed(dependency.python, [HELPER, "--check"], 15_000);
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
      await runFixed(
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
    await runFixed(
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
    const sceneOutput = await runFixed(
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
    const transcriptRaw = await runFixed(
      context.dependencies.python,
      [HELPER, "--input", audio, "--model", context.dependencies.whisperModel],
      600_000,
      context.signal,
    );
    const transcript = parseTranscript(
      transcriptRaw,
      context.dependencies.whisperModel,
    );
    const sceneCount = sceneTimestamps.length;
    const result = {
      analysisId,
      averageSceneDuration: probe.durationSeconds / Math.max(1, sceneCount + 1),
      cutsPerMinute: sceneCount / (probe.durationSeconds / 60),
      durationSeconds: probe.durationSeconds,
      extractionVersion: "ffmpeg-whisper-v1" as const,
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

export function parseTranscript(raw: string, model: string) {
  const value = JSON.parse(raw) as {
    duration?: unknown;
    language?: unknown;
    segments?: unknown;
    text?: unknown;
  };
  if (
    typeof value.text !== "string" ||
    !value.text.trim() ||
    value.text.length > 100_000 ||
    !Array.isArray(value.segments) ||
    value.segments.length > 500
  )
    throw new Error("invalid_transcript");
  const segments = value.segments.map((segment) => {
    const item = segment as { end?: unknown; start?: unknown; text?: unknown };
    if (
      typeof item.start !== "number" ||
      typeof item.end !== "number" ||
      typeof item.text !== "string" ||
      item.text.length > 1000
    )
      throw new Error("invalid_transcript");
    return { end: item.end, start: item.start, text: item.text.trim() };
  });
  return {
    durationSeconds: Number(value.duration),
    engine: "faster-whisper" as const,
    language:
      typeof value.language === "string" ? value.language.slice(0, 20) : null,
    model,
    segments,
    text: value.text.trim(),
  };
}

async function runFixed(
  executable: string,
  args: string[],
  timeoutMs: number,
  signal?: AbortSignal,
  includeStderr = false,
) {
  return new Promise<string>((resolvePromise, reject) => {
    const child = spawn(executable, args, {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const cap = 1024 * 1024;
    child.stdout.on("data", (chunk) => {
      if (stdout.length < cap) stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      if (stderr.length < cap) stderr += String(chunk);
    });
    const stop = () => child.kill();
    signal?.addEventListener("abort", stop, { once: true });
    const timer = setTimeout(stop, timeoutMs);
    child.once("error", reject);
    child.once("close", (code) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", stop);
      if (code === 0)
        resolvePromise(includeStderr ? `${stdout}\n${stderr}` : stdout);
      else reject(new Error("native_dependency_failed"));
    });
  });
}
