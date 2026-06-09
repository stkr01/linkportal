import type { Theme, ThemeKey } from '../types';

// Standardpaletten (matchar :root i styles.css). Ändras inte – endast utgångsläge.
export const DEFAULT_THEME: Record<ThemeKey, string> = {
  primary: '#00833e',
  primaryDark: '#006330',
  accent: '#8bc63f',
  bg: '#f4f6f5',
  surface: '#ffffff',
  text: '#1f2421',
};

// Maps a theme key -> CSS variable in styles.css.
const CSS_VAR: Record<ThemeKey, string> = {
  primary: '--rs-primary',
  primaryDark: '--rs-primary-dark',
  accent: '--rs-accent',
  bg: '--bg',
  surface: '--surface',
  text: '--text',
};

export const THEME_KEYS = Object.keys(DEFAULT_THEME) as ThemeKey[];

// Slå ihop standard + användarens överstyrningar.
export function resolveTheme(theme?: Theme | null): Record<ThemeKey, string> {
  return { ...DEFAULT_THEME, ...(theme ?? {}) };
}

// Applicera ett tema genom att sätta CSS-variabler på <html>.
export function applyTheme(theme?: Theme | null): void {
  const resolved = resolveTheme(theme);
  const root = document.documentElement;
  for (const key of THEME_KEYS) {
    root.style.setProperty(CSS_VAR[key], resolved[key]);
  }
}

// Återställ till standard (ta bort inline-överstyrningar).
export function clearTheme(): void {
  const root = document.documentElement;
  for (const key of THEME_KEYS) {
    root.style.removeProperty(CSS_VAR[key]);
  }
}
