// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import ThankYou, { metadata } from "@/app/thank-you/page";
import { thankYou } from "@/content/landing";

afterEach(cleanup);

describe("/thank-you", () => {
  it("has one h1 saying the visitor is in", () => {
    render(<ThankYou />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: thankYou.heading })).toBeInTheDocument();
  });

  it("tells them what happens next", () => {
    render(<ThankYou />);
    expect(screen.getByText(thankYou.body)).toBeInTheDocument();
  });

  it("offers the home page and the latest devotional, as links 44px tall", () => {
    render(<ThankYou />);
    expect(screen.getByRole("link", { name: /back to the home page/i })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getByRole("link", { name: /read the latest devotional/i }).getAttribute("href"),
    ).toMatch(/^\/devotionals\/[a-z0-9-]+$/);
    for (const link of screen.getAllByRole("link")) expect(link.className).toMatch(/min-h-11/);
  });

  it("has no sign-up form and carries no personal data", () => {
    render(<ThankYou />);
    expect(document.querySelector("form, input")).toBeNull();
  });

  it("is kept out of search results", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.title).toBe("Thank you");
  });
});
