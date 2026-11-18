// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import Home from "@/app/page";
import { JsonLd } from "@/components/json-ld";
import { articleJsonLd, siteJsonLd } from "@/lib/seo";

afterEach(cleanup);

const script = (container: HTMLElement) =>
  container.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');

describe("siteJsonLd", () => {
  const graph = siteJsonLd()["@graph"];
  const organization = graph.find((node) => node["@type"] === "Organization")!;
  const website = graph.find((node) => node["@type"] === "WebSite")!;

  it("describes the organisation with what is public: name, address, description, contact", () => {
    expect(siteJsonLd()["@context"]).toBe("https://schema.org");
    expect(organization).toMatchObject({
      "@id": "https://wordonthewater.net/#organization",
      name: "Word on the Water",
      url: "https://wordonthewater.net",
      description:
        "Devotionals and Bible teaching for surfers and anyone who feels the swell of life.",
      email: "hello@wordonthewater.net",
    });
  });

  it("describes the website and names the organisation as its publisher", () => {
    expect(website).toMatchObject({
      "@id": "https://wordonthewater.net/#website",
      name: "Word on the Water",
      url: "https://wordonthewater.net",
      publisher: { "@id": organization["@id"] },
    });
  });

  it("claims nothing it cannot back: no logo file or social profiles until they exist", () => {
    expect(organization).not.toHaveProperty("logo");
    expect(organization).not.toHaveProperty("sameAs");
  });
});

describe("JsonLd", () => {
  it("writes the data as a JSON-LD script that parses back to the same data", () => {
    const data = { "@context": "https://schema.org", "@type": "Organization", name: "X" };
    const { container } = render(<JsonLd data={data} />);
    expect(JSON.parse(script(container)!.textContent!)).toEqual(data);
  });

  it("cannot be broken out of: a < in the data never reaches the page as one", () => {
    const data = { name: "</script><img src=x onerror=alert(1)>" };
    const { container } = render(<JsonLd data={data} />);
    const text = script(container)!.textContent!;
    expect(text).not.toContain("<");
    expect(JSON.parse(text)).toEqual(data);
  });
});

describe("the home page", () => {
  it("carries the organisation data", () => {
    const { container } = render(<Home />);
    const data = JSON.parse(script(container)!.textContent!);
    expect(data["@graph"].map((node: { "@type": string }) => node["@type"])).toEqual([
      "Organization",
      "WebSite",
    ]);
  });
});

describe("articleJsonLd", () => {
  const meta = {
    title: "More Than Watchmen",
    summary: "Every dawn patrol starts in the dark.",
    publishAt: "2026-11-28",
    author: "H",
    imageAlt: "A surfer at dawn",
  };
  const article = articleJsonLd({
    slug: "advent-01-more-than-watchmen",
    meta,
    imageUrl: "https://wordonthewater.net/content/devotionals/x/abc/verse-card.png",
  });

  it("describes the devotional as an Article with its title, summary, date and image", () => {
    expect(article).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "More Than Watchmen",
      description: "Every dawn patrol starts in the dark.",
      datePublished: "2026-11-28",
      image: "https://wordonthewater.net/content/devotionals/x/abc/verse-card.png",
      url: "https://wordonthewater.net/devotionals/advent-01-more-than-watchmen",
    });
  });

  it("credits the author as written and names the organisation as publisher", () => {
    expect(article.author).toEqual({ "@type": "Person", name: "H" });
    expect(article.publisher).toEqual({ "@id": "https://wordonthewater.net/#organization" });
  });

  it("points at its own page as the main entity", () => {
    expect(article.mainEntityOfPage).toBe(article.url);
  });
});
