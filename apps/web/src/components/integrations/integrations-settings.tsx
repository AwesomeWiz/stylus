"use client";
import Link from "next/link";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { integrationProviders } from "@/core/integrations/public";
import {
  connectIntegration as connectIntegrationAction,
  disconnectIntegration as disconnectIntegrationAction,
  loadIntegrationSettings as loadIntegrationSettingsAction,
} from "@/modules/integrations/actions";
import { resilientIntegrationAction } from "./client-action";
const connectIntegration = resilientIntegrationAction(connectIntegrationAction);
const disconnectIntegration = resilientIntegrationAction(
  disconnectIntegrationAction,
);
const loadIntegrationSettings = resilientIntegrationAction(
  loadIntegrationSettingsAction,
);
import { integrationLabels } from "./integration-labels";
import { GithubSelection } from "./github-selection";
type Settings = Extract<
  Awaited<ReturnType<typeof loadIntegrationSettings>>,
  { ok: true }
>["data"];
export function IntegrationsSettings({
  initial,
  grantId,
  installUrl,
  authorizationFailed,
}: {
  initial: Awaited<ReturnType<typeof loadIntegrationSettings>>;
  grantId?: string;
  installUrl?: string;
  authorizationFailed: boolean;
}) {
  const [localResult, setLocalResult] = useState<{
    source: typeof initial;
    result: typeof initial;
  } | null>(null);
  const result = localResult?.source === initial ? localResult.result : initial;
  const setResult = (next: typeof initial) =>
    setLocalResult({ source: initial, result: next });
  const [busy, setBusy] = useState(""),
    [error, setError] = useState(
      authorizationFailed
        ? "Authorization was cancelled or could not be verified. Start Connect again."
        : "",
    ),
    [disconnect, setDisconnect] = useState<string | null>(null);
  const data: Settings | null = result.ok ? result.data : null;
  const opener = useRef<HTMLElement | null>(null),
    root = useRef<HTMLDivElement>(null);
  async function refresh() {
    setResult(await loadIntegrationSettings());
  }
  return (
    <div
      ref={root}
      tabIndex={-1}
      role="region"
      aria-label="Integration connections"
      className="mt-8 max-w-4xl space-y-6 outline-none [&_button]:min-h-11"
    >
      {error ? (
        <p role="alert" className="text-sm">
          {error}
        </p>
      ) : null}
      {!result.ok ? (
        <p role="alert">
          {result.message}{" "}
          <Button variant="secondary" onClick={refresh}>
            Retry integrations
          </Button>
        </p>
      ) : null}
      {grantId ? <GithubSelection grantId={grantId} onSaved={refresh} /> : null}
      {data
        ? integrationProviders.map((provider) => {
            const label = integrationLabels[provider],
              Icon = label.icon,
              row = data.connections.find((c) => c.provider === provider),
              canManage = provider !== "github" || data.canManage;
            return (
              <section
                key={provider}
                aria-label={label.title}
                className="space-y-3 border-b pb-6"
              >
                <div className="flex items-center gap-2">
                  <Icon className="size-5" aria-hidden="true" />
                  <h2 className="font-semibold">{label.title}</h2>
                </div>
                <p className="text-sm">{label.description}</p>
                <p className="text-muted-foreground text-xs">{label.scope}</p>
                <p className="text-sm break-words" role="status">
                  {row?.status === "connected"
                    ? "Connected"
                    : row?.status === "attention"
                      ? "Needs attention"
                      : "Disconnected"}
                  {row?.display_name ? ` · ${row.display_name}` : ""}
                </p>
                {row?.status === "connected" && provider === "github" ? (
                  <p className="text-muted-foreground text-sm break-words">
                    Selected repositories:{" "}
                    {row.config.repositories
                      ?.map((r) => r.fullName)
                      .join(", ") || "None"}
                  </p>
                ) : null}
                {!data.setup[provider] ? (
                  <p className="text-muted-foreground text-sm">
                    Server setup required. See docs/INTEGRATIONS.md in the
                    repository.
                  </p>
                ) : canManage ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={!!busy}
                      variant={
                        row?.status === "connected" ? "secondary" : "primary"
                      }
                      onClick={async () => {
                        setBusy(provider);
                        setError("");
                        const r = await connectIntegration(provider);
                        if (r.ok) window.location.assign(r.data);
                        else {
                          setError(r.message);
                          setBusy("");
                        }
                      }}
                    >
                      {busy === provider
                        ? "Opening authorization…"
                        : row?.status === "connected"
                          ? provider === "github"
                            ? "Change repositories"
                            : "Reconnect"
                          : "Connect"}
                    </Button>
                    {provider === "github" && installUrl ? (
                      <a
                        className="inline-flex min-h-11 items-center px-3 text-sm underline"
                        href={installUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Install GitHub App
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    An organization owner or admin can manage GitHub.
                  </p>
                )}
                {canManage && row && row.status !== "disconnected" ? (
                  <Button
                    variant="ghost"
                    disabled={!!busy}
                    onClick={(e) => {
                      opener.current = e.currentTarget;
                      setDisconnect(row.id);
                    }}
                  >
                    Disconnect {label.title}
                  </Button>
                ) : null}
              </section>
            );
          })
        : null}
      <Link
        href="/apps"
        className="inline-block min-h-11 py-2 text-sm underline"
      >
        Manage trusted Stylus Apps
      </Link>
      <Dialog
        open={!!disconnect}
        className="[&_button]:min-h-11"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          requestAnimationFrame(() => {
            (opener.current?.isConnected
              ? opener.current
              : root.current
            )?.focus();
          });
        }}
        onOpenChange={(open) => {
          if (!open && !busy) setDisconnect(null);
        }}
        title="Disconnect integration"
        description="Provider access and local credentials will be cleared. Stylus work and references remain; external files and events are not deleted."
      >
        <div className="flex flex-wrap gap-3 p-6">
          <Button
            variant="secondary"
            disabled={!!busy}
            onClick={() => setDisconnect(null)}
          >
            Cancel
          </Button>
          <Button
            disabled={!!busy}
            onClick={async () => {
              if (!disconnect) return;
              setBusy("disconnect");
              setError("");
              const r = await disconnectIntegration(disconnect);
              setBusy("");
              if (!r.ok) setError(r.message);
              else {
                setDisconnect(null);
                await refresh();
              }
            }}
          >
            {busy === "disconnect" ? "Disconnecting…" : "Confirm disconnect"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
