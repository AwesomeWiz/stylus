"use client";

import { Button } from "@/components/ui/button";

export default function WhiteboardsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <h1 className="text-xl font-semibold">Whiteboards could not be loaded</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Check your connection, then try again.
      </p>
      <Button className="mt-5" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
