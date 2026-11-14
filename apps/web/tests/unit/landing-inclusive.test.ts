import { describe, expect, it } from "vitest";

import * as landing from "@/content/landing";

const copy = JSON.stringify(landing);

describe("the landing copy is for surfers of every kind, and for anyone", () => {
  it("opens with surfers, then anyone who feels the swell of life", () => {
    expect(landing.hero.eyebrow).toBe("Devotionals and Bible teaching for surfers");
    expect(landing.hero.lede).toMatch(
      /^Word on the Water is an online ministry for surfers, and for anyone who has felt small out past the break\./,
    );
    expect(landing.about.paragraphs[1]).toMatch(
      /^Word on the Water is for surfers, and for anyone who just feels the swell of life\./,
    );
  });

  it("has no row in the who-it-is-for list for one sex", () => {
    expect(landing.about.who.map((w) => w.term)).toEqual(["Surfers", "Everyone", "The curious"]);
    expect(landing.about.who[1].description).toMatch(/husbands, wives, parents and friends/i);
  });

  it("never singles out men: the plural 'men' and 'for men' stay out of the copy", () => {
    // "fully man" in the statement of faith is about Jesus, and is not matched.
    expect(copy).not.toMatch(/\bmen\b|for men|men who|husbands, fathers/i);
  });
});
