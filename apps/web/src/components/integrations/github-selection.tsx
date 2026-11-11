"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  loadGithubChoices as loadGithubChoicesAction,
  selectGithubRepositories as selectGithubRepositoriesAction,
} from "@/modules/integrations/actions";
import { resilientIntegrationAction } from "./client-action";
const loadGithubChoices = resilientIntegrationAction(loadGithubChoicesAction);
const selectGithubRepositories = resilientIntegrationAction(
  selectGithubRepositoriesAction,
);
import type { RepositoryChoice } from "@/core/integrations/public";
import { integrationControl } from "./integration-labels";
export function GithubSelection({
  grantId,
  onSaved,
}: {
  grantId: string;
  onSaved: () => Promise<void>;
}) {
  const [installations, setInstallations] = useState<
      { id: string; title: string }[]
    >([]),
    [installation, setInstallation] = useState(""),
    [repos, setRepos] = useState<RepositoryChoice[]>([]),
    [selected, setSelected] = useState<RepositoryChoice[]>([]),
    [page, setPage] = useState(1),
    [more, setMore] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  useEffect(() => {
    let active = true;
    loadGithubChoices({
      grantId,
      installationId: installation || undefined,
      page,
    }).then((r) => {
      if (!active) return;
      if (!r.ok) {
        setError(r.message);
        return;
      }
      if (installation) {
        const items = r.data.items as RepositoryChoice[];
        setRepos((old) => (page === 1 ? items : [...old, ...items]));
      } else {
        const items = r.data.items as { id: string; title: string }[];
        setInstallations((old) => (page === 1 ? items : [...old, ...items]));
      }
      setMore(r.data.hasMore);
    });
    return () => {
      active = false;
    };
  }, [grantId, installation, page]);
  if (done)
    return (
      <p role="status">GitHub connected with the selected repositories.</p>
    );
  return (
    <section
      className="space-y-3 rounded-md border p-4"
      aria-label="Select GitHub repositories"
    >
      <h2 className="font-semibold">Choose GitHub repositories</h2>
      <p className="text-muted-foreground text-sm">
        Only selected repositories are shared with this Stylus organization.
        Authorization expires after ten minutes.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      <label className="block text-sm">
        Installation
        <Select
          className={integrationControl}
          value={installation}
          onChange={(e) => {
            setInstallation(e.target.value);
            setRepos([]);
            setSelected([]);
            setPage(1);
            setError("");
          }}
        >
          <option value="">Choose an installation</option>
          {installations.map((i) => (
            <option key={i.id} value={i.id}>
              {i.title}
            </option>
          ))}
        </Select>
      </label>
      {!installation && !installations.length && !error ? (
        <p role="status">
          Loading installations. If none appear, install the configured App
          first and reconnect.
        </p>
      ) : null}
      {repos.map((r) => (
        <label
          key={r.id}
          className="flex min-h-11 items-center gap-3 text-sm break-all"
        >
          <input
            type="checkbox"
            checked={selected.some((s) => s.id === r.id)}
            disabled={
              busy ||
              (!selected.some((s) => s.id === r.id) && selected.length >= 20)
            }
            onChange={(e) =>
              setSelected((old) =>
                e.target.checked
                  ? [...old, r]
                  : old.filter((s) => s.id !== r.id),
              )
            }
          />
          {r.fullName}
        </label>
      ))}
      {more ? (
        <Button variant="secondary" onClick={() => setPage((p) => p + 1)}>
          More {installation ? "repositories" : "installations"}
        </Button>
      ) : null}
      <Button
        disabled={!selected.length || busy}
        onClick={async () => {
          setBusy(true);
          const r = await selectGithubRepositories({
            grantId,
            installationId: installation,
            repositories: selected,
          });
          setBusy(false);
          if (r.ok) {
            setDone(true);
            await onSaved();
          } else setError(r.message);
        }}
      >
        {busy
          ? "Verifying repositories…"
          : `Connect ${selected.length} selected repositories`}
      </Button>
    </section>
  );
}
