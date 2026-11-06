// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Coming } from "@/components/sections/coming";
import { coming } from "@/content/landing";
import { formatDate } from "@/lib/devotionals/format";
import { loadContent } from "@/lib/devotionals/load";

afterEach(cleanup);

const content = loadContent();
const devotional = content.devotionals.at(-1)!;
const series = content.series.find((s) => s.slug === devotional.meta.series)!;

describe("coming content", () => {
  it("keeps to the design limits", () => {
    expect(coming.heading.length).toBeLessThanOrEqual(40);
    for (const offer of coming.offers) {
      expect(offer.title.length).toBeLessThanOrEqual(28);
      expect(offer.body.length).toBeLessThanOrEqual(140);
    }
  });

  it("has three offers in order: weekly devotional, teaching series, audio and video", () => {
    expect(coming.offers.map((o) => o.title)).toEqual([
      "Weekly devotional",
      "Bible teaching series",
      "Audio and video",
    ]);
  });

  it("launches on 5 December 2026 and leaves out the undecided details", () => {
    expect(coming.offers[0].status).toBe("Launching 5 December 2026");
    expect(coming.offers[0].body).toContain("each Saturday.");
    expect(coming.offers[1].body).not.toMatch(/Mark|first series/);
    expect(coming.offers[2].body).not.toMatch(/Podcast|YouTube|decide/);
  });
});

describe("Coming", () => {
  it("is a section named by its h2", () => {
    render(<Coming devotional={devotional} series={series} />);
    const region = screen.getByRole("region", { name: coming.heading });
    expect(region).toHaveAttribute("id", "coming");
  });

  it("shows each offer as an article with an h3 and a status", () => {
    render(<Coming devotional={devotional} series={series} />);
    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(3);
    articles.forEach((article, i) => {
      expect(within(article).getByRole("heading", { level: 3 })).toHaveTextContent(
        coming.offers[i].title,
      );
      expect(article).toHaveTextContent(coming.offers[i].status);
    });
  });

  it("shows the devotional's title, date, author and the start of the text", () => {
    render(<Coming devotional={devotional} series={series} />);
    const preview = screen.getByRole("region", { name: /devotional preview/i });
    expect(screen.getByText("Latest devotional")).toBeInTheDocument();
    expect(
      within(preview).getByRole("heading", { level: 3, name: devotional.meta.title }),
    ).toBeInTheDocument();
    expect(preview).toHaveTextContent(formatDate(devotional.meta.publishAt));
    expect(preview).toHaveTextContent(`by ${devotional.meta.author}`);
    const firstParagraph = devotional.sections[0].markdown.split("\n\n")[0];
    expect(preview).toHaveTextContent(firstParagraph);
  });

  it("fills the surf report panel from the devotional", () => {
    const { container } = render(<Coming devotional={devotional} series={series} />);
    const terms = [...container.querySelector("dl")!.querySelectorAll("dt")].map(
      (dt) => dt.textContent,
    );
    expect(terms).toEqual(["Passage", "Series", "Read time", "Conditions", "Topics"]);
    const panel = container.querySelector("dl")!;
    expect(panel).toHaveTextContent(devotional.meta.passages.join("; "));
    expect(panel).toHaveTextContent(
      `${series.title} · ${devotional.meta.seriesNumber}/${series.outline.length}`,
    );
    expect(panel).toHaveTextContent(`${devotional.readMinutes} min`);
    expect(panel).toHaveTextContent(devotional.meta.reportConditions);
  });

  it("links to the full devotional", () => {
    render(<Coming devotional={devotional} series={series} />);
    const link = screen.getByRole("link", { name: /read the full devotional/i });
    expect(link).toHaveAttribute("href", `/devotionals/${devotional.slug}`);
  });

  it("shows no placeholders", () => {
    const { container } = render(<Coming devotional={devotional} series={series} />);
    expect(container.querySelectorAll("[data-placeholder]").length).toBe(0);
  });
});
