import type { HelpContent } from './types';

// English help content (default / fallback language).
export const helpEn: HelpContent = {
  title: 'How LinkPortal works',
  intro:
    "LinkPortal is your team's shared catalog of links — a \"password manager for links\". This guide explains how to find, open and manage links, and what each role can do.",
  fallbackNote: "This guide isn't translated into your language yet, so it's shown in English.",
  sections: [
    {
      id: 'getting-started',
      title: 'Getting started',
      paragraphs: [
        'Sign in with the username and password you were given. The first time you sign in you may be asked to set a new password.',
        'The dashboard shows your links. Categories are listed in the sidebar on the left; the links themselves appear in the main area.',
        'Switch between Card view (logos and details) and Detail view (a compact table) using the toggle above the list. Your choice is remembered in this browser.',
      ],
    },
    {
      id: 'finding',
      title: 'Finding and opening links',
      paragraphs: [
        'Type in the search box at the top to filter links by name, URL, team, tags and more. Press Ctrl+K to jump straight to search, and Esc or the ✕ button to clear it.',
        'Click a link card (or the Open button) to open it in a new tab. Use the Copy button to copy the URL to your clipboard.',
        "A small coloured dot shows the link's monitoring status: green means reachable, red means down, and grey means not monitored.",
      ],
    },
    {
      id: 'favorites',
      title: 'Favorites and recently added',
      paragraphs: [
        'Mark links you use often with the ★ star. They gather under Favorites in the sidebar for quick access. Favorites are personal to your account.',
        'The Recently added view lists the newest links. You can choose how many it shows in Settings.',
      ],
    },
    {
      id: 'categories-links',
      title: 'Categories and adding links',
      paragraphs: [
        'Links are organised into categories, which can be nested. Click a category in the sidebar to see only its links; the number next to each shows how many links it contains.',
        'Editors and admins can add a link with “+ New link”, and edit or delete existing ones. A link has a name, URL, category, environment (Prod/Test/Dev), owning team, tags, an optional description and an optional logo image.',
        "URLs may use schemes such as https://, rdp:// and ssh:// — a scheme is required (a bare hostname won't work).",
      ],
    },
    {
      id: 'monitoring',
      title: 'Monitoring and alerts',
      paragraphs: [
        'LinkPortal can periodically check that links respond. HTTP/HTTPS links are checked with a lightweight request; rdp/ssh links are checked with a TCP port test.',
        'Click the status dot to run an immediate test (editors and admins). The “Last successful” time shows when the link last responded.',
        'When a link changes from up to down it appears under Monitor Alerts. Links marked “Do not monitor” are never tested and always show a neutral dot. Admins set the check interval and timeout in Settings.',
      ],
    },
    {
      id: 'trash',
      title: 'Trash',
      paragraphs: [
        'Deleting a link moves it to Trash rather than removing it immediately. Admins can open the Trash view to restore a link or delete it permanently.',
      ],
    },
    {
      id: 'import-export',
      title: 'Import and export',
      paragraphs: [
        'Open Settings → Import / export to download all links as a JSON backup. Any user can export.',
        'Admins can import links from a previously exported file. Import is non-destructive: it adds new links and skips any that already exist (same name and URL) — nothing is overwritten or deleted.',
      ],
    },
    {
      id: 'extension',
      title: 'Browser extension',
      paragraphs: [
        'The Chrome/Edge extension puts your links one click away from the toolbar. You can search and open links, save the current tab to a category (or the Inbox), and star favorites.',
        'It can notify you when new links are added, and you can open the popup with a keyboard shortcut (Ctrl+Shift+L by default). Sign in once with your server URL and account.',
      ],
    },
    {
      id: 'settings',
      title: 'Settings',
      paragraphs: [
        'Settings holds your personal preferences and, for admins, site-wide options. Everyone can change the interface language, the colour theme (saved to your account) and how many links the Recently added view shows.',
        'Admins can manage categories, configure monitoring, set the public web-app address used by the extension, and import links.',
      ],
    },
    {
      id: 'roles',
      title: 'Roles',
      paragraphs: [
        'Viewer — browse, search, open and favorite links, and export.',
        'Editor — everything a viewer can do, plus add and edit links and run health tests.',
        'Admin — full control: delete and restore links, manage categories and users, import links, and change monitoring and site settings.',
      ],
    },
    {
      id: 'version',
      title: 'Version and updates',
      paragraphs: [
        'The current build version is shown under Settings → About. It is derived from the project source, so the server and a local copy show the same version when they are on the same release — handy for confirming an update went through.',
      ],
    },
  ],
};
