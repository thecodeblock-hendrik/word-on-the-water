// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AdventVideosPage from "@/app/videos/advent/page";
import VideosPage from "@/app/videos/page";

let saved: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (saved ? { value: saved } : undefined) }),
}));

beforeEach(() => {
  saved = undefined;
  // jsdom has no layout, so it has no scrolling either.
  Element.prototype.scrollIntoView = () => {};
  vi.stubEnv("VIDEOS_ENABLED", "1");
  vi.stubEnv("DEVOTIONAL_TODAY", "2026-12-06");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const shelf = async () => render(await VideosPage());
const path = async (week?: string) =>
  render(await AdventVideosPage({ searchParams: Promise.resolve(week ? { week } : {}) }));

/** Each week's <details>, with its theme, whether it is open and whether it says "This week". */
const weeks = (root: HTMLElement) =>
  [...root.querySelectorAll("details")].map((row) => ({
    row,
    theme: row.querySelector("summary [data-theme-name]")!.textContent,
    open: row.open,
    thisWeek: row.querySelector("summary")!.textContent!.includes("This week"),
  }));

describe("the cookie banner on the video pages", () => {
  const banner = () => screen.queryByRole("region", { name: "Cookies for videos" });

  it.each([
    ["the shelf", shelf],
    ["the weekly path", () => path()],
  ])("is on %s until there is a choice", async (_, page) => {
    await page();
    expect(banner()).not.toBeNull();
    for (const choice of ["yes", "no"]) {
      cleanup();
      saved = choice;
      await page();
      expect(banner()).toBeNull();
    }
  });

  it("comes before the videos", async () => {
    const { container } = await path();
    const row = container.querySelector("details")!;
    expect(banner()!.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

// The footer's headings are level 3, so each page needs a level 2 above them.
describe("the headings on the video pages", () => {
  const levelTwo = () => screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);

  it("name the series on the shelf", async () => {
    await shelf();
    expect(levelTwo()).toEqual(["Advent word studies"]);
  });

  it("name the list of weeks on the path", async () => {
    await path();
    expect(levelTwo()).toEqual(["The 4 weeks"]);
  });
});

describe("the lighthouse banner", () => {
  /** The art inside `box`: which picture is for which colour scheme, and what it says it shows. */
  const art = (box: Element) =>
    [...box.querySelectorAll("img")].map((img) => [
      img.closest(".when-light") ? "light" : img.closest(".when-dark") ? "dark" : "both",
      decodeURIComponent(img.getAttribute("src")!).match(
        /series\/advent\/\w+\/(art-[a-z-]+)\.png/,
      )?.[1],
      img.getAttribute("alt"),
      img.getAttribute("loading"),
      img.getAttribute("fetchpriority"),
      img.getAttribute("style"),
    ]);
  // Decoration beside the words, so no alt text. It is the largest paint, so it must not be lazy.
  const both = [
    ["light", "art-dawn-patrol", "", "eager", "high", null],
    ["dark", "art-night-swell", "", "eager", "high", null],
  ];

  it("is the shelf's cover, with the same words on it", async () => {
    await shelf();
    const block = screen.getByRole("link", { name: /Advent word studies/ });
    expect(art(block)).toEqual(both);
    expect(block.textContent).toContain("4 videos, about 18 minutes");
    expect(block.textContent).toContain("Advent");
  });

  it("sits behind the heading of the weekly path, and nowhere in the weeks", async () => {
    const { container } = await path();
    const heading = screen.getByRole("heading", { level: 1 }).closest("header")!;
    expect(art(heading)).toEqual(both);
    expect(container.querySelectorAll("img")).toHaveLength(2);
  });
});

describe("/videos", () => {
  it.each([VideosPage, () => AdventVideosPage({ searchParams: Promise.resolve({}) })])(
    "is not found while VIDEOS_ENABLED is off",
    async (page) => {
      vi.stubEnv("VIDEOS_ENABLED", "");
      await expect(async () => page()).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
    },
  );

  it("shows one Advent block that links to the weekly path", async () => {
    await shelf();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Videos");
    const block = screen.getByRole("link", { name: /Advent word studies/ });
    expect(block.getAttribute("href")).toBe("/videos/advent");
    expect(block.textContent).toContain("4 videos, about 18 minutes");
    expect(block.textContent).toContain("By BibleProject");
    expect(block.textContent).toContain("This week: Peace");
  });

  it("names BibleProject with a link", async () => {
    await shelf();
    const link = screen.getByRole("link", { name: "bibleproject.com" });
    expect(link.getAttribute("href")).toBe("https://www.bibleproject.com/");
  });

  it("has no week label once Advent is over", async () => {
    vi.stubEnv("DEVOTIONAL_TODAY", "2026-12-27");
    await shelf();
    expect(document.body.textContent).not.toContain("This week");
  });
});

describe("/videos/advent", () => {
  it("lists the four weeks in order, with this week open and labelled", async () => {
    const { container } = await path();
    expect(weeks(container).map((w) => [w.theme, w.open, w.thisWeek])).toEqual([
      ["Hope", false, false],
      ["Peace", true, true],
      ["Joy", false, false],
      ["Love", false, false],
    ]);
  });

  it("opens the week named in the address and keeps this week's label", async () => {
    const { container } = await path("joy");
    expect(
      weeks(container)
        .filter((w) => w.open)
        .map((w) => w.theme),
    ).toEqual(["Joy"]);
    expect(
      weeks(container)
        .filter((w) => w.thisWeek)
        .map((w) => w.theme),
    ).toEqual(["Peace"]);
  });

  it("opens nothing once Advent is over", async () => {
    vi.stubEnv("DEVOTIONAL_TODAY", "2026-12-27");
    const { container } = await path();
    expect(weeks(container).some((w) => w.open || w.thisWeek)).toBe(false);
  });

  it("lets only one row be open, without JavaScript, by giving the rows one name", async () => {
    const { container } = await path();
    const names = new Set(weeks(container).map((w) => w.row.getAttribute("name")));
    expect(names.size).toBe(1);
    expect([...names][0]).toBeTruthy();
  });

  it("gives every video a credit, a link to its page and the privacy notice", async () => {
    const { container } = await path();
    const pages = ["yakhal-hope", "shalom-peace", "chara-joy", "agape-love"];
    weeks(container).forEach(({ row }, i) => {
      const inside = within(row);
      expect(row.textContent).toContain("Video by BibleProject, its author and owner.");
      expect(
        inside.getByRole("link", { name: "bibleproject.com", hidden: true }).getAttribute("href"),
      ).toBe("https://www.bibleproject.com/");
      expect(
        inside
          .getByRole("link", { name: "Watch on BibleProject", hidden: true })
          .getAttribute("href"),
      ).toBe(`https://bibleproject.com/videos/${pages[i]}/`);
      expect(row.textContent).toContain("YouTube, a Google service, which then receives data");
      expect(row.textContent).toContain(
        "By playing, you agree to the YouTube Terms and our Privacy policy.",
      );
      const href = (name: string) =>
        inside.getByRole("link", { name, hidden: true }).getAttribute("href");
      expect(href("YouTube Terms")).toBe("https://www.youtube.com/t/terms");
      expect(href("Privacy policy")).toBe("/privacy");
    });
  });

  it("loads nothing from YouTube: no player and no image", async () => {
    const { container } = await path();
    // A link to YouTube's terms is fine: following it is the visitor's choice, and it loads nothing.
    // The only pictures are our own banner.
    expect(container.querySelector("iframe, script, link")).toBeNull();
    for (const loaded of container.querySelectorAll("[src]")) {
      expect(loaded.getAttribute("src")).toMatch(/^\/_next\/image\?url=%2Fcontent%2Fseries%2F/);
    }
    expect(container.innerHTML).not.toMatch(/youtube-nocookie\.com|ytimg/);
  });

  it("links back to the shelf", async () => {
    await path();
    expect(screen.getByRole("link", { name: "Videos" }).getAttribute("href")).toBe("/videos");
  });
});
