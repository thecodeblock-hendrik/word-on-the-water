// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ChapterNav } from "@/components/bible/chapter-nav";
import { findBook } from "@/lib/bible/books";

afterEach(cleanup);

const nav = (slug: string, chapter: number, version = "bsb") => {
  render(<ChapterNav version={version} book={findBook(slug)!} chapter={chapter} />);
  return within(screen.getByRole("navigation", { name: "Previous and next chapter" }));
};

describe("ChapterNav", () => {
  it("links to the chapters before and after, named for screen readers and showing the place", () => {
    const n = nav("john", 3);
    const previous = n.getByRole("link", { name: /^Previous chapter: John 2/ });
    const next = n.getByRole("link", { name: /^Next chapter: John 4/ });
    expect(previous).toHaveAttribute("href", "/bible/bsb/john/2");
    expect(next).toHaveAttribute("href", "/bible/bsb/john/4");
    expect(previous).toHaveTextContent("John 2");
    expect(next).toHaveTextContent("John 4");
  });

  it("shows a chevron above the place below lg, and the text arrow from lg", () => {
    const n = nav("john", 3);
    for (const [name, arrow] of [
      [/^Previous chapter/, "←"],
      [/^Next chapter/, "→"],
    ] as const) {
      const link = n.getByRole("link", { name });
      const chevron = link.querySelector("svg")!;
      expect(chevron).toHaveAttribute("aria-hidden", "true");
      expect(chevron).toHaveClass("lg:hidden");
      // The chevron comes before the name, so it sits above it in the capsule.
      expect(chevron.compareDocumentPosition(link.querySelector(".truncate")!)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
      const text = [...link.querySelectorAll("span[aria-hidden='true']")];
      expect(text.map((a) => a.textContent)).toEqual([arrow]);
      expect(text[0]).toHaveClass("max-lg:hidden");
    }
  });

  it.each([
    ["genesis", 1, "Start of the Bible", "Start"],
    ["revelation", 22, "End of the Bible", "End"],
  ])(
    "calls the dead end of %s %i by its full name, shortened below lg",
    (book, ch, full, short) => {
      const dead = nav(book, ch).getByRole("button", { name: full });
      expect(dead).toBeDisabled();
      const [long, brief] = [...dead.querySelectorAll(".truncate")] as HTMLElement[];
      expect([long.textContent, brief.textContent]).toEqual([full, short]);
      expect(long).toHaveClass("max-lg:hidden");
      expect(brief).toHaveClass("lg:hidden");
    },
  );

  it("keeps the name on one line: the arrow never shrinks and the name is the part that can truncate", () => {
    const link = nav("john", 3).getByRole("link", { name: /^Previous chapter/ });
    expect(link.querySelector("span[aria-hidden='true']")).toHaveClass("flex-none");
    expect(link.querySelector(".truncate")).not.toBeNull();
    expect(link.className).toMatch(/min-w-0/);
  });

  it("shows the standard short name below lg and the full name from lg", () => {
    const link = nav("1-thessalonians", 5).getByRole("link", { name: /^Previous chapter/ });
    const [full, short] = [...link.querySelectorAll(".truncate > span")] as HTMLElement[];
    expect(full.textContent).toBe("1 Thessalonians 4");
    expect(full).toHaveClass("max-lg:hidden");
    expect(short.textContent).toBe("1 Thess 4");
    expect(short).toHaveClass("lg:hidden");
  });

  it("puts previous before next in reading order", () => {
    const links = nav("john", 3).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/bible/bsb/john/2",
      "/bible/bsb/john/4",
    ]);
  });

  it("crosses from the end of one book to the start of the next, and the Testament boundary", () => {
    expect(nav("malachi", 4).getByRole("link", { name: /^Next chapter/ })).toHaveAttribute(
      "href",
      "/bible/bsb/matthew/1",
    );
    cleanup();
    expect(nav("matthew", 1).getByRole("link", { name: /^Previous chapter/ })).toHaveAttribute(
      "href",
      "/bible/bsb/malachi/4",
    );
    cleanup();
    expect(
      nav("genesis", 50).getByRole("link", { name: /^Next chapter: Exodus 1/ }),
    ).toBeInTheDocument();
  });

  it("names the first chapter of a book you step into, with its full name", () => {
    expect(
      nav("1-john", 5).getByRole("link", { name: /^Next chapter: 2 John 1/ }),
    ).toBeInTheDocument();
  });

  it("has no previous link at Genesis 1, only a disabled place-holder, and still links forward", () => {
    const n = nav("genesis", 1);
    expect(n.queryByRole("link", { name: /^Previous chapter/ })).not.toBeInTheDocument();
    expect(n.getByRole("button", { name: /Start of the Bible/ })).toBeDisabled();
    expect(n.getByRole("link", { name: /^Next chapter: Genesis 2/ })).toBeInTheDocument();
  });

  it("has no next link at Revelation 22, only a disabled place-holder, and still links back", () => {
    const n = nav("revelation", 22);
    expect(n.queryByRole("link", { name: /^Next chapter/ })).not.toBeInTheDocument();
    expect(n.getByRole("button", { name: /End of the Bible/ })).toBeDisabled();
    expect(n.getByRole("link", { name: /^Previous chapter: Revelation 21/ })).toBeInTheDocument();
  });

  it("stays in the chosen Bible and goes to the whole chapter, never a verse range", () => {
    const hrefs = nav("romans", 14, "web")
      .getAllByRole("link")
      .map((l) => l.getAttribute("href"));
    expect(hrefs).toEqual(["/bible/web/romans/13", "/bible/web/romans/15"]);
    expect(hrefs.join()).not.toContain("?v");
  });

  it("keeps the desktop look from lg: next filled, previous outlined", () => {
    const n = nav("john", 3);
    expect(n.getByRole("link", { name: /^Next chapter/ })).toHaveClass("lg:bg-accent-ink");
    expect(n.getByRole("link", { name: /^Previous chapter/ })).not.toHaveClass("lg:bg-accent-ink");
  });

  it("gives neither tab a fill or a border below lg", () => {
    for (const link of nav("john", 3).getAllByRole("link")) {
      expect(link).toHaveClass("flex-1", "flex-col", "text-ink", "rounded-full");
      const phone = link.className.split(/\s+/).filter((c) => !c.startsWith("lg:"));
      expect(phone.join(" ")).not.toMatch(/(^| )(bg-|border)/);
    }
  });

  it("keeps both buttons tall touch targets from lg (below it they fill the 64px capsule)", () => {
    const n = nav("john", 3);
    for (const link of n.getAllByRole("link")) expect(link).toHaveClass("lg:min-h-12");
  });

  it("floats as the glass capsule below lg, capped at 440px, and sits under the text from lg", () => {
    nav("john", 3);
    const bar = screen.getByRole("navigation", { name: "Previous and next chapter" });
    expect(bar).toHaveClass(
      "fixed",
      "max-lg:glass-dock",
      "max-lg:glass-bar",
      "mx-auto",
      "max-w-[440px]",
      "lg:static",
    );
  });
});
