export const THEME_COOKIE = "theme";

export type Theme = "light" | "dark";

/** Returns the theme if the value is a valid choice, otherwise undefined (follow the device). */
export function parseTheme(value: string | undefined): Theme | undefined {
  return value === "light" || value === "dark" ? value : undefined;
}

/** Page background per theme, as in tokens.css. Used for the browser chrome colour. */
export const THEME_COLORS: Record<Theme, string> = { light: "#fbf3e8", dark: "#0f2233" };

/** The theme-color for the viewport: one colour if chosen, otherwise follow the device. */
export function themeColor(theme: Theme | undefined) {
  if (theme) return THEME_COLORS[theme];
  return [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
  ];
}
