/** "2026-12-05" as "5 December 2026". */
export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** "2026-12-05" as "Saturday 5 December 2026" (no comma, as in the design). */
export function formatDateLong(iso: string): string {
  const weekday = utc(iso).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  return `${weekday} ${formatDate(iso)}`;
}

/** "2026-12-05" as "5 December". */
export function formatDayMonth(iso: string): string {
  return utc(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
}

/** "2026-12-08" as "8 Dec". */
export function formatDateShort(iso: string): string {
  return utc(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Today as YYYY-MM-DD (UTC). */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
