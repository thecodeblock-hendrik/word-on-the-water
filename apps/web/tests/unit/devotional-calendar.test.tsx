// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DevotionalPage from "@/app/devotionals/[slug]/page";
import Home from "@/app/page";
import { loadContent } from "@/lib/devotionals/load";

const { devotionals } = loadContent();
const bySeriesNumber = (n: number) => devotionals.find((d) => d.meta.seriesNumber === n)!;
const one = bySeriesNumber(1);
const two = bySeriesNumber(2);
const three = bySeriesNumber(3);

const on = (day: string) => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${day}T08:00:00Z`));
};
const props = (slug: string) => ({ params: Promise.resolve({ slug }) });

beforeEach(() => vi.useFakeTimers({ toFake: ["Date"] }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("the landing card follows the calendar", () => {
  const card = () => screen.getByRole("region", { name: /devotional preview/i });

  it.each([
    ["before launch", "2026-11-06", one],
    ["on launch day", "2026-12-05", one],
    ["the day before week 2", "2026-12-11", one],
    ["on the day week 2 is published", "2026-12-12", two],
    ["the day before week 3", "2026-12-18", two],
    ["on the day week 3 is published", "2026-12-19", three],
    ["after week 3", "2027-01-01", three],
  ])("%s (%s) shows the right devotional", (_label, day, expected) => {
    on(day);
    render(<Home />);
    expect(within(card()).getByRole("heading", { level: 3 })).toHaveTextContent(
      expected.meta.title,
    );
    expect(within(card()).getByRole("link", { name: /read the full devotional/i })).toHaveAttribute(
      "href",
      `/devotionals/${expected.slug}`,
    );
  });
});

describe("going back through the series", () => {
  const weeks = () => screen.getByRole("navigation", { name: "Advent weeks" });
  const seriesNav = () => screen.getByRole("navigation", { name: "Series" });

  it("week 2 links back to week 1 in the list and in the Previous card", async () => {
    on("2026-12-12");
    render(await DevotionalPage(props(two.slug)));
    const items = weeks().querySelectorAll("li");
    expect(
      within(items[0] as HTMLElement).getByRole("link", { name: one.meta.title }),
    ).toHaveAttribute("href", `/devotionals/${one.slug}`);
    expect(items[1]).toHaveAttribute("aria-current", "page");
    expect(within(items[1] as HTMLElement).queryByRole("link")).toBeNull();
    expect(
      within(seriesNav()).getByRole("link", { name: new RegExp(one.meta.title) }),
    ).toHaveAttribute("href", `/devotionals/${one.slug}`);
  });

  it("only published weeks are links: week 3 is not", async () => {
    on("2026-12-12");
    render(await DevotionalPage(props(two.slug)));
    const items = weeks().querySelectorAll("li");
    expect(within(items[2] as HTMLElement).queryByRole("link")).toBeNull();
    expect(seriesNav()).toHaveTextContent("Next · 19 December");
    expect(within(seriesNav()).queryAllByRole("link", { name: /Next/ })).toHaveLength(0);
  });

  it("week 1 links forward to week 2 once it is published, and not before", async () => {
    on("2026-12-11");
    const before = render(await DevotionalPage(props(one.slug)));
    expect(within(weeks().querySelectorAll("li")[1] as HTMLElement).queryByRole("link")).toBeNull();
    before.unmount();

    on("2026-12-12");
    render(await DevotionalPage(props(one.slug)));
    expect(
      within(weeks().querySelectorAll("li")[1] as HTMLElement).getByRole("link"),
    ).toHaveAttribute("href", `/devotionals/${two.slug}`);
    expect(within(seriesNav()).getByRole("link", { name: /Next/ })).toHaveAttribute(
      "href",
      `/devotionals/${two.slug}`,
    );
  });

  it("week 2 is a 404 until its publish date", async () => {
    on("2026-12-11");
    await expect(DevotionalPage(props(two.slug))).rejects.toThrow(
      /NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/,
    );
  });
});
