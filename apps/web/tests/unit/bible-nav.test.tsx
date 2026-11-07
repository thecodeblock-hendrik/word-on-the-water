// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { NavLink } from "@/components/layout/nav-link";
import { NAV_LINKS, navLinks } from "@/components/layout/nav-links";

let pathname: string | null = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

beforeEach(() => {
  pathname = "/";
  vi.stubEnv("BIBLE_ENABLED", "1");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("navLinks", () => {
  it("is the five section links while the Bible is off", () => {
    expect(navLinks(false)).toEqual(NAV_LINKS);
  });

  it("puts Bible after Devotionals when it is on", () => {
    const labels = navLinks(true).map((l) => l.label);
    expect(labels).toEqual([
      "About",
      "Devotionals",
      "Bible",
      "Start here",
      "What we believe",
      "Prayer",
    ]);
    expect(navLinks(true)[2]).toMatchObject({ href: "/bible", match: "/bible" });
  });
});

describe("NavLink", () => {
  const link = () => screen.getByRole("link", { name: "Bible" });

  it("marks the page as current on the Bible pages and on /bible itself", () => {
    for (const path of ["/bible", "/bible/bsb/john/3"]) {
      pathname = path;
      render(
        <NavLink href="/bible" match="/bible">
          Bible
        </NavLink>,
      );
      expect(link()).toHaveAttribute("aria-current", "page");
      cleanup();
    }
  });

  it("is not current elsewhere, including a path that only starts with the same letters", () => {
    for (const path of ["/", "/devotionals/x", "/bibles", null]) {
      pathname = path;
      render(
        <NavLink href="/bible" match="/bible">
          Bible
        </NavLink>,
      );
      expect(link()).not.toHaveAttribute("aria-current");
      cleanup();
    }
  });

  it("never marks a link without a match as current", () => {
    pathname = "/bible/bsb/john/3";
    render(<NavLink href="/#about">About</NavLink>);
    expect(screen.getByRole("link", { name: "About" })).not.toHaveAttribute("aria-current");
  });

  it("shows the current page with more than colour: a bar and a heavier weight", () => {
    pathname = "/bible";
    render(
      <NavLink href="/bible" match="/bible" className="x">
        Bible
      </NavLink>,
    );
    expect(link().className).toMatch(/aria-\[current=page\]:(underline|border-l-4|font-semibold)/);
  });
});

describe("Header with the Bible on", () => {
  it("lists six links with Bible third", () => {
    render(<Header />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    const labels = within(nav)
      .getAllByRole("link")
      .map((l) => l.textContent);
    expect(labels).toEqual([
      "About",
      "Devotionals",
      "Bible",
      "Start here",
      "What we believe",
      "Prayer",
    ]);
    expect(within(nav).getByRole("link", { name: "Bible" })).toHaveAttribute("href", "/bible");
  });

  it("has Bible in the open mobile menu too, marked current on a Bible page", async () => {
    pathname = "/bible/bsb/john/3";
    render(<Header />);
    await userEvent.setup().click(screen.getByRole("button", { name: /menu/i }));
    const menu = within(screen.getByTestId("mobile-menu"));
    expect(menu.getAllByRole("link").map((l) => l.textContent)).toEqual([
      "About",
      "Devotionals",
      "Bible",
      "Start here",
      "What we believe",
      "Prayer",
    ]);
    expect(menu.getByRole("link", { name: "Bible" })).toHaveAttribute("aria-current", "page");
  });

  it("is unchanged while the Bible is off", () => {
    vi.stubEnv("BIBLE_ENABLED", "");
    render(<Header />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).queryByRole("link", { name: "Bible" })).not.toBeInTheDocument();
    expect(within(nav).getAllByRole("link")).toHaveLength(5);
  });
});

describe("Footer", () => {
  it("lists Bible under Read, after Devotionals, only while the Bible is on", () => {
    const { unmount } = render(<Footer />);
    const read = within(screen.getByRole("navigation", { name: "Read" }));
    expect(read.getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Devotionals",
      "Bible",
      "Teaching",
      "Start here",
    ]);
    unmount();

    vi.stubEnv("BIBLE_ENABLED", "");
    render(<Footer />);
    expect(screen.queryByRole("link", { name: "Bible" })).not.toBeInTheDocument();
  });
});
