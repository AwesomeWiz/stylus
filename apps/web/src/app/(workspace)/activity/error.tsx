"use client";

import { Button } from "@/components/ui/button";

export default function ActivityError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg border-y py-12 text-center">
      <h2 className="font-semibold">Activity could not be loaded</h2>
      <p className="text-muted-foreground mt-2 text-sm">
        Check your connection and try loading the history again.
      </p>
      <Button className="mt-4" onClick={reset} variant="secondary">
        Try again
      </Button>
    </div>
  );
}
