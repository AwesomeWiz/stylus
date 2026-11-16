"use client";

import { useEffect } from "react";
import { ErrorExperience } from "@/components/errors/error-experience";

export default function RootError({ reset }: { reset: () => void }) {
  useEffect(() => {
    document.title = "Unexpected error — Stylus";
  }, []);
  return <ErrorExperience kind="unexpected" reset={reset} />;
}
