import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import {
  getCategories,
  getLinks,
  getTags,
  createLink,
  updateLink,
  deleteLink,
  getDeletedLinks,
  restoreLink,
  permanentDeleteLink,
  setFavorite,
  testLink,
  testAllLinks,
} from '../api/client';
import type { Environment, LinkInput, LinkItem } from '../types';
import { categoryPathMap } from '../utils/categories';
import { useTranslation } from '../i18n';
import CategoryTree from '../components/CategoryTree';
import LinkCard from '../components/LinkCard';
import LinkList from '../components/LinkList';
import LinkListEdited from '../components/LinkListEdited';
import TrashList from '../components/TrashList';
import LinkForm from '../components/LinkForm';
import CommandPalette from '../components/CommandPalette';
import MultiSelectDropdown from '../components/MultiSelectDropdown';

type ViewMode = 'card' | 'list' | 'edited';

const ENVIRONMENTS: Environment[] = ['PROD', 'TEST', 'DEV', 'NA'];

function readStoredList(key: string): string[] {
  try {
    const saved = localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

// Reads the user-configurable "recently added" count from localStorage (1–100, default 10).
function readRecentCount(): number {
  const saved = Number(localStorage.getItem('linkportal.recentCount'));
  return Number.isFinite(saved) && saved >= 1 ? Math.min(Math.floor(saved), 100) : 10;
}

export default function DashboardPage() {
  const { user, logout, hasRole } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [favoritesView, setFavoritesView] = useState(false);
  const [alertsView, setAlertsView] = useState(false);
  const [recentView, setRecentView] = useState(false);
  const [trashView, setTrashView] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LinkItem | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('linkportal.viewMode');
    return saved === 'list' || saved === 'edited' ? saved : 'card';
  });

  const changeView = (mode: ViewMode) => {
    localStorage.setItem('linkportal.viewMode', mode);
    setViewMode(mode);
  };

  // Korsfiltrering: taggar + miljö. Behålls i localStorage och över kategoribyten.
  const [selectedTags, setSelectedTags] = useState<string[]>(() =>
    readStoredList('linkportal.filterTags')
  );
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>(() =>
    readStoredList('linkportal.filterEnvironments')
  );

  useEffect(() => {
    localStorage.setItem('linkportal.filterTags', JSON.stringify(selectedTags));
  }, [selectedTags]);
  useEffect(() => {
    localStorage.setItem('linkportal.filterEnvironments', JSON.stringify(selectedEnvironments));
  }, [selectedEnvironments]);

  const hasActiveFilters = selectedTags.length > 0 || selectedEnvironments.length > 0;
  const clearFilters = () => {
    setSelectedTags([]);
    setSelectedEnvironments([]);
  };

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

  const tagsQuery = useQuery({ queryKey: ['tags'], queryFn: getTags });

  const linksQuery = useQuery({
    queryKey: ['links', selectedCategory, debouncedSearch, selectedTags, selectedEnvironments],
    queryFn: () =>
      getLinks({
        categoryId: selectedCategory ?? undefined,
        q: debouncedSearch || undefined,
        tags: selectedTags.length ? selectedTags.map(Number) : undefined,
        environment: selectedEnvironments.length ? selectedEnvironments : undefined,
      }),
  });

  // Alla länkar (för command palette) – oberoende av filter.
  const allLinksQuery = useQuery({ queryKey: ['links', 'all'], queryFn: () => getLinks({}) });

  // Deleted links (Trash view) – admin-only; also drives the sidebar count.
  const deletedQuery = useQuery({
    queryKey: ['links', 'deleted'],
    queryFn: getDeletedLinks,
    enabled: hasRole('ADMIN'),
  });

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
  const restoreMut = useMutation({
    mutationFn: (id: number) => restoreLink(id),
    onSuccess: invalidate,
  });
  const permanentDeleteMut = useMutation({
    mutationFn: (id: number) => permanentDeleteLink(id),
    onSuccess: invalidate,
  });
  const favoriteMut = useMutation({
    mutationFn: ({ id, isFavorite }: { id: number; isFavorite: boolean }) => setFavorite(id, isFavorite),
    onSuccess: invalidate,
  });
  const testMut = useMutation({
    mutationFn: (id: number) => testLink(id),
    onSuccess: invalidate,
  });
  const testAllMut = useMutation({
    mutationFn: (ids?: number[]) => testAllLinks(ids),
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
    if (window.confirm(t('dashboard.deleteConfirm', { name: l.name }))) {
      deleteMut.mutate(l.id);
    }
  };

  const onToggleFavorite = (l: LinkItem) => {
    favoriteMut.mutate({ id: l.id, isFavorite: !l.isFavorite });
  };

  const onTest = (l: LinkItem) => {
    testMut.mutate(l.id);
  };

  const onRestore = (l: LinkItem) => {
    restoreMut.mutate(l.id);
  };

  const onPermanentDelete = (l: LinkItem) => {
    if (window.confirm(t('trash.confirmPermanent', { name: l.name }))) {
      permanentDeleteMut.mutate(l.id);
    }
  };

  const canEdit = hasRole('EDITOR');
  const canDelete = hasRole('ADMIN');
  const links = linksQuery.data ?? [];

  // Favoriter – platt lista, oberoende av valt kategori-filter.
  const favorites = useMemo(
    () =>
      (allLinksQuery.data ?? [])
        .filter((l) => l.isFavorite)
        .sort((a, b) => a.name.localeCompare(b.name, 'en')),
    [allLinksQuery.data]
  );

  // Monitor Alerts – länkar som varit gröna men ändrats till röda (alertActive).
  const alerts = useMemo(
    () =>
      (allLinksQuery.data ?? [])
        .filter((l) => l.alertActive)
        .sort((a, b) => a.name.localeCompare(b.name, 'en')),
    [allLinksQuery.data]
  );

  // Recently added – flat list across all links, newest first, capped by the user setting.
  const recentCount = useMemo(() => readRecentCount(), []);
  const recent = useMemo(
    () =>
      [...(allLinksQuery.data ?? [])]
        .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
        .slice(0, recentCount),
    [allLinksQuery.data, recentCount]
  );

  const deleted = deletedQuery.data ?? [];

  const selectFavorites = () => {
    setFavoritesView(true);
    setAlertsView(false);
    setRecentView(false);
    setTrashView(false);
    setSelectedCategory(null);
  };
  const selectAlerts = () => {
    setAlertsView(true);
    setFavoritesView(false);
    setRecentView(false);
    setTrashView(false);
    setSelectedCategory(null);
  };
  const selectRecent = () => {
    setRecentView(true);
    setFavoritesView(false);
    setAlertsView(false);
    setTrashView(false);
    setSelectedCategory(null);
  };
  const selectTrash = () => {
    setTrashView(true);
    setFavoritesView(false);
    setAlertsView(false);
    setRecentView(false);
    setSelectedCategory(null);
  };
  const selectCategory = (id: number | null) => {
    setFavoritesView(false);
    setAlertsView(false);
    setRecentView(false);
    setTrashView(false);
    setSelectedCategory(id);
  };

  const displayLinks = recentView
    ? recent
    : alertsView
    ? alerts
    : favoritesView
    ? favorites
    : links;

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">🔗 LinkPortal</span>
        <div className="search-wrap">
          <input
            className="search"
            placeholder={t('dashboard.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSearch('');
            }}
          />
          {search && (
            <button
              type="button"
              className="search-clear"
              title={t('dashboard.clearSearch')}
              aria-label={t('dashboard.clearSearch')}
              onClick={() => setSearch('')}
            >
              ✕
            </button>
          )}
        </div>
        <span className="spacer" />
        {hasRole('ADMIN') && (
          <RouterLink to="/admin/users">
            <button className="secondary">{t('dashboard.users')}</button>
          </RouterLink>
        )}
        <RouterLink to="/settings">
          <button className="secondary">{t('dashboard.settings')}</button>
        </RouterLink>
        <span className="user-chip">
          {user?.displayName} <span className="badge">{user?.role}</span>
        </span>
        <button className="secondary" onClick={() => logout()}>
          {t('dashboard.logout')}
        </button>
      </header>

      <div className="main">
        <aside className="sidebar">
          {categoriesQuery.isLoading ? (
            <div className="muted">{t('dashboard.loadingCategories')}</div>
          ) : (
            <CategoryTree
              nodes={categoriesQuery.data ?? []}
              selectedId={selectedCategory}
              onSelect={selectCategory}
              favoritesActive={favoritesView}
              favoritesCount={favorites.length}
              onSelectFavorites={selectFavorites}
              alertsActive={alertsView}
              alertsCount={alerts.length}
              onSelectAlerts={selectAlerts}
              recentActive={recentView}
              recentCount={recent.length}
              onSelectRecent={selectRecent}
              trashActive={trashView}
              trashCount={deleted.length}
              onSelectTrash={canDelete ? selectTrash : undefined}
            />
          )}
        </aside>

        <main className="content">
          <div className="content-header">
            <h2>
              {trashView
                ? t('dashboard.trash')
                : recentView
                ? t('dashboard.recentlyAdded')
                : alertsView
                ? t('dashboard.monitorAlerts')
                : favoritesView
                ? t('dashboard.favorites')
                : selectedCategory
                ? pathMap.get(selectedCategory) ?? t('dashboard.category')
                : t('dashboard.allLinks')}
            </h2>
            <span className="muted">({trashView ? deleted.length : displayLinks.length})</span>
            {!favoritesView && !alertsView && !recentView && !trashView && (
              <div className="filter-bar">
                <MultiSelectDropdown
                  label={t('filter.tags')}
                  options={(tagsQuery.data ?? []).map((tg) => ({
                    value: String(tg.id),
                    label: tg.name,
                  }))}
                  selected={selectedTags}
                  onChange={setSelectedTags}
                  emptyText={t('filter.noTags')}
                />
                <MultiSelectDropdown
                  label={t('filter.environment')}
                  options={ENVIRONMENTS.map((e) => ({ value: e, label: e }))}
                  selected={selectedEnvironments}
                  onChange={setSelectedEnvironments}
                />
                <button
                  type="button"
                  className="secondary"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                >
                  {t('filter.clear')}
                </button>
              </div>
            )}
            <span className="spacer" />
            {!trashView && (
            <div className="view-toggle" role="group" aria-label={t('dashboard.viewModeLabel')}>
              <button
                type="button"
                className={`secondary${viewMode === 'card' ? ' active' : ''}`}
                aria-pressed={viewMode === 'card'}
                onClick={() => changeView('card')}
              >
                ▦ {t('dashboard.viewCard')}
              </button>
              <button
                type="button"
                className={`secondary${viewMode === 'list' ? ' active' : ''}`}
                aria-pressed={viewMode === 'list'}
                onClick={() => changeView('list')}
              >
                ☰ {t('dashboard.viewDetail')}
              </button>
              <button
                type="button"
                className={`secondary${viewMode === 'edited' ? ' active' : ''}`}
                aria-pressed={viewMode === 'edited'}
                onClick={() => changeView('edited')}
              >
                🕓 {t('dashboard.viewEdited')}
              </button>
            </div>
            )}
            {canEdit && !trashView && (
              <button
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
              >
                {t('dashboard.newLink')}
              </button>
            )}
            {canEdit && !favoritesView && !trashView && (
              <button
                type="button"
                className="secondary"
                onClick={() => testAllMut.mutate(displayLinks.map((l) => l.id))}
                disabled={testAllMut.isPending}
                title={t('health.testAllHint')}
              >
                {testAllMut.isPending ? t('health.testing') : t('health.testAll')}
              </button>
            )}
          </div>

          {trashView ? (
            deletedQuery.isLoading ? (
              <div className="empty">{t('dashboard.loadingLinks')}</div>
            ) : deleted.length === 0 ? (
              <div className="empty">{t('dashboard.noTrash')}</div>
            ) : (
              <TrashList
                links={deleted}
                pathMap={pathMap}
                onRestore={onRestore}
                onDeletePermanently={onPermanentDelete}
              />
            )
          ) : linksQuery.isLoading ? (
            <div className="empty">{t('dashboard.loadingLinks')}</div>
          ) : displayLinks.length === 0 ? (
            <div className="empty">
              {alertsView
                ? t('dashboard.noAlerts')
                : favoritesView
                ? t('dashboard.noFavorites')
                : t('dashboard.noLinks')}
              {!favoritesView && !alertsView && !recentView && canEdit && t('dashboard.noLinksHint')}
            </div>
          ) : viewMode === 'list' ? (
            <LinkList
              links={displayLinks}
              pathMap={pathMap}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={(link) => {
                setEditing(link);
                setShowForm(true);
              }}
              onDelete={onDelete}
              onToggleFavorite={onToggleFavorite}
              onTest={onTest}
            />
          ) : viewMode === 'edited' ? (
            <LinkListEdited
              links={displayLinks}
              pathMap={pathMap}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={(link) => {
                setEditing(link);
                setShowForm(true);
              }}
              onDelete={onDelete}
              onToggleFavorite={onToggleFavorite}
              onTest={onTest}
            />
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
                  onTest={onTest}
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
