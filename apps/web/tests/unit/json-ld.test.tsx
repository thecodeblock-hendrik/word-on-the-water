// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import Home from "@/app/page";
import { JsonLd } from "@/components/json-ld";
import { siteJsonLd } from "@/lib/seo";

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
      description: "Devotionals and Bible teaching for men and surfers.",
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
