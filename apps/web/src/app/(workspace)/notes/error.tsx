"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotesError({ reset }: { reset: () => void }) {
  return (
    <section className="max-w-lg space-y-4 border-y py-8">
      <h1 className="text-xl font-semibold">Working Notes could not load</h1>
      <p role="alert" className="text-muted-foreground text-sm">
        Check your connection and retry. You can also return to the Notes index
        to clear the current filters.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Button className="min-h-11" variant="secondary" onClick={reset}>
          Retry Notes
        </Button>
        <Link
          href="/notes"
          prefetch={false}
          className="inline-block min-h-11 py-2 text-sm underline"
        >
          Clear filters / Notes index
        </Link>
      </div>
    </section>
  );
}
