import type { Metadata } from "next";

import { About } from "@/components/sections/about";
import { BeliefsFounder } from "@/components/sections/beliefs-founder";
import { Coming } from "@/components/sections/coming";
import { SubscribeBand } from "@/components/devotional/subscribe-band";
import { Hero } from "@/components/sections/hero";
import { Start } from "@/components/sections/start";
import { today } from "@/lib/devotionals/format";
import { featured, loadContent } from "@/lib/devotionals/load";

// The home page is its own canonical address; everything else it inherits from the layout.
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  const { devotionals, series } = loadContent();
  const devotional = featured(devotionals, today())!;
  const devotionalSeries = series.find((s) => s.slug === devotional.meta.series)!;
  return (
    <>
      <Hero />
      <About />
      <hr className="border-0 border-t border-line max-lg:hidden" />
      <Coming devotional={devotional} series={devotionalSeries} />
      <Start />
      <BeliefsFounder />
      <SubscribeBand source="landing_closing" />
    </>
  );
}
