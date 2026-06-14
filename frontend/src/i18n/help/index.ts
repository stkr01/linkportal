import type { Lang } from '../index';
import type { HelpContent } from './types';
import { helpEn } from './en';
import { helpSv } from './sv';

export type { HelpContent, HelpSection } from './types';

// Languages that have a native help translation. Other languages fall back to
// English. To add a language: create ./<code>.ts and register it here.
const HELP: Partial<Record<Lang, HelpContent>> = {
  en: helpEn,
  sv: helpSv,
};

/** True when the given language has its own help translation (not a fallback). */
export function hasHelpTranslation(lang: Lang): boolean {
  return lang in HELP;
}

/** Help content for the language, falling back to English when not translated. */
export function getHelpContent(lang: Lang): HelpContent {
  return HELP[lang] ?? helpEn;
}
