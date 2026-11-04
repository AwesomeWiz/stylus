"use client";
import { useDeferredValue, useMemo, useState } from "react";
import { Search, X, LocateFixed } from "lucide-react";
import type { BoardElementRow } from "@/lib/supabase/database.types";
import { updateBoardSearchIndex } from "@/modules/whiteboards/search-index";
export function BoardSearch({
  rows,
  onLocate,
  children,
}: {
  rows: BoardElementRow[];
  onLocate: (id: string) => void;
  children: React.ReactNode;
}) {
  const [query, setQuery] = useState(""),
    search = useDeferredValue(query.trim().toLocaleLowerCase());
  const [index, setIndex] = useState(() => updateBoardSearchIndex([], rows));
  const nextIndex = useMemo(
    () => updateBoardSearchIndex(index, rows),
    [index, rows],
  );
  if (nextIndex !== index) setIndex(nextIndex);
  const results = useMemo(
    () =>
      search
        ? nextIndex.filter((item) => item.normalized.includes(search))
        : [],
    [nextIndex, search],
  );
  return (
    <>
      <div className="relative mb-3">
        <Search
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute top-3 left-2 size-3.5"
        />
        <input
          aria-label="Search this board"
          placeholder="Search this board"
          className="bg-background h-10 w-full rounded border pr-8 pl-7 text-xs"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setQuery("");
            }
            event.stopPropagation();
          }}
        />
        {query ? (
          <button
            type="button"
            className="absolute top-0 right-0 flex size-10 items-center justify-center"
            aria-label="Clear Board search"
            onClick={() => setQuery("")}
          >
            <X aria-hidden className="size-3.5" />
          </button>
        ) : null}
      </div>
      {search ? (
        <>
          <p role="status" className="text-muted-foreground mb-2 text-xs">
            {results.length} matches
            {results.length > 50 ? " · first 50 shown; refine your search" : ""}
          </p>
          <ul>
            {results.slice(0, 50).map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className="hover:bg-muted flex min-h-10 w-full items-center justify-between gap-2 rounded px-2 text-left text-xs"
                  onClick={() => onLocate(entry.id)}
                >
                  <span className="min-w-0 truncate">{entry.title}</span>
                  <LocateFixed aria-hidden className="size-3.5 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <div hidden={Boolean(search)}>{children}</div>
    </>
  );
}
