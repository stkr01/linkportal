import { useState } from 'react';
import type { LinkItem } from '../types';
import { useTranslation } from '../i18n';
import { formatDate, formatDateTime } from '../utils/date';
import HealthDot from './HealthDot';

interface Props {
  link: LinkItem;
  path: string;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (l: LinkItem) => void;
  onDelete: (l: LinkItem) => void;
  onToggleFavorite: (l: LinkItem) => void;
  onTest?: (l: LinkItem) => void;
  onOpen?: (l: LinkItem) => void;
  highlight?: boolean;
}

function faviconUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return `${u.origin}/favicon.ico`;
  } catch {
    return null;
  }
}

export default function LinkCard({ link, path, canEdit, canDelete, onEdit, onDelete, onToggleFavorite, onTest, onOpen, highlight }: Props) {
  const { t } = useTranslation();
  const fav = faviconUrl(link.url);
  const lastEdited = formatDate(link.dateModified);

  // Försök i tur och ordning: angiven bild → favicon → bokstavs-fallback.
  const sources = [link.imageUrl, fav].filter(Boolean) as string[];
  const [srcIndex, setSrcIndex] = useState(0);
  const currentSrc = sources[srcIndex];

  // Transient "Copied!" feedback for the two copy buttons.
  const [copied, setCopied] = useState<'url' | 'link' | null>(null);
  const flash = (what: 'url' | 'link') => {
    setCopied(what);
    setTimeout(() => setCopied(null), 1500);
  };

  const copy = () => {
    navigator.clipboard.writeText(link.url);
    flash('url');
  };

  // Shareable deep link to this entry inside LinkPortal (not the tool URL).
  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/link/${link.id}`);
    flash('link');
  };

  // Monitoring status as a colored frame around the whole card.
  const monClass = link.doNotMonitor
    ? 'mon-off'
    : link.healthStatus === 'UP'
    ? 'mon-up'
    : link.healthStatus === 'DOWN'
    ? 'mon-down'
    : 'mon-unknown';

  return (
    <div className={`card link-card ${monClass}${highlight ? ' highlight' : ''}`} id={`link-${link.id}`}>
      <div className="crumb">{path}</div>
      <div className="link-head">
        <a
          className={`link-thumb${currentSrc ? '' : ' thumb-fallback'}`}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          title={t('card.openTitle', { name: link.name })}
          onClick={() => onOpen?.(link)}
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
          <a href={link.url} target="_blank" rel="noopener noreferrer" onClick={() => onOpen?.(link)}>
            {link.name}
          </a>
          <HealthDot link={link} onTest={canEdit && onTest ? () => onTest(link) : undefined} />
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
        {link.lastUpAt && (
          <>
            ✅ {t('health.lastUpAt', { date: formatDateTime(link.lastUpAt) })}
            <br />
          </>
        )}
        {link.modifiedBy
          ? t('card.lastEditedBy', { date: lastEdited, name: link.modifiedBy.displayName })
          : t('card.lastEdited', { date: lastEdited })}
        <span className="click-count" title={`${t('list.clicks')}: ${link.clickCount}`}>
          {' · '}
          {t('card.clicks', { count: link.clickCount })}
        </span>
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
          {copied === 'url' ? t('card.copied') : t('card.copy')}
        </button>
        <button className="secondary" onClick={copyLink} title={t('card.copyLinkTitle')}>
          {copied === 'link' ? t('card.copied') : t('card.copyLink')}
        </button>
        <a href={link.url} target="_blank" rel="noopener noreferrer" onClick={() => onOpen?.(link)}>
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
