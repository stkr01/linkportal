import type { LinkItem } from '../types';
import { useTranslation } from '../i18n';
import { useMonitoringPref } from '../prefs/monitoring';
import HealthDot from './HealthDot';
import { formatDateTime } from '../utils/date';

interface Props {
  links: LinkItem[];
  pathMap: Map<number, string>;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (l: LinkItem) => void;
  onDelete: (l: LinkItem) => void;
  onToggleFavorite: (l: LinkItem) => void;
  onTest?: (l: LinkItem) => void;
  onOpen?: (l: LinkItem) => void;
  highlightId?: number | null;
}

// Compact, image-free detail view (alternative to the card grid).
export default function LinkList({
  links,
  pathMap,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onToggleFavorite,
  onTest,
  onOpen,
  highlightId,
}: Props) {
  const { t } = useTranslation();
  const { hideMonitoring } = useMonitoringPref();
  const copy = (url: string) => navigator.clipboard.writeText(url);

  return (
    <div className="card link-table-wrap">
      <table className="link-table">
        <thead>
          <tr>
            <th className="col-fav" aria-label={t('card.favorite')}></th>
            <th>{t('list.name')}</th>
            <th>{t('list.category')}</th>
            <th>{t('list.environment')}</th>
            <th>{t('list.manageSoftware')}</th>
            <th>{t('list.team')}</th>
            {!hideMonitoring && <th>{t('list.lastUp')}</th>}
            <th className="col-clicks">{t('list.clicks')}</th>
            <th>{t('list.tags')}</th>
            <th className="col-actions">{t('list.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {links.map((l) => (
              <tr key={l.id} id={`link-${l.id}`} className={l.id === highlightId ? 'highlight' : undefined}>
                <td className="col-fav">
                  {canEdit ? (
                    <button
                      type="button"
                      className="fav-toggle"
                      title={l.isFavorite ? t('card.removeFavorite') : t('card.addFavorite')}
                      aria-label={l.isFavorite ? t('card.removeFavorite') : t('card.addFavorite')}
                      onClick={() => onToggleFavorite(l)}
                    >
                      {l.isFavorite ? '★' : '☆'}
                    </button>
                  ) : l.isFavorite ? (
                    <span title={t('card.favorite')}>★</span>
                  ) : null}
                </td>
                <td>
                  <HealthDot link={l} onTest={canEdit && onTest ? () => onTest(l) : undefined} />{' '}
                  <a href={l.url} target="_blank" rel="noopener noreferrer" onClick={() => onOpen?.(l)}>
                    {l.name}
                  </a>
                  {l.status === 'DEPRECATED' && (
                    <span className="env PROD" style={{ marginLeft: '0.4rem' }}>
                      {t('card.deprecated')}
                    </span>
                  )}
                </td>
                <td className="muted">{pathMap.get(l.categoryId) ?? ''}</td>
                <td>
                  <span className={`env ${l.environment}`}>{l.environment}</span>
                </td>
                <td>{l.manageSoftware || '—'}</td>
                <td>{l.owningTeam || '—'}</td>
                {!hideMonitoring && (
                  <td
                    className={l.healthStatus === 'DOWN' ? undefined : 'muted'}
                    style={
                      l.healthStatus === 'DOWN'
                        ? { color: 'var(--danger)', fontWeight: 700 }
                        : undefined
                    }
                  >
                    {l.lastUpAt ? formatDateTime(l.lastUpAt) : '—'}
                  </td>
                )}
                <td className="col-clicks muted">{l.clickCount}</td>
                <td>
                  {l.tags.length > 0 ? (
                    <div className="row-tags">
                      {l.tags.map((tag) => (
                        <span key={tag.id} className="tag">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="col-actions">
                  <div className="row-actions">
                    <button className="secondary" onClick={() => copy(l.url)}>
                      {t('card.copy')}
                    </button>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" onClick={() => onOpen?.(l)}>
                      <button className="secondary">{t('card.open')}</button>
                    </a>
                    {canEdit && (
                      <button className="secondary" onClick={() => onEdit(l)}>
                        {t('common.edit')}
                      </button>
                    )}
                    {canDelete && (
                      <button className="danger" onClick={() => onDelete(l)}>
                        {t('common.delete')}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
