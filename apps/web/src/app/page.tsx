import { About } from "@/components/sections/about";
import { Coming } from "@/components/sections/coming";
import { Hero } from "@/components/sections/hero";

export default function Home() {
  return (
    <>
      <Hero />
      <About />
      <hr className="border-0 border-t border-line" />
      <Coming />
    </>
  );
}
