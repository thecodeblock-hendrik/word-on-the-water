// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CspNonce } from "@/components/csp-nonce";

const setNonce = vi.hoisted(() => vi.fn());
vi.mock("get-nonce", () => ({ setNonce }));

beforeEach(() => setNonce.mockClear());
afterEach(() => {
  cleanup();
  document.head.innerHTML = "";
});

function addScript(nonce?: string) {
  const script = document.createElement("script");
  if (nonce) script.nonce = nonce;
  document.head.append(script);
}

describe("CspNonce", () => {
  it("gives the page's script nonce to the library that injects scroll-lock styles", () => {
    addScript("abc123");
    render(<CspNonce />);
    expect(setNonce).toHaveBeenCalledWith("abc123");
  });

  it("does nothing when the page has no nonce, such as in local tests", () => {
    addScript();
    render(<CspNonce />);
    expect(setNonce).not.toHaveBeenCalled();
  });

  it("renders nothing", () => {
    addScript("abc123");
    const { container } = render(<CspNonce />);
    expect(container).toBeEmptyDOMElement();
  });
});
