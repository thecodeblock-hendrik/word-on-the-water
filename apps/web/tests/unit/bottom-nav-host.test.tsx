// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BottomNavHost } from "@/components/layout/bottom-nav-host";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

afterEach(cleanup);

const show = (path: string) => {
  pathname = path;
  return render(<BottomNavHost devotionalHref="/devotionals/advent-01" />);
};

describe("BottomNavHost", () => {
  it.each(["/", "/privacy", "/thank-you", "/no-such-page"])("shows the bar on %s", (path) => {
    show(path);
    expect(screen.getByRole("navigation", { name: "Quick links" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Devotional" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Shore" })).toBeNull();
  });

  it("shows Shore in place of Devotional on a devotional page", () => {
    show("/devotionals/advent-01");
    expect(screen.getByRole("link", { name: "Shore" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("link", { name: "Devotional" })).toBeNull();
  });

  it("is left out of the Bible reader, which has its own bar", () => {
    show("/bible/web/john/3");
    expect(screen.queryByRole("navigation", { name: "Quick links" })).toBeNull();
  });

  // /bible only redirects to the chapter last read. Until that chapter and its bar arrive, the
  // visitor is still looking at the bar they tapped.
  describe("on the way into the Bible reader", () => {
    /** The host as the address changes, one page after another. */
    function visit(...paths: string[]) {
      const [first, ...rest] = paths;
      const view = show(first);
      for (const path of rest) {
        pathname = path;
        view.rerender(<BottomNavHost devotionalHref="/devotionals/advent-01" />);
      }
    }
    const bar = () => screen.queryByRole("navigation", { name: "Quick links" });

    it("keeps the bar while /bible redirects", () => {
      visit("/privacy", "/bible");
      expect(bar()).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Devotional" })).toBeInTheDocument();
    });

    it("keeps it as it was: Shore stays when the Bible is opened from a devotional", () => {
      visit("/devotionals/advent-01", "/bible");
      expect(screen.getByRole("link", { name: "Shore" })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Devotional" })).toBeNull();
    });

    it("goes once the chapter is there", () => {
      visit("/privacy", "/bible", "/bible/web/john/3");
      expect(bar()).toBeNull();
    });

    it("comes back as the new page needs it afterwards", () => {
      visit("/devotionals/advent-01", "/bible", "/bible/web/john/3", "/privacy");
      expect(screen.getByRole("link", { name: "Devotional" })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Shore" })).toBeNull();
    });

    it("does not appear over the reader when /bible is followed from inside it", () => {
      visit("/bible/web/john/3", "/bible");
      expect(bar()).toBeNull();
    });
  });

  it("marks the bar so the page can leave room for it", () => {
    show("/");
    expect(screen.getByRole("navigation", { name: "Quick links" })).toHaveAttribute(
      "data-bottom-nav",
    );
  });
});
