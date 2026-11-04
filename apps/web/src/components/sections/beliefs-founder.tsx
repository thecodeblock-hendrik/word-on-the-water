import { Beliefs } from "@/components/sections/beliefs";
import { Founder } from "@/components/sections/founder";

/** Statement of faith beside the writer's introduction. */
export function BeliefsFounder() {
  return (
    <section aria-label="Beliefs and founder" className="py-[72px]">
      <div className="mx-auto grid max-w-[1120px] gap-12 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] lg:grid-cols-2 lg:gap-14">
        <Beliefs />
        <Founder />
      </div>
    </section>
  );
}
