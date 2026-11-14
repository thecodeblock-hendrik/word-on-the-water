import type { Metadata } from "next";

import { PlaceholderText } from "@/components/placeholder-text";
import { PRIVACY_UPDATED, privacyPolicy } from "@/content/privacy";
import { formatDate } from "@/lib/devotionals/format";
import { isBibleEnabled } from "@/lib/bible/flag";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: privacyPolicy({ bibleEnabled: false }).description,
  alternates: { canonical: "/privacy" },
};

const EMAIL = /([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/;

/** Policy text: email addresses become links, and any [placeholder] is highlighted. */
function PolicyText({ children }: { children: string }) {
  return children.split(EMAIL).map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={`mailto:${part}`} className="underline hover:text-accent-ink">
        {part}
      </a>
    ) : (
      <PlaceholderText key={i}>{part}</PlaceholderText>
    ),
  );
}

const heading =
  "flex items-center gap-3 font-display text-[1.15rem] font-semibold uppercase tracking-[.2em] text-accent-ink after:h-px after:flex-1 after:bg-line after:content-['']";

/** What we collect, why, how long we keep it and your rights, in plain language. */
export default function PrivacyPage() {
  const policy = privacyPolicy({ bibleEnabled: isBibleEnabled() });
  return (
    <article className="mx-auto max-w-[1080px] py-10 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:py-16">
      <h1 className="font-display text-[clamp(2.2rem,7vw,3.4rem)] font-semibold uppercase leading-[1.05] tracking-[.03em] text-balance">
        {policy.title}
      </h1>
      <p className="mt-3 font-ui text-sm text-muted">Last updated {formatDate(PRIVACY_UPDATED)}</p>
      <div className="mt-6 grid max-w-[62ch] gap-4">
        {policy.intro.map((text) => (
          <p key={text}>
            <PolicyText>{text}</PolicyText>
          </p>
        ))}
      </div>
      {policy.sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          aria-labelledby={`${section.id}-h`}
          className="mt-10 grid max-w-[62ch] gap-4"
        >
          <h2 id={`${section.id}-h`} className={heading}>
            {section.heading}
          </h2>
          {section.paragraphs?.map((text) => (
            <p key={text}>
              <PolicyText>{text}</PolicyText>
            </p>
          ))}
          {section.items ? (
            <dl className="m-0 grid gap-4">
              {section.items.map((item) => (
                <div key={item.term}>
                  <dt className="font-ui font-semibold">{item.term}</dt>
                  <dd className="m-0 mt-0.5 text-muted">
                    <PolicyText>{item.text}</PolicyText>
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
          {section.closing?.map((text) => (
            <p key={text}>
              <PolicyText>{text}</PolicyText>
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
