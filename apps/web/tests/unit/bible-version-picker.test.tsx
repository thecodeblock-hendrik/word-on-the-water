// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VersionList } from "@/components/bible/version-list";
import { VersionSwitcher } from "@/components/bible/version-switcher";
import type { PickerState } from "@/lib/bible/picker";
import { VERSIONS } from "@/lib/bible/versions";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeEach(() => push.mockClear());
afterEach(cleanup);

describe("VersionList", () => {
  it("is a radio group of the three Bibles in order, with the current one selected", () => {
    render(<VersionList versions={VERSIONS} value="bsb" onChange={() => {}} />);
    const group = screen.getByRole("radiogroup", { name: "Bible version" });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("value"))).toEqual(["bsb", "web", "esv"]);
    expect(radios[0]).toBeChecked();
    expect(radios[1]).not.toBeChecked();
  });

  it("names each Bible and says what it is in plain language", () => {
    render(<VersionList versions={VERSIONS} value="bsb" onChange={() => {}} />);
    expect(
      screen.getByRole("radio", { name: /Berean Standard Bible \(BSB\)/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Modern English, easy to read. Public domain.")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /World English Bible \(WEB\)/ })).toBeInTheDocument();
  });

  it("shows Selected on the current Bible and Coming soon on the ESV, which cannot be chosen", () => {
    render(<VersionList versions={VERSIONS} value="bsb" onChange={() => {}} />);
    expect(screen.getByText("Selected")).toBeInTheDocument();
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /English Standard Version/ })).toBeDisabled();
  });

  it("tells the parent which Bible was chosen, and nothing for the disabled ESV", async () => {
    const onChange = vi.fn();
    render(<VersionList versions={VERSIONS} value="bsb" onChange={onChange} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: /World English Bible/ }));
    expect(onChange).toHaveBeenCalledWith("web");
    onChange.mockClear();
    await user.click(screen.getByRole("radio", { name: /English Standard Version/ }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("can be chosen by clicking the text of a card, not only the dot", async () => {
    const onChange = vi.fn();
    render(<VersionList versions={VERSIONS} value="bsb" onChange={onChange} />);
    await userEvent
      .setup()
      .click(screen.getByText("Modern English, classic style. Public domain."));
    expect(onChange).toHaveBeenCalledWith("web");
  });
});

const state: PickerState = { version: "bsb", book: "john", chapter: 3, from: 16, to: 18 };

describe("VersionSwitcher", () => {
  const chip = () => screen.getByRole("button", { name: "Bible version: BSB. Change" });

  it("is a chip with the short name of the current Bible", () => {
    render(<VersionSwitcher state={state} />);
    expect(chip()).toHaveTextContent("BSB");
  });

  it("opens a sheet titled Choose Bible with the version list", async () => {
    render(<VersionSwitcher state={state} />);
    await userEvent.setup().click(chip());
    const sheet = screen.getByRole("dialog", { name: "Choose Bible" });
    expect(within(sheet).getByRole("radiogroup", { name: "Bible version" })).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("goes to the same passage in the chosen Bible and closes", async () => {
    render(<VersionSwitcher state={state} />);
    const user = userEvent.setup();
    await user.click(chip());
    await user.click(screen.getByRole("radio", { name: /World English Bible/ }));
    expect(push).toHaveBeenCalledWith("/bible/web/john/3?v=16-18");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps a whole chapter whole", async () => {
    render(<VersionSwitcher state={{ ...state, from: null, to: null }} />);
    const user = userEvent.setup();
    await user.click(chip());
    await user.click(screen.getByRole("radio", { name: /World English Bible/ }));
    expect(push).toHaveBeenCalledWith("/bible/web/john/3");
  });

  it("just closes when the current Bible is chosen again", async () => {
    render(<VersionSwitcher state={state} />);
    const user = userEvent.setup();
    await user.click(chip());
    await user.click(screen.getByRole("radio", { name: /Berean Standard Bible/ }));
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes with Escape and gives focus back to the chip", async () => {
    render(<VersionSwitcher state={state} />);
    const user = userEvent.setup();
    await user.click(chip());
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(chip()).toHaveFocus();
    expect(push).not.toHaveBeenCalled();
  });

  it("closes with the Close button", async () => {
    render(<VersionSwitcher state={state} />);
    const user = userEvent.setup();
    await user.click(chip());
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("makes every control at least 44px tall", async () => {
    render(<VersionSwitcher state={state} />);
    const trigger = chip();
    await userEvent.setup().click(trigger);
    expect(trigger.className).toMatch(/min-h-11/);
    expect(screen.getByRole("button", { name: "Close" }).className).toMatch(/size-11|min-h-11/);
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio.closest("label")!.className).toMatch(/min-h-16|min-h-14|min-h-11/);
    }
  });
});
