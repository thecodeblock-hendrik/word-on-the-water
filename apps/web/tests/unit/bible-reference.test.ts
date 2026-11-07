import { describe, expect, it } from "vitest";

import { findBook } from "@/lib/bible/books";
import { passageTitle, verseLabel } from "@/lib/bible/reference";

const john = findBook("john")!;

describe("verseLabel", () => {
  it("writes one verse alone and a range with an en dash", () => {
    expect(verseLabel({ from: 16, to: 16 })).toBe("16");
    expect(verseLabel({ from: 16, to: 18 })).toBe("16–18");
  });
});

describe("passageTitle", () => {
  it("is the chapter for a whole chapter", () => {
    expect(passageTitle(john, 3, null)).toBe("John 3");
  });

  it("includes the verses for a range or a single verse", () => {
    expect(passageTitle(john, 3, { from: 16, to: 18 })).toBe("John 3:16–18");
    expect(passageTitle(john, 3, { from: 16, to: 16 })).toBe("John 3:16");
  });

  it("keeps the name of numbered books", () => {
    expect(passageTitle(findBook("1-john")!, 4, null)).toBe("1 John 4");
  });
});
