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

export const about = {
  eyebrow: "Why we're here",
  heading: "Faith that holds when the sets roll in",
  paragraphs: [
    "Surfers know the ocean is not tame. Jesus' friends learned that too, on a small boat in a big storm, and then they watched Him speak and the sea went still.",
    "[Two or three sentences on why you started this. What gap you saw for men and surfers, and what you hope a reader walks away with each week.]",
  ],
  who: [
    {
      term: "Men",
      description:
        "Husbands, fathers, sons and friends who want to read the Bible honestly and live it out at home and at work.",
    },
    {
      term: "Surfers",
      description:
        "Anyone who chases swell and has sat in the lineup wondering who made all this. Every level, every board.",
    },
    {
      term: "The curious",
      description: "Not sure about Jesus yet? You are welcome here. Ask the hard questions.",
    },
  ],
};

/** Everything the landing page says. The placeholder check scans this. */
export const landing = { hero, about };
