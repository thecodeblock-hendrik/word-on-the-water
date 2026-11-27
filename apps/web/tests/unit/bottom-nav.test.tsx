// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChatHost } from "@/components/chat/chat-host";
import { BottomNav } from "@/components/layout/bottom-nav";

vi.mock("@/lib/actions/chat", () => ({ sendChat: vi.fn(), warmChat: vi.fn() }));

afterEach(cleanup);

const site = () => render(<BottomNav devotionalHref="/devotionals/advent-01" />);

const tabNames = () =>
  [...screen.getByRole("navigation", { name: "Quick links" }).querySelectorAll("a")].map(
    (link) => link.textContent,
  );

describe("BottomNav on the site pages", () => {
  it("is a labelled landmark that only shows below lg and floats at the bottom", () => {
    site();
    const nav = screen.getByRole("navigation", { name: "Quick links" });
    expect(nav).toHaveClass("fixed", "lg:hidden");
  });

  it("is a glass capsule, at most 440px wide and centred", () => {
    site();
    expect(screen.getByRole("navigation")).toHaveClass(
      "glass-dock",
      "glass-bar",
      "mx-auto",
      "max-w-[440px]",
    );
  });

  it("has Devotional, Bible and Ask the Word", () => {
    site();
    expect(tabNames()).toEqual(["Devotional", "Bible", "Ask the Word"]);
    expect(screen.getByRole("link", { name: "Devotional" })).toHaveAttribute(
      "href",
      "/devotionals/advent-01",
    );
    expect(screen.getByRole("link", { name: "Bible" })).toHaveAttribute("href", "/bible");
  });

  it("gives the three tabs equal shares, with no raised button and no filled one", () => {
    site();
    const nav = screen.getByRole("navigation");
    for (const link of nav.querySelectorAll("a")) {
      expect(link).toHaveClass("flex-1", "flex-col", "text-ink");
      expect(link.className).not.toMatch(/\bbg-/);
      expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    }
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

describe("BottomNav on a devotional page", () => {
  const devotional = () =>
    render(<BottomNav devotionalHref="/devotionals/advent-01" onDevotional />);

  it("puts Shore, which goes to the landing page, where Devotional was", () => {
    devotional();
    expect(tabNames()).toEqual(["Shore", "Bible", "Ask the Word"]);
    expect(screen.getByRole("link", { name: "Shore" })).toHaveAttribute("href", "/");
  });

  it.each([
    ["a devotional page", true],
    ["any other page", false],
  ])("marks no tab as the current page on %s", (_, onDevotional) => {
    render(<BottomNav devotionalHref="/devotionals/advent-01" onDevotional={onDevotional} />);
    expect(screen.getByRole("navigation").querySelector("[aria-current]")).toBeNull();
  });
});

describe("BottomNav on the chat screen", () => {
  it("swaps Ask the Word for Shore on the right", () => {
    render(<BottomNav devotionalHref="/devotionals/advent-01" variant="chat" />);
    expect(tabNames()).toEqual(["Devotional", "Bible", "Shore"]);
    expect(screen.getByRole("link", { name: "Shore" })).toHaveAttribute("href", "/");
  });

  it("keeps Devotional on the left even over a devotional page", () => {
    render(<BottomNav devotionalHref="/devotionals/advent-01" variant="chat" onDevotional />);
    expect(tabNames()).toEqual(["Devotional", "Bible", "Shore"]);
  });
});
