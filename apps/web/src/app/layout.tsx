import type { Metadata } from "next";
import type { ReactNode } from "react";

import { env } from "@/lib/env";

import "./globals.css";

void env;

export const metadata: Metadata = {
  title: "Stylus",
  description: "The collaborative operating system for startup teams.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
