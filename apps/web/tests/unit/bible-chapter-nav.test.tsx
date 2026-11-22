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

  it("puts a left arrow before the previous place and a right arrow after the next, hidden from screen readers", () => {
    const n = nav("john", 3);
    const previous = n.getByRole("link", { name: /^Previous chapter/ });
    const next = n.getByRole("link", { name: /^Next chapter/ });
    const arrows = (el: HTMLElement) =>
      [...el.querySelectorAll("[aria-hidden='true']")].map((a) => a.textContent);
    expect(arrows(previous)).toEqual(["←"]);
    expect(arrows(next)).toEqual(["→"]);
    const order = (el: HTMLElement) => [...el.children].map((c) => c.getAttribute("aria-hidden"));
    expect(order(previous).slice(1)).toEqual(["true", null]);
    expect(order(next).slice(1)).toEqual([null, "true"]);
    cleanup();
    expect(nav("genesis", 1).getByRole("button", { name: /Start of the Bible/ }).textContent).toBe(
      "←Start of the Bible",
    );
    cleanup();
    expect(
      nav("revelation", 22).getByRole("button", { name: /End of the Bible/ }).textContent,
    ).toBe("End of the Bible→");
  });

  it("keeps the name on one line: the arrow never shrinks and the name is the part that can truncate", () => {
    const link = nav("john", 3).getByRole("link", { name: /^Previous chapter/ });
    expect(link.querySelector("[aria-hidden='true']")?.className).toMatch(/flex-none/);
    expect(link.querySelector(".truncate")).not.toBeNull();
    expect(link.className).toMatch(/min-w-0/);
  });

  it("shows the full name, and the standard short name only on a phone while the middle button is showing", () => {
    const link = nav("1-thessalonians", 5).getByRole("link", { name: /^Previous chapter/ });
    const [full, short] = [...link.querySelectorAll(".truncate > span")] as HTMLElement[];
    expect(full.textContent).toBe("1 Thessalonians 4");
    expect(full.className).toMatch(/group-has-\[\[data-bar-middle\]\]\/nav:max-lg:hidden/);
    expect(short.textContent).toBe("1 Thess 4");
    expect(short.className).toMatch(/^hidden /);
    expect(short.className).toMatch(/group-has-\[\[data-bar-middle\]\]\/nav:max-lg:inline/);
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

  it("makes next the filled button, as in the approved mockup, and previous the outlined one", () => {
    const n = nav("john", 3);
    expect(n.getByRole("link", { name: /^Next chapter/ }).className).toMatch(/bg-accent-ink/);
    expect(n.getByRole("link", { name: /^Previous chapter/ }).className).not.toMatch(
      /bg-accent-ink/,
    );
  });

  it("makes both buttons tall touch targets", () => {
    const n = nav("john", 3);
    for (const link of n.getAllByRole("link")) expect(link.className).toMatch(/min-h-12/);
  });

  it("is pinned to the bottom of the screen on a phone and sits under the text on a wide screen", () => {
    nav("john", 3);
    const bar = screen.getByRole("navigation", { name: "Previous and next chapter" });
    expect(bar.className).toMatch(/\bfixed\b/);
    expect(bar.className).toMatch(/\bbottom-0\b/);
    expect(bar.className).toMatch(/lg:static/);
  });
});
