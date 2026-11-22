// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ShoreButton } from "@/components/bible/shore-button";
import { ChatReturn } from "@/components/chat/chat-return";
import { clearChatReturn, markChatLeft } from "@/lib/chat/return";

beforeEach(() => sessionStorage.clear());
afterEach(cleanup);

describe("ShoreButton, the middle of the Bible reader's bar", () => {
  it("goes to the landing page and is named Shore", () => {
    render(<ShoreButton />);
    expect(screen.getByRole("link", { name: "Shore" })).toHaveAttribute("href", "/");
  });

  it("is a round ink button of 56px with its word under it, in a bump the top line follows", () => {
    render(<ShoreButton />);
    const link = screen.getByRole("link", { name: "Shore" });
    const round = link.querySelector("span");
    expect(round?.className).toMatch(/\bbg-ink\b/);
    expect(round?.className).toMatch(/\bsize-14\b/);
    expect(round?.className).toMatch(/\brounded-full\b/);
    const root = link.closest("[data-bar-middle]")!;
    const bump = root.querySelector("svg[data-bump]");
    expect(bump?.getAttribute("aria-hidden")).toBe("true");
    expect(bump?.querySelectorAll("path").length).toBe(2);
  });

  it("is for phones only", () => {
    render(<ShoreButton />);
    expect(
      screen.getByRole("link", { name: "Shore" }).closest("[data-bar-middle]")?.className,
    ).toMatch(/\blg:hidden\b/);
  });
});

describe("the middle button in the Bible reader", () => {
  it("is Shore for a visitor who did not come from the chat", () => {
    render(<ChatReturn />);
    expect(screen.getByRole("link", { name: "Shore" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^your chat$/i })).toBeNull();
  });

  it("is Your chat, and not Shore, for a visitor who came from the chat", async () => {
    markChatLeft("/");
    render(<ChatReturn />);
    expect(await screen.findByRole("button", { name: /^your chat$/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Shore" })).toBeNull();
  });

  it("goes back to Shore when the way back to the chat is cleared", async () => {
    markChatLeft("/");
    render(<ChatReturn />);
    await screen.findByRole("button", { name: /^your chat$/i });
    act(() => clearChatReturn());
    expect(screen.getByRole("link", { name: "Shore" })).toBeInTheDocument();
  });
});
