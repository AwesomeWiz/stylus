import type { Metadata } from "next";
import type { ReactNode } from "react";

import { serverEnv } from "@/lib/env/server";

import "./globals.css";
import "@xyflow/react/dist/style.css";

void serverEnv;

export const metadata: Metadata = {
  title: "Stylus",
  description: "The collaborative operating system for startup teams.",
  icons: {
    icon: [
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      {
        url: "/brand/stylus-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/brand/stylus-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: "/brand/apple-touch-icon.png",
  },
};

const themeScript = `(()=>{try{const k="stylus-theme",v=localStorage.getItem(k),p=v==="light"||v==="dark"||v==="system"?v:"system",d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.dataset.theme=p}catch{}})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/fonts/geist/Geist-Variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
