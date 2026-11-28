// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VideoPlayer } from "@/components/videos/video-player";
import { playerUrl } from "@/lib/videos/links";

const player = (linked = false) => (
  <details open>
    <summary>Peace</summary>
    <VideoPlayer youtubeId="oLYORLZOaZE" theme="Peace" length="3:48" linked={linked}>
      <span>our cover</span>
    </VideoPlayer>
  </details>
);

const scrollIntoView = vi.fn();
beforeEach(() => {
  Element.prototype.scrollIntoView = scrollIntoView;
});
afterEach(() => {
  cleanup();
  scrollIntoView.mockReset();
});

/** What the browser does when a row opens or closes, by a tap or because another one opened. */
const setOpen = (row: HTMLDetailsElement, open: boolean) =>
  act(() => {
    row.open = open;
    row.dispatchEvent(new Event("toggle"));
  });

describe("playerUrl", () => {
  it("is the privacy-enhanced player, starting because the visitor tapped Play", () => {
    expect(playerUrl("oLYORLZOaZE")).toBe(
      "https://www.youtube-nocookie.com/embed/oLYORLZOaZE?autoplay=1&playsinline=1&rel=0",
    );
  });
});

describe("VideoPlayer", () => {
  it("has no Play button without JavaScript, only the cover", () => {
    const html = renderToString(player());
    expect(html).toContain("our cover");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<iframe");
  });

  it("shows no player before the tap", () => {
    const { container } = render(player());
    expect(screen.getByRole("button", { name: "Play Peace" })).toBeTruthy();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("puts the player in the cover's place on a tap, with only the permissions it needs", async () => {
    const { container } = render(player());
    await userEvent.click(screen.getByRole("button", { name: "Play Peace" }));
    const frame = container.querySelector("iframe")!;
    expect(frame.getAttribute("src")).toBe(playerUrl("oLYORLZOaZE"));
    expect(frame.getAttribute("title")).toBe("Peace, a video by BibleProject");
    expect(frame.getAttribute("referrerpolicy")).toBe("strict-origin-when-cross-origin");
    expect(frame.getAttribute("allow")).toBe("autoplay; fullscreen; picture-in-picture");
    expect(container.textContent).not.toContain("our cover");
    expect(document.activeElement).toBe(frame);
  });

  it("removes the player when its row closes, so the sound stops", async () => {
    const { container } = render(player());
    await userEvent.click(screen.getByRole("button", { name: "Play Peace" }));
    setOpen(container.querySelector("details")!, false);
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.textContent).toContain("our cover");
  });

  it("scrolls to its row when the address named it", () => {
    render(player(true));
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });
  });

  it("does not move the page for a row the address did not name", () => {
    render(player());
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it.each([
    [-40, 1],
    [200, 0],
  ])("brings an opened row back when its top is at %ipx", (top, calls) => {
    const { container } = render(player());
    const row = container.querySelector("details")!;
    row.getBoundingClientRect = () => ({ top }) as DOMRect;
    setOpen(row, true);
    expect(scrollIntoView).toHaveBeenCalledTimes(calls);
  });
});
