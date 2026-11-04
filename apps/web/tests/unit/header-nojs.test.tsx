// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { Header } from "@/components/layout/header";
import { NAV_LINKS } from "@/components/layout/nav-links";

afterEach(cleanup);

describe("header without JavaScript", () => {
  const serverHtml = renderToStaticMarkup(<Header />);

  it("shows every link in a noscript nav below lg", () => {
    const noscript = /<noscript>([\s\S]*?)<\/noscript>/.exec(serverHtml)?.[1] ?? "";
    expect(noscript).toMatch(/lg:hidden/);
    for (const link of NAV_LINKS) expect(noscript).toContain(`href="${link.href}"`);
    for (const link of NAV_LINKS) expect(noscript).toContain(link.label);
  });

  it("noscript links are 44px tall", () => {
    const noscript = /<noscript>([\s\S]*?)<\/noscript>/.exec(serverHtml)?.[1] ?? "";
    expect(noscript).toMatch(/min-h-11/);
  });

  it("keeps the dead menu button invisible until the page hydrates", () => {
    expect(serverHtml).toMatch(/<button[^>]*aria-label="Menu"[^>]*class="[^"]*invisible/);
  });

  it("makes the menu button visible once hydrated", () => {
    render(<Header />);
    expect(screen.getByRole("button", { name: "Menu" }).className).not.toMatch(/invisible/);
  });
});
