import { CONTACT_EMAIL } from "../lib/site.ts";

/** The day the policy was last changed. Change it whenever the text below changes. */
export const PRIVACY_UPDATED = "2026-11-28";

export type PolicyItem = { term: string; text: string };
export type PolicySection = {
  id: string;
  heading: string;
  paragraphs?: string[];
  items?: PolicyItem[];
  closing?: string[];
};
export type PrivacyPolicy = {
  title: string;
  description: string;
  intro: string[];
  sections: PolicySection[];
};

// Who is responsible (the registered name), and where to write. The same PO Box that Kit prints in every email footer. A
// [bracketed] value would show highlighted on the page, and the launch check would fail on it.
const RESPONSIBLE = "Word On The Water";
const POSTAL = "PO Box 6055, Port Elizabeth, Eastern Cape 6001";

/**
 * The public privacy policy, written from docs/privacy.md (keep the two in step). It says only what
 * is true today: the weekly email sign-up, and email you send us. The Bible cookies are listed only
 * while the Bible reader is switched on, and the Ask the Word chat and the videos are described only
 * while they are. The videos wording carries what YouTube's developer policies (III.A) ask for.
 */
export function privacyPolicy({
  bibleEnabled,
  chatEnabled = false,
  videosEnabled = false,
}: {
  bibleEnabled: boolean;
  chatEnabled?: boolean;
  videosEnabled?: boolean;
}): PrivacyPolicy {
  return {
    title: "Privacy policy",
    description:
      "What we collect when you read Word on the Water or sign up for the weekly devotional, why, how long we keep it, and your rights.",
    intro: [
      "Word on the Water is a small online ministry. We collect as little about you as we can, we say plainly what we keep and for how long, and we never sell your details or use them for advertising.",
    ],
    sections: [
      {
        id: "who-we-are",
        heading: "Who we are",
        paragraphs: [
          `This site is run by ${RESPONSIBLE}, the registered name of the ministry. We decide how your details are used. You can write to us at ${CONTACT_EMAIL}.`,
        ],
      },
      {
        id: "what-we-collect",
        heading: "What we collect and why",
        items: [
          {
            term: "The weekly email",
            text: "Your email address, and your first name if you give it. We use them only to send you the weekly devotional. You confirm your address by email before anything is sent, and we keep a note of when and where you signed up and which wording you agreed to, so that we can show you gave your consent. You can withdraw it at any time.",
          },
          {
            term: "Checking you are a person",
            text: "When you reach or use the sign-up form, Cloudflare Turnstile checks that you are not a bot. Cloudflare sees your IP address and some signals from your browser to decide. This runs only on the sign-up form, not on every page.",
          },
          {
            term: "Stopping abuse",
            text: "To stop spam we keep a scrambled (hashed) version of your IP address, and of an email address you submit, for a few minutes to an hour. We cannot turn it back into your address.",
          },
          {
            term: "Running the site",
            text: "Our hosting records each request (the page, the result, the time and a request number) for a short time so that we can fix faults. We never record what you type into a form or your email address.",
          },
          {
            term: "Counting visits",
            text: "We use Vercel Web Analytics and Speed Insights to see which pages are read and how fast they load. They use no cookies and build no profile of you.",
          },
          {
            term: "Fixing errors",
            text: "If the site breaks, an error report is sent to Sentry. Personal details are removed before it is sent.",
          },
          ...(chatEnabled
            ? [
                {
                  term: "Ask the Word chat",
                  text: "The questions you type are matched against our own written answers on our server. They are not stored, not sent to anyone else and not written to our logs; we keep only a count of how many questions were answered. We refuse messages that look like personal details, so please do not share any. Your conversation is kept only in your browser tab, and it is gone when you close the tab or press Clear chat.",
                },
              ]
            : []),
          ...(videosEnabled
            ? [
                {
                  term: "Watching videos",
                  text: "Our video pages show our own covers, so opening them sends nothing to YouTube or Google. A banner on the video pages asks whether you accept YouTube, and unless you accept, we load nothing from YouTube. You can change your choice with Cookie settings at the foot of the video pages. When you have accepted and you press play, the video loads in YouTube's player from youtube-nocookie.com, YouTube's privacy-enhanced address. YouTube is a Google service, and this part of the site uses YouTube API Services. Google then receives data such as your IP address and details of your browser and device, and may set cookies or store similar data on your device. What the player shows, which may include other videos or advertising, is chosen by YouTube. We add no tracking of our own to the videos. By playing a video you agree to be bound by the YouTube Terms of Service (https://www.youtube.com/t/terms). Google handles your data under the Google Privacy Policy (https://www.google.com/policies/privacy). If you would rather not, choose Decline: the pages and the links to BibleProject still work.",
                },
              ]
            : []),
          {
            term: "Emails you send us",
            text: `If you email ${CONTACT_EMAIL}, it is ordinary email: it passes through our email host (Squarespace) to our own Gmail mailbox (Google). We keep it only as long as we need to answer you. Please do not send anything you would not want to put in an email.`,
          },
        ],
      },
      {
        id: "cookies",
        heading: "Cookies",
        paragraphs: [
          videosEnabled
            ? "We set no advertising or tracking cookies of our own. If you accept YouTube and press play on a video, YouTube may set cookies or store data on your device (see Watching videos). The cookies we set ourselves are small first-party ones that remember a choice you made:"
            : "We use no advertising or tracking cookies. The only cookies are small first-party ones that remember a choice you made:",
        ],
        items: [
          {
            term: "theme",
            text: "Whether you chose the light or the dark look. It lasts a year.",
          },
          ...(bibleEnabled
            ? [
                {
                  term: "bible-version and bible-passage",
                  text: "The Bible you read last and the passage you were reading, so that the Bible reader opens where you left off. Each lasts a year. They hold no personal details.",
                },
              ]
            : []),
          ...(videosEnabled
            ? [
                {
                  term: "youtube-consent",
                  text: "Whether you accepted or declined YouTube on the video pages. It holds only yes or no, and lasts six months.",
                },
              ]
            : []),
        ],
      },
      {
        id: "how-long",
        heading: "How long we keep it",
        items: [
          {
            term: "Sign-ups you have not confirmed",
            text: "Deleted from our database after 7 days. Kit, our email service, keeps its own copy until we delete it by hand, which we do each month. It never emails an unconfirmed address.",
          },
          {
            term: "Subscribers",
            text: "Until you unsubscribe. After that we keep only a minimal record that you unsubscribed, so that we do not email you again.",
          },
          {
            term: "Emails you send us",
            text: "Only as long as we need to answer you.",
          },
          {
            term: "Hosting logs",
            text: "A short time, set by our host, Vercel.",
          },
          {
            term: "Backups",
            text: "Our database is backed up every night. Each backup is encrypted and deleted after 30 days, so anything you ask us to delete is gone from the backups within 30 days.",
          },
          {
            term: "Abuse-prevention keys",
            text: "Minutes to an hour, then they expire.",
          },
        ],
      },
      {
        id: "who-else",
        heading: "Who else handles your details",
        paragraphs: [
          videosEnabled
            ? "We use these services to run the site. They handle your details only for us, except YouTube, as noted below:"
            : "We use these services to run the site. They handle your details only for us:",
        ],
        items: [
          { term: "Kit", text: "Sends the weekly email and holds the subscriber list." },
          { term: "Vercel", text: "Hosts the site, and records visits and speed." },
          { term: "Neon", text: "Holds our database, in Frankfurt, Germany." },
          {
            term: "Upstash",
            text: "Holds the short-lived abuse-prevention keys, in Frankfurt, Germany.",
          },
          {
            term: "Cloudflare",
            text: "Runs the sign-up check, and stores our encrypted nightly backups, which it cannot read.",
          },
          {
            term: "Sentry",
            text: "Receives error reports with personal details removed, and stores them in the EU.",
          },
          { term: "Squarespace", text: "Our domain name, and the forwarding of email sent to us." },
          { term: "Google", text: "Runs the Gmail mailbox that the email you send us is forwarded to." },
          ...(videosEnabled
            ? [
                {
                  term: "YouTube (Google)",
                  text: "Plays our videos, only if you accept it and press play. Google uses the data it receives under its own privacy policy, not only for us.",
                },
              ]
            : []),
        ],
        closing: [
          "Some of these services are based outside the EU and South Africa, mainly in the United States, and each is bound by its own data-protection terms. We do not sell your details and we do not share them with anyone else.",
        ],
      },
      {
        id: "your-rights",
        heading: "Your rights",
        paragraphs: [
          "We aim to follow South Africa's Protection of Personal Information Act (POPIA) and the EU's General Data Protection Regulation (GDPR). You can:",
        ],
        items: [
          {
            term: "Unsubscribe",
            text: "Use the unsubscribe link in any email, or write to us.",
          },
          {
            term: "Ask what we hold",
            text: `Email ${CONTACT_EMAIL} and we will send you a copy within 30 days.`,
          },
          {
            term: "Correct or delete it",
            text: `Email ${CONTACT_EMAIL} and we will do it within 30 days, in our database and in Kit.`,
          },
          {
            term: "Complain",
            text: "If you are in South Africa, to the Information Regulator. If you are in the EU, to the data-protection authority of your country.",
          },
        ],
      },
      {
        id: "children",
        heading: "Children",
        paragraphs: [
          "Word on the Water is not aimed at children, and we do not knowingly collect their details.",
        ],
      },
      {
        id: "changes",
        heading: "Changes to this policy",
        paragraphs: [
          "If we change how we use your details, we update this page and the date at the top.",
        ],
      },
      {
        id: "contact",
        heading: "Contact",
        paragraphs: [`Questions about your details: ${CONTACT_EMAIL}. By post: ${POSTAL}.`],
      },
    ],
  };
}
