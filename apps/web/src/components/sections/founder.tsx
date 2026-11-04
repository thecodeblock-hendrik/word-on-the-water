import Image from "next/image";

import { Logo } from "@/components/logo";
import { PlaceholderText } from "@/components/placeholder-text";
import { founder } from "@/content/landing";

type Photo = { src: string; alt: string };

/** Who writes this. Shows the logo mark in the photo frame until a real photo exists. */
export function Founder({ photo = founder.photo }: { photo?: Photo }) {
  return (
    <div id="founder" className="grid content-start gap-3">
      <p className="font-display text-sm font-semibold uppercase tracking-[.18em] text-accent-ink">
        {founder.eyebrow}
      </p>
      <h2 className="font-display text-[clamp(2rem,4.5vw,2.75rem)] font-semibold uppercase leading-[1.05] tracking-[.04em] text-balance">
        {founder.heading}
      </h2>
      <div className="mt-3 grid items-start gap-5 min-[420px]:grid-cols-[120px_minmax(0,1fr)]">
        <div
          data-testid="founder-photo"
          className="relative grid aspect-[4/5] w-[120px] place-items-center overflow-hidden rounded-sm border border-line bg-surface"
        >
          {photo ? (
            <Image src={photo.src} alt={photo.alt} fill sizes="120px" className="object-cover" />
          ) : (
            <Logo className="w-3/4" />
          )}
        </div>
        <div className="grid gap-3">
          <span className="font-display text-xl font-semibold uppercase tracking-[.1em]">
            <PlaceholderText>{founder.name}</PlaceholderText>
          </span>
          <p>
            <PlaceholderText>{founder.bio}</PlaceholderText>
          </p>
          <p>
            <PlaceholderText>{founder.church}</PlaceholderText>
          </p>
        </div>
      </div>
    </div>
  );
}
