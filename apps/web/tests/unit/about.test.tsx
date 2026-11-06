// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PlaceholderText } from "@/components/placeholder-text";
import { About } from "@/components/sections/about";
import { about } from "@/content/landing";

afterEach(cleanup);

describe("PlaceholderText", () => {
  it("renders plain text without markers", () => {
    const { container } = render(<PlaceholderText>Hello there</PlaceholderText>);
    expect(container).toHaveTextContent("Hello there");
    expect(container.querySelector("[data-placeholder]")).toBeNull();
  });

  it("highlights bracketed draft copy and keeps the text", () => {
    const { container } = render(<PlaceholderText>Hi [your name], welcome</PlaceholderText>);
    const marked = container.querySelectorAll("[data-placeholder]");
    expect(marked).toHaveLength(1);
    expect(marked[0]).toHaveTextContent("[your name]");
    expect(container).toHaveTextContent("Hi [your name], welcome");
  });
});

describe("about content", () => {
  it("keeps to the design limits", () => {
    expect(about.heading.length).toBeLessThanOrEqual(40);
  });

  it("says who it is for: men, surfers and the curious", () => {
    expect(about.who.map((w) => w.term)).toEqual(["Men", "Surfers", "The curious"]);
  });
});

describe("About", () => {
  it("is a section named by its h2", () => {
    render(<About />);
    const region = screen.getByRole("region", { name: about.heading });
    expect(region).toHaveAttribute("id", "about");
    expect(screen.getByRole("heading", { level: 2, name: about.heading })).toBeInTheDocument();
  });

  it("lists who it is for as a description list", () => {
    const { container } = render(<About />);
    const list = container.querySelector("dl")!;
    expect(list).toHaveAccessibleName(/who this is for/i);
    expect(list.querySelectorAll("dt")).toHaveLength(3);
    expect(within(list as HTMLElement).getByText("The curious")).toBeInTheDocument();
  });

  it("shows three paragraphs and no placeholder", () => {
    const { container } = render(<About />);
    expect(container.querySelectorAll("[data-placeholder]")).toHaveLength(0);
    expect(container.querySelectorAll("p.font-serif")).toHaveLength(3);
    expect(screen.getByText(/Word on the Water is for men who surf/)).toBeInTheDocument();
  });

  it("links 'paddle out with us' to the sign-up section", () => {
    render(<About />);
    const link = screen.getByRole("link", { name: "paddle out with us" });
    expect(link).toHaveAttribute("href", "/#subscribe");
    expect(link.closest("p")).toHaveTextContent(
      "You don't need to have it all figured out, so paddle out with us, one passage at a time.",
    );
  });
});
