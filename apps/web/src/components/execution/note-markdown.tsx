import { Fragment, type ReactNode } from "react";

// Deliberately small Markdown subset. React escapes all text; no HTML, embeds or images.
export function noteLink(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
function inline(text: string): ReactNode[] {
  return text
    .split(
      /(\[[^\]\n]{1,300}\]\([^\s)]{1,2000}\)|\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*)/g,
    )
    .map((part, i) => {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part),
        href = link ? noteLink(link[2]!) : null;
      if (link && href)
        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary break-all underline"
          >
            {link[1]}
          </a>
        );
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("`") && part.endsWith("`"))
        return (
          <code key={i} className="bg-muted rounded px-1">
            {part.slice(1, -1)}
          </code>
        );
      if (part.startsWith("*") && part.endsWith("*"))
        return <em key={i}>{part.slice(1, -1)}</em>;
      return <Fragment key={i}>{part}</Fragment>;
    });
}
export function NoteMarkdown({ content }: { content: string }) {
  const lines = content.split(/\r?\n/),
    blocks: ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.trim()) continue;
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const Tag =
        heading[1]!.length === 1
          ? "h3"
          : heading[1]!.length === 2
            ? "h4"
            : "h5";
      blocks.push(
        <Tag key={i} className="pt-2 font-semibold">
          {inline(heading[2]!)}
        </Tag>,
      );
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: ReactNode[] = [];
      const start = i;
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i]!)) {
        items.push(
          <li key={i}>{inline(lines[i]!.replace(/^\s*[-*]\s+/, ""))}</li>,
        );
        i++;
      }
      i--;
      blocks.push(
        <ul key={start} className="list-disc space-y-1 pl-5">
          {items}
        </ul>,
      );
      continue;
    }
    blocks.push(
      <p key={i} className="whitespace-pre-wrap">
        {inline(line)}
      </p>,
    );
  }
  return (
    <div className="max-w-[72ch] space-y-3 text-sm leading-7 break-words">
      {blocks.length ? (
        blocks
      ) : (
        <p className="text-muted-foreground">This Note has no content yet.</p>
      )}
    </div>
  );
}
