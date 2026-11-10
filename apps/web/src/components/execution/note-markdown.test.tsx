import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NoteMarkdown, noteLink } from "./note-markdown";
afterEach(cleanup);
describe("working Note Markdown", () => {
  it("renders a bounded useful text subset with heading semantics", () => {
    render(
      <NoteMarkdown
        content={
          "# Plan\n- **Decide**\n- *Try*\n`sample`\n[Source](https://example.test/research)"
        }
      />,
    );
    expect(
      screen.getByRole("heading", { level: 3, name: "Plan" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Source" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(document.querySelector("strong")).toHaveTextContent("Decide");
    expect(document.querySelector("code")).toHaveTextContent("sample");
  });
  it("escapes HTML and refuses scripts, data URLs, embeds and image fetches", () => {
    render(
      <NoteMarkdown
        content={
          '<script>secret()</script>\n<iframe src="https://example.test"></iframe>\n[bad](javascript:alert)\n![image](data:text/html,unsafe)'
        }
      />,
    );
    expect(document.querySelector("script,iframe,img")).toBeNull();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,evil",
      "file:///private",
      "//example.test",
      "/private",
    ])
      expect(noteLink(url)).toBeNull();
  });
  it("has an honest empty state", () => {
    render(<NoteMarkdown content="" />);
    expect(
      screen.getByText("This Note has no content yet."),
    ).toBeInTheDocument();
  });
});
