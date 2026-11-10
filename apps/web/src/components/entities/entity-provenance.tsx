import Link from "next/link";
import type { Route } from "next";
import type { EntityProvenanceLink } from "@/core/entities/public";
export function EntityProvenance({
  links,
  title = "Why this work exists",
}: {
  links: readonly EntityProvenanceLink[];
  title?: string;
}) {
  if (!links.length) return null;
  return (
    <section
      className="mb-5 space-y-2 border-y py-3"
      aria-label={
        title === "Why this work exists" ? "Decision provenance" : title
      }
    >
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="space-y-1">
        {links.slice(0, 6).map((link, index) => (
          <li key={link.href + index} className="text-sm">
            <span className="text-muted-foreground">{link.label}: </span>
            <Link
              prefetch={false}
              className="text-primary inline-block min-h-11 py-2 underline"
              href={link.href as Route}
            >
              {link.title}
            </Link>
          </li>
        ))}
      </ul>
      {links.length > 6 ? (
        <details>
          <summary className="min-h-11 cursor-pointer py-2 text-sm underline">
            {links.length - 6} more explicit links
          </summary>
          <ul>
            {links.slice(6).map((link, index) => (
              <li key={link.href + index} className="text-sm">
                <span className="text-muted-foreground">{link.label}: </span>
                <Link
                  prefetch={false}
                  className="text-primary inline-block min-h-11 py-2 underline"
                  href={link.href as Route}
                >
                  {link.title}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
