"use client";
import { Button } from "@/components/ui/button";
export default function MarketingError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-xl px-6 py-16 text-center">
      <h1 className="text-xl font-semibold">Marketing could not be loaded</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Try the request again. No records were changed.
      </p>
      <Button className="mt-5" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
