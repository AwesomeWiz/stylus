import type { Metadata } from "next";
import type { ReactNode } from "react";

import { serverEnv } from "@/lib/env/server";

import "./globals.css";
import "@xyflow/react/dist/style.css";

void serverEnv;

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
