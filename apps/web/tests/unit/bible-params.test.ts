import { describe, expect, it } from "vitest";

import { parseChapter, versesParam } from "@/lib/bible/params";

describe("parseChapter", () => {
  it("reads a plain chapter number", () => {
    expect(parseChapter("1")).toBe(1);
    expect(parseChapter("119")).toBe(119);
  });

  it("rejects anything that is not the canonical form of a chapter number", () => {
    for (const bad of ["", "0", "03", "1.5", "-1", "+1", "abc", "1e1", " 1", "1 ", "1000", "٣"]) {
      expect(parseChapter(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});

describe("versesParam", () => {
  it("passes a single value through and treats missing or blank as no verses", () => {
    expect(versesParam("16-18")).toBe("16-18");
    expect(versesParam(undefined)).toBeUndefined();
    expect(versesParam("")).toBeUndefined();
  });

  it("makes a repeated parameter something the verse parser rejects", () => {
    expect(versesParam(["1", "2"])).toBe("1,2");
  });
});
