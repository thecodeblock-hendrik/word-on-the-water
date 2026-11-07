// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DevotionalPage, { generateMetadata } from "@/app/devotionals/[slug]/page";

vi.mock("@/lib/actions/subscribe", () => ({ subscribe: vi.fn() }));
vi.mock("next/script", () => ({ default: () => null }));

const slug = "advent-01-more-than-watchmen";
const props = (s: string) => ({ params: Promise.resolve({ slug: s }) });

async function renderPage() {
  return render(await DevotionalPage(props(slug)));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-12-06T08:00:00Z"));
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "1x00000000000000000000AA");
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("devotional page", () => {
  it("has the crumbs, one h1, the summary and the byline", async () => {
    await renderPage();
    const crumbs = screen.getByRole("navigation", { name: /breadcrumb/i });
    expect(crumbs).toHaveTextContent("Devotionals / Advent / 1 of 5");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("More Than Watchmen");
    expect(screen.getByText("Advent · 1 of 5", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText(/Every dawn patrol starts in the dark/)).toBeInTheDocument();
    expect(screen.getByText("By H")).toBeInTheDocument();
    expect(screen.getByText("Saturday 5 December 2026")).toBeInTheDocument();
    expect(screen.getByText("3 min read")).toBeInTheDocument();
  });

  it("shows the series art for both colour schemes, with a caption", async () => {
    const { container } = await renderPage();
    const art = container.querySelectorAll("figure img");
    expect(art).toHaveLength(2);
    const sources = [...art].map((i) => decodeURIComponent(i.getAttribute("src")!));
    expect(sources.some((s) => s.includes("/content/series/advent/art-dawn-patrol.png"))).toBe(
      true,
    );
    expect(sources.some((s) => s.includes("/content/series/advent/art-night-swell.png"))).toBe(
      true,
    );
    expect(screen.getByText("Illustration: Advent series art")).toBeInTheDocument();
  });

  it("uses no inline styles, which the page's content security policy blocks", async () => {
    const { container } = await renderPage();
    expect(container.querySelectorAll("[style]")).toHaveLength(0);
  });

  it("shows the sections in order", async () => {
    await renderPage();
    const names = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(names).toEqual([
      "Conditions",
      "The Lineup",
      "The Word",
      "Paddle Out",
      "Pray",
      "Go Deeper",
      "Share the verse",
      "One devotional. Every Saturday at dawn.",
    ]);
  });

  it("shows the quoted verses with verse numbers and small-capital LORD", async () => {
    const { container } = await renderPage();
    const quote = container.querySelector("blockquote[data-scripture]")!;
    expect([...quote.querySelectorAll("sup")].map((s) => s.textContent)).toEqual(["5", "6", "2"]);
    expect([...quote.querySelectorAll("cite")].map((c) => c.textContent)).toEqual([
      "Psalm 130:5–6 (ESV)",
      "Isaiah 9:2 (ESV)",
    ]);
    expect(quote.querySelector("[data-small-caps]")).toHaveTextContent("Lord");
  });

  it("shows the pull quote and styles the closing Amen", async () => {
    const { container } = await renderPage();
    expect(container.querySelector("[data-pull]")).toHaveTextContent(
      "He can't hurry the dawn, but he knows it's coming.",
    );
    expect(container.querySelector("[data-amen]")).toHaveTextContent("Amen.");
  });

  it("lists Go Deeper as terms and adds next week's passage", async () => {
    const { container } = await renderPage();
    const deeper = container.querySelector("section[aria-labelledby='h-deeper']")!;
    const terms = [...deeper.querySelectorAll("dt")].map((d) => d.textContent);
    expect(terms).toEqual(["Talk it over with a mate", "Read further"]);
    expect(deeper).toHaveTextContent("Next week: Luke 1:5–25.");
  });

  it("offers the verse card for the current colour scheme, to save", async () => {
    const { container } = await renderPage();
    const share = container.querySelector("section[aria-labelledby='h-verse']")!;
    const saves = [...share.querySelectorAll("a[download]")].map((a) => a.getAttribute("href"));
    expect(saves).toEqual([
      `/content/devotionals/${slug}/verse-card-dawn-patrol.png`,
      `/content/devotionals/${slug}/verse-card-night-swell.png`,
    ]);
    expect(within(share as HTMLElement).getAllByAltText(/Psalm 130:6/)).toHaveLength(2);
  });

  it("has a copy link button and links on to Start here", async () => {
    await renderPage();
    expect(screen.getByRole("button", { name: "Copy link" })).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Series" });
    expect(within(nav).getByRole("link", { name: /Start here/ })).toHaveAttribute(
      "href",
      "/#start",
    );
    expect(nav).toHaveTextContent("Next · 12 December");
    expect(nav).toHaveTextContent("The Long Wait");
    expect(within(nav).queryByRole("link", { name: /The Long Wait/ })).toBeNull();
  });

  it("has the surf report in a complementary landmark", async () => {
    await renderPage();
    const side = screen.getByRole("complementary", { name: /about this devotional/i });
    const terms = [...side.querySelectorAll("dt")].map((d) => d.textContent);
    expect(terms).toEqual(["Passage", "Series", "Read time", "Conditions", "Topics"]);
    expect(side).toHaveTextContent("Advent · 1/5");
    expect(side).toHaveTextContent("Waiting, hope");
  });

  it("lists the weeks of the series as a navigation, with this week marked", async () => {
    const { container } = await renderPage();
    const list = screen.getByRole("navigation", { name: "Advent weeks" });
    const items = list.querySelectorAll("ol li");
    expect(items).toHaveLength(5);
    expect(items[0]).toHaveAttribute("aria-current", "page");
    expect(items[1]).toHaveTextContent("The Long Wait");
    expect(items[1]).toHaveTextContent("Luke 1:5–25 · 12 Dec");
    expect(container.querySelectorAll("[data-placeholder]")).toHaveLength(0);
  });

  it("ends with the sign-up form, tagged as coming from the devotional", async () => {
    const { container } = await renderPage();
    expect(container.querySelector("#subscribe input[name=email]")).not.toBeNull();
    expect(container.querySelector("input[name=source]")).toHaveValue("devotional_band");
  });

  it("gives an unknown devotional a 404", async () => {
    await expect(DevotionalPage(props("nope"))).rejects.toThrow(
      /NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/,
    );
  });
});

describe("generateMetadata", () => {
  it("uses the title, the summary and the night swell verse card for sharing", async () => {
    const meta = await generateMetadata(props(slug));
    expect(meta.title).toBe("More Than Watchmen");
    expect(meta.description).toMatch(/^Every dawn patrol starts in the dark/);
    expect(meta.alternates?.canonical).toBe(`/devotionals/${slug}`);
    const images = JSON.stringify(meta.openGraph?.images);
    expect(images).toContain(`/content/devotionals/${slug}/verse-card-night-swell.png`);
  });
});
