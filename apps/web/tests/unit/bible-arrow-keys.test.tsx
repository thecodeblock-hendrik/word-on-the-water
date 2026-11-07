// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ArrowKeys, shouldHandleArrowKey } from "@/components/bible/arrow-keys";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeEach(() => push.mockClear());
afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const key = (init: KeyboardEventInit = {}, target: EventTarget = document.body) => {
  const event = new KeyboardEvent("keydown", {
    key: "ArrowRight",
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
};

describe("shouldHandleArrowKey", () => {
  const ev = (init: KeyboardEventInit, target: HTMLElement = document.body) => {
    const event = new KeyboardEvent("keydown", { key: "ArrowRight", ...init });
    Object.defineProperty(event, "target", { value: target });
    return event;
  };

  it("accepts a plain arrow key on the page", () => {
    expect(shouldHandleArrowKey(ev({}))).toBe(true);
    expect(shouldHandleArrowKey(ev({ key: "ArrowLeft" }))).toBe(true);
  });

  it("ignores other keys", () => {
    for (const k of ["ArrowUp", "ArrowDown", "Enter", "a", "Tab"])
      expect(shouldHandleArrowKey(ev({ key: k }))).toBe(false);
  });

  it("leaves browser shortcuts alone: Alt+Left is Back, Cmd+Left is Back, Shift and Ctrl select and jump", () => {
    for (const mod of ["altKey", "ctrlKey", "metaKey", "shiftKey"] as const) {
      expect(shouldHandleArrowKey(ev({ [mod]: true })), mod).toBe(false);
    }
  });

  it("ignores a key something else has already handled", () => {
    expect(shouldHandleArrowKey(ev({ cancelable: true }, document.body))).toBe(true);
    const handled = new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true });
    handled.preventDefault();
    expect(shouldHandleArrowKey(handled)).toBe(false);
  });

  it("ignores typing and choosing: text boxes, selects, radios, sliders and editable text", () => {
    const make = (html: string) => {
      document.body.innerHTML = html;
      return document.body.firstElementChild as HTMLElement;
    };
    for (const html of [
      "<input type='text'>",
      "<input type='number'>",
      "<textarea></textarea>",
      "<select><option>a</option></select>",
      "<input type='radio'>",
      "<div role='radio' tabindex='0'></div>",
      "<div role='slider' tabindex='0'></div>",
      "<div contenteditable='true'></div>",
    ]) {
      expect(shouldHandleArrowKey(ev({}, make(html))), html).toBe(false);
    }
  });

  it("ignores keys inside an open dialog or menu", () => {
    document.body.innerHTML = "<div role='dialog'><button id='b'>x</button></div>";
    expect(shouldHandleArrowKey(ev({}, document.getElementById("b")!))).toBe(false);
  });
});

describe("ArrowKeys", () => {
  it("goes to the next chapter on the right arrow and the previous on the left", () => {
    render(<ArrowKeys previous="/bible/bsb/john/2" next="/bible/bsb/john/4" />);
    key({ key: "ArrowRight" });
    expect(push).toHaveBeenLastCalledWith("/bible/bsb/john/4");
    key({ key: "ArrowLeft" });
    expect(push).toHaveBeenLastCalledWith("/bible/bsb/john/2");
  });

  it("does nothing at either end of the Bible", () => {
    render(<ArrowKeys previous={null} next={null} />);
    key({ key: "ArrowRight" });
    key({ key: "ArrowLeft" });
    expect(push).not.toHaveBeenCalled();
  });

  it("does nothing while typing in a field or with a modifier held", () => {
    document.body.innerHTML = "<input id='f'>";
    render(<ArrowKeys previous="/p" next="/n" />);
    key({}, document.getElementById("f")!);
    key({ altKey: true });
    expect(push).not.toHaveBeenCalled();
  });

  it("stops listening when it is removed", () => {
    const { unmount } = render(<ArrowKeys previous="/p" next="/n" />);
    unmount();
    key({});
    expect(push).not.toHaveBeenCalled();
  });

  it("follows new links after the page changes", () => {
    const { rerender } = render(<ArrowKeys previous="/p1" next="/n1" />);
    rerender(<ArrowKeys previous="/p2" next="/n2" />);
    key({});
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/n2");
  });

  it("does not take the arrow away from a focused radio, as in the Bible switch", async () => {
    document.body.innerHTML = "";
    const { container } = render(
      <>
        <ArrowKeys previous="/p" next="/n" />
        <input type="radio" name="r" aria-label="one" />
      </>,
    );
    const radio = container.querySelector("input")!;
    radio.focus();
    await userEvent.setup().keyboard("{ArrowRight}");
    expect(push).not.toHaveBeenCalled();
  });
});
