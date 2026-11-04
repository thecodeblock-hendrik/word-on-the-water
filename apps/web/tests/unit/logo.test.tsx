// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Logo, LogoSprite } from "@/components/logo";

afterEach(cleanup);

describe("Logo", () => {
  it("sprite defines the mark once", () => {
    const { container } = render(<LogoSprite />);
    expect(container.querySelectorAll("symbol#logo-mark")).toHaveLength(1);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("is an image with a name when labelled", () => {
    render(<Logo label="Word on the Water logo" />);
    expect(screen.getByRole("img", { name: "Word on the Water logo" })).toBeInTheDocument();
  });

  it("is hidden from assistive tech when decorative", () => {
    const { container } = render(<Logo />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
