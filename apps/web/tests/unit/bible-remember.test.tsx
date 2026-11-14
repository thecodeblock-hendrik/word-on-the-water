// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { RememberPassage } from "@/components/bible/remember-passage";
import { RememberVersion } from "@/components/bible/remember-version";
import {
  FIRST_PASSAGE,
  parsePassage,
  parseVersion,
  PASSAGE_COOKIE,
  passageCookie,
  passageValue,
  VERSION_COOKIE,
  versionCookie,
} from "@/lib/bible/remember";

beforeEach(() => {
  document.cookie = `${VERSION_COOKIE}=; Max-Age=0; Path=/`;
  document.cookie = `${PASSAGE_COOKIE}=; Max-Age=0; Path=/`;
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

describe("parsePassage", () => {
  it("reads a verse range, one verse or a whole chapter", () => {
    expect(parsePassage("romans.8.28-30")).toEqual({
      book: "romans",
      chapter: 8,
      from: 28,
      to: 30,
    });
    expect(parsePassage("john.3.16")).toEqual({ book: "john", chapter: 3, from: 16, to: 16 });
    expect(parsePassage("john.3")).toEqual({ book: "john", chapter: 3, from: null, to: null });
    expect(parsePassage("1-john.2.1-2")).toEqual({ book: "1-john", chapter: 2, from: 1, to: 2 });
  });

  it("starts at John 3:16 when there is nothing to resume", () => {
    expect(FIRST_PASSAGE).toEqual({ book: "john", chapter: 3, from: 16, to: 16 });
    expect(parsePassage(undefined)).toEqual(FIRST_PASSAGE);
  });

  it.each([
    "",
    "john",
    "nope.1",
    "john.99",
    "john.0",
    "john.03",
    "john.3.0",
    "john.3.18-16",
    "john.3.16-",
    "john.3.16-18-20",
    "john.3.1000",
    "JOHN.3",
    "john.3;path=/",
    "../../web.1",
    "john.3 ",
  ])("falls back to John 3:16 for the forged or broken value %j", (value) => {
    expect(parsePassage(value)).toEqual(FIRST_PASSAGE);
  });
});

describe("passageValue and passageCookie", () => {
  it("writes what parsePassage reads", () => {
    for (const value of ["romans.8.28-30", "john.3.16", "john.3", "1-john.2.1-2"]) {
      expect(passageValue(parsePassage(value))).toBe(value);
    }
  });

  it("lasts a year, is first-party Lax, and is Secure only when asked", () => {
    const passage = { book: "john", chapter: 3, from: 16, to: 16 };
    expect(passageCookie(passage, false)).toBe(
      "bible-passage=john.3.16; Path=/; Max-Age=31536000; SameSite=Lax",
    );
    expect(passageCookie(passage, true)).toMatch(/; Secure$/);
  });
});

describe("RememberPassage", () => {
  it("writes the passage being read and renders nothing", () => {
    const { container } = render(<RememberPassage book="romans" chapter={8} from={28} to={30} />);
    expect(document.cookie).toContain("bible-passage=romans.8.28-30");
    expect(container).toBeEmptyDOMElement();
  });

  it("remembers a whole chapter when no verses are chosen, and replaces an earlier passage", () => {
    render(<RememberPassage book="romans" chapter={8} from={28} to={30} />);
    cleanup();
    render(<RememberPassage book="mark" chapter={1} from={null} to={null} />);
    expect(document.cookie).toContain("bible-passage=mark.1");
    expect(document.cookie).not.toContain("romans");
  });

  it("does not write a cookie for a passage that does not exist", () => {
    render(<RememberPassage book="nope" chapter={1} from={null} to={null} />);
    render(<RememberPassage book="john" chapter={99} from={null} to={null} />);
    expect(document.cookie).not.toContain("bible-passage");
  });
});
