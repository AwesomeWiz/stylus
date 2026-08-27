"use client";

import { CircleCheck, CircleOff } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { PluginIcon } from "@/core/plugins/icons";
import type { PluginManifest } from "@/core/plugins/public";
import type { OrganizationRole } from "@/lib/supabase/database.types";
import { setPluginEnabledAction } from "@/modules/plugins/actions";
import { initialPluginActionState } from "@/modules/plugins/schemas";

export interface OrganizationPluginView {
  enabled: boolean;
  manifest: PluginManifest;
}

export function AppsManagement({
  currentRole,
  plugins,
}: {
  currentRole: OrganizationRole;
  plugins: OrganizationPluginView[];
}) {
  const canManage = currentRole === "OWNER" || currentRole === "ADMIN";
  return (
    <div className="divide-y border-y">
      {plugins.map((plugin) => (
        <PluginRow canManage={canManage} key={plugin.manifest.id} {...plugin} />
      ))}
    </div>
  );
}

function PluginRow({
  canManage,
  enabled,
  manifest,
}: OrganizationPluginView & { canManage: boolean }) {
  const [state, action, pending] = useActionState(
    setPluginEnabledAction,
    initialPluginActionState,
  );
  return (
    <section className="grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="flex min-w-0 gap-3">
        <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md border">
          <PluginIcon className="size-5" icon={manifest.icon} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 className="font-semibold">{manifest.name}</h2>
            <span className="text-muted-foreground text-xs">
              v{manifest.version} · {manifest.category}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            {manifest.description}
          </p>
          <p className="text-muted-foreground mt-2 text-xs">
            {manifest.capabilities.length
              ? `${manifest.capabilities.length} ${manifest.capabilities.length === 1 ? "capability" : "capabilities"}: ${manifest.capabilities.join(", ")}`
              : "No runtime capabilities declared"}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 md:justify-end">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {enabled ? (
            <CircleCheck aria-hidden="true" className="text-success size-4" />
          ) : (
            <CircleOff
              aria-hidden="true"
              className="text-muted-foreground size-4"
            />
          )}
          {enabled ? "Enabled" : "Disabled"}
        </span>
        {canManage ? (
          <form action={action}>
            <input name="pluginId" type="hidden" value={manifest.id} />
            <input name="enabled" type="hidden" value={String(!enabled)} />
            <Button disabled={pending} type="submit" variant="secondary">
              {pending ? "Saving…" : enabled ? "Disable" : "Enable"}
            </Button>
            {state.message ? (
              <span
                className="sr-only"
                role={state.status === "error" ? "alert" : "status"}
              >
                {state.message}
              </span>
            ) : null}
          </form>
        ) : (
          <span className="text-muted-foreground text-xs">Read only</span>
        )}
      </div>
    </section>
  );
}
