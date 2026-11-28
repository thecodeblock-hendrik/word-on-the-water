import { PLAYER_ORIGIN } from "./videos/links";

const TURNSTILE = "https://challenges.cloudflare.com";

/**
 * Nonce-based CSP (ADR 0007). A fresh nonce per request means pages render dynamically.
 * `strict-dynamic` lets nonced scripts load the scripts they need (Next chunks, Turnstile).
 */
export function buildCsp({
  nonce,
  isDev,
  upgradeInsecure,
  videos = false,
}: {
  nonce: string;
  isDev: boolean;
  /** Only for https requests: WebKit rewrites http://localhost assets to https and they fail. */
  upgradeInsecure: boolean;
  /** Lets the video player be framed (ADR 0013). */
  videos?: boolean;
}): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${TURNSTILE}${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    `frame-src ${TURNSTILE}${videos ? ` ${PLAYER_ORIGIN}` : ""}`,
    "connect-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ];
  if (!isDev && upgradeInsecure) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}
