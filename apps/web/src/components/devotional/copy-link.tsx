"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

/** The share row: a prompt and a button that copies the page address. */
export function CopyLink({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5 font-ui text-sm text-muted">
      <span>{prompt}</span>
      <Button variant="outline" onClick={copy}>
        Copy link
      </Button>
      <span role="status">{copied ? "Link copied" : ""}</span>
    </div>
  );
}
