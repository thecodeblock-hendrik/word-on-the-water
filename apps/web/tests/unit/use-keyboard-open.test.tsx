// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useKeyboardOpen } from "@/components/chat/use-keyboard-open";

let viewport: EventTarget & { height: number };

beforeEach(() => {
  viewport = Object.assign(new EventTarget(), { height: 760 });
  Object.defineProperty(window, "visualViewport", { value: viewport, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 760, configurable: true });
});
afterEach(cleanup);

function resizeTo(height: number) {
  act(() => {
    viewport.height = height;
    viewport.dispatchEvent(new Event("resize"));
  });
}

describe("useKeyboardOpen", () => {
  it("is false at full height", () => {
    expect(renderHook(() => useKeyboardOpen()).result.current).toBe(false);
  });

  it("is true when the visual viewport loses a keyboard's worth of height, and false again", () => {
    const { result } = renderHook(() => useKeyboardOpen());
    resizeTo(480);
    expect(result.current).toBe(true);
    resizeTo(760);
    expect(result.current).toBe(false);
  });

  it("ignores a small change such as the browser bar collapsing", () => {
    const { result } = renderHook(() => useKeyboardOpen());
    resizeTo(700);
    expect(result.current).toBe(false);
  });

  it("is false where the browser has no visual viewport", () => {
    Object.defineProperty(window, "visualViewport", { value: undefined, configurable: true });
    expect(renderHook(() => useKeyboardOpen()).result.current).toBe(false);
  });
});
