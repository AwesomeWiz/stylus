import Link from "next/link";
import type { Route } from "next";
import type { EntityProvenanceLink } from "@/core/entities/public";
export function EntityProvenance({
  links,
}: {
  links: readonly EntityProvenanceLink[];
}) {
  if (!links.length) return null;
  return (
    <section
      className="mb-5 space-y-2 border-y py-3"
      aria-label="Decision provenance"
    >
      <h2 className="text-sm font-semibold">Why are we doing this?</h2>
      <ul className="space-y-1">
        {links.map((link, index) => (
          <li key={link.href + index} className="text-sm">
            <span className="text-muted-foreground">{link.label}: </span>
            <Link
              className="text-primary inline-block min-h-11 py-2 underline"
              href={link.href as Route}
            >
              {link.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
