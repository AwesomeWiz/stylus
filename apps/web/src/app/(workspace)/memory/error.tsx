"use client";

import { Button } from "@/components/ui/button";

export default function MemoryErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg border-y py-12 text-center">
      <h2 className="font-semibold">Company memory could not be loaded</h2>
      <p className="text-muted-foreground mt-2 text-sm">
        Your canonical Company Profile remains unchanged. Try loading memory
        again.
      </p>
      <Button className="mt-4" onClick={reset} variant="secondary">
        Try again
      </Button>
    </div>
  );
}
