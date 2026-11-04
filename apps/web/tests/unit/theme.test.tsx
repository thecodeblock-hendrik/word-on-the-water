// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { THEME_COOKIE, parseTheme } from "@/lib/theme";

afterEach(cleanup);

const set = vi.fn();
let forwardedProto: string | null = null;
vi.mock("next/headers", () => ({
  cookies: async () => ({ set }),
  headers: async () => new Headers(forwardedProto ? { "x-forwarded-proto": forwardedProto } : {}),
}));

describe("parseTheme", () => {
  it("accepts light and dark only", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("sepia")).toBeUndefined();
    expect(parseTheme(undefined)).toBeUndefined();
  });
});

describe("setTheme action", () => {
  beforeEach(() => {
    set.mockClear();
    forwardedProto = null;
  });

  it("marks the cookie Secure only when the request came over https", async () => {
    const { setTheme } = await import("@/lib/actions/theme");
    forwardedProto = "https";
    await setTheme("dark");
    expect(set.mock.calls[0][2]).toMatchObject({ secure: true });
    set.mockClear();
    forwardedProto = "http";
    await setTheme("dark");
    expect(set.mock.calls[0][2]).toMatchObject({ secure: false });
  });

  it("is not Secure when there is no forwarded protocol, as on local http", async () => {
    const { setTheme } = await import("@/lib/actions/theme");
    await setTheme("light");
    expect(set.mock.calls[0][2]).toMatchObject({ secure: false });
  });

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

describe("theme colours for the browser chrome", () => {
  it("match the page background tokens in tokens.css", async () => {
    const { readFileSync } = await import("node:fs");
    const { THEME_COLORS } = await import("@/lib/theme");
    const css = readFileSync("src/styles/tokens.css", "utf8");
    const lightBg = /:root \{[^}]*--bg: (#\w+)/.exec(css)?.[1];
    const darkBg = /:root\[data-theme="dark"\] \{[^}]*--bg: (#\w+)/.exec(css)?.[1];
    expect(THEME_COLORS.light).toBe(lightBg);
    expect(THEME_COLORS.dark).toBe(darkBg);
  });

  it("follows the device when no theme is chosen", async () => {
    const { themeColor } = await import("@/lib/theme");
    expect(themeColor(undefined)).toEqual([
      { media: "(prefers-color-scheme: light)", color: "#fbf3e8" },
      { media: "(prefers-color-scheme: dark)", color: "#0f2233" },
    ]);
  });

  it("uses one colour when the reader chose a theme", async () => {
    const { themeColor } = await import("@/lib/theme");
    expect(themeColor("dark")).toBe("#0f2233");
    expect(themeColor("light")).toBe("#fbf3e8");
  });
});

describe("ThemeToggle and the browser chrome", () => {
  it("sets every theme-color meta tag to the chosen colour", async () => {
    document.head.innerHTML =
      '<meta name="theme-color" content="#fbf3e8" media="(prefers-color-scheme: light)">' +
      '<meta name="theme-color" content="#0f2233" media="(prefers-color-scheme: dark)">';
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never;
    const { ThemeToggle } = await import("@/components/theme-toggle");
    render(<ThemeToggle saveTheme={vi.fn()} />);
    await userEvent.click(screen.getByRole("button"));
    const metas = document.head.querySelectorAll('meta[name="theme-color"]');
    expect(metas).toHaveLength(2);
    metas.forEach((meta) => expect(meta).toHaveAttribute("content", "#0f2233"));
  });
});
