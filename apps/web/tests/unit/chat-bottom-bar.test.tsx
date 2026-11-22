// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ChatHost } from "@/components/chat/chat-host";
import { openChat } from "@/lib/chat/open";

vi.mock("@/lib/actions/chat", () => ({ sendChat: vi.fn(), warmChat: vi.fn() }));

// The panel is a lazy chunk; load it once up front so the first test does not wait for it.
beforeAll(() => import("@/components/chat/chat-panel"));
afterEach(cleanup);

async function openWithBar() {
  render(<ChatHost devotionalHref="/devotionals/advent-01" />);
  act(() => openChat(null));
  return screen.findByRole("dialog", { name: "Got Questions" });
}

describe("the bottom bar on the chat screen", () => {
  it("has Devotional, Bible and Shore inside the chat, and no Got Questions", async () => {
    const dialog = await openWithBar();
    const bar = within(dialog).getByRole("navigation", { name: "Quick links" });
    expect(within(bar).getByRole("link", { name: "Devotional" })).toHaveAttribute(
      "href",
      "/devotionals/advent-01",
    );
    expect(within(bar).getByRole("link", { name: "Bible" })).toHaveAttribute("href", "/bible");
    expect(within(bar).getByRole("link", { name: "Shore" })).toHaveAttribute("href", "/");
    expect(within(bar).queryByRole("link", { name: "Got Questions" })).toBeNull();
  });

  it.each(["Devotional", "Bible", "Shore"])("leaves the chat when %s is tapped", async (name) => {
    const dialog = await openWithBar();
    const link = within(dialog).getByRole("link", { name });
    link.addEventListener("click", (e) => e.preventDefault());
    await userEvent.setup().click(link);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is hidden while the keyboard is open", async () => {
    const viewport = Object.assign(new EventTarget(), { height: 760 });
    Object.defineProperty(window, "visualViewport", { value: viewport, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 760, configurable: true });
    const dialog = await openWithBar();
    expect(within(dialog).getByRole("navigation", { name: "Quick links" })).toBeInTheDocument();
    act(() => {
      viewport.height = 450;
      viewport.dispatchEvent(new Event("resize"));
    });
    expect(within(dialog).queryByRole("navigation", { name: "Quick links" })).toBeNull();
  });

  it("is not there when the host was given no devotional link", async () => {
    render(<ChatHost />);
    act(() => openChat(null));
    const dialog = await screen.findByRole("dialog", { name: "Got Questions" });
    expect(within(dialog).queryByRole("navigation", { name: "Quick links" })).toBeNull();
  });
});
