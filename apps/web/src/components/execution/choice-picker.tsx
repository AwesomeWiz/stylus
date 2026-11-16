"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { searchExecutionAction } from "@/modules/execution/actions";
export type ExecutionChoice = { id: string; title: string; status: string };
export function ExecutionChoicePicker({
  kind,
  onSelect,
}: {
  kind: "task" | "milestone";
  onSelect: (choice: ExecutionChoice) => void;
}) {
  const [query, setQuery] = useState(""),
    [items, setItems] = useState<ExecutionChoice[]>([]),
    [cursor, setCursor] = useState<string>(),
    [more, setMore] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [searched, setSearched] = useState(false),
    generation = useRef(0);
  async function search(next = false) {
    const turn = ++generation.current;
    setBusy(true);
    setError("");
    if (!next) setItems([]);
    try {
      const result = await searchExecutionAction({
        kind,
        query,
        ...(next && cursor ? { cursor } : {}),
      });
      if (turn !== generation.current) return;
      setSearched(true);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setItems((old) =>
        next ? [...old, ...result.data.items] : result.data.items,
      );
      setCursor(result.data.cursor);
      setMore(result.data.more);
    } catch {
      if (turn === generation.current)
        setError("Records could not load. Retry the search.");
    } finally {
      if (turn === generation.current) setBusy(false);
    }
  }
  return (
    <section
      aria-label={"Find " + kind}
      className="space-y-2 rounded-md border p-3"
    >
      <label className="block text-sm">
        Find a {kind}
        <input
          className="bg-background mt-1 min-h-11 w-full rounded-md border px-3"
          value={query}
          maxLength={100}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (!busy) void search();
            }
          }}
          onChange={(e) => {
            generation.current++;
            setBusy(false);
            setQuery(e.target.value);
            setItems([]);
            setMore(false);
            setSearched(false);
          }}
        />
      </label>
      <Button variant="secondary" disabled={busy} onClick={() => void search()}>
        {busy ? "Searching…" : "Search records"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm">
          {error}
        </p>
      ) : null}
      {searched && !items.length && !busy ? (
        <p role="status" className="text-muted-foreground text-sm">
          No matching records.
        </p>
      ) : null}
      <ul className="max-h-60 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className="hover:bg-muted min-h-11 w-full rounded-md border px-3 py-2 text-left text-sm"
            >
              <span className="block font-medium break-words">
                {item.title}
              </span>
              <span className="text-muted-foreground text-xs">
                {item.status.replaceAll("_", " ")}
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
          More records
        </Button>
      ) : null}
    </section>
  );
}
