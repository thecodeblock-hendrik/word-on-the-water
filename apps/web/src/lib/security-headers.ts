/** Static security headers sent on every response. The CSP is handled separately. */
export const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: ["camera", "microphone", "geolocation", "payment", "usb", "interest-cohort"]
      .map((feature) => `${feature}=()`)
      .join(", "),
  },
];
