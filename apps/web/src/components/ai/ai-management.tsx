"use client";

import { CircleAlert, CircleCheck, Cpu, ShieldCheck } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  AIRunRow,
  OrganizationAIPolicyRow,
  OrganizationRole,
} from "@/lib/supabase/database.types";
import { updateOrganizationAIPolicyAction } from "@/modules/ai/actions";
import { initialAIPolicyActionState } from "@/modules/ai/schemas";

function formatRunTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function policyModeLabel(mode: OrganizationAIPolicyRow["execution_mode"]) {
  return {
    DISABLED: "Disabled",
    LOCAL_ONLY: "Local only",
    REMOTE_ALLOWED: "Remote allowed",
  }[mode];
}

export function AIManagement({
  configuredProviderIds,
  currentRole,
  policy,
  runs,
}: {
  configuredProviderIds: string[];
  currentRole: OrganizationRole;
  policy: OrganizationAIPolicyRow | null;
  runs: AIRunRow[];
}) {
  const canManage = currentRole === "OWNER" || currentRole === "ADMIN";
  const effectivePolicy = policy ?? {
    allowed_provider_ids: [],
    default_tier: "FAST" as const,
    execution_mode: "DISABLED" as const,
    monthly_remote_cost_limit_usd: null,
  };
  return (
    <div className="space-y-9">
      <section aria-labelledby="ai-policy-heading" className="border-y py-5">
        <div className="mb-5 flex items-start gap-3">
          <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md border">
            <ShieldCheck aria-hidden="true" className="size-4" />
          </span>
          <div>
            <h2 className="font-semibold" id="ai-policy-heading">
              Organization policy
            </h2>
            <p className="text-muted-foreground text-sm">
              Provider credentials remain server configuration and are never
              shown here.
            </p>
          </div>
        </div>
        {canManage ? (
          <AIPolicyForm
            configuredProviderIds={configuredProviderIds}
            policy={effectivePolicy}
          />
        ) : (
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <PolicyValue
              label="Execution mode"
              value={policyModeLabel(effectivePolicy.execution_mode)}
            />
            <PolicyValue
              label="Default tier"
              value={effectivePolicy.default_tier.toLowerCase()}
            />
            <PolicyValue
              label="Remote monthly ceiling"
              value={
                effectivePolicy.monthly_remote_cost_limit_usd === null
                  ? "Not configured"
                  : `$${effectivePolicy.monthly_remote_cost_limit_usd.toFixed(2)} estimated`
              }
            />
          </dl>
        )}
      </section>

      <section aria-labelledby="ai-runs-heading">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold" id="ai-runs-heading">
              AI runs
            </h2>
            <p className="text-muted-foreground text-sm">
              Safe operational metadata only. Prompts and model responses are
              not stored.
            </p>
          </div>
          <span className="text-muted-foreground text-sm">
            Latest {runs.length}
          </span>
        </div>
        <AIRunList runs={runs} />
      </section>
    </div>
  );
}

function PolicyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 font-medium capitalize">{value}</dd>
    </div>
  );
}

