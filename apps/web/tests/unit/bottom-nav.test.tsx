// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChatHost } from "@/components/chat/chat-host";
import { BottomNav } from "@/components/layout/bottom-nav";

vi.mock("@/lib/actions/chat", () => ({ sendChat: vi.fn(), warmChat: vi.fn() }));

afterEach(cleanup);

const site = () => render(<BottomNav devotionalHref="/devotionals/advent-01" />);

describe("BottomNav on the site pages", () => {
  it("is a labelled landmark that only shows on phones and stays fixed at the bottom", () => {
    site();
    const nav = screen.getByRole("navigation", { name: "Quick links" });
    expect(nav.className).toMatch(/\bfixed\b/);
    expect(nav.className).toMatch(/\bbottom-0\b/);
    expect(nav.className).toMatch(/\blg:hidden\b/);
  });

  it("has Devotional, Bible and Ask the Word", () => {
    site();
    expect(screen.getByRole("link", { name: "Devotional" })).toHaveAttribute(
      "href",
      "/devotionals/advent-01",
    );
    expect(screen.getByRole("link", { name: "Bible" })).toHaveAttribute("href", "/bible");
    expect(screen.getByRole("link", { name: "Ask the Word" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Shore" })).toBeNull();
  });

  it("puts Bible in the middle as a round 56px ink button inside a bump the top line follows", () => {
    site();
    const bible = screen.getByRole("link", { name: "Bible" });
    const round = bible.querySelector("span");
    expect(round?.className).toMatch(/\bbg-ink\b/);
    expect(round?.className).toMatch(/\bsize-14\b/);
    expect(round?.className).toMatch(/\brounded-full\b/);
    const bump = screen.getByRole("navigation").querySelector("svg[data-bump]");
    expect(bump?.getAttribute("aria-hidden")).toBe("true");
    expect(bump?.querySelectorAll("path").length).toBe(2);
  });

  it("keeps the side buttons at least 44px tall and clear of the home bar", () => {
    site();
    for (const name of ["Devotional", "Ask the Word"]) {
      expect(screen.getByRole("link", { name }).className).toMatch(/\bmin-h-12\b/);
    }
    expect(screen.getByRole("navigation").className).toMatch(/env\(safe-area-inset-bottom\)/);
  });
});

describe("BottomNav Ask the Word", () => {
  it("opens the chat in place, without following its mail link", async () => {
    render(
      <>
        <BottomNav devotionalHref="/devotionals/advent-01" />
        <ChatHost />
      </>,
    );
    await userEvent.setup().click(screen.getByRole("link", { name: "Ask the Word" }));
    expect(await screen.findByRole("dialog", { name: "Ask the Word" })).toBeInTheDocument();
  });
});

describe("BottomNav current page", () => {
  it("marks Devotional as the current page, in the accent colour", () => {
    render(<BottomNav devotionalHref="/devotionals/advent-01" current="devotional" />);
    const link = screen.getByRole("link", { name: "Devotional" });
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link.className).toMatch(/\bborder-accent-ink\b/);
    expect(link.className).toMatch(/\btext-accent-ink\b/);
  });

  it("marks nothing as current by default", () => {
    site();
    expect(screen.getByRole("navigation").querySelector("[aria-current]")).toBeNull();
  });
});

describe("BottomNav on the chat screen", () => {
  it("swaps Ask the Word for Shore, which goes to the landing page", () => {
    render(<BottomNav devotionalHref="/devotionals/advent-01" variant="chat" />);
    expect(screen.getByRole("link", { name: "Shore" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("link", { name: "Ask the Word" })).toBeNull();
    expect(screen.getByRole("link", { name: "Devotional" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bible" })).toBeInTheDocument();
  });
});
