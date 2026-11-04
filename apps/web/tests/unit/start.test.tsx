// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Start } from "@/components/sections/start";
import { start } from "@/content/landing";
import { formatReference } from "@/lib/scripture";

afterEach(cleanup);

describe("start content", () => {
  it("keeps to the design limits", () => {
    expect(start.heading.length).toBeLessThanOrEqual(40);
    for (const step of start.steps) {
      expect(step.title.length).toBeLessThanOrEqual(28);
      expect(step.body.length).toBeLessThanOrEqual(90);
    }
  });

  it("tells the gospel in four parts with the agreed references", () => {
    expect(start.steps.map((s) => formatReference(s.reference))).toEqual([
      "Genesis 1:1",
      "Romans 3:23",
      "1 Corinthians 15:3–4",
      "Ephesians 2:8–9",
    ]);
  });
});

describe("Start", () => {
  it("is a section named by its h2", () => {
    render(<Start />);
    expect(screen.getByRole("region", { name: start.heading })).toHaveAttribute("id", "start");
    expect(screen.getByRole("heading", { level: 2, name: start.heading })).toBeInTheDocument();
  });

  it("is an ordered list of four steps, each with an h3 and its reference", () => {
    render(<Start />);
    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    items.forEach((item, i) => {
      expect(within(item).getByRole("heading", { level: 3 })).toHaveTextContent(
        start.steps[i].title,
      );
      expect(item.querySelector("cite")).toHaveTextContent(
        formatReference(start.steps[i].reference),
      );
      expect(item).toHaveTextContent(String(i + 1));
    });
  });

  it("offers a way to talk to someone", () => {
    render(<Start />);
    expect(screen.getByRole("link", { name: "Talk to someone" })).toHaveAttribute(
      "href",
      "/#contact",
    );
  });

  it("has no draft placeholders in the gospel wording", () => {
    const { container } = render(<Start />);
    expect(container.querySelectorAll("[data-placeholder]")).toHaveLength(0);
  });
});
