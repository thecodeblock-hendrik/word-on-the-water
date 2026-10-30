const TURNSTILE = "https://challenges.cloudflare.com";

/**
 * Nonce-based CSP (ADR 0007). A fresh nonce per request means pages render dynamically.
 * `strict-dynamic` lets nonced scripts load the scripts they need (Next chunks, Turnstile).
 */
export function buildCsp({ nonce, isDev }: { nonce: string; isDev: boolean }): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${TURNSTILE}${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    `frame-src ${TURNSTILE}`,
    "connect-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ];
  if (!isDev) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}
