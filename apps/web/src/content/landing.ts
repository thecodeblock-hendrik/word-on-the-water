import type { Scripture } from "@/lib/scripture";

type Link = { label: string; href: string };

export const hero = {
  eyebrow: "Devotionals and Bible teaching for men and surfers",
  verse: {
    text: "Who then is this, that even the wind and the sea obey him?",
    reference: { book: "Mark", chapter: 4, verses: "41" } satisfies Scripture,
  },
  lede: "Word on the Water is an online ministry for men who surf, and for anyone who has felt small out past the break. Short devotionals and plain Bible teaching that point to the One the wind and waves obey.",
  ctas: {
    primary: { label: "Get the weekly devotional", href: "/#subscribe" } satisfies Link,
    secondary: { label: "New to faith? Start here", href: "/#start" } satisfies Link,
  },
};

/** Everything the landing page says. The placeholder check scans this. */
export const landing = { hero };
