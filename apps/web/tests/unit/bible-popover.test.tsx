// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PassagePopover } from "@/components/bible/passage-popover";
import type { PickerState } from "@/lib/bible/picker";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/bible/scroll-to-current", () => ({ scrollToCurrent: () => {} }));

beforeEach(() => push.mockClear());
afterEach(cleanup);

const range: PickerState = { version: "bsb", book: "john", chapter: 3, from: 16, to: 18 };
const whole: PickerState = { ...range, from: null, to: null };

async function open(state: PickerState = range) {
  const user = userEvent.setup();
  render(<PassagePopover state={state} />);
  await user.click(screen.getByRole("button", { name: /Change passage/ }));
  return { user, dialog: screen.getByRole("dialog", { name: "Choose passage" }) };
}

describe("PassagePopover", () => {
  it("is a button that names the passage and opens the picker", async () => {
    render(<PassagePopover state={range} />);
    const trigger = screen.getByRole("button", { name: "Change passage: John 3:16–18" });
    await userEvent.setup().click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Choose passage" });
    expect(within(dialog).getByRole("radiogroup", { name: "Bible version" })).toBeDefined();
  });

  it("shows the current book, chapter and verses as chosen", async () => {
    const { dialog } = await open();
    expect(within(dialog).getByRole("button", { name: /^John/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(within(dialog).getByRole("button", { name: "Chapter 3" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    for (const n of ["Verse 15", "Verse 19"]) {
      expect(within(dialog).getByRole("button", { name: n })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    }
    for (const n of ["Verse 16", "Verse 17", "Verse 18"]) {
      expect(within(dialog).getByRole("button", { name: n })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    }
    expect(within(dialog).getByRole("status")).toHaveTextContent("Reading John 3:16–18 in the BSB");
  });

  it("a new book shows its chapters and clears the verses", async () => {
    const { user, dialog } = await open();
    await user.click(within(dialog).getByRole("button", { name: /^Mark/ }));
    expect(within(dialog).getByRole("heading", { name: "Mark" })).toBeDefined();
    expect(within(dialog).getByRole("button", { name: "Chapter 16" })).toBeDefined();
    expect(within(dialog).queryByRole("button", { name: "Chapter 17" })).toBeNull();
    await user.click(within(dialog).getByRole("button", { name: "Read" }));
    expect(push).toHaveBeenCalledWith("/bible/bsb/mark/1");
  });

  it("filters the books as you type", async () => {
    const { user, dialog } = await open();
    await user.type(within(dialog).getByRole("searchbox", { name: "Find a book" }), "jo");
    const books = within(within(dialog).getByRole("navigation", { name: "Books" }));
    expect(books.getByRole("button", { name: /^John/ })).toBeDefined();
    expect(books.queryByRole("button", { name: /^Genesis/ })).toBeNull();
  });

  it("one click on a verse is that verse, a second makes a range", async () => {
    const { user, dialog } = await open(whole);
    await user.click(within(dialog).getByRole("button", { name: "Verse 20" }));
    expect(within(dialog).getByRole("status")).toHaveTextContent("Reading John 3:20 in");
    await user.click(within(dialog).getByRole("button", { name: "Verse 22" }));
    expect(within(dialog).getByRole("status")).toHaveTextContent("Reading John 3:20–22 in");
    await user.click(within(dialog).getByRole("button", { name: "Read" }));
    expect(push).toHaveBeenCalledWith("/bible/bsb/john/3?v=20-22");
  });

  it("Whole chapter clears the verses and is marked while nothing is chosen", async () => {
    const { user, dialog } = await open();
    const whole = within(dialog).getByRole("button", { name: "Whole chapter" });
    expect(whole).toHaveAttribute("aria-pressed", "false");
    await user.click(whole);
    expect(whole).toHaveAttribute("aria-pressed", "true");
    expect(within(dialog).getByRole("status")).toHaveTextContent("Reading John 3 in");
    await user.click(within(dialog).getByRole("button", { name: "Read" }));
    expect(push).toHaveBeenCalledWith("/bible/bsb/john/3");
  });

  it("choosing every verse still reads the verses that are marked", async () => {
    const { user, dialog } = await open(whole);
    await user.click(within(dialog).getByRole("button", { name: "Verse 1" }));
    await user.click(within(dialog).getByRole("button", { name: "Verse 36" }));
    expect(within(dialog).getByRole("button", { name: "Whole chapter" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await user.click(within(dialog).getByRole("button", { name: "Read" }));
    expect(push).toHaveBeenCalledWith("/bible/bsb/john/3?v=1-36");
  });

  it("a long book shows its chapters in pages of 25", async () => {
    const { user, dialog } = await open();
    await user.click(within(dialog).getByRole("button", { name: /^Psalms/ }));
    expect(within(dialog).getByRole("button", { name: "Chapter 25" })).toBeDefined();
    expect(within(dialog).queryByRole("button", { name: "Chapter 26" })).toBeNull();
    await user.click(within(dialog).getByRole("tab", { name: "26 to 50" }));
    expect(within(dialog).getByRole("button", { name: "Chapter 26" })).toBeDefined();
  });

  it("changing the Bible applies on Read and keeps the passage", async () => {
    const { user, dialog } = await open();
    await user.click(within(dialog).getByRole("radio", { name: "WEB" }));
    await user.click(within(dialog).getByRole("button", { name: "Read" }));
    expect(push).toHaveBeenCalledWith("/bible/web/john/3?v=16-18");
  });
});
