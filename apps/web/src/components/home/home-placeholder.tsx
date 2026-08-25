import { ArrowRight, CheckCircle2, Compass, Layers3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

const foundationItems = [
  {
    title: "Organize your workspace",
    description:
      "Core collaboration tools will live together in one focused operating environment.",
    icon: Layers3,
  },
  {
    title: "Keep priorities visible",
    description:
      "Home will surface the work, deadlines, and decisions that need attention.",
    icon: CheckCircle2,
  },
  {
    title: "Extend with purpose",
    description:
      "Business capabilities will remain modular while sharing a consistent platform.",
    icon: Compass,
  },
];

export function HomePlaceholder() {
  return (
    <div>
      <PageHeader
        title="Home"
        description="A focused view of what needs your team’s attention. Workspace features will appear here as they become available."
        action={
          <Button disabled variant="secondary">
            Customize home
          </Button>
        }
      />

      <section aria-labelledby="welcome-title" className="py-8 lg:py-10">
        <div className="max-w-3xl">
          <p className="text-primary mb-2 text-sm font-medium">
            Workspace foundation
          </p>
          <h2
            id="welcome-title"
            className="text-xl font-semibold tracking-tight sm:text-2xl"
          >
            Welcome to Stylus
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6 sm:text-base">
            Your startup’s shared workspace is ready for the next stage of
            setup. This foundation keeps collaboration, knowledge, and future
            business tools coherent without crowding your day.
          </p>
        </div>
      </section>

      <section aria-labelledby="foundation-title" className="border-t pt-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="foundation-title" className="text-sm font-semibold">
            Built for focused work
          </h2>
          <span className="text-muted-foreground text-xs">
            Foundation preview
          </span>
        </div>
        <div className="grid border-y sm:grid-cols-3 sm:divide-x">
          {foundationItems.map((item) => (
            <article
              className="group border-b py-5 last:border-b-0 sm:border-b-0 sm:px-5 sm:first:pl-0"
              key={item.title}
            >
              <item.icon
                aria-hidden="true"
                className="text-primary mb-4 size-5"
                strokeWidth={1.8}
              />
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="text-muted-foreground mt-1.5 text-sm leading-5">
                {item.description}
              </p>
              <span className="text-muted-foreground mt-4 inline-flex items-center gap-1 text-xs font-medium">
                Coming in a future phase
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
