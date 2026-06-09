import { FormEvent, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from '../api/client';
import type { Theme, ThemeKey } from '../types';
import { flattenCategories } from '../utils/categories';
import { DEFAULT_THEME, THEME_KEYS, THEME_LABELS, applyTheme, resolveTheme } from '../utils/theme';

export default function SettingsPage() {
  const { user, hasRole, setTheme } = useAuth();
  const isAdmin = hasRole('ADMIN');

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">🔗 LinkPortal</span>
        <span className="spacer" />
        <RouterLink to="/">
          <button className="secondary">← Tillbaka</button>
        </RouterLink>
      </header>

      <div className="content" style={{ overflowY: 'auto', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <h2>Inställningar</h2>

        <ThemeSection key={user?.id} initial={user?.theme ?? null} onSave={setTheme} />

        {isAdmin && <CategorySection />}
      </div>
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
      setStatus('Tema sparat.');
    } catch {
      setStatus('Kunde inte spara temat.');
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
      setStatus('Återställt till standardtema.');
    } catch {
      setStatus('Kunde inte återställa.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }} onSubmit={onSubmit}>
      <h3 style={{ marginTop: 0 }}>Färgtema</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Temat sparas på ditt konto och följer dig oavsett enhet. Ändringar förhandsvisas direkt.
      </p>

      <div className="theme-grid">
        {THEME_KEYS.map((key) => (
          <div key={key} className="theme-row">
            <input
              type="color"
              value={draft[key]}
              onChange={(e) => setColor(key, e.target.value)}
              aria-label={THEME_LABELS[key]}
            />
            <div className="theme-meta">
              <span>{THEME_LABELS[key]}</span>
              <code>{draft[key]}</code>
            </div>
          </div>
        ))}
      </div>

      <div className="modal-actions" style={{ marginTop: '1rem' }}>
        {status && <span className="muted" style={{ marginRight: 'auto' }}>{status}</span>}
        <button type="button" className="secondary" onClick={reset} disabled={saving}>
          Återställ standard
        </button>
        <button type="submit" disabled={saving}>
          {saving ? 'Sparar…' : 'Spara tema'}
        </button>
      </div>
    </form>
  );
}

/* ---------- Kategorihantering (endast Admin) ---------- */

function CategorySection() {
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
        'Något gick fel.'
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
    if (!name.trim()) return setError('Ange ett namn.');
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
    if (window.confirm(`Radera kategorin "${label}"? Den måste vara tom (inga underkategorier eller länkar).`)) {
      deleteMut.mutate(id);
    }
  };

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <h3 style={{ marginTop: 0 }}>Kategorier</h3>

      <form onSubmit={onCreate} style={{ marginBottom: '1rem' }}>
        <div className="row">
          <div>
            <label>Ny kategori</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Namn" />
          </div>
          <div>
            <label>Förälder</label>
            <select value={parentId} onChange={(e) => setParentId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">— Toppnivå —</option>
              {flat.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.path}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" disabled={createMut.isPending} style={{ marginTop: '0.5rem' }}>
          + Lägg till kategori
        </button>
      </form>

      {error && <div className="error" style={{ marginBottom: '0.75rem' }}>{error}</div>}

      {categoriesQuery.isLoading ? (
        <div className="muted">Laddar…</div>
      ) : (
        <table className="cat-table">
          <thead>
            <tr>
              <th>Kategori</th>
              <th>Länkar</th>
              <th>Flytta till</th>
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
                      <option value="">— Toppnivå —</option>
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
                          Spara
                        </button>
                        <button className="secondary" onClick={() => setEditingId(null)}>
                          Avbryt
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="secondary" onClick={() => startEdit(c.id, c.name)}>
                          Byt namn
                        </button>
                        <button className="danger" onClick={() => onDelete(c.id, c.name)}>
                          Radera
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
