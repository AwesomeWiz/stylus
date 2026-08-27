"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Archive, FileVideo, Play, RotateCcw, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type {
  MarketingCompetitorReelAnalysisRow,
  MarketingCompetitorReelRow,
  MarketingCompetitorReelTranscriptRow,
  OrganizationRole,
} from "@/lib/supabase/database.types";
import { cancelJobAction } from "@/modules/jobs/actions";
import { initialJobActionState } from "@/modules/jobs/schemas";
import { canMutateMarketing } from "@/modules/marketing/authorization";
import {
  createCompetitorReelUploadAction,
  finalizeCompetitorReelUploadAction,
  requestCompetitorReelAnalysisAction,
  setCompetitorReelArchivedAction,
} from "@/modules/marketing/reel-actions";
import { competitorReelAnalysisSchema } from "@/modules/marketing/reel-analysis";
import { initialMarketingActionState } from "@/modules/marketing/schemas";

export function CompetitorReels({
  analyses,
  competitorId,
  reels,
  role,
  transcripts,
}: {
  analyses: MarketingCompetitorReelAnalysisRow[];
  competitorId: string;
  reels: MarketingCompetitorReelRow[];
  role: OrganizationRole;
  transcripts: MarketingCompetitorReelTranscriptRow[];
}) {
  const editable = canMutateMarketing(role);
  return (
    <section aria-labelledby="competitor-reels-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-y py-3">
        <div>
          <h2 className="font-semibold" id="competitor-reels-heading">
            Competitor Reels
          </h2>
          <p className="text-muted-foreground text-sm">
            Manual MP4 analysis with local extraction and transcript-aware
            strategy.
          </p>
        </div>
        {editable ? <ReelUpload competitorId={competitorId} /> : null}
      </div>
      {reels.length ? (
        <div className="divide-y border-y">
          {reels.map((reel) => (
            <ReelRow
              analyses={analyses.filter(
                (item) => item.competitor_reel_id === reel.id,
              )}
              editable={editable}
              key={reel.id}
              reel={reel}
              transcript={transcripts.find(
                (item) => item.competitor_reel_id === reel.id,
              )}
            />
          ))}
        </div>
      ) : (
        <div className="border-y py-10 text-center">
          <FileVideo className="text-muted-foreground mx-auto size-6" />
          <p className="mt-2 font-medium">No competitor Reels</p>
          <p className="text-muted-foreground text-sm">
            Upload a permitted MP4 to begin.
          </p>
        </div>
      )}
    </section>
  );
}

