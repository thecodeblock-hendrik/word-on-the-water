// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatHost } from "@/components/chat/chat-host";
import { Header } from "@/components/layout/header";
import { Start } from "@/components/sections/start";

vi.mock("@/lib/actions/theme", () => ({ setTheme: vi.fn() }));
vi.mock("@/lib/actions/chat", () => ({ sendChat: vi.fn(), warmChat: vi.fn() }));

beforeEach(() => vi.stubEnv("CHAT_ENABLED", "1"));
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const page = (
  <>
    <Header />
    <Start chatEnabled />
    <ChatHost />
  </>
);
const chatDialog = () => screen.findByRole("dialog", { name: "Ask the Word" });

describe("Ask the Word in the menu bar", () => {
  it("is a link in the main navigation, after the section links", () => {
    render(<Header />);
    const links = within(screen.getByRole("navigation", { name: "Main" })).getAllByRole("link");
    expect(links.at(-1)).toHaveTextContent("Ask the Word");
    expect(links.at(-1)).toHaveAttribute("href", "mailto:hello@wordonthewater.net");
  });

  it("is not there while the chat is off", () => {
    vi.stubEnv("CHAT_ENABLED", "");
    render(<Header />);
    expect(screen.queryByRole("link", { name: /Ask the Word/ })).toBeNull();
  });

  it("opens the chat, and Escape gives focus back to the link", async () => {
    const user = userEvent.setup();
    render(page);
    const link = within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", {
      name: "Ask the Word",
    });
    await user.click(link);
    await chatDialog();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(link).toHaveFocus();
  });
});

describe("Ask the Word in the mobile menu", () => {
  it("is listed in the menu, and choosing it closes the menu and opens the chat", async () => {
    const user = userEvent.setup();
    render(page);
    const menuButton = screen.getByRole("button", { name: "Menu" });
    await user.click(menuButton);
    const menu = screen.getByTestId("mobile-menu");

    await user.click(within(menu).getByRole("link", { name: "Ask the Word" }));

    await chatDialog();
    expect(screen.queryByTestId("mobile-menu")).toBeNull();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(menuButton).toHaveFocus();
  });

  it("is not listed while the chat is off", async () => {
    vi.stubEnv("CHAT_ENABLED", "");
    render(<Header />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Menu" }));
    expect(
      within(screen.getByTestId("mobile-menu")).queryByRole("link", { name: /Got/ }),
    ).toBeNull();
  });
});

describe("the button under Start here", () => {
  it("asks 'Ask the Word', is solid and opens the same chat", async () => {
    const user = userEvent.setup();
    render(page);
    const button = within(screen.getByRole("region", { name: "Start here" })).getByRole("link", {
      name: "Ask the Word",
    });
    expect(button.className).toMatch(/bg-accent-ink/);
    await user.click(button);
    await chatDialog();
  });

  it("keeps the plain name in the bar and the menu, never as a question", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: "Ask the Word" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "Ask the Word?" })).toBeNull();
  });
});
