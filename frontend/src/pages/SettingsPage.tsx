import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
  getSettings,
  updateSettings,
  exportLinks,
  importLinks,
} from '../api/client';
import type { AppSettings, LinkExportItem, Theme, ThemeKey } from '../types';
import { flattenCategories } from '../utils/categories';
import { DEFAULT_THEME, THEME_KEYS, applyTheme, resolveTheme } from '../utils/theme';
import { useTranslation, LANGUAGES, type Lang } from '../i18n';
import type { TranslationKey } from '../i18n/en';

// Maps each theme color to its translation key.
const THEME_LABEL_KEYS: Record<ThemeKey, TranslationKey> = {
  primary: 'theme.primary',
  primaryDark: 'theme.primaryDark',
  accent: 'theme.accent',
  bg: 'theme.bg',
  surface: 'theme.surface',
  text: 'theme.text',
};

export default function SettingsPage() {
  const { user, hasRole, setTheme } = useAuth();
  const { t } = useTranslation();
  const isAdmin = hasRole('ADMIN');

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">🔗 LinkPortal</span>
        <span className="spacer" />
        <RouterLink to="/">
          <button className="secondary">{t('common.back')}</button>
        </RouterLink>
      </header>

      <div className="content" style={{ overflowY: 'auto', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <h2>{t('settings.title')}</h2>

        <LanguageSection />

        <RecentSection />

        <ThemeSection key={user?.id} initial={user?.theme ?? null} onSave={setTheme} />

        <ImportExportSection isAdmin={isAdmin} />

        {isAdmin && <WebAppSection />}

        {isAdmin && <HealthCheckSection />}

        {isAdmin && <CategorySection />}
      </div>
    </div>
  );
}

/* ---------- Språk (alla användare) ---------- */

function LanguageSection() {
  const { t, lang, setLang } = useTranslation();

  return (
    <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
      <h3 style={{ marginTop: 0 }}>{t('settings.language')}</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        {t('settings.languageHint')}
      </p>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        aria-label={t('settings.language')}
        style={{ maxWidth: 240 }}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ---------- Recently added (all users) ---------- */

function RecentSection() {
  const { t } = useTranslation();
  const [count, setCount] = useState<number>(() => {
    const saved = Number(localStorage.getItem('linkportal.recentCount'));
    return Number.isFinite(saved) && saved >= 1 ? Math.min(Math.floor(saved), 100) : 10;
  });

  const update = (raw: number) => {
    setCount(raw);
    if (Number.isFinite(raw) && raw >= 1) {
      localStorage.setItem('linkportal.recentCount', String(Math.min(Math.floor(raw), 100)));
    }
  };

  return (
    <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
      <h3 style={{ marginTop: 0 }}>{t('settings.recent')}</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        {t('settings.recentHint')}
      </p>
      <label htmlFor="recent-count">{t('settings.recentCount')}</label>
      <input
        id="recent-count"
        type="number"
        min={1}
        max={100}
        value={count}
        onChange={(e) => update(Number(e.target.value))}
        style={{ maxWidth: 240 }}
      />
    </div>
  );
}

/* ---------- Färgtema (alla användare) ---------- */

function ThemeSection({
  initial,
  onSave,
}: {
  initial: Theme | null;
  onSave: (theme: Theme | null) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Record<ThemeKey, string>>(resolveTheme(initial));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const setColor = (key: ThemeKey, value: string) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    applyTheme(next); // live-förhandsvisning
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      // Spara bara de färger som avviker från standard.
      const overrides: Theme = {};
      for (const key of THEME_KEYS) {
        if (draft[key].toLowerCase() !== DEFAULT_THEME[key].toLowerCase()) {
          overrides[key] = draft[key];
        }
      }
      await onSave(Object.keys(overrides).length ? overrides : null);
      setStatus(t('settings.themeSaved'));
    } catch {
      setStatus(t('settings.themeSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setDraft({ ...DEFAULT_THEME });
    applyTheme(null);
    setSaving(true);
    setStatus('');
    try {
      await onSave(null);
      setStatus(t('settings.themeReset'));
    } catch {
      setStatus(t('settings.themeResetFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }} onSubmit={onSubmit}>
      <h3 style={{ marginTop: 0 }}>{t('settings.theme')}</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        {t('settings.themeHint')}
      </p>

      <div className="theme-grid">
        {THEME_KEYS.map((key) => (
          <div key={key} className="theme-row">
            <input
              type="color"
              value={draft[key]}
              onChange={(e) => setColor(key, e.target.value)}
              aria-label={t(THEME_LABEL_KEYS[key])}
            />
            <div className="theme-meta">
              <span>{t(THEME_LABEL_KEYS[key])}</span>
              <code>{draft[key]}</code>
            </div>
          </div>
        ))}
      </div>

      <div className="modal-actions" style={{ marginTop: '1rem' }}>
        {status && <span className="muted" style={{ marginRight: 'auto' }}>{status}</span>}
        <button type="button" className="secondary" onClick={reset} disabled={saving}>
          {t('settings.resetDefault')}
        </button>
        <button type="submit" disabled={saving}>
          {saving ? t('common.saving') : t('settings.saveTheme')}
        </button>
      </div>
    </form>
  );
}

/* ---------- Import / Export ---------- */

function ImportExportSection({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');
  const [exporting, setExporting] = useState(false);

  const onExport = async () => {
    setStatus('');
    setExporting(true);
    try {
      const data = await exportLinks();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `linkportal-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setStatus(t('settings.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const importMut = useMutation({
    mutationFn: (links: LinkExportItem[]) => importLinks({ links }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      let msg = t('settings.importResult', { created: result.created, skipped: result.skipped });
      if (result.errors.length) msg += ' ' + t('settings.importErrors', { count: result.errors.length });
      setStatus(msg);
    },
    onError: () => setStatus(t('settings.importFailed')),
  });

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    setStatus('');
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = ''; // allow re-selecting the same file
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const links = Array.isArray(parsed) ? parsed : parsed?.links;
      if (!Array.isArray(links)) {
        setStatus(t('settings.importFailed'));
        return;
      }
      importMut.mutate(links as LinkExportItem[]);
    } catch {
      setStatus(t('settings.importFailed'));
    }
  };

  return (
    <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
      <h3 style={{ marginTop: 0 }}>{t('settings.importExport')}</h3>
      <p className="muted" style={{ marginTop: 0 }}>{t('settings.importExportHint')}</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button type="button" onClick={onExport} disabled={exporting}>
          {exporting ? t('common.loading') : t('settings.exportBtn')}
        </button>
        {isAdmin && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={onFile}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="secondary"
              onClick={() => fileRef.current?.click()}
              disabled={importMut.isPending}
            >
              {importMut.isPending ? t('common.loading') : t('settings.importBtn')}
            </button>
          </>
        )}
      </div>

      {isAdmin && (
        <p className="muted" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
          {t('settings.importHint')}
        </p>
      )}
      {status && <p className="muted" style={{ marginBottom: 0 }}>{status}</p>}
    </div>
  );
}

/* ---------- Web app address (endast Admin) ---------- */

function WebAppSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: getSettings });
  const [draft, setDraft] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const current = draft ?? settingsQuery.data?.webAppUrl ?? '';

  const saveMut = useMutation({
    mutationFn: (webAppUrl: string) => updateSettings({ webAppUrl }),
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data);
      setDraft(null);
      setStatus(t('settings.webAppSaved'));
    },
    onError: () => setStatus(t('settings.somethingWrong')),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setStatus('');
    saveMut.mutate(current.trim());
  };

  return (
    <form className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }} onSubmit={onSubmit}>
      <h3 style={{ marginTop: 0 }}>{t('settings.webApp')}</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        {t('settings.webAppHint')}
      </p>
      <input
        id="webapp-url"
        type="url"
        placeholder="https://linkportal.example.com"
        value={current}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="modal-actions" style={{ marginTop: '1rem' }}>
        {status && <span className="muted" style={{ marginRight: 'auto' }}>{status}</span>}
        <button type="submit" disabled={saveMut.isPending}>
          {saveMut.isPending ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </form>
  );
}

/* ---------- Health-check (endast Admin) ---------- */

function HealthCheckSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: getSettings });
  const [draft, setDraft] = useState<AppSettings | null>(null);
  const [status, setStatus] = useState('');

  const current = draft ?? settingsQuery.data ?? null;

  const saveMut = useMutation({
    mutationFn: (input: Partial<AppSettings>) => updateSettings(input),
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data);
      setDraft(null);
      setStatus(t('settings.health.saved'));
    },
    onError: () => setStatus(t('settings.somethingWrong')),
  });

  if (!current) {
    return (
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>{t('settings.health.title')}</h3>
        <p className="muted">{t('common.loading')}</p>
      </div>
    );
  }

  const set = (patch: Partial<AppSettings>) => setDraft({ ...current, ...patch });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setStatus('');
    saveMut.mutate({
      healthCheckEnabled: current.healthCheckEnabled,
      healthCheckIntervalHours: current.healthCheckIntervalHours,
      healthCheckTimeoutSec: current.healthCheckTimeoutSec,
      healthRetentionDays: current.healthRetentionDays,
    });
  };

  return (
    <form className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }} onSubmit={onSubmit}>
      <h3 style={{ marginTop: 0 }}>{t('settings.health.title')}</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        {t('settings.health.hint')}
      </p>

      <label htmlFor="hc-enabled" className="checkbox-row">
        <input
          id="hc-enabled"
          type="checkbox"
          checked={current.healthCheckEnabled}
          onChange={(e) => set({ healthCheckEnabled: e.target.checked })}
        />
        <span>{t('settings.health.enabled')}</span>
      </label>

      <div className="row">
        <div>
          <label htmlFor="hc-interval">{t('settings.health.intervalHours')}</label>
          <input
            id="hc-interval"
            type="number"
            min={1}
            max={168}
            value={current.healthCheckIntervalHours}
            onChange={(e) => set({ healthCheckIntervalHours: Number(e.target.value) })}
          />
        </div>
        <div>
          <label htmlFor="hc-timeout">{t('settings.health.timeoutSec')}</label>
          <input
            id="hc-timeout"
            type="number"
            min={1}
            max={60}
            value={current.healthCheckTimeoutSec}
            onChange={(e) => set({ healthCheckTimeoutSec: Number(e.target.value) })}
          />
        </div>
      </div>

      <label htmlFor="hc-retention">{t('settings.health.retentionDays')}</label>
      <input
        id="hc-retention"
        type="number"
        min={0}
        max={3650}
        value={current.healthRetentionDays}
        onChange={(e) => set({ healthRetentionDays: Number(e.target.value) })}
      />

      <div className="modal-actions" style={{ marginTop: '1rem' }}>
        {status && <span className="muted" style={{ marginRight: 'auto' }}>{status}</span>}
        <button type="submit" disabled={saveMut.isPending}>
          {saveMut.isPending ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </form>
  );
}

/* ---------- Kategorihantering (endast Admin) ---------- */

function CategorySection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: getCategories });
  const flat = flattenCategories(categoriesQuery.data ?? []);

  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | ''>('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['categories'] });
  const onError = (err: unknown) =>
    setError(
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        t('settings.somethingWrong')
    );

  const createMut = useMutation({
    mutationFn: () => createCategory({ name: name.trim(), parentId: parentId === '' ? null : Number(parentId) }),
    onSuccess: () => {
      invalidate();
      setName('');
      setParentId('');
      setError('');
    },
    onError,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; parentId?: number | null } }) =>
      updateCategory(id, data),
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      setError('');
    },
    onError,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: () => {
      invalidate();
      setError('');
    },
    onError,
  });

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError(t('settings.enterName'));
    createMut.mutate();
  };

  const startEdit = (id: number, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const saveEdit = (id: number) => {
    if (!editName.trim()) return;
    updateMut.mutate({ id, data: { name: editName.trim() } });
  };

  const moveTo = (id: number, newParent: number | '') => {
    updateMut.mutate({ id, data: { parentId: newParent === '' ? null : Number(newParent) } });
  };

  const onDelete = (id: number, label: string) => {
    if (window.confirm(t('settings.deleteCategoryConfirm', { name: label }))) {
      deleteMut.mutate(id);
    }
  };

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <h3 style={{ marginTop: 0 }}>{t('settings.categories')}</h3>

      <form onSubmit={onCreate} style={{ marginBottom: '1rem' }}>
        <div className="row">
          <div>
            <label>{t('settings.newCategory')}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('settings.namePlaceholder')} />
          </div>
          <div>
            <label>{t('settings.parent')}</label>
            <select value={parentId} onChange={(e) => setParentId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">{t('common.topLevel')}</option>
              {flat.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.path}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" disabled={createMut.isPending} style={{ marginTop: '0.5rem' }}>
          {t('settings.addCategory')}
        </button>
      </form>

      {error && <div className="error" style={{ marginBottom: '0.75rem' }}>{error}</div>}

      {categoriesQuery.isLoading ? (
        <div className="muted">{t('common.loading')}</div>
      ) : (
        <table className="cat-table">
          <thead>
            <tr>
              <th>{t('list.category')}</th>
              <th>{t('settings.colLinks')}</th>
              <th>{t('settings.colMoveTo')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {flat.map((c) => {
              const node = findNode(categoriesQuery.data ?? [], c.id);
              const blocked = node ? descendantIds(node) : new Set<number>();
              return (
                <tr key={c.id}>
                  <td style={{ paddingLeft: `${0.5 + c.depth * 1.2}rem` }}>
                    {editingId === c.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(c.id)}
                        autoFocus
                      />
                    ) : (
                      c.name
                    )}
                  </td>
                  <td>{node?.linkCount ?? 0}</td>
                  <td>
                    <select
                      value={node?.parentId ?? ''}
                      onChange={(e) => moveTo(c.id, e.target.value === '' ? '' : Number(e.target.value))}
                    >
                      <option value="">{t('common.topLevel')}</option>
                      {flat
                        .filter((o) => o.id !== c.id && !blocked.has(o.id))
                        .map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.path}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="cat-actions">
                    {editingId === c.id ? (
                      <>
                        <button className="secondary" onClick={() => saveEdit(c.id)}>
                          {t('common.save')}
                        </button>
                        <button className="secondary" onClick={() => setEditingId(null)}>
                          {t('common.cancel')}
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="secondary" onClick={() => startEdit(c.id, c.name)}>
                          {t('common.rename')}
                        </button>
                        <button className="danger" onClick={() => onDelete(c.id, c.name)}>
                          {t('common.delete')}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function findNode(nodes: import('../types').CategoryNode[], id: number): import('../types').CategoryNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return null;
}

// Alla id i ett delträd (inkl. noden själv) – för att blockera cykliska flyttar.
function descendantIds(node: import('../types').CategoryNode): Set<number> {
  const ids = new Set<number>([node.id]);
  for (const child of node.children) {
    for (const id of descendantIds(child)) ids.add(id);
  }
  return ids;
}
