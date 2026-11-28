// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AdventVideosPage from "@/app/videos/advent/page";
import VideosPage from "@/app/videos/page";

beforeEach(() => {
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
      expect(inside.getByRole("link", { name: "Privacy", hidden: true }).getAttribute("href")).toBe(
        "/privacy",
      );
    });
  });

  it("loads nothing from YouTube: no player and no image", async () => {
    const { container } = await path();
    expect(container.querySelector("iframe, img")).toBeNull();
    expect(container.innerHTML).not.toMatch(/youtube(-nocookie)?\.com|ytimg/);
  });

  it("links back to the shelf", async () => {
    await path();
    expect(screen.getByRole("link", { name: "Videos" }).getAttribute("href")).toBe("/videos");
  });
});
