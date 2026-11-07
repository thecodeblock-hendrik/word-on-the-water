import { About } from "@/components/sections/about";
import { BeliefsFounder } from "@/components/sections/beliefs-founder";
import { Coming } from "@/components/sections/coming";
import { Hero } from "@/components/sections/hero";
import { Start } from "@/components/sections/start";
import { today } from "@/lib/devotionals/format";
import { featured, loadContent } from "@/lib/devotionals/load";

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
    </>
  );
}