function ReelUpload({ competitorId }: { competitorId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  async function selected(file?: File) {
    if (!file) return;
    if (file.type !== "video/mp4" || file.size > 100 * 1024 * 1024) {
      setMessage("Choose an MP4 no larger than 100 MiB.");
      return;
    }
    startTransition(async () => {
      const form = new FormData();
      form.set("competitorId", competitorId);
      form.set("fileName", file.name);
      form.set("fileSize", String(file.size));
      form.set("mimeType", file.type);
      form.set("sourceUrl", sourceUrl);
      const prepared = await createCompetitorReelUploadAction(form);
      if (!prepared.reelId || !prepared.storagePath) {
        setMessage(prepared.message);
        return;
      }
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.storage
        .from("marketing-reel-media")
        .upload(prepared.storagePath, file, {
          contentType: "video/mp4",
          upsert: false,
        });
      if (error) {
        setMessage(
          "The MP4 upload failed safely. You can try again with a new Reel.",
        );
        return;
      }
      const finalize = new FormData();
      finalize.set("reelId", prepared.reelId);
      const result = await finalizeCompetitorReelUploadAction(finalize);
      setMessage(result.message);
      if (result.status === "success") setSourceUrl("");
    });
  }
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-52">
        <span className="mb-1 block text-xs font-medium">
          Optional source URL
        </span>
        <Input
          disabled={pending}
          onChange={(event) => setSourceUrl(event.target.value)}
          placeholder="https://instagram.com/reel/…"
          type="url"
          value={sourceUrl}
        />
      </label>
      <input
        accept="video/mp4,.mp4"
        className="sr-only"
        onChange={(event) => void selected(event.target.files?.[0])}
        ref={input}
        type="file"
      />
      <Button disabled={pending} onClick={() => input.current?.click()}>
        <Upload className="size-4" />
        {pending ? "Uploading…" : "Add Reel"}
      </Button>
      {message ? (
        <p className="basis-full text-sm" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function ReelRow({
  analyses,
  editable,
  reel,
  transcript,
}: {
  analyses: MarketingCompetitorReelAnalysisRow[];
  editable: boolean;
  reel: MarketingCompetitorReelRow;
  transcript?: MarketingCompetitorReelTranscriptRow;
}) {
  const latest = analyses[0];
  const parsed = latest?.structured_result
    ? competitorReelAnalysisSchema.safeParse(latest.structured_result)
    : null;
  const active = latest && ["QUEUED", "PROCESSING"].includes(latest.status);
  const [analysisState, analyze, analyzing] = useActionState(
    requestCompetitorReelAnalysisAction,
    initialMarketingActionState,
  );
  const [archiveState, archive, archiving] = useActionState(
    setCompetitorReelArchivedAction,
    initialMarketingActionState,
  );
  const [cancelState, cancel, cancelling] = useActionState(
    cancelJobAction,
    initialJobActionState,
  );
  return (
    <article className="space-y-4 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">
            {reel.original_filename ?? "Competitor Reel"}
          </p>
          <p className="text-muted-foreground text-sm">
            {reel.processing_status} ·{" "}
            {new Intl.DateTimeFormat("en-GB", {
              dateStyle: "medium",
              timeZone: "UTC",
            }).format(new Date(reel.created_at))}
          </p>
          {reel.source_url ? (
            <a
              className="text-sm underline"
              href={reel.source_url}
              rel="noreferrer"
              target="_blank"
            >
              Source metadata
            </a>
          ) : null}
        </div>
        {editable ? (
          <div className="flex gap-2">
            {!reel.archived_at &&
            ["UPLOADED", "ANALYZED", "FAILED", "CANCELLED"].includes(
              reel.processing_status,
            ) ? (
              <form action={analyze}>
                <input name="reelId" type="hidden" value={reel.id} />
                <Button disabled={analyzing} type="submit" variant="secondary">
                  <Play className="size-4" />
                  {analyses.length ? "Re-extract & analyze" : "Analyze"}
                </Button>
              </form>
            ) : null}
            {active && latest.job_id ? (
              <form action={cancel}>
                <input name="jobId" type="hidden" value={latest.job_id} />
                <Button
                  aria-label="Cancel analysis"
                  disabled={cancelling}
                  size="icon"
                  type="submit"
                  variant="ghost"
                >
                  <X className="size-4" />
                </Button>
              </form>
            ) : null}
            <form action={archive}>
              <input name="reelId" type="hidden" value={reel.id} />
              <input
                name="archived"
                type="hidden"
                value={String(!reel.archived_at)}
              />
              <Button
                aria-label={reel.archived_at ? "Restore Reel" : "Archive Reel"}
                disabled={archiving || Boolean(active)}
                size="icon"
                type="submit"
                variant="ghost"
              >
                {reel.archived_at ? (
                  <RotateCcw className="size-4" />
                ) : (
                  <Archive className="size-4" />
                )}
              </Button>
            </form>
          </div>
        ) : null}
      </div>
      {[analysisState, archiveState, cancelState].map((state, index) =>
        state.message ? (
          <p
            className={
              state.status === "error" ? "text-destructive text-sm" : "text-sm"
            }
            key={index}
            role="status"
          >
            {state.message}
          </p>
        ) : null,
      )}
      {reel.duration_seconds !== null ? (
        <div className="grid gap-3 border-y py-3 text-sm sm:grid-cols-4">
          <Metric
            label="Duration"
            value={`${reel.duration_seconds.toFixed(1)}s`}
          />
          <Metric
            label="Resolution"
            value={`${reel.width ?? "—"}×${reel.height ?? "—"}`}
          />
          <Metric label="Scenes" value={String(reel.scene_count ?? "—")} />
          <Metric
            label="Cuts/min"
            value={reel.cuts_per_minute?.toFixed(1) ?? "—"}
          />
        </div>
      ) : null}
      {latest ? (
        <p className="text-muted-foreground text-sm">
          Analysis v{latest.analysis_version}: {latest.status}
        </p>
      ) : null}
      {parsed?.success ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <section>
            <h3 className="font-medium">Strategic interpretation</h3>
            <p className="mt-2 text-sm">{parsed.data.summary}</p>
            <dl className="mt-3 space-y-2 text-sm">
              <Detail label="Primary hook" value={parsed.data.primary_hook} />
              <Detail label="Hook type" value={parsed.data.hook_type} />
              <Detail label="Content angle" value={parsed.data.content_angle} />
              <Detail
                label="CTA"
                value={parsed.data.call_to_action || "None observed"}
              />
              <Detail label="Pacing" value={parsed.data.pacing_analysis} />
            </dl>
          </section>
          <section>
            <h3 className="font-medium">Reusable patterns</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {parsed.data.reusable_patterns.map((value) => (
                <li key={value}>{value}</li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-4 text-xs">
              V1 has no semantic frame understanding or OCR. Visual observations
              are deterministic media metrics only.
            </p>
          </section>
        </div>
      ) : null}
      {transcript ? (
        <details className="border-t pt-3">
          <summary className="cursor-pointer text-sm font-medium">
            Transcript
          </summary>
          <p className="mt-3 text-sm whitespace-pre-wrap">{transcript.text}</p>
          <div className="text-muted-foreground mt-3 space-y-1 text-xs">
            {Array.isArray(transcript.segments)
              ? transcript.segments.slice(0, 100).map((segment, index) => {
                  const item = segment as { start?: number; text?: string };
                  return (
                    <p key={index}>
                      {formatTime(item.start ?? 0)} · {item.text}
                    </p>
                  );
                })
              : null}
          </div>
        </details>
      ) : null}
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
