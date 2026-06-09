// English dictionary (default language).
// To add another language later, copy this file (e.g. sv.ts), translate the
// values, and register it in i18n/index.tsx. Keys must stay identical.
export const en = {
  // Generic / shared
  'common.loading': 'Loading…',
  'common.save': 'Save',
  'common.saving': 'Saving…',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.rename': 'Rename',
  'common.back': '← Back',
  'common.topLevel': '— Top level —',

  // Login
  'login.subtitle': 'IT-Operations – internal link catalog',
  'login.username': 'Username',
  'login.password': 'Password',
  'login.failed': 'Login failed.',
  'login.signingIn': 'Signing in…',
  'login.signIn': 'Sign in',

  // Change password
  'changePassword.title': 'Change password',
  'changePassword.mustChange': 'You must change your password before continuing.',
  'changePassword.update': 'Update your password.',
  'changePassword.current': 'Current password',
  'changePassword.new': 'New password',
  'changePassword.confirm': 'Confirm new password',
  'changePassword.tooShort': 'New password must be at least 8 characters.',
  'changePassword.mismatch': 'Passwords do not match.',
  'changePassword.failed': 'Could not change password.',
  'changePassword.submit': 'Save new password',

  // Dashboard
  'dashboard.searchPlaceholder': 'Search… (or press Ctrl+K)',
  'dashboard.users': 'Users',
  'dashboard.settings': '⚙ Settings',
  'dashboard.logout': 'Log out',
  'dashboard.loadingCategories': 'Loading categories…',
  'dashboard.favorites': '★ Favorites',
  'dashboard.category': 'Category',
  'dashboard.allLinks': 'All links',
  'dashboard.loadingLinks': 'Loading links…',
  'dashboard.noFavorites': 'No favorites yet. Mark a link with ★ to add it here.',
  'dashboard.noLinks': 'No links here yet.',
  'dashboard.noLinksHint': ' Click "+ New link" to add one.',
  'dashboard.newLink': '+ New link',
  'dashboard.deleteConfirm': 'Delete the link "{{name}}"? Only an admin can do this.',
  'dashboard.viewCard': 'Cards',
  'dashboard.viewDetail': 'Details',
  'dashboard.viewModeLabel': 'View mode',

  // Link card
  'card.openTitle': 'Open {{name}}',
  'card.removeFavorite': 'Remove favorite',
  'card.addFavorite': 'Mark as favorite',
  'card.favorite': 'Favorite',
  'card.deprecated': 'DEPRECATED',
  'card.added': 'Added {{date}}',
  'card.addedBy': 'Added {{date}} by {{name}}',
  'card.copy': 'Copy',
  'card.open': 'Open ↗',

  // Detail list (table)
  'list.name': 'Name',
  'list.category': 'Category',
  'list.environment': 'Environment',
  'list.manageSoftware': 'Manage Software',
  'list.team': 'Team',
  'list.added': 'Added',
  'list.actions': 'Actions',

  // Category tree
  'tree.favorites': 'Favorites',
  'tree.allLinks': 'All links',

  // Command palette
  'palette.placeholder': 'Search links… (Esc to close)',
  'palette.noMatches': 'No matches',

  // Link form
  'form.editTitle': 'Edit link',
  'form.newTitle': 'New link',
  'form.name': 'Name *',
  'form.nameRequired': 'Name is required.',
  'form.selectCategory': 'Select a category.',
  'form.invalidUrl': 'Invalid URL (must start with http:// or https://).',
  'form.saveFailed': 'Could not save the link.',
  'form.category': 'Category *',
  'form.manageSoftware': 'Manage Software',
  'form.owningTeam': 'Owning team',
  'form.environment': 'Environment',
  'form.tags': 'Tags (comma-separated)',
  'form.tagsPlaceholder': 'prod, critical',
  'form.description': 'Description',
  'form.imageUrl': 'Image URL (logo/icon, optional)',
  'form.imagePreviewAlt': 'Preview',

  // Settings
  'settings.title': 'Settings',
  'settings.theme': 'Color theme',
  'settings.themeHint':
    'The theme is saved to your account and follows you on any device. Changes are previewed instantly.',
  'settings.themeSaved': 'Theme saved.',
  'settings.themeSaveFailed': 'Could not save the theme.',
  'settings.themeReset': 'Reset to the default theme.',
  'settings.themeResetFailed': 'Could not reset.',
  'settings.resetDefault': 'Reset to default',
  'settings.saveTheme': 'Save theme',
  'settings.categories': 'Categories',
  'settings.newCategory': 'New category',
  'settings.namePlaceholder': 'Name',
  'settings.parent': 'Parent',
  'settings.addCategory': '+ Add category',
  'settings.colLinks': 'Links',
  'settings.colMoveTo': 'Move to',
  'settings.somethingWrong': 'Something went wrong.',
  'settings.enterName': 'Enter a name.',
  'settings.deleteCategoryConfirm':
    'Delete the category "{{name}}"? It must be empty (no subcategories or links).',

  // Theme color labels
  'theme.primary': 'Primary color (buttons, accents)',
  'theme.primaryDark': 'Dark primary color (hover, links)',
  'theme.accent': 'Accent color',
  'theme.bg': 'Background',
  'theme.surface': 'Cards / surfaces',
  'theme.text': 'Text',

  // Admin – users
  'adminUsers.title': 'User management',
  'adminUsers.newUser': 'New user',
  'adminUsers.username': 'Username',
  'adminUsers.displayName': 'Display name',
  'adminUsers.tempPassword': 'Temporary password',
  'adminUsers.role': 'Role',
  'adminUsers.passwordTooShort': 'The password must be at least 8 characters.',
  'adminUsers.createFailed': 'Could not create user.',
  'adminUsers.createUser': 'Create user',
  'adminUsers.createHint': 'The user will be forced to change their password on first login.',
  'adminUsers.users': 'Users',
  'adminUsers.colName': 'Name',
  'adminUsers.colStatus': 'Status',
  'adminUsers.colActions': 'Actions',
  'adminUsers.active': 'Active',
  'adminUsers.inactive': 'Inactive',
  'adminUsers.deactivate': 'Deactivate',
  'adminUsers.activate': 'Activate',
  'adminUsers.resetPassword': 'Reset password',
  'adminUsers.resetPrompt': 'New password (at least 8 characters):',
} as const;

export type TranslationKey = keyof typeof en;
