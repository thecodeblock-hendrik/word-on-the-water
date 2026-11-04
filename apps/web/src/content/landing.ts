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

export const coming = {
  eyebrow: "What's coming",
  heading: "Read it before the paddle out",
  intro:
    "Content is on the way. Sign up and the first devotional lands in your inbox on launch day.",
  offers: [
    {
      status: "Launching [month 2027]",
      title: "Weekly devotional",
      body: "A five-minute read each [Monday]. One passage, one thought, one question to take into the week.",
    },
    {
      status: "In planning",
      title: "Bible teaching series",
      body: "Walk through a book of the Bible over several weeks. A good first series could be [Mark: the One the sea obeys].",
    },
    {
      status: "Later",
      title: "Audio and video",
      body: "Short readings recorded at the beach for the drive to the coast. [Podcast or YouTube, decide later]",
    },
  ],
  sample: {
    eyebrow: "Sample devotional",
    title: "He brought them to their desired haven",
    meta: "[Date] · by [Author]",
    passage: { book: "Psalm", chapter: 107, verses: "23–30" } satisfies Scripture,
    report: [
      { term: "Read time", value: "5 min" },
      { term: "Series", value: "Storm Sayings" },
      { term: "Take out with you", value: "1 question" },
    ],
    paragraphs: [
      "[Opening paragraph. A short story from the water, then the turn to the passage. About 150 words.]",
      "[Reflection. What the passage says about God, and what it asks of us this week.]",
    ],
  },
};

/** Everything the landing page says. The placeholder check scans this. */
export const landing = { hero, about, coming };
