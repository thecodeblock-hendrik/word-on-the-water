// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatHost } from "@/components/chat/chat-host";
import { ChatReturn } from "@/components/chat/chat-return";
import { chatReturnUrl, clearChatReturn, markChatLeft } from "@/lib/chat/return";

vi.mock("@/lib/actions/chat", () => ({ sendChat: vi.fn(), warmChat: vi.fn() }));

beforeEach(() => sessionStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ChatReturn, the Your chat tab in the Bible", () => {
  it("is not there when the visitor did not come from the chat", () => {
    render(<ChatReturn />);
    expect(screen.queryByRole("button", { name: /^your chat$/i })).toBeNull();
  });

  it("is an equal tab below lg: a filled bubble above its words, no round button", async () => {
    markChatLeft("/");
    render(<ChatReturn />);
    const button = await screen.findByRole("button", { name: /^your chat$/i });
    expect(button).toHaveClass("flex-1", "flex-col", "text-ink", "lg:text-bg");
    expect(button).toHaveTextContent("Your chat");
    const icon = button.querySelector("svg")!;
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon.querySelector("path")).toHaveAttribute("fill", "currentColor");
    expect(button.closest("[data-chat-return]")!.querySelector("svg[data-chat-bump]")).toBeNull();
  });

  it("opens the chat over the page without leaving it, and clears the way back", async () => {
    markChatLeft("/");
    render(
      <>
        <ChatHost />
        <ChatReturn />
      </>,
    );
    await userEvent.setup().click(await screen.findByRole("button", { name: /^your chat$/i }));
    await screen.findByRole("dialog", { name: "Ask the Word" });
    expect(chatReturnUrl()).toBeNull();
    expect(screen.queryByRole("button", { name: /^your chat$/i })).toBeNull();
  });

  it("can be dismissed, and then stays away", async () => {
    markChatLeft("/");
    render(<ChatReturn />);
    await screen.findByRole("button", { name: /^your chat$/i });
    await userEvent.setup().click(screen.getByRole("button", { name: /hide/i }));
    expect(screen.queryByRole("button", { name: /^your chat$/i })).toBeNull();
    expect(chatReturnUrl()).toBeNull();
  });

  it("goes away when the way back is cleared elsewhere", async () => {
    markChatLeft("/");
    render(<ChatReturn />);
    await screen.findByRole("button", { name: /^your chat$/i });
    act(() => clearChatReturn());
    expect(screen.queryByRole("button", { name: /^your chat$/i })).toBeNull();
  });
});

describe("the chat reopening when the visitor comes back", () => {
  const dialog = () => screen.findByRole("dialog", { name: "Ask the Word" });

  it("stays closed on an ordinary page load", () => {
    render(<ChatHost />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens after the browser Back button returns to the page the chat was on", async () => {
    markChatLeft(`${location.pathname}${location.search}`);
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([
      { type: "back_forward" } as PerformanceNavigationTiming,
    ]);
    render(<ChatHost />);
    await dialog();
    expect(chatReturnUrl()).toBeNull();
  });

  it("does not open after Back to some other page", async () => {
    markChatLeft("/somewhere-else");
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([
      { type: "back_forward" } as PerformanceNavigationTiming,
    ]);
    render(<ChatHost />);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(chatReturnUrl()).toBe("/somewhere-else");
  });
});
