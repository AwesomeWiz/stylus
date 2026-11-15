"use client";

import { useEffect } from "react";
import { ErrorExperience } from "@/components/errors/error-experience";

export default function GlobalError({ reset }: { reset: () => void }) {
  useEffect(() => {
    document.title = "Unexpected error — Stylus";
  }, []);
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <ErrorExperience kind="unexpected" reset={reset} />
      </body>
    </html>
  );
}
