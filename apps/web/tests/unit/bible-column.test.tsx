// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PassageColumn } from "@/components/bible/passage-column";
import type { PickerState } from "@/lib/bible/picker";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const scrollToCurrent = vi.hoisted(() => vi.fn());
vi.mock("@/components/bible/scroll-to-current", () => ({ scrollToCurrent }));
const scrolledTo = () =>
  scrollToCurrent.mock.calls.map(([el]) => el as HTMLElement | null).filter((el) => el !== null);

beforeEach(() => {
  push.mockClear();
  scrollToCurrent.mockClear();
});
afterEach(cleanup);

const range: PickerState = { version: "bsb", book: "john", chapter: 3, from: 16, to: 18 };
const whole: PickerState = { ...range, from: null, to: null };

const column = () => screen.getByRole("complementary", { name: "Choose passage" });

describe("PassageColumn", () => {
  it("is a labelled complementary landmark that is only shown from lg", () => {
    render(<PassageColumn state={range} />);
    expect(column().className).toMatch(/\bhidden\b.*\blg:(block|grid)\b/);
  });

  describe("Bible", () => {
    it("is a segmented radio group of BSB, WEB and ESV (soon), with the ESV disabled", () => {
      render(<PassageColumn state={range} />);
      const group = within(column()).getByRole("radiogroup", { name: "Bible version" });
      const radios = within(group).getAllByRole("radio");
      expect(radios.map((r) => r.getAttribute("value"))).toEqual(["bsb", "web", "esv"]);
      expect(radios[0]).toBeChecked();
      expect(radios[2]).toBeDisabled();
      expect(within(group).getByText("ESV soon")).toBeInTheDocument();
    });

    it("opens the same passage in the chosen Bible", async () => {
      render(<PassageColumn state={range} />);
      await userEvent.setup().click(screen.getByRole("radio", { name: "WEB" }));
      expect(push).toHaveBeenCalledWith("/bible/web/john/3?v=16-18");
    });

    it("does nothing when the ESV is clicked or the current Bible is chosen again", async () => {
      render(<PassageColumn state={range} />);
      const user = userEvent.setup();
      await user.click(screen.getByRole("radio", { name: /ESV/ }));
      await user.click(screen.getByRole("radio", { name: "BSB" }));
      expect(push).not.toHaveBeenCalled();
    });
  });

  describe("Books", () => {
    it("lists all 66 books as links to chapter 1 in the current Bible", () => {
      render(<PassageColumn state={range} />);
      const books = within(screen.getByRole("navigation", { name: "Books" })).getAllByRole("link");
      expect(books).toHaveLength(66);
      expect(books[0]).toHaveAttribute("href", "/bible/bsb/genesis/1");
      expect(books.at(-1)).toHaveAttribute("href", "/bible/bsb/revelation/1");
    });

    it("follows the chosen Bible", () => {
      render(<PassageColumn state={{ ...range, version: "web" }} />);
      expect(screen.getByRole("link", { name: "Romans" })).toHaveAttribute(
        "href",
        "/bible/web/romans/1",
      );
    });

    it("marks the current book and centres it in its list", () => {
      render(<PassageColumn state={range} />);
      expect(screen.getByRole("link", { name: "John" })).toHaveAttribute("aria-current", "true");
      expect(screen.getByRole("link", { name: "Genesis" })).not.toHaveAttribute("aria-current");
      expect(scrolledTo().map((el) => el.textContent)).toContain("John");
    });

    it("groups them under Old and New Testament", () => {
      render(<PassageColumn state={range} />);
      expect(screen.getByText("Old Testament")).toBeInTheDocument();
      expect(screen.getByText("New Testament")).toBeInTheDocument();
    });
  });

  describe("Chapters", () => {
    it("lists the chapters of the current book as links, with the current one marked", () => {
      render(<PassageColumn state={range} />);
      const chapters = within(
        screen.getByRole("navigation", { name: "Chapters of John" }),
      ).getAllByRole("link");
      expect(chapters).toHaveLength(21);
      expect(chapters[0]).toHaveAttribute("href", "/bible/bsb/john/1");
      expect(chapters[2]).toHaveAttribute("aria-current", "true");
      expect(chapters[3]).not.toHaveAttribute("aria-current");
    });

    it("has 150 for Psalms and one for Jude", () => {
      const { unmount } = render(
        <PassageColumn state={{ ...whole, book: "psalms", chapter: 23 }} />,
      );
      expect(
        within(screen.getByRole("navigation", { name: "Chapters of Psalms" })).getAllByRole("link"),
      ).toHaveLength(150);
      unmount();
      render(<PassageColumn state={{ ...whole, book: "jude", chapter: 1 }} />);
      expect(
        within(screen.getByRole("navigation", { name: "Chapters of Jude" })).getAllByRole("link"),
      ).toHaveLength(1);
    });
  });

  describe("Verses", () => {
    const section = () => screen.getByText("Verses", { selector: "summary" }).closest("details")!;

    it("keeps the verses folded for a whole chapter and open when verses are chosen", () => {
      const { unmount } = render(<PassageColumn state={whole} />);
      expect(section()).not.toHaveAttribute("open");
      unmount();
      render(<PassageColumn state={range} />);
      expect(section()).toHaveAttribute("open");
    });

    it("has a Verses summary that is at least 44px tall", () => {
      render(<PassageColumn state={whole} />);
      expect(screen.getByText("Verses", { selector: "summary" }).className).toMatch(/min-h-11/);
    });

    it("starts from the current verses and shows them with steppers", () => {
      render(<PassageColumn state={range} />);
      expect(screen.getByRole("radio", { name: /Some verses/ })).toBeChecked();
      expect(
        within(screen.getByRole("group", { name: "First verse" })).getByRole("status"),
      ).toHaveTextContent("16");
    });

    it("shows the verses on the page with Show verses, using the steppers", async () => {
      render(<PassageColumn state={range} />);
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "Increase last verse" }));
      await user.click(screen.getByRole("button", { name: "Show verses" }));
      expect(push).toHaveBeenCalledWith("/bible/bsb/john/3?v=16-19");
    });

    it("shows the whole chapter when Whole chapter is chosen", async () => {
      render(<PassageColumn state={range} />);
      const user = userEvent.setup();
      await user.click(screen.getByRole("radio", { name: /Whole chapter/ }));
      await user.click(screen.getByRole("button", { name: "Show verses" }));
      expect(push).toHaveBeenCalledWith("/bible/bsb/john/3");
    });

    it("keeps the steppers inside this chapter", async () => {
      render(<PassageColumn state={{ ...range, from: 35, to: 36 }} />);
      expect(screen.getByRole("button", { name: "Increase last verse" })).toBeDisabled();
    });
  });

  it("lets the books and the chapters scroll in their own regions, so the Bible switch and the verses stay in view", () => {
    render(<PassageColumn state={range} />);
    const books = screen.getByRole("navigation", { name: "Books" })
      .firstElementChild as HTMLElement;
    const chapters = screen
      .getByRole("navigation", { name: "Chapters of John" })
      .querySelector("[data-scroll]")!;
    expect(books.className).toMatch(/overflow-y-auto/);
    expect(books.className).toMatch(/max-h-/);
    expect(chapters.className).toMatch(/overflow-y-auto/);
    expect(chapters.className).toMatch(/max-h-/);
  });

  it("makes every button at least 44px and every link row at least 44px", () => {
    render(<PassageColumn state={range} />);
    for (const link of within(screen.getByRole("navigation", { name: "Books" })).getAllByRole(
      "link",
    )) {
      expect(link.className).toMatch(/min-h-11/);
    }
    for (const link of within(
      screen.getByRole("navigation", { name: "Chapters of John" }),
    ).getAllByRole("link")) {
      expect(link.className).toMatch(/min-h-11/);
    }
    expect(screen.getByRole("button", { name: "Show verses" }).className).toMatch(/min-h-11/);
  });
});
