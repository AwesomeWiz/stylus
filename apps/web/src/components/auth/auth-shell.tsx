import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  FileText,
  Lightbulb,
  MessageSquare,
  Search,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  children: ReactNode;
  description: string;
  title: string;
  showcase?: boolean;
}
const stages = [
  {
    icon: Search,
    label: "Research signal",
    detail: "Understand the audience, with evidence.",
  },
  {
    icon: Lightbulb,
    label: "Content opportunity",
    detail: "Choose an idea worth developing.",
  },
  {
    icon: MessageSquare,
    label: "Creative Council",
    detail: "Create a draft and review its direction.",
  },
  {
    icon: FileText,
    label: "Production brief",
    detail: "Bring the hook, script and production notes together.",
  },
];
export function AuthShell({
  children,
  description,
  title,
  showcase = false,
}: AuthShellProps) {
  return (
    <main
      className={cn(
        "bg-background min-h-dvh",
        showcase
          ? "min-[1200px]:grid min-[1200px]:grid-cols-2"
          : "flex items-center justify-center",
      )}
    >
      {showcase ? (
        <aside
          aria-label="About Stylus"
          className="bg-muted/40 hidden min-h-dvh flex-col justify-center border-r px-12 py-12 min-[1200px]:flex"
        >
          <div className="mx-auto w-full max-w-lg">
            <p className="text-primary text-sm font-medium">
              A shared space for startup work
            </p>
            <h2 className="mt-4 max-w-md text-3xl leading-tight font-semibold tracking-tight">
              Turn shared understanding into work your team can move forward.
            </h2>
            <p className="text-muted-foreground mt-4 max-w-md text-[15px] leading-6">
              Plan tasks, keep company knowledge clear, and develop original
              creative work together.
            </p>
            <figure className="mt-10">
              <figcaption className="text-muted-foreground mb-3 text-xs font-medium">
                Example Marketing workflow
              </figcaption>
              <ol className="space-y-2">
                {stages.map(({ icon: Icon, label, detail }, index) => (
                  <li key={label}>
                    <div className="bg-background flex items-start gap-3 rounded-md border p-4">
                      <Icon
                        aria-hidden="true"
                        className="text-muted-foreground mt-0.5 size-4 shrink-0"
                      />
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-muted-foreground mt-1 text-sm leading-5">
                          {detail}
                        </p>
                      </div>
                    </div>
                    {index < stages.length - 1 ? (
                      <ArrowDown
                        aria-hidden="true"
                        className="text-muted-foreground mx-auto mt-2 size-3"
                      />
                    ) : null}
                  </li>
                ))}
              </ol>
            </figure>
          </div>
        </aside>
      ) : null}
      <div className="flex min-h-dvh min-w-0 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-[25rem]">
          <Link
            href="/"
            aria-label="Stylus home"
            className="mb-10 inline-flex min-h-10 items-center gap-2.5"
          >
            <Image
              alt=""
              className="size-9 object-contain"
              height={36}
              width={36}
              priority
              src="/brand/stylus-mark.png"
            />
            <span className="text-base font-semibold tracking-tight">
              Stylus
            </span>
          </Link>
          <header className="mb-7">
            <h1 className="text-2xl leading-8 font-semibold tracking-tight">
              {title}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              {description}
            </p>
          </header>
          {children}
        </div>
      </div>
    </main>
  );
}
