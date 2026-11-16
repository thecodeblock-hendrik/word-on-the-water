// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ErrorPage from "@/app/error";
import { buttonClasses } from "@/components/ui/button";

afterEach(cleanup);

describe("the error page", () => {
  it("says something went wrong and Try again calls reset", () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error("boom")} reset={reset} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Something went wrong");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it("uses the shared primary button, whose accent-ink fill has enough contrast in both schemes", () => {
    render(<ErrorPage error={new Error("boom")} reset={() => {}} />);
    const button = screen.getByRole("button", { name: "Try again" });
    expect(button.className).toBe(buttonClasses("primary"));
    expect(button.className).not.toMatch(/bg-accent(?!-)/);
  });
});
