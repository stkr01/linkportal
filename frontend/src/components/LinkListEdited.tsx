import type { LinkItem } from '../types';
import { useTranslation } from '../i18n';
import { formatDate } from '../utils/date';
import HealthDot from './HealthDot';

interface Props {
  links: LinkItem[];
  pathMap: Map<number, string>;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (l: LinkItem) => void;
  onDelete: (l: LinkItem) => void;
  onToggleFavorite: (l: LinkItem) => void;
  onTest?: (l: LinkItem) => void;
  highlightId?: number | null;
}

// Detail view variant that shows audit info (Last Edit / Edited by) instead of Tags.
export default function LinkListEdited({
  links,
  pathMap,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onToggleFavorite,
  onTest,
  highlightId,
}: Props) {
  const { t } = useTranslation();
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
            <th>{t('list.lastEdit')}</th>
            <th>{t('list.editedBy')}</th>
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
                  <a href={l.url} target="_blank" rel="noopener noreferrer">
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
                <td className="muted">{formatDate(l.dateModified)}</td>
                <td className="muted">{l.modifiedBy?.displayName ?? '—'}</td>
                <td className="col-actions">
                  <div className="row-actions">
                    <button className="secondary" onClick={() => copy(l.url)}>
                      {t('card.copy')}
                    </button>
                    <a href={l.url} target="_blank" rel="noopener noreferrer">
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
