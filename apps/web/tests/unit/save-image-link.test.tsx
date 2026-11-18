// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SaveImageLink } from "@/components/devotional/save-image-link";

const href = "/content/devotionals/advent-01/0123abcd/verse-card-night-swell.png";
const fileName = "verse-card-night-swell.png";

/** An IntersectionObserver that reports the element on screen as soon as it is observed. */
class OnScreen {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as never);
  }
  disconnect() {}
}

// The content route sends the card with this type, as the real one does.
const fetchMock = vi.fn(
  async () => new Response(new Uint8Array([137, 80]), { headers: { "Content-Type": "image/png" } }),
);
const share = vi.fn<(data: ShareData) => Promise<void>>(async () => {});

function installedOnIPhone(installed: boolean) {
  Object.defineProperty(navigator, "standalone", { value: installed, configurable: true });
}

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", OnScreen);
  vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(navigator, "share", { value: share, configurable: true });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockClear();
  share.mockReset();
  installedOnIPhone(false);
});

function clickSave() {
  const link = screen.getByRole("link", { name: "Save image" });
  return { link, notPrevented: fireEvent.click(link) };
}

describe("SaveImageLink", () => {
  it("is a plain download link in the browser, with no fetch or share sheet", () => {
    installedOnIPhone(false);
    render(<SaveImageLink href={href} fileName={fileName} />);
    const { link, notPrevented } = clickSave();
    expect(link).toHaveAttribute("href", href);
    expect(link).toHaveAttribute("download");
    expect(notPrevented).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(share).not.toHaveBeenCalled();
  });

  it("in the installed iPhone app opens the share sheet with the card, and does not leave the page", async () => {
    installedOnIPhone(true);
    render(<SaveImageLink href={href} fileName={fileName} />);
    expect(fetchMock).toHaveBeenCalledWith(href);

    const { notPrevented } = clickSave();
    expect(notPrevented).toBe(false);
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const [file] = share.mock.calls[0][0].files!;
    expect(file.name).toBe(fileName);
    expect(file.type).toBe("image/png");
  });

  it("stays quiet when the share sheet is closed without saving", async () => {
    installedOnIPhone(true);
    share.mockRejectedValueOnce(new DOMException("cancelled", "AbortError"));
    render(<SaveImageLink href={href} fileName={fileName} />);
    const { notPrevented } = clickSave();
    expect(notPrevented).toBe(false);
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
  });
});
