// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Beliefs } from "@/components/sections/beliefs";
import { BeliefsFounder } from "@/components/sections/beliefs-founder";
import { Founder } from "@/components/sections/founder";
import { beliefs, founder } from "@/content/landing";

afterEach(cleanup);

describe("beliefs and founder content", () => {
  it("keeps to the design limits", () => {
    expect(beliefs.heading.length).toBeLessThanOrEqual(40);
    expect(founder.heading.length).toBeLessThanOrEqual(40);
  });

  it("states the four historic points, then a placeholder for the rest", () => {
    expect(beliefs.points).toHaveLength(5);
    expect(beliefs.points[0]).toMatch(/Bible is God's Word/);
    expect(beliefs.points[4]).toMatch(/^\[.*\]$/);
  });
});

describe("Beliefs", () => {
  it("is anchored as believe with an h2 and a list of five points", () => {
    const { container } = render(<Beliefs />);
    expect(container.querySelector("#believe")).not.toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: beliefs.heading })).toBeInTheDocument();
    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(5);
  });

  it("shows the draft point as a highlighted placeholder", () => {
    const { container } = render(<Beliefs />);
    expect(container.querySelectorAll("[data-placeholder]")).toHaveLength(1);
  });

  it("has no link to a full statement until one exists", () => {
    render(<Beliefs />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("links to the full statement when given an address", () => {
    render(<Beliefs fullStatementHref="/statement-of-faith" />);
    expect(screen.getByRole("link", { name: /full statement of faith/i })).toHaveAttribute(
      "href",
      "/statement-of-faith",
    );
  });
});

describe("Founder", () => {
  it("is anchored as founder with an h2", () => {
    const { container } = render(<Founder />);
    expect(container.querySelector("#founder")).not.toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: founder.heading })).toBeInTheDocument();
  });

  it("shows the name, bio and church as highlighted draft copy", () => {
    const { container } = render(<Founder />);
    expect(container).toHaveTextContent("Hendrik");
    expect(container.querySelectorAll("[data-placeholder]").length).toBeGreaterThanOrEqual(3);
  });

  it("falls back to the logo mark in a 4:5 frame when there is no photo", () => {
    render(<Founder />);
    const frame = screen.getByTestId("founder-photo");
    expect(frame.className).toMatch(/aspect-\[4\/5\]/);
    expect(frame.querySelector("use")).not.toBeNull();
    expect(frame.querySelector("img")).toBeNull();
  });

  it("shows the photo with its alt text when there is one", () => {
    render(<Founder photo={{ src: "/hendrik.jpg", alt: "Hendrik on his board at dawn" }} />);
    const frame = screen.getByTestId("founder-photo");
    expect(
      within(frame).getByRole("img", { name: "Hendrik on his board at dawn" }),
    ).toBeInTheDocument();
    expect(frame.querySelector("use")).toBeNull();
  });
});

describe("BeliefsFounder", () => {
  it("is one labelled region holding both", () => {
    render(<BeliefsFounder />);
    const region = screen.getByRole("region", { name: "Beliefs and founder" });
    expect(within(region).getAllByRole("heading", { level: 2 })).toHaveLength(2);
  });
});
