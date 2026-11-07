/** A chapter number in its plain form: "3", not "03", "3.0" or "+3". */
export function parseChapter(value: string): number | null {
  return /^[1-9]\d{0,2}$/.test(value) ? Number(value) : null;
}

/** The ?v= value as one string; a repeated parameter becomes a list, which the verse parser rejects. */
export function versesParam(value: string | string[] | undefined): string | undefined {
  return (Array.isArray(value) ? value.join(",") : value) || undefined;
}
