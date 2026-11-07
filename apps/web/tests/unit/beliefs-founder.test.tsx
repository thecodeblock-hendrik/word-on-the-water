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

  it("states the four historic points and no placeholder", () => {
    expect(beliefs.points).toHaveLength(4);
    expect(beliefs.points[0]).toMatch(/Bible is God's Word/);
    expect(beliefs.points.some((point) => point.startsWith("["))).toBe(false);
  });
});

describe("Beliefs", () => {
  it("is anchored as believe with an h2 and a list of four points", () => {
    const { container } = render(<Beliefs />);
    expect(container.querySelector("#believe")).not.toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: beliefs.heading })).toBeInTheDocument();
    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(4);
  });

  it("has no placeholder text", () => {
    const { container } = render(<Beliefs />);
    expect(container.querySelectorAll("[data-placeholder]")).toHaveLength(0);
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

  it("shows the name, the church and the faith story, with no draft text left", () => {
    const { container } = render(<Founder />);
    expect(container).toHaveTextContent('Henno (AKA "H")');
    expect(container).toHaveTextContent("Harvest Christian Church");
    expect(container).toHaveTextContent("caught in addiction");
    expect(container).toHaveTextContent("In 2023 I found Jesus");
    expect(container).toHaveTextContent(
      "In 2023 I found Jesus, and He gave me what the waves and the substance abuse could never give: real freedom.",
    );
    expect(container).toHaveTextContent(
      "I created Word on the Water to share the good news of Jesus with anyone who feels empty: He loves you and He is enough.",
    );
    expect(container).not.toHaveTextContent("I write Word on the Water");
    expect(container.querySelectorAll("[data-placeholder]")).toHaveLength(0);
  });

  it("shows the surfing photo in a square frame wide enough to see the wave", () => {
    render(<Founder />);
    const frame = screen.getByTestId("founder-photo");
    expect(frame.className).toMatch(/aspect-square/);
    const img = within(frame).getByRole("img", { name: /Henno/ });
    expect(img.getAttribute("src")).toMatch(/henno-surfing/);
    expect(img).not.toHaveAttribute("style");
    expect(frame.querySelector("use")).toBeNull();
  });

  it("falls back to the logo mark when a photo is not given", () => {
    render(<Founder photo={null} />);
    const frame = screen.getByTestId("founder-photo");
    expect(frame.querySelector("use")).not.toBeNull();
    expect(frame.querySelector("img")).toBeNull();
  });
});

describe("BeliefsFounder", () => {
  it("is one labelled region holding both", () => {
    render(<BeliefsFounder />);
    const region = screen.getByRole("region", { name: "Beliefs and founder" });
    expect(within(region).getAllByRole("heading", { level: 2 })).toHaveLength(2);
  });
});
