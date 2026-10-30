// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { SkipLink } from "@/components/layout/skip-link";

describe("SkipLink", () => {
  it("links to the main content landmark", () => {
    render(<SkipLink />);
    expect(screen.getByRole("link", { name: /skip to main content/i })).toHaveAttribute(
      "href",
      "#main",
    );
  });
});

describe("Header", () => {
  it("is a banner with the site name and one primary call to action", () => {
    render(<Header />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /word on the water/i })).toHaveAttribute("href", "/");
    const cta = screen.getByRole("link", { name: /get the devotional/i });
    expect(cta).toHaveAttribute("href", "/#subscribe");
    expect(cta.className).toMatch(/min-h-11/);
  });
});

describe("Footer", () => {
  it("is a contentinfo landmark", () => {
    render(<Footer />);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});
