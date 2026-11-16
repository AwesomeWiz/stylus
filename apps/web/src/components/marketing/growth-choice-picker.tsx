"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { searchGrowth } from "./growth-requests";
import type { GrowthChoice } from "@/modules/marketing/server/growth-data";

/** Explicit bounded lookup. Old results never appear under a new query/category. */
export function GrowthChoicePicker({
  kind,
  onSelect,
  label = "Find records",
}: {
  kind: string;
  onSelect: (choice: GrowthChoice) => void;
  label?: string;
}) {
  const [query, setQuery] = useState(""),
    [items, setItems] = useState<GrowthChoice[]>([]),
    [cursor, setCursor] = useState<string>(),
    [more, setMore] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [searched, setSearched] = useState(false);
  const generation = useRef(0);
  async function search(next = false) {
    const turn = ++generation.current;
    setBusy(true);
    setError("");
    if (!next) setItems([]);
    const result = await searchGrowth({
      kind,
      query,
      ...(next && cursor ? { cursor } : {}),
    });
    if (turn !== generation.current) return;
    setBusy(false);
    setSearched(true);
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    setItems((old) =>
      next ? [...old, ...result.data.items] : result.data.items,
    );
    setMore(result.data.hasMore);
    setCursor(result.data.cursor);
  }
  return (
    <section className="space-y-2 rounded-md border p-3" aria-label={label}>
      <label className="block text-sm">
        {kind === "snapshot" ? "Snapshot ID (optional)" : label}
        <input
          className="bg-background mt-1 min-h-11 w-full rounded-md border px-3"
          value={query}
          maxLength={100}
          onChange={(e) => {
            generation.current++;
            setBusy(false);
            setQuery(e.target.value);
            setItems([]);
            setSearched(false);
            setMore(false);
          }}
          placeholder={
            kind === "snapshot"
              ? "Leave empty to browse observations"
              : "Search titles"
          }
        />
      </label>
      <Button variant="secondary" disabled={busy} onClick={() => void search()}>
        {busy ? "Loading…" : "Search records"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm">
          {error}
        </p>
      ) : null}
      {searched && !items.length && !busy ? (
        <p role="status" className="text-muted-foreground text-sm">
          No records on this page.{" "}
          {more
            ? "Continue to the next page."
            : "Try another search or create the source in its workspace."}
        </p>
      ) : null}
      <ul className="max-h-64 space-y-1 overflow-y-auto">
        {items.map((choice) => (
          <li key={choice.id}>
            <button
              type="button"
              className="hover:bg-muted w-full rounded-md border p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
              onClick={() => onSelect(choice)}
            >
              <span className="block text-sm font-medium">{choice.title}</span>
              <span className="text-muted-foreground block text-xs break-words">
                {choice.detail}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {more ? (
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => void search(true)}
        >
          Load more records
        </Button>
      ) : null}
    </section>
  );
}
