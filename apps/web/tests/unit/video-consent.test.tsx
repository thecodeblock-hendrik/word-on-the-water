// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Footer } from "@/components/layout/footer";
import { ConsentBanner } from "@/components/videos/consent-banner";
import { allowVideos, saveVideoConsent } from "@/lib/actions/video-consent";
import { OPEN_VIDEO_CONSENT, parseVideoConsent } from "@/lib/videos/consent";

let pathname: string | null = "/videos";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
const set = vi.fn();
let proto = "https";
vi.mock("next/headers", () => ({
  cookies: async () => ({ set }),
  headers: async () => ({ get: () => proto }),
}));

beforeEach(() => {
  pathname = "/videos";
  proto = "https";
  set.mockReset();
  Element.prototype.scrollIntoView = () => {};
  vi.stubEnv("VIDEOS_ENABLED", "1");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const form = (choice: string) => {
  const data = new FormData();
  data.set("choice", choice);
  return data;
};

describe("the saved choice", () => {
  it("is yes, no or nothing", () => {
    expect(parseVideoConsent("yes")).toBe("yes");
    expect(parseVideoConsent("no")).toBe("no");
    for (const other of [undefined, "", "YES", "maybe"]) {
      expect(parseVideoConsent(other)).toBeUndefined();
    }
  });

  it("is kept for six months in a first-party cookie, Secure over https", async () => {
    await saveVideoConsent(form("no"));
    expect(set).toHaveBeenCalledWith("youtube-consent", "no", {
      path: "/",
      sameSite: "lax",
      secure: true,
      maxAge: 60 * 60 * 24 * 182,
    });
    proto = "http";
    await allowVideos();
    expect(set).toHaveBeenLastCalledWith(
      "youtube-consent",
      "yes",
      expect.objectContaining({ secure: false }),
    );
  });

  it("ignores anything else", async () => {
    await saveVideoConsent(form("maybe"));
    await saveVideoConsent(new FormData());
    expect(set).not.toHaveBeenCalled();
  });
});

describe("the banner", () => {
  const banner = () => screen.queryByRole("region", { name: "Cookies for videos" });
  const reopen = () => act(() => void window.dispatchEvent(new Event(OPEN_VIDEO_CONSENT)));

  it("asks while there is no choice, with a link to the privacy policy", () => {
    render(<ConsentBanner />);
    expect(banner()).toHaveTextContent(
      "Our videos play through YouTube (Google). If you accept, pressing Play lets it set cookies and receive data such as your IP address. Nothing is sent to YouTube before that.",
    );
    expect(screen.getByRole("link", { name: "Privacy policy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(banner()).not.toHaveTextContent(/You (accepted|declined)/);
  });

  it("gives Decline and Accept the same look, with neither chosen beforehand", () => {
    render(<ConsentBanner />);
    const [decline, accept] = screen.getAllByRole("button");
    expect([decline.textContent, accept.textContent]).toEqual(["Decline", "Accept"]);
    expect(decline.className).toBe(accept.className);
    expect(decline.className).toMatch(/min-h-11/);
    expect([decline, accept].map((b) => b.getAttribute("value"))).toEqual(["no", "yes"]);
    expect([decline, accept].every((b) => b.getAttribute("type") === "submit")).toBe(true);
    expect(document.activeElement).toBe(document.body);
  });

  it("is sent with the page, so it works and does not jump in", () => {
    expect(renderToString(<ConsentBanner />)).toContain("Cookies for videos");
  });

  it.each(["yes", "no"] as const)("is gone once the choice is %s", (consent) => {
    render(<ConsentBanner consent={consent} />);
    expect(banner()).toBeNull();
  });

  it.each([
    ["yes", "You accepted YouTube."],
    ["no", "You declined YouTube."],
  ] as const)("comes back from Cookie settings, saying the choice was %s", (consent, said) => {
    render(<ConsentBanner consent={consent} />);
    reopen();
    expect(banner()).toHaveTextContent(said);
    expect(document.activeElement).toBe(banner());
  });
});

describe("Cookie settings in the footer", () => {
  const button = () => screen.queryByRole("button", { name: "Cookie settings" });

  it.each(["/videos", "/videos/advent"])("is on %s and asks the banner to open", async (path) => {
    pathname = path;
    const opened = vi.fn();
    window.addEventListener(OPEN_VIDEO_CONSENT, opened);
    render(<Footer />);
    act(() => button()!.click());
    expect(opened).toHaveBeenCalledTimes(1);
    window.removeEventListener(OPEN_VIDEO_CONSENT, opened);
  });

  it.each(["/", "/privacy", "/videosx", null])("is not on %s", (path) => {
    pathname = path;
    render(<Footer />);
    expect(button()).toBeNull();
  });

  it("is nowhere while videos are off, and needs JavaScript", () => {
    expect(renderToString(<Footer />)).not.toContain("Cookie settings");
    vi.stubEnv("VIDEOS_ENABLED", "");
    render(<Footer />);
    expect(button()).toBeNull();
  });
});
