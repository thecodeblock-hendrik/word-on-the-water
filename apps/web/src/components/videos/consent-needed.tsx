import { useEffect, useRef } from "react";

/**
 * Shown in the cover's place when Play is pressed and YouTube has not been accepted. It is taller
 * than the cover, so it scrolls itself clear of the floating bottom bar (the scroll margin below
 * lg): focusing a button does not scroll one that is on the screen but under the bar.
 */
export function ConsentNeeded({
  onAllow,
  onNotNow,
}: {
  onAllow: () => void;
  onNotNow: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const allow = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    allow.current!.focus({ preventScroll: true });
    panel.current!.scrollIntoView({ block: "nearest" });
  }, []);

  return (
    <div
      ref={panel}
      role="group"
      aria-label="YouTube is turned off"
      className="flex min-h-[200px] scroll-mb-[calc(5.5rem+max(.875rem,env(safe-area-inset-bottom)))] flex-col justify-center gap-2 rounded-xl bg-deep p-3.5 text-center font-ui text-on-deep lg:scroll-mb-0"
    >
      <p className="font-semibold">YouTube is turned off</p>
      <p className="text-[13px] text-on-deep-muted">
        To play this video here, allow YouTube. It may set cookies and receives data such as your IP
        address.
      </p>
      <button
        type="button"
        ref={allow}
        onClick={onAllow}
        className="min-h-11 cursor-pointer rounded-md bg-on-deep px-3 font-semibold text-deep"
      >
        Allow and play
      </button>
      <button
        type="button"
        onClick={onNotNow}
        className="min-h-11 cursor-pointer text-sm underline"
      >
        Not now
      </button>
    </div>
  );
}
