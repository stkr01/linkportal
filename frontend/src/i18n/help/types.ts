// Types for the in-app Help / "How it works" guide.
// The help content lives in its own module (i18n/help/) so the large prose
// strings stay out of the main UI dictionaries. Add a new language by creating
// a sibling file (e.g. de.ts) that satisfies HelpContent and registering it in
// ./index.ts — untranslated languages fall back to English automatically.

export interface HelpSection {
  /** Stable id, used as the React key and heading anchor. */
  id: string;
  title: string;
  /** One entry per paragraph. */
  paragraphs: string[];
}

export interface HelpContent {
  /** Page heading and document title. */
  title: string;
  /** Short introduction shown under the heading. */
  intro: string;
  sections: HelpSection[];
  /** Shown (in this content's language) when the guide falls back to English. */
  fallbackNote: string;
}
