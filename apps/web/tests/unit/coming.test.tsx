// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Coming } from "@/components/sections/coming";
import { coming } from "@/content/landing";
import { formatReference } from "@/lib/scripture";

afterEach(cleanup);

describe("coming content", () => {
  it("keeps to the design limits", () => {
    expect(coming.heading.length).toBeLessThanOrEqual(40);
    for (const offer of coming.offers) {
      expect(offer.title.length).toBeLessThanOrEqual(28);
      expect(offer.body.length).toBeLessThanOrEqual(140);
    }
    expect(coming.sample.title.length).toBeLessThanOrEqual(60);
    for (const row of coming.sample.report) expect(row.value.length).toBeLessThanOrEqual(18);
  });

  it("has three offers in order: weekly devotional, teaching series, audio and video", () => {
    expect(coming.offers.map((o) => o.title)).toEqual([
      "Weekly devotional",
      "Bible teaching series",
      "Audio and video",
    ]);
  });

  it("derives the report passage from the structured reference", () => {
    expect(coming.sample.passage).toEqual({ book: "Psalm", chapter: 107, verses: "23–30" });
  });
});

describe("Coming", () => {
  it("is a section named by its h2", () => {
    render(<Coming />);
    const region = screen.getByRole("region", { name: coming.heading });
    expect(region).toHaveAttribute("id", "coming");
  });

  it("shows each offer as an article with an h3 and a status", () => {
    render(<Coming />);
    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(3);
    articles.forEach((article, i) => {
      expect(within(article).getByRole("heading", { level: 3 })).toHaveTextContent(
        coming.offers[i].title,
      );
      expect(article).toHaveTextContent(coming.offers[i].status);
    });
  });

  it("shows the sample devotional with a surf report panel", () => {
    const { container } = render(<Coming />);
    const sample = screen.getByRole("region", { name: /sample devotional preview/i });
    expect(
      within(sample).getByRole("heading", { level: 3, name: coming.sample.title }),
    ).toBeInTheDocument();
    expect(within(sample).getByText("Today's report")).toBeInTheDocument();
    expect(sample).toHaveTextContent(formatReference(coming.sample.passage));
    expect(container.querySelector("dl")!.querySelectorAll("dt")).toHaveLength(4);
  });

  it("does not label the sample as a mockup placeholder", () => {
    render(<Coming />);
    expect(screen.getByText("Sample devotional")).toBeInTheDocument();
    expect(screen.queryByText(/sample devotional · placeholder/i)).not.toBeInTheDocument();
  });

  it("shows draft copy as highlighted placeholders", () => {
    const { container } = render(<Coming />);
    expect(container.querySelectorAll("[data-placeholder]").length).toBeGreaterThan(0);
  });
});
