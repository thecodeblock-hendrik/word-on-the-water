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

  it("marks the bar so the page can leave room for it", () => {
    show("/");
    expect(screen.getByRole("navigation", { name: "Quick links" })).toHaveAttribute(
      "data-bottom-nav",
    );
  });
});
