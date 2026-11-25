import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Clapperboard,
  BookOpen,
  FileText,
  Link2,
  FlaskConical,
  PanelsTopLeft,
} from "lucide-react";

import { LandingMain } from "@/components/landing/landing-main";
import { Fragment } from "react";
import { HeroPreview } from "@/components/landing/hero-preview";
import { RevealFigure } from "@/components/landing/reveal-figure";
import { Walkthrough } from "@/components/landing/walkthrough";
import styles from "@/components/landing/landing.module.css";
import { BrandLogo } from "@/components/layout/brand-logo";
import { buttonVariants } from "@/components/ui/button";

const repository = "https://github.com/AwesomeWiz/stylus";
const title = "See the evidence behind product decisions";
const description =
  "Stylus is an open-source workspace for early-stage product teams. Follow customer evidence through hypotheses, experiments, tasks and learning.";
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "Stylus",
    title,
    description,
    url: "/",
    images: [
      {
        url: "/product/board.webp",
        width: 660,
        height: 453,
        alt: "The Paper Orbit learning board in Stylus",
      },
    ],
  },
};

function Recording({
  name,
  label,
}: {
  name: "boards" | "operating-loop";
  label: string;
}) {
  return (
    <video
      controls
      playsInline
      preload="none"
      width={1600}
      height={900}
      aria-label={label}
      poster={`/product/${name}-poster.webp`}
    >
      <source src={`/product/${name}.webm`} type="video/webm" />
      <a href={`/product/${name}.webm`}>Download the recording</a>
    </video>
  );
}