function AIPolicyForm({
  configuredProviderIds,
  policy,
}: {
  configuredProviderIds: string[];
  policy: Pick<
    OrganizationAIPolicyRow,
    | "allowed_provider_ids"
    | "default_tier"
    | "execution_mode"
    | "monthly_remote_cost_limit_usd"
  >;
}) {
  const [state, action, pending] = useActionState(
    updateOrganizationAIPolicyAction,
    initialAIPolicyActionState,
  );
  return (
    <form action={action} className="grid gap-5 lg:grid-cols-3">
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Execution mode</span>
        <select
          className="bg-background h-10 rounded-md border px-3"
          defaultValue={policy.execution_mode}
          name="executionMode"
        >
          <option value="DISABLED">Disabled</option>
          <option value="LOCAL_ONLY">Local only</option>
          <option value="REMOTE_ALLOWED">Remote allowed</option>
        </select>
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Default logical tier</span>
        <select
          className="bg-background h-10 rounded-md border px-3"
          defaultValue={policy.default_tier}
          name="defaultTier"
        >
          <option value="FAST">Fast</option>
          <option value="BALANCED">Balanced</option>
          <option value="REASONING">Reasoning</option>
        </select>
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">Remote monthly ceiling (USD)</span>
        <Input
          defaultValue={policy.monthly_remote_cost_limit_usd ?? ""}
          min="0"
          name="monthlyRemoteCostLimitUsd"
          placeholder="No hard ceiling"
          step="0.01"
          type="number"
        />
      </label>
      <fieldset className="lg:col-span-2">
        <legend className="text-sm font-medium">Allowed providers</legend>
        <p className="text-muted-foreground mt-1 text-xs">
          Leaving all unchecked allows any deployment-configured provider that
          satisfies the selected execution mode.
        </p>
        <div className="mt-2 flex flex-wrap gap-4">
          {configuredProviderIds.length ? (
            configuredProviderIds.map((providerId) => (
              <label
                className="flex items-center gap-2 text-sm"
                key={providerId}
              >
                <input
                  defaultChecked={policy.allowed_provider_ids.includes(
                    providerId,
                  )}
                  name="allowedProviderIds"
                  type="checkbox"
                  value={providerId}
                />
                {providerId}
              </label>
            ))
          ) : (
            <span className="text-muted-foreground text-sm">
              No execution provider is configured on this deployment.
            </span>
          )}
        </div>
      </fieldset>
      <div className="flex items-end justify-between gap-3 lg:justify-end">
        {state.message ? (
          <p
            className={
              state.status === "error"
                ? "text-destructive text-sm"
                : "text-muted-foreground text-sm"
            }
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.message}
          </p>
        ) : null}
        <Button disabled={pending} type="submit">
          {pending ? "Saving…" : "Save policy"}
        </Button>
      </div>
    </form>
  );
}

function AIRunList({ runs }: { runs: AIRunRow[] }) {
  if (!runs.length)
    return (
      <div className="border-y px-4 py-12 text-center">
        <Cpu
          aria-hidden="true"
          className="text-muted-foreground mx-auto size-5"
        />
        <p className="mt-2 text-sm font-medium">No AI runs yet</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Future authorized Core and plugin requests will appear here.
        </p>
      </div>
    );
  return (
    <div className="divide-y border-y">
      {runs.map((run) => (
        <article
          className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
          key={run.id}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {run.status === "SUCCEEDED" ? (
                <CircleCheck
                  aria-hidden="true"
                  className="text-success size-4"
                />
              ) : (
                <CircleAlert
                  aria-hidden="true"
                  className="text-muted-foreground size-4"
                />
              )}
              <span className="text-sm font-medium">{run.capability}</span>
              <span className="text-muted-foreground text-xs">
                {run.plugin_id ?? "Core"}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {formatRunTime(run.started_at)} ·{" "}
              {run.requested_tier.toLowerCase()} ·{" "}
              {run.selected_model_id ?? "No model selected"} ·{" "}
              {run.provider_id ?? "Provider unavailable"}
            </p>
          </div>
          <div className="text-left text-xs md:text-right">
            <p className="font-medium">{run.status.toLowerCase()}</p>
            <p className="text-muted-foreground mt-1">
              {run.duration_ms === null ? "—" : `${run.duration_ms} ms`} ·{" "}
              {run.total_tokens === null
                ? "usage unknown"
                : `${run.total_tokens} tokens`}{" "}
              ·{" "}
              {run.estimated_cost_usd === null
                ? "cost unknown"
                : `$${run.estimated_cost_usd.toFixed(6)} estimated`}
            </p>
            {run.error_category ? (
              <p className="text-destructive mt-1">{run.error_category}</p>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
