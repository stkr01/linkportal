import type { LinkItem } from '../types';

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
  const fav = faviconUrl(link.url);
  const added = new Date(link.dateAdded).toLocaleDateString('sv-SE');

  const copy = () => {
    navigator.clipboard.writeText(link.url);
  };

  return (
    <div className="card link-card">
      <div className="crumb">{path}</div>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {canEdit && (
          <button
            type="button"
            className="fav-toggle"
            title={link.isFavorite ? 'Ta bort favorit' : 'Markera som favorit'}
            aria-label={link.isFavorite ? 'Ta bort favorit' : 'Markera som favorit'}
            onClick={() => onToggleFavorite(link)}
          >
            {link.isFavorite ? '★' : '☆'}
          </button>
        )}
        {!canEdit && link.isFavorite && <span title="Favorit">★</span>}
        {fav && (
          <img
            src={fav}
            alt=""
            width={16}
            height={16}
            onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
          />
        )}
        <a href={link.url} target="_blank" rel="noopener noreferrer">
          {link.name}
        </a>
        <span className={`env ${link.environment}`}>{link.environment}</span>
        {link.status === 'DEPRECATED' && <span className="env PROD">UTFASAD</span>}
      </h3>

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
        Tillagd {added}
        {link.addedBy ? ` av ${link.addedBy.displayName}` : ''}
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
          Kopiera
        </button>
        <a href={link.url} target="_blank" rel="noopener noreferrer">
          <button className="secondary">Öppna ↗</button>
        </a>
        {canEdit && (
          <button className="secondary" onClick={() => onEdit(link)}>
            Redigera
          </button>
        )}
        {canDelete && (
          <button className="danger" onClick={() => onDelete(link)}>
            Radera
          </button>
        )}
      </div>
    </div>
  );
}
