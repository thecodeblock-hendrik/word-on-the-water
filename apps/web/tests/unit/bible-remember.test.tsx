// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { RememberVersion } from "@/components/bible/remember-version";
import { parseVersion, VERSION_COOKIE, versionCookie } from "@/lib/bible/remember";

beforeEach(() => {
  document.cookie = `${VERSION_COOKIE}=; Max-Age=0; Path=/`;
});
afterEach(cleanup);

describe("parseVersion", () => {
  it("accepts the versions that are turned on", () => {
    expect(parseVersion("bsb")).toBe("bsb");
    expect(parseVersion("web")).toBe("web");
  });

  it("falls back to the BSB for anything else: missing, unknown, the disabled ESV, odd input", () => {
    for (const value of [
      undefined,
      "",
      "kjv",
      "esv",
      "BSB",
      "../web",
      "web;path=/",
      "bsb ",
      "%00",
    ]) {
      expect(parseVersion(value), String(value)).toBe("bsb");
    }
  });
});

describe("versionCookie", () => {
  it("lasts a year, is first-party Lax, and is Secure only when asked", () => {
    expect(versionCookie("web", false)).toBe(
      "bible-version=web; Path=/; Max-Age=31536000; SameSite=Lax",
    );
    expect(versionCookie("web", true)).toBe(
      "bible-version=web; Path=/; Max-Age=31536000; SameSite=Lax; Secure",
    );
  });
});

describe("RememberVersion", () => {
  it("writes the cookie for the version being read and renders nothing", () => {
    const { container } = render(<RememberVersion id="web" />);
    expect(document.cookie).toContain("bible-version=web");
    expect(container).toBeEmptyDOMElement();
  });

  it("replaces an earlier choice", () => {
    render(<RememberVersion id="web" />);
    cleanup();
    render(<RememberVersion id="bsb" />);
    expect(document.cookie).toContain("bible-version=bsb");
    expect(document.cookie).not.toContain("bible-version=web");
  });

  it("does not write a cookie for a version that is not available", () => {
    render(<RememberVersion id="esv" />);
    expect(document.cookie).not.toContain("bible-version");
  });
});
