import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import {
  getCategories,
  getLinks,
  createLink,
  updateLink,
  deleteLink,
  setFavorite,
} from '../api/client';
import type { LinkInput, LinkItem } from '../types';
import { categoryPathMap } from '../utils/categories';
import CategoryTree from '../components/CategoryTree';
import LinkCard from '../components/LinkCard';
import LinkForm from '../components/LinkForm';
import CommandPalette from '../components/CommandPalette';

export default function DashboardPage() {
  const { user, logout, hasRole } = useAuth();
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [favoritesView, setFavoritesView] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LinkItem | null>(null);
  const [showPalette, setShowPalette] = useState(false);

  // Debounce sökning
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Ctrl/Cmd+K öppnar command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowPalette(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: getCategories });

  const linksQuery = useQuery({
    queryKey: ['links', selectedCategory, debouncedSearch],
    queryFn: () =>
      getLinks({
        categoryId: selectedCategory ?? undefined,
        q: debouncedSearch || undefined,
      }),
  });

  // Alla länkar (för command palette) – oberoende av filter.
  const allLinksQuery = useQuery({ queryKey: ['links', 'all'], queryFn: () => getLinks({}) });

  const pathMap = useMemo(
    () => categoryPathMap(categoriesQuery.data ?? []),
    [categoriesQuery.data]
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['links'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
  };

  const createMut = useMutation({
    mutationFn: (input: LinkInput) => createLink(input),
    onSuccess: invalidate,
  });
  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: number; input: LinkInput }) => updateLink(id, input),
    onSuccess: invalidate,
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteLink(id),
    onSuccess: invalidate,
  });
  const favoriteMut = useMutation({
    mutationFn: ({ id, isFavorite }: { id: number; isFavorite: boolean }) => setFavorite(id, isFavorite),
    onSuccess: invalidate,
  });

  const onSubmitForm = async (input: LinkInput) => {
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, input });
    } else {
      await createMut.mutateAsync(input);
    }
  };

  const onDelete = (l: LinkItem) => {
    if (window.confirm(`Radera länken "${l.name}"? Detta kan endast Admin göra.`)) {
      deleteMut.mutate(l.id);
    }
  };

  const onToggleFavorite = (l: LinkItem) => {
    favoriteMut.mutate({ id: l.id, isFavorite: !l.isFavorite });
  };

  const canEdit = hasRole('EDITOR');
  const canDelete = hasRole('ADMIN');
  const links = linksQuery.data ?? [];

  // Favoriter – platt lista, oberoende av valt kategori-filter.
  const favorites = useMemo(
    () =>
      (allLinksQuery.data ?? [])
        .filter((l) => l.isFavorite)
        .sort((a, b) => a.name.localeCompare(b.name, 'sv')),
    [allLinksQuery.data]
  );

  const selectFavorites = () => {
    setFavoritesView(true);
    setSelectedCategory(null);
  };
  const selectCategory = (id: number | null) => {
    setFavoritesView(false);
    setSelectedCategory(id);
  };

  const displayLinks = favoritesView ? favorites : links;

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">🔗 LinkPortal</span>
        <input
          className="search"
          placeholder="Sök… (eller tryck Ctrl+K)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="spacer" />
        {hasRole('ADMIN') && (
          <RouterLink to="/admin/users">
            <button className="secondary">Användare</button>
          </RouterLink>
        )}
        <span className="user-chip">
          {user?.displayName} <span className="badge">{user?.role}</span>
        </span>
        <button className="secondary" onClick={() => logout()}>
          Logga ut
        </button>
      </header>

      <div className="main">
        <aside className="sidebar">
          {categoriesQuery.isLoading ? (
            <div className="muted">Laddar kategorier…</div>
          ) : (
            <CategoryTree
              nodes={categoriesQuery.data ?? []}
              selectedId={selectedCategory}
              onSelect={selectCategory}
              favoritesActive={favoritesView}
              favoritesCount={favorites.length}
              onSelectFavorites={selectFavorites}
            />
          )}
        </aside>

        <main className="content">
          <div className="content-header">
            <h2>
              {favoritesView
                ? '★ Favoriter'
                : selectedCategory
                ? pathMap.get(selectedCategory) ?? 'Kategori'
                : 'Alla länkar'}
            </h2>
            <span className="muted">({displayLinks.length})</span>
            <span className="spacer" />
            {canEdit && (
              <button
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
              >
                + Ny länk
              </button>
            )}
          </div>

          {linksQuery.isLoading ? (
            <div className="empty">Laddar länkar…</div>
          ) : displayLinks.length === 0 ? (
            <div className="empty">
              {favoritesView
                ? 'Inga favoriter ännu. Markera en länk med ★ för att lägga till den här.'
                : 'Inga länkar här ännu.'}
              {!favoritesView && canEdit && ' Klicka på "+ Ny länk" för att lägga till en.'}
            </div>
          ) : (
            <div className="link-grid">
              {displayLinks.map((l) => (
                <LinkCard
                  key={l.id}
                  link={l}
                  path={pathMap.get(l.categoryId) ?? ''}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onEdit={(link) => {
                    setEditing(link);
                    setShowForm(true);
                  }}
                  onDelete={onDelete}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {showForm && (
        <LinkForm
          categories={categoriesQuery.data ?? []}
          initial={editing}
          defaultCategoryId={selectedCategory}
          onSubmit={onSubmitForm}
          onClose={() => setShowForm(false)}
        />
      )}

      {showPalette && (
        <CommandPalette
          links={allLinksQuery.data ?? []}
          pathMap={pathMap}
          onClose={() => setShowPalette(false)}
        />
      )}
    </div>
  );
}
