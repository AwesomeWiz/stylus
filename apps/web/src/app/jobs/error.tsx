"use client";

import { Button } from "@/components/ui/button";

export default function JobsError({ reset }: { reset: () => void }) {
  return (
    <div className="p-8">
      <h2 className="font-semibold">Jobs could not be loaded</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Try the organization queue again.
      </p>
      <Button className="mt-4" onClick={reset} variant="secondary">
        Try again
      </Button>
    </div>
  );
}
