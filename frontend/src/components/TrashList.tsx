import type { LinkItem } from '../types';
import { useTranslation } from '../i18n';
import { formatDateTime } from '../utils/date';

interface Props {
  links: LinkItem[];
  pathMap: Map<number, string>;
  onRestore: (l: LinkItem) => void;
  onDeletePermanently: (l: LinkItem) => void;
}

// Trash view: soft-deleted links with restore / permanent-delete actions (ADMIN only).
export default function TrashList({ links, pathMap, onRestore, onDeletePermanently }: Props) {
  const { t } = useTranslation();

  return (
    <div className="card link-table-wrap">
      <table className="link-table">
        <thead>
          <tr>
            <th>{t('list.name')}</th>
            <th>{t('list.category')}</th>
            <th>{t('list.environment')}</th>
            <th>{t('trash.colDeleted')}</th>
            <th className="col-actions">{t('list.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {links.map((l) => (
            <tr key={l.id}>
              <td>
                <a href={l.url} target="_blank" rel="noopener noreferrer">
                  {l.name}
                </a>
              </td>
              <td className="muted">{pathMap.get(l.categoryId) ?? ''}</td>
              <td>
                <span className={`env ${l.environment}`}>{l.environment}</span>
              </td>
              <td className="muted">{l.deletedAt ? formatDateTime(l.deletedAt) : '—'}</td>
              <td className="col-actions">
                <div className="row-actions">
                  <button className="secondary" onClick={() => onRestore(l)}>
                    {t('trash.restore')}
                  </button>
                  <button className="danger" onClick={() => onDeletePermanently(l)}>
                    {t('trash.deletePermanently')}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