function headlineWords(text: string) {
  return text.split(" ").map((word, index) => (
    <Fragment key={word}>
      {index > 0 && " "}
      <span className={styles.headlineWord}>{word}</span>
    </Fragment>
  ));
}

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <a className={styles.skip} href="#content">
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.nav}>
          <Link href="/" aria-label="Stylus home">
            <BrandLogo />
          </Link>
          <nav aria-label="Product navigation">
            <a className={styles.tourLink} href="#walkthrough">
              Product tour
            </a>
            <Link
              href="/login"
              prefetch={false}
              className={buttonVariants({ variant: "secondary" })}
            >
              Sign in <ArrowRight size={16} />
            </Link>
          </nav>
        </div>
      </header>
      <LandingMain>
        <section className={styles.hero} aria-labelledby="intro">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>
              An open-source workspace for startup teams
            </p>
            <h1 id="intro">
              {headlineWords("See the evidence behind")}{" "}
              <em>{headlineWords("product decisions")}</em>
            </h1>
            <p className={styles.lede}>
              Stylus helps early-stage teams turn customer observations into
              experiments, track the work and remember what they learned.
            </p>
            <div className={styles.actions}>
              <Link
                href="/signup"
                prefetch={false}
                className={buttonVariants()}
              >
                Try Stylus <ArrowRight size={16} />
              </Link>
              <a className={styles.textLink} href="#walkthrough">
                Explore the walkthrough <ArrowDown size={16} />
              </a>
            </div>
          </div>
          <HeroPreview>
            <figcaption>
              <span>
                <PanelsTopLeft size={16} /> Paper Orbit
              </span>
              <span>Fictional workspace</span>
            </figcaption>
            <div className={styles.heroBoard}>
              {(["board", "board-dark"] as const).map((file) => (
                <picture
                  key={file}
                  className={
                    file === "board" ? styles.lightBoard : styles.darkBoard
                  }
                >
                  <source
                    media="(max-width: 540px)"
                    srcSet={`/product/${file}-detail.webp`}
                    width={file === "board" ? 509 : 609}
                    height={file === "board" ? 253 : 301}
                  />
                  <Image
                    unoptimized
                    src={
                      file === "board"
                        ? "/product/workspace.webp"
                        : "/product/workspace-dark.webp"
                    }
                    width={1360}
                    height={765}
                    alt="Paper Orbit board with the task Build the guided setup variant, assigned to Alex."
                    loading="eager"
                    fetchPriority="high"
                  />
                </picture>
              ))}
            </div>
            <ol
              className={styles.recordChain}
              aria-label="Records on this board"
            >
              <li>
                <span>Evidence · EVID-1</span>Setup hesitation
              </li>
              <li>
                <span>Hypothesis</span>One clear first step
              </li>
              <li>
                <span>Task · Alex</span>Build the guided variant
              </li>
            </ol>
          </HeroPreview>
        </section>

        <section
          className={styles.tour}
          id="walkthrough"
          aria-labelledby="tour-heading"
        >
          <p className={styles.kicker}>Product walkthrough</p>
          <h2 id="tour-heading">Follow one onboarding decision</h2>
          <Walkthrough />
          <details className={styles.replay}>
            <summary>
              <Clapperboard size={18} /> Watch the operating loop{" "}
              <span>8 sec</span>
            </summary>
            <Recording
              name="operating-loop"
              label="Silent walkthrough from EVID-1 to the recorded Learning"
            />
          </details>
        </section>
        <section className={styles.feature} aria-labelledby="boards-heading">
          <div className={styles.featureCopy}>
            <p className={styles.kicker}>Boards</p>
            <h2 id="boards-heading">Put the whole workshop on one board</h2>
            <p>
              Group workshop notes in sections, sketch a shape beside the
              experiment and select the linked task to see its available
              actions.
            </p>
          </div>
          <RevealFigure>
            <Recording
              name="boards"
              label="Full Paper Orbit canvas showing shape creation and the linked task menu"
            />
            <figcaption>
              Paper Orbit · First-session learning board{" "}
              <a className={styles.textLink} href="/product/boards.webm">
                Open full-size recording <ArrowUpRight size={14} />
              </a>
            </figcaption>
          </RevealFigure>
        </section>
        <section className={styles.tasks} aria-labelledby="tasks-heading">
          <div className={styles.featureCopy}>
            <p className={styles.kicker}>Daily execution</p>
            <h2 id="tasks-heading">See what has to happen first</h2>
            <p>
              Home brings due dates, blocked work and recent activity into one
              view. In Tasks, Riley can open the measurement task and see
              exactly what blocks it. The prerequisite leads to Alex’s build
              task, and the milestone keeps both tied to the onboarding test.
            </p>
          </div>
          <div className={styles.taskCaptures}>
            <RevealFigure>
              <Image
                unoptimized
                src="/product/daily-home.webp"
                width={1360}
                height={765}
                alt="Paper Orbit Home with attention items and recent activity"
              />
              <figcaption>Home · Today’s attention items</figcaption>
            </RevealFigure>
            <RevealFigure>
              <Image
                unoptimized
                src="/product/prerequisite.webp"
                width={477}
                height={450}
                alt="Instrument first-session completion is blocked by Build the guided setup variant. Both belong to Validate a clearer first session."
                sizes="(max-width: 760px) 92vw, 477px"
              />
              <figcaption>Tasks · Measurement prerequisite</figcaption>
            </RevealFigure>
          </div>
        </section>
        <section
          className={styles.knowledge}
          aria-labelledby="knowledge-heading"
        >
          <div>
            <p className={styles.kicker}>Knowledge and collaboration</p>
            <h2 id="knowledge-heading">Keep the reason with the decision</h2>
            <p>
              Paper Orbit can keep interview notes while the experiment runs,
              discuss the result with teammates and choose which conclusion
              belongs in Company Memory.
            </p>
          </div>
          <RevealFigure>
            <FileText aria-hidden="true" />
            <div>
              <h3>Working Notes</h3>
              <p>Collect observations and link the work they inform.</p>
            </div>
            <BookOpen aria-hidden="true" />
            <div>
              <h3>Company Memory</h3>
              <p>
                Review the conclusion before promoting it to shared company
                knowledge.
              </p>
            </div>
          </RevealFigure>
        </section>
        <section className={styles.extensions} aria-labelledby="extend-heading">
          <p className={styles.kicker}>Optional capabilities</p>
          <h2 id="extend-heading">Bring in the context your team uses</h2>
          <div>
            <article>
              <FlaskConical />
              <h3>Marketing and AI</h3>
              <p>
                Enable Marketing to collect research, plan experiments and
                develop Reel ideas. With a model provider configured, Creative
                Studio can turn a selected idea into a production brief.
              </p>
            </article>
            <article>
              <Link2 />
              <h3>GitHub and Drive</h3>
              <p>
                Connect selected repositories to reference issues, commits and
                pull requests. With Drive connected, find and link files by
                metadata; their contents stay in Drive.
              </p>
            </article>
            <article>
              <PanelsTopLeft />
              <h3>Google Calendar</h3>
              <p>
                Connect a calendar to link events, or explicitly create an event
                for a dated task, milestone or experiment in a calendar you own.
              </p>
            </article>
          </div>
        </section>
        <section className={styles.close} aria-labelledby="close-heading">
          <div>
            <h2 id="close-heading">Get started with Stylus</h2>
            <p>
              Create an account on the hosted app, or run a workspace on your
              own infrastructure. Stylus is open source.{" "}
              <a className="underline underline-offset-4" href={repository}>
                Inspect the source on GitHub
              </a>
              .
            </p>
          </div>
          <div className={styles.actions}>
            <Link href="/signup" prefetch={false} className={buttonVariants()}>
              Create an account <ArrowRight size={16} />
            </Link>
            <a
              className={styles.textLink}
              href={repository + "/blob/main/docs/SELF_HOSTING.md"}
            >
              Self-hosting guide <ArrowUpRight size={16} />
            </a>
          </div>
        </section>
      </LandingMain>
      <footer className={styles.footer}>
        <span>Stylus · AGPL-3.0-only</span>
        <a className={styles.textLink} href={repository}>
          Source on GitHub <ArrowUpRight size={14} />
        </a>
      </footer>
    </div>
  );
}
