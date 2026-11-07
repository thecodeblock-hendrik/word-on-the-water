// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Home from "@/app/page";
import { SubscribeBand } from "@/components/devotional/subscribe-band";
import { signup } from "@/content/landing";

vi.mock("@/lib/actions/subscribe", () => ({ subscribe: vi.fn() }));
vi.mock("next/script", () => ({ default: () => null }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-12-06T08:00:00Z"));
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "1x00000000000000000000AA");
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

const hidden = (name: string) =>
  [...document.querySelectorAll<HTMLInputElement>(`input[type=hidden][name="${name}"]`)].map(
    (input) => input.value,
  );

describe("SubscribeBand", () => {
  it("is the #subscribe section the buttons link to, named by its h2", () => {
    render(<SubscribeBand source="landing_closing" />);
    const band = screen.getByRole("region", { name: signup.heading });
    expect(band).toHaveAttribute("id", "subscribe");
    expect(screen.getByRole("heading", { level: 2, name: signup.heading })).toBeInTheDocument();
    expect(screen.getByText(signup.lede)).toBeInTheDocument();
  });

  it("holds the sign-up form, with the site key from the environment", () => {
    render(<SubscribeBand source="landing_closing" />);
    expect(screen.getByLabelText(signup.emailLabel)).toBeInTheDocument();
    expect(document.querySelector(".cf-turnstile")).toHaveAttribute(
      "data-sitekey",
      "1x00000000000000000000AA",
    );
  });

  it("tells the form where it is and when it was drawn", () => {
    render(<SubscribeBand source="devotional_band" />);
    expect(hidden("source")).toEqual(["devotional_band"]);
    expect(hidden("rendered_at")).toEqual([String(new Date("2026-12-06T08:00:00Z").getTime())]);
  });

  it("gives every page drawn its own idempotency key", () => {
    render(<SubscribeBand source="landing_closing" />);
    const first = hidden("idempotency_key")[0];
    cleanup();
    render(<SubscribeBand source="landing_closing" />);
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(hidden("idempotency_key")[0]).not.toBe(first);
  });

  it("says sign-up is not available when no site key is set", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    render(<SubscribeBand source="landing_closing" />);
    expect(screen.getByText(signup.unavailable)).toBeInTheDocument();
  });
});

describe("the landing page", () => {
  it("ends with the sign-up band, so every Subscribe button has somewhere to go", () => {
    const { container } = render(<Home />);
    const target = container.querySelector("#subscribe");
    expect(target).not.toBeNull();
    expect(target?.tagName).toBe("SECTION");
    expect(hidden("source")).toEqual(["landing_closing"]);
  });
});
