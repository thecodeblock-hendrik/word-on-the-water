// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChatHost } from "@/components/chat/chat-host";
import { ChatLauncher } from "@/components/chat/chat-launcher";
import { Start } from "@/components/sections/start";
import { warmChat } from "@/lib/actions/chat";

vi.mock("@/lib/actions/chat", () => ({ sendChat: vi.fn(), warmChat: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.mocked(warmChat).mockClear();
});

describe("ChatLauncher", () => {
  it("is a mail link before any script runs", () => {
    render(
      <>
        <ChatLauncher className="x" />
        <ChatHost />
      </>,
    );
    expect(screen.getByRole("link", { name: "Got Questions" })).toHaveAttribute(
      "href",
      "mailto:hello@wordonthewater.net",
    );
  });

  it("opens the chat on click instead of following the link, and gives focus back on close", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ChatLauncher className="x" />
        <ChatHost />
      </>,
    );
    const link = screen.getByRole("link", { name: "Got Questions" });

    await user.click(link);
    expect(await screen.findByRole("dialog", { name: "Got Questions" })).toBeDefined();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(link).toHaveFocus();
  });

  it("wakes the servers on the first open, once, so the first question is not slow", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ChatLauncher className="x" />
        <ChatHost />
      </>,
    );
    expect(warmChat).not.toHaveBeenCalled();
    const link = screen.getByRole("link", { name: "Got Questions" });

    await user.click(link);
    await screen.findByRole("dialog", { name: "Got Questions" });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await user.click(link);
    await screen.findByRole("dialog", { name: "Got Questions" });

    expect(warmChat).toHaveBeenCalledOnce();
  });

  it("does not load the chat until the first click", () => {
    render(
      <>
        <ChatLauncher className="x" />
        <ChatHost />
      </>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("Start with the chat", () => {
  it("keeps the existing 'Talk to someone' link when the chat is off", () => {
    render(<Start />);
    expect(screen.getByRole("link", { name: "Talk to someone" })).toHaveAttribute(
      "href",
      "mailto:hello@wordonthewater.net",
    );
    expect(screen.queryByRole("link", { name: "Got Questions" })).toBeNull();
  });

  it("shows Got Questions in its place when the chat is on", () => {
    render(<Start chatEnabled />);
    expect(screen.getByRole("link", { name: "Got Questions?" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Talk to someone" })).toBeNull();
  });
});
