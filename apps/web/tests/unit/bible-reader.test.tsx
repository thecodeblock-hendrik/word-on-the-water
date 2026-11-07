// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PassageText } from "@/components/bible/passage-text";
import { Reader } from "@/components/bible/reader";
import { findBook } from "@/lib/bible/books";
import type { Block, Passage } from "@/lib/bible/types";
import { findVersion } from "@/lib/bible/versions";

afterEach(cleanup);

const blocks: Block[] = [
  { kind: "heading", level: 1, text: "Book heading" },
  { kind: "heading", level: 2, text: "Section heading" },
  { kind: "title", text: "A Psalm of David." },
  {
    kind: "paragraph",
    indent: 0,
    runs: [
      { verse: 1, end: null, start: true, text: "First verse begins" },
      { verse: 1, end: null, start: false, text: "and continues." },
      { verse: 3, end: 4, start: true, text: "Joined verses." },
    ],
  },
  { kind: "break" },
  { kind: "label", text: "Beloved" },
  { kind: "poetry", indent: 1, runs: [{ verse: 5, end: null, start: true, text: "A line," }] },
  {
    kind: "poetry",
    indent: 2,
    runs: [{ verse: 5, end: null, start: false, text: "an indented line." }],
  },
  { kind: "list", indent: 1, runs: [{ verse: 6, end: null, start: true, text: "A list item" }] },
];

describe("PassageText", () => {
  it("shows a verse number only where the verse starts, and labels combined verses", () => {
    const { container } = render(<PassageText blocks={blocks} />);
    const numbers = [...container.querySelectorAll("sup")].map((n) => n.textContent);
    expect(numbers).toEqual(["1", "3-4", "5", "6"]);
  });

  it("keeps the text of a verse that continues into the same paragraph", () => {
    render(<PassageText blocks={blocks} />);
    expect(screen.getByText(/First verse begins and continues\./)).toBeInTheDocument();
  });

  it("uses heading levels below the page title and keeps psalm titles and labels as text", () => {
    render(<PassageText blocks={blocks} />);
    expect(screen.getByRole("heading", { level: 2, name: "Book heading" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Section heading" })).toBeInTheDocument();
    expect(screen.getByText("A Psalm of David.").tagName).toBe("P");
    expect(screen.getByText("Beloved").tagName).toBe("P");
  });

  it("indents poetry lines more for deeper levels, without inline styles", () => {
    const { container } = render(<PassageText blocks={blocks} />);
    const first = screen.getByText(/A line,/).closest("p")!;
    const second = screen.getByText(/an indented line\./).closest("p")!;
    expect(first.className).not.toBe(second.className);
    expect(container.querySelectorAll("[style]")).toHaveLength(0);
  });

  it("hides the blank-line break from assistive technology", () => {
    const { container } = render(<PassageText blocks={blocks} />);
    expect(container.querySelector("[data-break]")).toHaveAttribute("aria-hidden", "true");
  });
});

const john = findBook("john")!;
const bsb = findVersion("bsb")!;

const passage = (over: Partial<Passage> = {}): Passage => ({
  version: "bsb",
  book: "john",
  chapter: 3,
  range: null,
  fallback: null,
  lastVerse: 36,
  blocks: [
    {
      kind: "paragraph",
      indent: 0,
      runs: [{ verse: 16, end: null, start: true, text: "For God so loved the world." }],
    },
  ],
  ...over,
});

describe("Reader", () => {
  it("titles a whole chapter, names the version and shows the credit", () => {
    render(<Reader passage={passage()} version={bsb} book={john} />);
    expect(screen.getByRole("heading", { level: 1, name: "John 3" })).toBeInTheDocument();
    expect(screen.getByText("Berean Standard Bible")).toBeInTheDocument();
    expect(screen.getByText(bsb.credit)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /show full chapter/i })).not.toBeInTheDocument();
  });

  it("titles a range, says which verses and links to the whole chapter", () => {
    render(<Reader passage={passage({ range: { from: 16, to: 18 } })} version={bsb} book={john} />);
    expect(screen.getByRole("heading", { level: 1, name: "John 3:16–18" })).toBeInTheDocument();
    expect(screen.getByText("Verses 16 to 18")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Show full chapter" })).toHaveAttribute(
      "href",
      "/bible/bsb/john/3",
    );
  });

  it("says Verse, not Verses, for a single verse", () => {
    render(<Reader passage={passage({ range: { from: 16, to: 16 } })} version={bsb} book={john} />);
    expect(screen.getByText("Verse 16")).toBeInTheDocument();
  });

  it("explains a fallback to the whole chapter, for one verse and for several", () => {
    const { rerender } = render(
      <Reader passage={passage({ fallback: { from: 21, to: 21 } })} version={bsb} book={john} />,
    );
    expect(screen.getByRole("note")).toHaveTextContent(
      "Verse 21 is not in the Berean Standard Bible, so the whole chapter is shown.",
    );
    rerender(
      <Reader passage={passage({ fallback: { from: 24, to: 26 } })} version={bsb} book={john} />,
    );
    expect(screen.getByRole("note")).toHaveTextContent(
      "Verses 24–26 are not in the Berean Standard Bible, so the whole chapter is shown.",
    );
  });

  it("explains a verse range it could not read, without repeating the input", () => {
    render(<Reader passage={passage()} version={bsb} book={john} invalidVerses />);
    expect(screen.getByRole("note")).toHaveTextContent(
      "That verse range was not understood, so the whole chapter is shown.",
    );
  });

  it("marks the text as English and gives the article an accessible name", () => {
    const { container } = render(<Reader passage={passage()} version={bsb} book={john} />);
    expect(container.querySelector("[lang='en']")).not.toBeNull();
    const article = screen.getByRole("article");
    expect(within(article).getByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});
