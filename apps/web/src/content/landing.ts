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
    "Word on the Water is for men who surf, and for men who just feel the swell of life. Each week brings a short devotional that opens the Bible and points you to the One the wind and waves obey, Jesus.",
  ],
  closing: {
    before: "You don't need to have it all figured out, so ",
    link: { label: "paddle out with us", href: "/#subscribe" } satisfies Link,
    after: ", one passage at a time.",
  },
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
      status: "Rolling in consistently",
      title: "Weekly devotional",
      body: "A five-minute read each Saturday. One passage, one thought, one question to take into the week.",
    },
    {
      status: "In planning",
      title: "Bible teaching series",
      body: "Walk through a book of the Bible over several weeks.",
    },
    {
      status: "Later",
      title: "Audio and video",
      body: "Short readings recorded at the beach for the drive to the coast.",
    },
  ],
};

export const start = {
  eyebrow: "New to faith?",
  heading: "Start here",
  intro: "The whole Bible points to one story. Here it is in four parts.",
  steps: [
    {
      title: "God made it all",
      body: "The ocean, the swell, and you. He made us to know Him.",
      reference: { book: "Genesis", chapter: 1, verses: "1" } satisfies Scripture,
    },
    {
      title: "We went our own way",
      body: "Every one of us has turned from God. That breaks our relationship with Him.",
      reference: { book: "Romans", chapter: 3, verses: "23" } satisfies Scripture,
    },
    {
      title: "Jesus came for us",
      body: "The One who calmed the sea died for our sin and rose again.",
      reference: { book: "1 Corinthians", chapter: 15, verses: "3–4" } satisfies Scripture,
    },
    {
      title: "Trust Him",
      body: "Turn to Jesus and trust Him. Forgiveness is a gift, not something we earn.",
      reference: { book: "Ephesians", chapter: 2, verses: "8–9" } satisfies Scripture,
    },
  ],
  talk: { label: "Talk to someone", href: "/#contact" } satisfies Link,
  readOn: "or read the Gospel of Mark, the shortest account of Jesus' life.",
};

export const beliefs = {
  eyebrow: "What we believe",
  heading: "Simple, historic faith",
  points: [
    "The Bible is God's Word, true and trustworthy.",
    "There is one God: Father, Son and Holy Spirit.",
    "Jesus Christ is fully God and fully man. He died for our sins and rose bodily from the dead.",
    "We are saved by grace through faith in Christ alone.",
  ],
};

export const founder = {
  eyebrow: "Who's behind this",
  heading: "Meet the writer",
  name: 'Henno (AKA "H")',
  bio: "For most of my life I was caught in addiction. The ocean was my other escape, and surfing was the one place I felt free. But nothing I chased could fill the emptiness. In 2023 I found Jesus, and He gave me what the waves and the substance abuse could never give: real freedom. I created Word on the Water to share the good news of Jesus with anyone who feels empty: He loves you and He is enough.",
  church: "Member of Harvest Christian Church.",
  photo: { src: "/henno-surfing.jpg", alt: "Henno riding a wave on his surfboard" } as
    | { src: string; alt: string }
    | undefined,
};

export const footer = {
  groups: [
    {
      title: "Read",
      links: [
        { label: "Devotionals", href: "/#coming" },
        { label: "Teaching", href: "/#coming" },
        { label: "Start here", href: "/#start" },
      ],
    },
    {
      title: "About",
      links: [
        { label: "Our story", href: "/#about" },
        { label: "Statement of faith", href: "/#believe" },
        { label: "Prayer", href: "/#contact" },
      ],
    },
  ],
  /** A social link shows in the footer only once it has an href. */
  social: [
    { label: "Instagram", handle: "[@handle]", href: undefined as string | undefined },
    { label: "YouTube", handle: "[@channel]", href: undefined as string | undefined },
  ],
  email: { label: "Email", href: "/#subscribe" } satisfies Link,
};

/** Everything the landing page says. The placeholder check scans this. */
export const landing = { hero, about, coming, start, beliefs, founder, footer };
