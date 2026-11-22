const stroke = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

/** A surfer on the swell. */
export const DevotionalIcon = ({ className }: { className?: string }) => (
  <svg {...stroke} className={className}>
    <circle cx="12" cy="9" r="3.5" />
    <path d="M2 17c3 0 3-2 5.5-2S10.5 17 12 17s3-2 5.5-2 2.5 2 4.5 2M2 21c3 0 3-2 5.5-2s3 2 5.5 2 3-2 5.5-2" />
  </svg>
);

/** An open book. */
export const BibleIcon = ({ className }: { className?: string }) => (
  <svg {...stroke} className={className}>
    <path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5v13" />
  </svg>
);

/** A speech bubble. */
export const ChatIcon = ({ className }: { className?: string }) => (
  <svg {...stroke} className={className}>
    <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
  </svg>
);

/** A surfboard standing in the sand. */
export const ShoreIcon = ({ className }: { className?: string }) => (
  <svg {...stroke} className={className}>
    <path d="M12 2c3 3 3.5 9 0 15-3.5-6-3-12 0-15zM12 6v11M3 21h18M7 21l2-2M17 21l-2-2" />
  </svg>
);
