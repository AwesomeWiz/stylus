import type { Metadata } from "next";
import Link from "next/link";
import { serverEnv } from "@/lib/env/server";

const description =
  "Stylus is an open-source operating system for early-stage teams to turn customer and market evidence into experiments, decisions, execution and learning.";

export const metadata: Metadata = {
  title: "From evidence to execution",
  description,
  alternates: {
    canonical: new URL("/about", serverEnv.NEXT_PUBLIC_SITE_URL).href,
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Stylus — From evidence to execution",
    description,
    url: new URL("/about", serverEnv.NEXT_PUBLIC_SITE_URL).href,
    type: "website",
    images: [{ url: "/brand/stylus-icon-512.png", alt: "Stylus" }],
  },
};

export default function AboutPage() {
  return (
    <main className="bg-background text-foreground min-h-dvh px-6 py-12">
      <article className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-4">
          <p className="text-primary font-semibold">Stylus</p>
          <h1 className="text-3xl font-semibold">
            From evidence to execution.
          </h1>
          <p className="max-w-prose text-lg">{description}</p>
          <p>
            Bring research, ideas, Experiments, Tasks, Boards and team knowledge
            into one connected workspace. Built for founders and small teams.
            Self-hostable, with optional AI and integrations.
          </p>
          <nav
            aria-label="Product links"
            className="flex flex-wrap gap-6 underline"
          >
            <Link href="/login">Sign in</Link>
            <a href="https://github.com/AwesomeWiz/stylus">
              Source and self-hosting guide
            </a>
          </nav>
        </header>
        <section className="space-y-3" aria-labelledby="loop-heading">
          <h2 id="loop-heading" className="text-xl font-semibold">
            A workspace for the operating loop
          </h2>
          <p>
            Evidence → Hypothesis → Experiment → Tasks and decisions → Learning
            → explicit Company Memory.
          </p>
          <p>
            Connect daily execution with the evidence behind it. Boards link to
            actual Stylus records. Working Notes stay separate from approved
            Company Memory; promotion is explicit and reviewed.
          </p>
          <p>
            Core works without AI or external integrations. Optional
            integrations connect GitHub, Drive metadata and Calendar events;
            Calendar creation is explicit, with no automatic sync.
          </p>
        </section>
        <figure>
          {/* Existing project asset; no authenticated or tenant data is fetched. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/stylus-icon-512.png"
            alt="Stylus mark"
            width="128"
            height="128"
          />
        </figure>
        <footer className="border-t pt-6 text-sm">
          Original Stylus code is AGPL-3.0-only. Dependencies and fonts retain
          their own terms. The public source repository is separate from any
          hosted service.
        </footer>
      </article>
    </main>
  );
}
