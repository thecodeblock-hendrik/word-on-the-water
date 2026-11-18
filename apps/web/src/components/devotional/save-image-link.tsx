"use client";

import { type MouseEvent, useEffect, useRef } from "react";

import { buttonClasses } from "@/components/ui/button";

async function loadFile(href: string, fileName: string): Promise<File> {
  const response = await fetch(href);
  if (!response.ok) throw new Error(`verse card ${response.status}`);
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type });
}

/** True in an app added to the iPhone home screen (Safari sets `navigator.standalone` only there). */
function installedOnIPhone() {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * A download link for a verse card. In an app added to the iPhone home screen a download replaces
 * the page with Safari's file view, which has no way back, so there the card opens the share sheet
 * instead (Save Image puts it in Photos). The file is fetched when the link nears the screen, so the
 * share sheet opens straight from the tap; a hidden card (the other colour scheme) is never fetched.
 */
export function SaveImageLink({ href, fileName }: { href: string; fileName: string }) {
  const link = useRef<HTMLAnchorElement>(null);
  const file = useRef<Promise<File> | null>(null);

  useEffect(() => {
    if (!installedOnIPhone() || !link.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        file.current = loadFile(href, fileName);
        observer.disconnect();
      },
      { rootMargin: "400px" },
    );
    observer.observe(link.current);
    return () => observer.disconnect();
  }, [href, fileName]);

  async function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!installedOnIPhone()) return;
    event.preventDefault();
    file.current ??= loadFile(href, fileName);
    try {
      await navigator.share({ files: [await file.current] });
    } catch {
      // Closed without saving, or the sheet was refused: the page simply stays as it is.
    }
  }

  return (
    <a ref={link} href={href} download onClick={onClick} className={buttonClasses("outline")}>
      Save image
    </a>
  );
}
