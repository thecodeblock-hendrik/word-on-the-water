// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SubscribeCta } from "@/components/layout/subscribe-cta";

const usePathname = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ usePathname }));

afterEach(cleanup);

const cta = () => screen.queryByRole("link", { name: /get the devotional|subscribe/i });

describe("the header sign-up button", () => {
  it.each(["/", "/devotionals/advent-01-more-than-watchmen", "/privacy"])(
    "is shown on %s and goes to the sign-up band",
    (path) => {
      usePathname.mockReturnValue(path);
      render(<SubscribeCta />);
      expect(cta()).toHaveAttribute("href", "/#subscribe");
    },
  );

  it("is not shown on the thank-you page, because the visitor has already signed up", () => {
    usePathname.mockReturnValue("/thank-you");
    render(<SubscribeCta />);
    expect(cta()).toBeNull();
  });

  it("is still shown when the path is not known", () => {
    usePathname.mockReturnValue(null);
    render(<SubscribeCta />);
    expect(cta()).not.toBeNull();
  });
});
