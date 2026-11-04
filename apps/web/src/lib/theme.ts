export const THEME_COOKIE = "theme";

export type Theme = "light" | "dark";

/** Returns the theme if the value is a valid choice, otherwise undefined (follow the device). */
export function parseTheme(value: string | undefined): Theme | undefined {
  return value === "light" || value === "dark" ? value : undefined;
}
