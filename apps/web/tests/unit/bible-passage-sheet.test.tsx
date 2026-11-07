// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PassageSheet } from "@/components/bible/passage-sheet";
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

const whole: PickerState = { version: "bsb", book: "john", chapter: 3, from: null, to: null };
const range: PickerState = { ...whole, from: 16, to: 18 };

async function open(state: PickerState = whole) {
  const user = userEvent.setup();
  render(<PassageSheet state={state} />);
  const trigger = screen.getByRole("button", { name: /Change passage/ });
  await user.click(trigger);
  return { user, trigger, sheet: screen.getByRole("dialog", { name: "Choose passage" }) };
}

const step = (name: RegExp) => screen.getByRole("button", { name });

describe("PassageSheet trigger", () => {
  it("shows the current passage and says it changes it", () => {
    render(<PassageSheet state={range} />);
    const trigger = screen.getByRole("button", { name: "Change passage: John 3:16–18" });
    expect(trigger).toHaveTextContent("John 3:16–18");
    expect(trigger.className).toMatch(/min-h-11/);
  });
});

describe("PassageSheet steps", () => {
  it("opens on the Book step with four steps in order", async () => {
    const { sheet } = await open();
    const steps = within(within(sheet).getByRole("navigation", { name: "Steps" })).getAllByRole(
      "button",
    );
    expect(steps.map((s) => s.textContent?.replace(/[^\w ]/g, "").trim())).toEqual([
      "1 Bible",
      "2 Book",
      "3 Chapter",
      "4 Verses",
    ]);
    expect(step(/^2 Book/)).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("heading", { level: 2, name: "Choose a book" })).toBeInTheDocument();
  });

  it("lists all 66 books under Old and New Testament, with the current one marked", async () => {
    await open();
    expect(screen.getByText("Old Testament")).toBeInTheDocument();
    expect(screen.getByText("New Testament")).toBeInTheDocument();
    const books = screen.getAllByRole("button", { name: /^(\d )?[A-Z][a-z]+( of [A-Z][a-z]+)?$/ });
    expect(books.filter((b) => b.closest("[data-books]"))).toHaveLength(66);
    expect(screen.getByRole("button", { name: "John" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Genesis" })).not.toHaveAttribute("aria-current");
  });

  it("goes back to any step by its button", async () => {
    const { user } = await open();
    await user.click(step(/^3 Chapter/));
    expect(
      screen.getByRole("heading", { level: 2, name: "Choose a chapter in John" }),
    ).toBeInTheDocument();
    await user.click(step(/^1 Bible/));
    expect(screen.getByRole("heading", { level: 2, name: "Choose a Bible" })).toBeInTheDocument();
    await user.click(step(/^4 Verses/));
    expect(screen.getByRole("heading", { level: 2, name: "Choose verses" })).toBeInTheDocument();
  });

  it("moves focus to the new step's heading so a screen reader hears where it is", async () => {
    const { user } = await open();
    await user.click(step(/^3 Chapter/));
    expect(screen.getByRole("heading", { level: 2, name: /Choose a chapter/ })).toHaveFocus();
  });
});

describe("scrolling to where you are", () => {
  it("centres the current book when the Book step opens", async () => {
    await open();
    expect(scrolledTo()).toHaveLength(1);
    expect(scrolledTo()[0].textContent).toContain("John");
  });

  it("centres the current chapter when the Chapter step opens", async () => {
    const { user } = await open({ ...whole, book: "psalms", chapter: 119 });
    scrollToCurrent.mockClear();
    await user.click(step(/^3 Chapter/));
    expect(scrolledTo()).toHaveLength(1);
    expect(scrolledTo()[0].textContent).toBe("119");
  });
});

describe("Bible step", () => {
  it("keeps the passage when the Bible changes, moves on to Book, and cannot pick the ESV", async () => {
    const { user } = await open(range);
    await user.click(step(/^1 Bible/));
    expect(screen.getByRole("radio", { name: /English Standard Version/ })).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: /World English Bible/ }));
    expect(screen.getByRole("heading", { level: 2, name: "Choose a book" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Read" }));
    expect(push).toHaveBeenCalledWith("/bible/web/john/3?v=16-18");
  });
});

describe("Book and chapter steps", () => {
  it("choosing a book resets to chapter 1 and moves on to the chapter grid", async () => {
    const { user } = await open(range);
    await user.click(screen.getByRole("button", { name: "Romans" }));
    expect(
      screen.getByRole("heading", { level: 2, name: "Choose a chapter in Romans" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^\d+$/ })).toHaveLength(16);
    expect(screen.getByRole("button", { name: "1" })).toHaveAttribute("aria-current", "true");
  });

  it("shows the right number of chapters for a long and a one-chapter book", async () => {
    const { user } = await open();
    await user.click(screen.getByRole("button", { name: "Psalms" }));
    expect(screen.getAllByRole("button", { name: /^\d+$/ })).toHaveLength(150);
    await user.click(step(/^2 Book/));
    await user.click(screen.getByRole("button", { name: "Jude" }));
    expect(screen.getAllByRole("button", { name: /^\d+$/ })).toHaveLength(1);
  });

  it("choosing a chapter moves on to Verses with the whole chapter chosen", async () => {
    const { user } = await open();
    await user.click(screen.getByRole("button", { name: "Romans" }));
    await user.click(screen.getByRole("button", { name: "14" }));
    expect(screen.getByRole("heading", { level: 2, name: "Choose verses" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Whole chapter/ })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Read" }));
    expect(push).toHaveBeenCalledWith("/bible/bsb/romans/14");
  });

  it("makes every chapter and book button at least 44px", async () => {
    const { user } = await open();
    expect(screen.getByRole("button", { name: "Genesis" }).className).toMatch(/min-h-12|min-h-11/);
    await user.click(screen.getByRole("button", { name: "John" }));
    expect(screen.getByRole("button", { name: "3" }).className).toMatch(/size-11|min-h-11/);
  });
});

describe("Verses step", () => {
  const first = () => within(screen.getByRole("group", { name: "First verse" }));
  const last = () => within(screen.getByRole("group", { name: "Last verse" }));

  it("starts from the current verses", async () => {
    const { user } = await open(range);
    await user.click(step(/^4 Verses/));
    expect(screen.getByRole("radio", { name: /Some verses/ })).toBeChecked();
    expect(first().getByRole("status")).toHaveTextContent("16");
    expect(last().getByRole("status")).toHaveTextContent("18");
  });

  it("steps the verses and reads them", async () => {
    const { user } = await open(range);
    await user.click(step(/^4 Verses/));
    await user.click(last().getByRole("button", { name: "Increase last verse" }));
    await user.click(first().getByRole("button", { name: "Decrease first verse" }));
    await user.click(screen.getByRole("button", { name: "Read" }));
    expect(push).toHaveBeenCalledWith("/bible/bsb/john/3?v=15-19");
  });

  it("turns the steppers on from Whole chapter at verse 1, and off again", async () => {
    const { user } = await open();
    await user.click(step(/^4 Verses/));
    expect(screen.queryByRole("group", { name: "First verse" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /Some verses/ }));
    expect(first().getByRole("status")).toHaveTextContent("1");
    expect(last().getByRole("status")).toHaveTextContent("1");
    await user.click(screen.getByRole("radio", { name: /Whole chapter/ }));
    expect(screen.queryByRole("group", { name: "First verse" })).not.toBeInTheDocument();
  });

  it("stops at the first and last verse of the chapter, using this Bible's own count", async () => {
    const { user } = await open({ version: "bsb", book: "romans", chapter: 14, from: 1, to: 1 });
    await user.click(step(/^4 Verses/));
    expect(first().getByRole("button", { name: "Decrease first verse" })).toBeDisabled();
    for (let i = 0; i < 30; i++) {
      const more = last().getByRole("button", { name: "Increase last verse" });
      if (more.hasAttribute("disabled")) break;
      await user.click(more);
    }
    expect(last().getByRole("status")).toHaveTextContent("23");
    expect(last().getByRole("button", { name: "Increase last verse" })).toBeDisabled();
  });

  it("never lets the first verse pass the last, and pushes the last along", async () => {
    const { user } = await open({ ...whole, from: 5, to: 5 });
    await user.click(step(/^4 Verses/));
    await user.click(first().getByRole("button", { name: "Increase first verse" }));
    expect(first().getByRole("status")).toHaveTextContent("6");
    expect(last().getByRole("status")).toHaveTextContent("6");
    await user.click(last().getByRole("button", { name: "Decrease last verse" }));
    expect(last().getByRole("status")).toHaveTextContent("6");
    expect(last().getByRole("button", { name: "Decrease last verse" })).toBeDisabled();
  });

  it("makes the stepper buttons at least 44px", async () => {
    const { user } = await open(range);
    await user.click(step(/^4 Verses/));
    expect(first().getByRole("button", { name: "Increase first verse" }).className).toMatch(
      /size-11/,
    );
  });
});

describe("Read and closing", () => {
  it("reads the passage as it is when nothing was changed, and closes", async () => {
    const { user } = await open(range);
    await user.click(screen.getByRole("button", { name: "Read" }));
    expect(push).toHaveBeenCalledWith("/bible/bsb/john/3?v=16-18");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes with Escape and gives focus back to the trigger, without going anywhere", async () => {
    const { user, trigger } = await open();
    await user.click(screen.getByRole("button", { name: "Romans" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(push).not.toHaveBeenCalled();
  });

  it("forgets unfinished choices when closed, so reopening shows the current passage", async () => {
    const { user, trigger } = await open();
    await user.click(screen.getByRole("button", { name: "Romans" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(trigger);
    expect(screen.getByRole("button", { name: "John" })).toHaveAttribute("aria-current", "true");
  });

  it("makes Read and Close at least 44px", async () => {
    await open();
    expect(screen.getByRole("button", { name: "Read" }).className).toMatch(/min-h-11/);
    expect(screen.getByRole("button", { name: "Close" }).className).toMatch(/size-11/);
  });
});
