// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChatInput } from "@/components/chat/chat-input";

afterEach(cleanup);

const show = (aboveBar: boolean) =>
  render(
    <ChatInput
      value=""
      onChange={vi.fn()}
      onSend={vi.fn()}
      error={null}
      followUp={false}
      inputRef={createRef()}
      aboveBar={aboveBar}
    />,
  );

const wrapper = () => screen.getByRole("textbox").closest("div")!.parentElement!;

describe("ChatInput above the bottom bar on a phone", () => {
  it("floats as a pill with no strip or border behind it, 12px above the capsule", () => {
    show(true);
    expect(wrapper().className).toMatch(/max-lg:border-0/);
    expect(wrapper().className).toMatch(/max-lg:bg-transparent/);
    // The capsule is 4rem tall and sits max(.875rem, home indicator) up; .75rem is the gap.
    expect(wrapper()).toHaveClass(
      "max-lg:pb-[calc(4.75rem+max(.875rem,env(safe-area-inset-bottom)))]",
    );
    expect(screen.getByRole("textbox").className).toMatch(/max-lg:rounded-3xl/);
  });

  it("is no wider than the capsule, and centred, below lg only", () => {
    show(true);
    expect(wrapper()).toHaveClass("max-lg:grid-cols-[minmax(0,440px)]", "max-lg:justify-center");
  });

  it("keeps the privacy line visible above the pill", () => {
    show(true);
    expect(screen.getByText("Please don't share personal details.")).toBeVisible();
  });

  it("keeps the usual strip when there is no bar", () => {
    show(false);
    expect(wrapper().className).not.toMatch(/max-lg:border-0/);
    expect(wrapper().className).toMatch(/\bborder-t\b/);
    expect(wrapper().className).not.toMatch(/440px/);
  });
});
