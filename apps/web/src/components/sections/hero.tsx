import { Logo } from "@/components/logo";
import { buttonClasses } from "@/components/ui/button";
import { hero } from "@/content/landing";
import { TRANSLATION, formatReference } from "@/lib/scripture";

/** Verse as the thesis, the audience in the lede, one clear next step. */
export function Hero() {
  return (
    <section
      aria-labelledby="hero-verse"
      className="relative bg-deep text-on-deep [--logo-gap:var(--deep)] [--logo-ring:var(--on-deep)] [--logo-wave:var(--accent-on-deep)]"
    >
      <h1 className="sr-only">Word on the Water</h1>
      <div className="mx-auto grid max-w-[1120px] items-center gap-7 pb-20 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-8 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:gap-12 md:pb-24 md:pt-18">
        <div>
          <p className="font-display text-sm font-semibold uppercase tracking-[.18em] text-accent-on-deep">
            {hero.eyebrow}
          </p>
          <blockquote
            id="hero-verse"
            className="mt-[18px] font-serif text-[clamp(1.9rem,4.4vw,3.2rem)] italic leading-[1.18] text-balance"
          >
            “{hero.verse.text}”
          </blockquote>
          <p className="mt-[18px] flex items-center gap-3.5 font-ui text-[13px] uppercase tracking-[.22em] text-on-deep-muted">
            <span>
              {formatReference(hero.verse.reference)} · {TRANSLATION}
            </span>
            <svg viewBox="0 0 150 16" aria-hidden="true" className="h-4 w-[150px] flex-none">
              <path
                className="fill-accent-on-deep"
                d="M0 11.4 C40 11.2 90 10.6 128 9.6 C134 9.4 137 8.6 137.5 7 C138 4.6 135.4 3.6 133.6 4.6 C135.6 1.2 141.4 1 143.6 3.8 C145.8 6.6 143.4 10.8 136 11.6 C100 12.6 50 12.6 0 12.2 Z"
              />
            </svg>
          </p>
          <p className="mt-7 max-w-[52ch] text-lg text-on-deep md:text-[1.1rem]">{hero.lede}</p>
          <div className="mt-[30px] flex flex-wrap gap-3">
            <a href={hero.ctas.primary.href} className={buttonClasses("primary-on-deep")}>
              {hero.ctas.primary.label}
            </a>
            <a href={hero.ctas.secondary.href} className={buttonClasses("ghost")}>
              {hero.ctas.secondary.label}
            </a>
          </div>
        </div>
        <div className="hidden md:block md:w-full md:max-w-[360px] md:justify-self-center">
          <Logo
            label="Word on the Water logo: a cross on the horizon inside a breaking wave"
            className="block h-auto w-full"
          />
        </div>
      </div>
      <svg
        viewBox="0 0 1440 48"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute -bottom-px left-0 block h-12 w-full"
      >
        <path
          className="fill-bg"
          d="M0 30 C180 8 360 8 540 26 C720 44 900 44 1080 24 C1260 6 1350 12 1440 22 V48 H0 Z"
        />
      </svg>
    </section>
  );
}
