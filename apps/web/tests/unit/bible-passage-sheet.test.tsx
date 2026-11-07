// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PassagePopover } from "@/components/bible/passage-popover";
import { PassageSheet } from "@/components/bible/passage-sheet";
import type { PickerState } from "@/lib/bible/picker";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/bible/scroll-to-current", () => ({ scrollToCurrent: () => {} }));

beforeEach(() => push.mockClear());
afterEach(cleanup);

const whole: PickerState = { version: "bsb", book: "john", chapter: 3, from: null, to: null };
const range: PickerState = { ...whole, from: 16, to: 18 };

async function open(state: PickerState = range) {
  const user = userEvent.setup();
  render(<PassageSheet state={state} />);
  const trigger = screen.getByRole("button", { name: /Change passage/ });
  await user.click(trigger);
  return { user, trigger, sheet: screen.getByRole("dialog", { name: "Choose passage" }) };
}

const tab = (sheet: HTMLElement, name: RegExp) => within(sheet).getByRole("tab", { name });

describe("PassageSheet", () => {
  it("shows the current passage on the button and opens on the Book tab", async () => {
    const { sheet } = await open();
    expect(tab(sheet, /^Book John$/)).toHaveAttribute("aria-selected", "true");
    expect(within(sheet).getByRole("navigation", { name: "Books" })).toBeDefined();
  });

  it("the tabs show what is chosen: the book, the chapter and the verses", async () => {
    const { sheet } = await open();
    expect(tab(sheet, /^Chapter 3$/)).toBeDefined();
    expect(tab(sheet, /^Verses 16–18$/)).toBeDefined();
  });

  it("shows All for the verses when the whole chapter is chosen", async () => {
    const { sheet } = await open(whole);
    expect(tab(sheet, /^Verses All$/)).toBeDefined();
  });

  it("choosing a book moves to its chapters, a chapter moves to its verses", async () => {
    const { user, sheet } = await open();
    await user.click(within(sheet).getByRole("button", { name: "Mark" }));
    expect(tab(sheet, /^Chapter 1$/)).toHaveAttribute("aria-selected", "true");
    expect(within(sheet).getAllByRole("button", { name: /^Chapter \d+$/ })).toHaveLength(16);
    await user.click(within(sheet).getByRole("button", { name: "Chapter 4" }));
    expect(tab(sheet, /^Verses All$/)).toHaveAttribute("aria-selected", "true");
    expect(within(sheet).getAllByRole("button", { name: /^Verse \d+$/ })).toHaveLength(41);
  });

  it("any tab can be tapped to go back", async () => {
    const { user, sheet } = await open();
    await user.click(tab(sheet, /^Verses/));
    await user.click(tab(sheet, /^Book/));
    expect(within(sheet).getByRole("navigation", { name: "Books" })).toBeDefined();
  });

  it("filters the books as you type", async () => {
    const { user, sheet } = await open();
    await user.type(within(sheet).getByRole("searchbox", { name: "Find a book" }), "jo");
    const books = within(within(sheet).getByRole("navigation", { name: "Books" }));
    expect(books.getByRole("button", { name: "John" })).toBeDefined();
    expect(books.queryByRole("button", { name: "Genesis" })).toBeNull();
  });

  it("one tap on a verse is that verse and a second makes a range, read from the footer", async () => {
    const { user, sheet } = await open(whole);
    await user.click(tab(sheet, /^Verses/));
    await user.click(within(sheet).getByRole("button", { name: "Verse 20" }));
    expect(within(sheet).getByRole("status")).toHaveTextContent("Reading John 3:20 in");
    await user.click(within(sheet).getByRole("button", { name: "Verse 22" }));
    expect(within(sheet).getByRole("status")).toHaveTextContent("Reading John 3:20–22 in");
    expect(tab(sheet, /^Verses 20–22$/)).toBeDefined();
    await user.click(within(sheet).getByRole("button", { name: "Read" }));
    expect(push).toHaveBeenCalledWith("/bible/bsb/john/3?v=20-22");
  });

  it("Whole chapter clears the verses and is marked while nothing is chosen", async () => {
    const { user, sheet } = await open();
    const button = within(sheet).getByRole("button", { name: "Whole chapter" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    await user.click(within(sheet).getByRole("button", { name: "Read" }));
    expect(push).toHaveBeenCalledWith("/bible/bsb/john/3");
  });

  it("a long book shows its chapters in pages of 25", async () => {
    const { user, sheet } = await open();
    await user.click(within(sheet).getByRole("button", { name: "Psalms" }));
    expect(within(sheet).getByRole("button", { name: "Chapter 25" })).toBeDefined();
    expect(within(sheet).queryByRole("button", { name: "Chapter 26" })).toBeNull();
    await user.click(within(sheet).getByRole("tab", { name: "26 to 50" }));
    expect(within(sheet).getByRole("button", { name: "Chapter 26" })).toBeDefined();
  });

  it("changing the Bible keeps the passage and applies on Read, and the ESV cannot be picked", async () => {
    const { user, sheet } = await open();
    expect(within(sheet).getByRole("radio", { name: "ESV" })).toBeDisabled();
    await user.click(within(sheet).getByRole("radio", { name: "WEB" }));
    await user.click(within(sheet).getByRole("button", { name: "Read" }));
    expect(push).toHaveBeenCalledWith("/bible/web/john/3?v=16-18");
  });

  it("reads the passage as it is when nothing was changed", async () => {
    const { user, sheet } = await open();
    await user.click(within(sheet).getByRole("button", { name: "Read" }));
    expect(push).toHaveBeenCalledWith("/bible/bsb/john/3?v=16-18");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes with Escape, gives focus back to the trigger and goes nowhere", async () => {
    const { user, trigger } = await open();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
    expect(push).not.toHaveBeenCalled();
  });

  it("forgets unfinished choices when closed", async () => {
    const { user, sheet } = await open();
    await user.click(within(sheet).getByRole("button", { name: "Mark" }));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: /Change passage/ }));
    expect(tab(screen.getByRole("dialog"), /^Book John$/)).toBeDefined();
  });

  it("can be mounted beside the desktop popover without sharing its Bible choice", async () => {
    render(
      <>
        <PassagePopover state={range} />
        <PassageSheet state={range} />
      </>,
    );
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("button", { name: /Change passage/ })[1]);
    const sheet = screen.getByRole("dialog", { name: "Choose passage" });
    await user.click(within(sheet).getByRole("radio", { name: "WEB" }));
    expect(within(sheet).getByRole("radio", { name: "WEB" })).toBeChecked();
    expect(within(sheet).getByRole("radio", { name: "BSB" })).not.toBeChecked();
  });
});
