// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Home from "@/app/page";
import { Header } from "@/components/layout/header";
import { navLinks } from "@/components/layout/nav-links";
import { Coming } from "@/components/sections/coming";
import { coming } from "@/content/landing";
import { loadContent } from "@/lib/devotionals/load";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("@/lib/actions/theme", () => ({ setTheme: vi.fn() }));

beforeEach(() => {
  pathname = "/";
  vi.stubEnv("BIBLE_ENABLED", "1");
  vi.stubEnv("VIDEOS_ENABLED", "1");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const labels = (links: HTMLElement[]) => links.map((link) => link.textContent);
const WITH_VIDEOS = ["About", "Devotionals", "Bible", "Videos", "Start here", "What we believe"];

describe("the Videos link", () => {
  it("comes after Bible, or after Devotionals while the Bible is off", () => {
    expect(navLinks(true, true).map((l) => l.label)).toEqual(WITH_VIDEOS);
    expect(navLinks(false, true).map((l) => l.label)).toEqual(
      WITH_VIDEOS.filter((label) => label !== "Bible"),
    );
    expect(navLinks(true, true)[3]).toMatchObject({ href: "/videos", match: "/videos" });
  });

  it("is in the desktop header", () => {
    render(<Header />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(labels(within(nav).getAllByRole("link"))).toEqual(WITH_VIDEOS);
  });

  it("is in the menu, marked current on both video pages", async () => {
    for (const path of ["/videos", "/videos/advent"]) {
      pathname = path;
      render(<Header />);
      await userEvent.setup().click(screen.getByRole("button", { name: /menu/i }));
      const menu = within(screen.getByTestId("mobile-menu"));
      expect(labels(menu.getAllByRole("link"))).toEqual(WITH_VIDEOS);
      expect(menu.getByRole("link", { name: "Videos" })).toHaveAttribute("aria-current", "page");
      cleanup();
    }
  });

  it("is nowhere while videos are off", () => {
    vi.stubEnv("VIDEOS_ENABLED", "");
    render(<Header />);
    expect(screen.queryByRole("link", { name: "Videos" })).not.toBeInTheDocument();
  });
});

describe("the What's coming card", () => {
  const content = loadContent();
  const devotional = content.devotionals.at(-1)!;
  const series = content.series.find((s) => s.slug === devotional.meta.series)!;
  const lastCard = () => screen.getAllByRole("article")[2];

  it("becomes Advent videos, a way in to the videos page, while videos are on", () => {
    render(<Coming devotional={devotional} series={series} videos />);
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(within(lastCard()).getByRole("heading", { level: 3 })).toHaveTextContent(
      "Advent videos",
    );
    expect(lastCard()).toHaveTextContent("Watch now");
    expect(lastCard()).toHaveTextContent("Hope, peace, joy and love in four short videos.");
    const link = within(lastCard()).getByRole("link", { name: "Watch the Advent series" });
    expect(link).toHaveAttribute("href", "/videos");
    expect(link.className).toMatch(/min-h-11/);
    expect(screen.queryByText("Audio and video")).not.toBeInTheDocument();
  });

  it("promises only video, within the design limits", () => {
    expect(coming.videos.title.length).toBeLessThanOrEqual(28);
    expect(coming.videos.body.length).toBeLessThanOrEqual(140);
    expect(JSON.stringify(coming.videos)).not.toMatch(/audio/i);
  });

  it("is as before while videos are off", () => {
    render(<Coming devotional={devotional} series={series} />);
    expect(lastCard()).toHaveTextContent("Audio and video");
    expect(within(lastCard()).queryByRole("link")).toBeNull();
  });

  it("follows the flag on the home page", () => {
    render(<Home />);
    expect(screen.getByRole("link", { name: "Watch the Advent series" })).toBeInTheDocument();
    cleanup();
    vi.stubEnv("VIDEOS_ENABLED", "");
    render(<Home />);
    expect(screen.queryByRole("link", { name: "Watch the Advent series" })).toBeNull();
  });
});
