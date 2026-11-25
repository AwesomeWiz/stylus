import { StepNavigation } from "./step-navigation";
import Image from "next/image";
import {
  ArrowUpLeft,
  BookOpen,
  FlaskConical,
  Lightbulb,
  ListChecks,
  Quote,
} from "lucide-react";

import styles from "./landing.module.css";

const steps = [
  {
    name: "Evidence",
    icon: Quote,
    image: "evidence",
    width: 720,
    height: 275,
    title: "Where do new teams hesitate?",
    text: "In a setup session, participants pause when every choice appears at once. The team saves the observation as EVID-1 so anyone can trace the idea back to its source.",
    alt: "Research Evidence record EVID-1 with the setup observation and a Create Hypothesis from Evidence link.",
  },
  {
    name: "Hypothesis",
    icon: Lightbulb,
    image: "hypothesis",
    width: 660,
    height: 420,
    title: "Give people one clear first step",
    text: "Alex links EVID-1 to a hypothesis: fewer setup decisions might help teams reach their first useful outcome. Confidence starts low. The next step is to test it.",
    alt: "Hypothesis detail showing Alex as owner, low confidence, the source EVID-1 and the Create Experiment action.",
  },
  {
    name: "Experiment",
    icon: FlaskConical,
    image: "experiment",
    width: 715,
    height: 348,
    title: "Compare two ways to start",
    text: "The guided setup experiment compares all choices at once with a progressive version. The team sets a criterion before the test: six of eight sessions should reach a first shared task without help.",
    alt: "Guided setup test plan with its linked hypothesis and success criterion.",
  },
  {
    name: "Tasks",
    icon: ListChecks,
    image: "tasks",
    width: 560,
    height: 205,
    title: "Build the variant, then measure it",
    text: "Alex owns the guided setup variant. Riley owns first-session measurement. A prerequisite makes the order explicit, and both tasks belong to the same milestone.",
    alt: "Task rows with owners Alex and Riley, deadlines, a shared milestone and one unfinished prerequisite.",
  },
  {
    name: "Learning",
    icon: BookOpen,
    image: "learning",
    width: 832,
    height: 390,
    title: "Decide what deserves another test",
    text: "Six of eight sample sessions completed the first step. The team records a cautious conclusion: try it with real participants. The Learning links back to the experiment and EVID-1.",
    alt: "Accepted conclusion, guided setup experiment result and original EVID-1 source in the Learning record.",
  },
];

export function Walkthrough() {
  return (
    <StepNavigation
      steps={steps.map(
        ({ name, icon: Icon, title, text, image, width, height, alt }, i) => ({
          id: image,
          label: name,
          title,
          icon: <Icon size={17} aria-hidden="true" />,
          panel: (
            <>
              <div className={styles.stepCopy}>
                <p className={styles.kicker}>
                  {name} <span> / </span> {i + 1} of {steps.length}
                </p>
                <h3>{title}</h3>
                <p className={styles.stepDescription}>{text}</p>
                {image === "learning" && (
                  <a href="#EVID-1" className={styles.sourceLink}>
                    <ArrowUpLeft size={16} aria-hidden="true" /> View source
                    evidence
                  </a>
                )}
              </div>
              <figure
                className={styles.stepCapture}
                id={image === "evidence" ? "EVID-1" : undefined}
                tabIndex={image === "evidence" ? -1 : undefined}
                aria-label={
                  image === "evidence"
                    ? "Source evidence EVID-1: participants hesitated during setup"
                    : undefined
                }
              >
                {image === "evidence" && (
                  <figcaption className={styles.recordLabel}>
                    Source record · EVID-1
                  </figcaption>
                )}
                <a
                  href={`/product/${image}.webp`}
                  aria-label={`View full-size ${name.toLowerCase()} capture`}
                >
                  <picture>
                    <source
                      media="(max-width: 540px)"
                      srcSet={`/product/${image}-detail.webp`}
                    />
                    <Image
                      fetchPriority="low"
                      unoptimized
                      src={`/product/${image}.webp`}
                      alt={alt}
                      width={width}
                      height={height}
                      sizes="(max-width: 760px) 92vw, 58vw"
                    />
                  </picture>
                </a>
              </figure>
            </>
          ),
        }),
      )}
    />
  );
}
