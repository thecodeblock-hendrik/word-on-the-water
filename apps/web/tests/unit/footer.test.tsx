// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Footer } from "@/components/layout/footer";
import { footer, hero } from "@/content/landing";
import { ESV_LIMITS, ESV_NOTICE } from "@/lib/scripture";

afterEach(cleanup);

describe("Footer", () => {
  it("is the contentinfo landmark with the ESV notice, word for word", () => {
    render(<Footer year={2026} />);
    const info = screen.getByRole("contentinfo");
    expect(info).toHaveTextContent(ESV_NOTICE);
  });

  it("carries the ESV usage limit, links to esv.org and labels the footer verse ESV", () => {
    render(<Footer year={2026} />);
    const info = screen.getByRole("contentinfo");
    expect(info).toHaveTextContent(ESV_LIMITS);
    expect(within(info).getByRole("link", { name: "www.esv.org" })).toHaveAttribute(
      "href",
      "https://www.esv.org",
    );
    expect(info).toHaveTextContent(
      `${hero.verse.reference.book} ${hero.verse.reference.chapter}:41 (ESV)`,
    );
  });

  it("carries the brand and the anchor verse with its reference", () => {
    render(<Footer year={2026} />);
    const info = screen.getByRole("contentinfo");
    expect(within(info).getByRole("link", { name: "Word on the Water" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(info).toHaveTextContent(hero.verse.text);
    expect(info).toHaveTextContent("Mark 4:41");
  });

  it("has Read, About and Follow link groups", () => {
    render(<Footer year={2026} />);
    for (const title of ["Read", "About", "Follow"]) {
      expect(screen.getByRole("navigation", { name: title })).toBeInTheDocument();
    }
    const read = within(screen.getByRole("navigation", { name: "Read" }));
    expect(read.getByRole("link", { name: "Devotionals" })).toHaveAttribute("href", "/#coming");
    expect(read.getByRole("link", { name: "Start here" })).toHaveAttribute("href", "/#start");
    const about = within(screen.getByRole("navigation", { name: "About" }));
    expect(about.getByRole("link", { name: "Statement of faith" })).toHaveAttribute(
      "href",
      "/#believe",
    );
    expect(about.getByRole("link", { name: "Prayer" })).toHaveAttribute("href", "/#contact");
  });

  it("only links social accounts that exist, and always offers email", () => {
    render(<Footer year={2026} />);
    const follow = within(screen.getByRole("navigation", { name: "Follow" }));
    expect(follow.getAllByRole("link").map((l) => l.textContent)).toEqual(["Email"]);
    expect(follow.getByRole("link", { name: "Email" })).toHaveAttribute("href", "/#subscribe");
    expect(screen.getByRole("contentinfo")).not.toHaveTextContent("[@");
  });

  it("every link has a real destination", () => {
    render(<Footer year={2026} />);
    for (const link of within(screen.getByRole("contentinfo")).getAllByRole("link")) {
      expect(link.getAttribute("href")).toBeTruthy();
      expect(link.getAttribute("href")).not.toBe("#");
    }
  });

  it("shows the copyright year it is given, and no privacy link until the page exists", () => {
    render(<Footer year={2026} />);
    const info = screen.getByRole("contentinfo");
    expect(info).toHaveTextContent("© 2026 Word on the Water");
    expect(within(info).queryByRole("link", { name: /privacy/i })).not.toBeInTheDocument();
  });

  it("links the privacy policy once its address is set", () => {
    render(<Footer year={2026} privacyHref="/privacy" />);
    expect(screen.getByRole("link", { name: "Privacy policy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
  });

  it("no longer holds the theme toggle, which moved to the header", () => {
    render(<Footer year={2026} />);
    expect(
      screen.queryByRole("button", { name: /switch between light and dark/i }),
    ).not.toBeInTheDocument();
  });
});

describe("footer content", () => {
  it("keeps social handles as placeholders so the launch check flags them", () => {
    expect(footer.social.some((s) => s.handle.startsWith("["))).toBe(true);
  });
});
