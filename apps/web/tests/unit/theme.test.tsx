// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { THEME_COOKIE, parseTheme } from "@/lib/theme";

afterEach(cleanup);

const set = vi.fn();
vi.mock("next/headers", () => ({ cookies: async () => ({ set }) }));

describe("parseTheme", () => {
  it("accepts light and dark only", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("sepia")).toBeUndefined();
    expect(parseTheme(undefined)).toBeUndefined();
  });
});

describe("setTheme action", () => {
  beforeEach(() => set.mockClear());

  it("stores a valid theme in a long-lived cookie", async () => {
    const { setTheme } = await import("@/lib/actions/theme");
    await setTheme("dark");
    expect(set).toHaveBeenCalledWith(
      THEME_COOKIE,
      "dark",
      expect.objectContaining({ path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 }),
    );
  });

  it("ignores an invalid theme", async () => {
    const { setTheme } = await import("@/lib/actions/theme");
    await setTheme("sepia");
    expect(set).not.toHaveBeenCalled();
  });
});

describe("ThemeToggle", () => {
  const save = vi.fn();

  beforeEach(() => {
    save.mockClear();
    document.documentElement.removeAttribute("data-theme");
  });

  async function renderToggle(prefersDark: boolean) {
    window.matchMedia = vi.fn().mockReturnValue({ matches: prefersDark }) as never;
    const { ThemeToggle } = await import("@/components/theme-toggle");
    render(<ThemeToggle saveTheme={save} />);
  }

  it("switches a light page to dark, updates the page at once and saves it", async () => {
    await renderToggle(false);
    await userEvent.click(screen.getByRole("button", { name: /switch between/i }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(save).toHaveBeenCalledWith("dark");
  });

  it("follows the device setting when no theme is chosen yet", async () => {
    await renderToggle(true);
    await userEvent.click(screen.getByRole("button", { name: /switch between/i }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(save).toHaveBeenCalledWith("light");
  });

  it("is a 44px touch target", async () => {
    await renderToggle(false);
    expect(screen.getByRole("button").className).toMatch(/min-h-11/);
    expect(screen.getByRole("button").className).toMatch(/min-w-11/);
  });
});
