"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function WhiteboardsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="text-xl font-semibold">Board could not be loaded</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Check your connection, then try again.
      </p>
      <Button className="mt-5" onClick={reset}>
        Try again
      </Button>
      <Link
        className="text-primary mt-4 min-h-10 rounded px-3 py-2 text-sm underline"
        href="/whiteboards"
      >
        Back to Boards
      </Link>
    </main>
  );
}
