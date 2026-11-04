// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Hero } from "@/components/sections/hero";
import { hero } from "@/content/landing";
import { formatReference } from "@/lib/scripture";

afterEach(cleanup);

describe("hero content", () => {
  it("keeps to the design document limits", () => {
    expect(hero.eyebrow.length).toBeLessThanOrEqual(55);
    expect(hero.lede.length).toBeLessThanOrEqual(240);
  });

  it("quotes Mark 4:41 in full with structured reference", () => {
    expect(hero.verse.reference).toEqual({ book: "Mark", chapter: 4, verses: "41" });
    expect(hero.verse.text).toBe("Who then is this, that even the wind and the sea obey him?");
  });

  it("has two calls to action, the main one to subscribe", () => {
    expect(hero.ctas.primary.href).toBe("/#subscribe");
    expect(hero.ctas.secondary.href).toBe("/#start");
  });
});

describe("Hero", () => {
  it("has the one h1 for the page", () => {
    render(<Hero />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Word on the Water");
  });

  it("sets the verse as a blockquote with its reference", () => {
    const { container } = render(<Hero />);
    expect(container.querySelector("blockquote")).toHaveTextContent(hero.verse.text);
    expect(screen.getByText(new RegExp(formatReference(hero.verse.reference)))).toBeInTheDocument();
    expect(screen.getByText(/ESV/)).toBeInTheDocument();
  });

  it("is a labelled region", () => {
    render(<Hero />);
    expect(screen.getByRole("region", { name: /who then is this/i })).toBeInTheDocument();
  });

  it("links both calls to action", () => {
    render(<Hero />);
    expect(screen.getByRole("link", { name: hero.ctas.primary.label })).toHaveAttribute(
      "href",
      "/#subscribe",
    );
    expect(screen.getByRole("link", { name: hero.ctas.secondary.label })).toHaveAttribute(
      "href",
      "/#start",
    );
  });

  it("shows the labelled logo mark", () => {
    render(<Hero />);
    expect(screen.getByRole("img", { name: /word on the water logo/i })).toBeInTheDocument();
  });
});
