// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { Header } from "@/components/layout/header";
import { NAV_LINKS } from "@/components/layout/nav-links";

afterEach(cleanup);

describe("Header", () => {
  it("has a Main nav with the five section links", () => {
    render(<Header />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((l) => l.textContent),
    ).toEqual(NAV_LINKS.map((l) => l.label));
    expect(NAV_LINKS).toHaveLength(5);
  });

  it("has one primary call to action to the subscribe section", () => {
    render(<Header />);
    const cta = screen.getByRole("link", { name: /get the devotional/i });
    expect(cta).toHaveAttribute("href", "/#subscribe");
    expect(cta).toHaveTextContent("Subscribe");
  });
});

describe("theme toggle", () => {
  const name = /switch between light and dark/i;

  it("sits in the header bar, after the call to action", () => {
    render(<Header />);
    const banner = screen.getByRole("banner");
    const toggle = within(banner).getByRole("button", { name });
    const cta = within(banner).getByRole("link", { name: /get the devotional/i });
    expect(cta.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("is shown only from lg in the bar, and has a second copy in the open menu", async () => {
    render(<Header />);
    const [barToggle] = screen.getAllByRole("button", { name });
    expect(barToggle.parentElement?.className).toMatch(/\bhidden\b.*\blg:block\b/);
    await userEvent.setup().click(screen.getByRole("button", { name: /menu/i }));
    expect(within(screen.getByTestId("mobile-menu")).getByRole("button", { name })).toBeVisible();
  });
});

describe("mobile menu", () => {
  async function setup() {
    render(<Header />);
    const user = userEvent.setup();
    const button = screen.getByRole("button", { name: /menu/i });
    return { user, button };
  }

  it("starts closed and exposes its state", async () => {
    const { button } = await setup();
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button.className).toMatch(/size-11/);
    expect(screen.queryByTestId("mobile-menu")).not.toBeInTheDocument();
  });

  it("opens on click and lists every link", async () => {
    const { user, button } = await setup();
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    const menu = screen.getByTestId("mobile-menu");
    expect(within(menu).getAllByRole("link")).toHaveLength(NAV_LINKS.length);
  });

  it("closes on Escape and returns focus to the button", async () => {
    const { user, button } = await setup();
    await user.click(button);
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("mobile-menu")).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it("closes when the button is pressed again", async () => {
    const { user, button } = await setup();
    await user.click(button);
    await user.click(button);
    expect(screen.queryByTestId("mobile-menu")).not.toBeInTheDocument();
  });

  it("closes when a link is chosen", async () => {
    const { user, button } = await setup();
    await user.click(button);
    await user.click(
      within(screen.getByTestId("mobile-menu")).getByRole("link", { name: "About" }),
    );
    expect(screen.queryByTestId("mobile-menu")).not.toBeInTheDocument();
  });
});
