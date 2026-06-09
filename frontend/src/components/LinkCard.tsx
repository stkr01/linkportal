import { useState } from 'react';
import type { LinkItem } from '../types';
import { useTranslation } from '../i18n';

interface Props {
  link: LinkItem;
  path: string;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (l: LinkItem) => void;
  onDelete: (l: LinkItem) => void;
  onToggleFavorite: (l: LinkItem) => void;
}

function faviconUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return `${u.origin}/favicon.ico`;
  } catch {
    return null;
  }
}

export default function LinkCard({ link, path, canEdit, canDelete, onEdit, onDelete, onToggleFavorite }: Props) {
  const { t } = useTranslation();
  const fav = faviconUrl(link.url);
  const added = new Date(link.dateAdded).toLocaleDateString('en-GB');

  // Försök i tur och ordning: angiven bild → favicon → bokstavs-fallback.
  const sources = [link.imageUrl, fav].filter(Boolean) as string[];
  const [srcIndex, setSrcIndex] = useState(0);
  const currentSrc = sources[srcIndex];

  const copy = () => {
    navigator.clipboard.writeText(link.url);
  };

  return (
    <div className="card link-card">
      <div className="crumb">{path}</div>
      <div className="link-head">
        <a
          className={`link-thumb${currentSrc ? '' : ' thumb-fallback'}`}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          title={t('card.openTitle', { name: link.name })}
        >
          {currentSrc ? (
            <img src={currentSrc} alt="" onError={() => setSrcIndex((i) => i + 1)} />
          ) : (
            <span className="thumb-letter">{link.name.charAt(0).toUpperCase()}</span>
          )}
        </a>
        <h3>
          {canEdit && (
            <button
              type="button"
              className="fav-toggle"
              title={link.isFavorite ? t('card.removeFavorite') : t('card.addFavorite')}
              aria-label={link.isFavorite ? t('card.removeFavorite') : t('card.addFavorite')}
              onClick={() => onToggleFavorite(link)}
            >
              {link.isFavorite ? '★' : '☆'}
            </button>
          )}
          {!canEdit && link.isFavorite && <span title={t('card.favorite')}>★</span>}
          <a href={link.url} target="_blank" rel="noopener noreferrer">
            {link.name}
          </a>
          <span className={`env ${link.environment}`}>{link.environment}</span>
          {link.status === 'DEPRECATED' && <span className="env PROD">{t('card.deprecated')}</span>}
        </h3>
      </div>

      {link.description && <p className="desc">{link.description}</p>}

      <div className="meta">
        {link.manageSoftware && (
          <>
            🛠 {link.manageSoftware}
            <br />
          </>
        )}
        {link.owningTeam && (
          <>
            👥 {link.owningTeam}
            <br />
          </>
        )}
        {link.addedBy
          ? t('card.addedBy', { date: added, name: link.addedBy.displayName })
          : t('card.added', { date: added })}
      </div>

      {link.tags.length > 0 && (
        <div>
          {link.tags.map((t) => (
            <span key={t.id} className="tag">
              {t.name}
            </span>
          ))}
        </div>
      )}

      <div className="actions">
        <button className="secondary" onClick={copy}>
          {t('card.copy')}
        </button>
        <a href={link.url} target="_blank" rel="noopener noreferrer">
          <button className="secondary">{t('card.open')}</button>
        </a>
        {canEdit && (
          <button className="secondary" onClick={() => onEdit(link)}>
            {t('common.edit')}
          </button>
        )}
        {canDelete && (
          <button className="danger" onClick={() => onDelete(link)}>
            {t('common.delete')}
          </button>
        )}
      </div>
    </div>
  );
}
