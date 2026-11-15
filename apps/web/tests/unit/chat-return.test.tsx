// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatHost } from "@/components/chat/chat-host";
import { ChatReturn } from "@/components/chat/chat-return";
import { chatReturnUrl, clearChatReturn, markChatLeft } from "@/lib/chat/return";

vi.mock("@/lib/actions/chat", () => ({ sendChat: vi.fn() }));

beforeEach(() => sessionStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ChatReturn, the floating Your chat button in the Bible", () => {
  it("is not there when the visitor did not come from the chat", () => {
    render(<ChatReturn />);
    expect(screen.queryByRole("link", { name: /your chat/i })).toBeNull();
  });

  it("is a link back to the page the chat was on", async () => {
    markChatLeft("/devotionals/advent-01");
    render(<ChatReturn />);
    const link = await screen.findByRole("link", { name: /your chat/i });
    expect(link).toHaveAttribute("href", "/devotionals/advent-01");
  });

  it("is a solid button of 44px or more that sits above the chapter buttons", async () => {
    markChatLeft("/");
    render(<ChatReturn />);
    const link = await screen.findByRole("link", { name: /your chat/i });
    expect(link.className).toMatch(/bg-accent-ink/);
    expect(link.className).toMatch(/min-h-12/);
    expect(link.parentElement?.className).toMatch(/fixed/);
  });

  it("asks the chat to reopen when it is used", async () => {
    markChatLeft("/");
    render(<ChatReturn />);
    const link = await screen.findByRole("link", { name: /your chat/i });
    link.addEventListener("click", (e) => e.preventDefault());
    await userEvent.setup().click(link);
    expect(sessionStorage.getItem("wotw-chat-reopen")).toBe("1");
  });

  it("can be dismissed, and then stays away", async () => {
    markChatLeft("/");
    render(<ChatReturn />);
    await screen.findByRole("link", { name: /your chat/i });
    await userEvent.setup().click(screen.getByRole("button", { name: /hide/i }));
    expect(screen.queryByRole("link", { name: /your chat/i })).toBeNull();
    expect(chatReturnUrl()).toBeNull();
  });

  it("goes away when the way back is cleared elsewhere", async () => {
    markChatLeft("/");
    render(<ChatReturn />);
    await screen.findByRole("link", { name: /your chat/i });
    act(() => clearChatReturn());
    expect(screen.queryByRole("link", { name: /your chat/i })).toBeNull();
  });
});

describe("the chat reopening when the visitor comes back", () => {
  const dialog = () => screen.findByRole("dialog", { name: "Got Questions" });

  it("stays closed on an ordinary page load", () => {
    render(<ChatHost />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens once when the Your chat button asked for it, and clears the way back", async () => {
    markChatLeft("/");
    sessionStorage.setItem("wotw-chat-reopen", "1");
    render(<ChatHost />);
    await dialog();
    expect(chatReturnUrl()).toBeNull();
    expect(sessionStorage.getItem("wotw-chat-reopen")).toBeNull();
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
