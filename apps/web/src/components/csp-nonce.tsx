"use client";

import { setNonce } from "get-nonce";
import { useEffect } from "react";

/**
 * Modal dialogs lock page scrolling by injecting a <style> element. Under our nonce-based CSP that
 * element is blocked unless it carries the page's nonce, so tell the library what the nonce is.
 */
export function CspNonce() {
  useEffect(() => {
    const nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce;
    if (nonce) setNonce(nonce);
  }, []);
  return null;
}
