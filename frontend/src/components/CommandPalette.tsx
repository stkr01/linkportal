import { useEffect, useMemo, useState } from 'react';
import type { LinkItem } from '../types';
import { useTranslation } from '../i18n';

interface Props {
  links: LinkItem[];
  pathMap: Map<number, string>;
  onClose: () => void;
}

// Enkel fuzzy-matchning: alla tecken i query måste förekomma i ordning.
function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (!q) return 0;
  let qi = 0;
  let score = 0;
  let lastIdx = -1;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += lastIdx === ti - 1 ? 2 : 1; // bonus för sammanhängande träffar
      lastIdx = ti;
      qi++;
    }
  }
  return qi === q.length ? score : -1;
}

export default function CommandPalette({ links, pathMap, onClose }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    if (!query.trim()) return links.slice(0, 20);
    return links
      .map((l) => {
        const hay = `${l.name} ${l.manageSoftware ?? ''} ${l.owningTeam ?? ''} ${pathMap.get(l.categoryId) ?? ''}`;
        return { link: l, score: fuzzyScore(query, hay) };
      })
      .filter((r) => r.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((r) => r.link);
  }, [query, links, pathMap]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const open = (l: LinkItem) => {
    window.open(l.url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div className="card palette" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          placeholder={t('palette.placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter' && results[active]) {
              open(results[active]);
            }
          }}
        />
        <div className="palette-results">
          {results.length === 0 && <div className="palette-item muted">{t('palette.noMatches')}</div>}
          {results.map((l, i) => (
            <div
              key={l.id}
              className={`palette-item${i === active ? ' active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => open(l)}
            >
              <span className="pname">{l.name}</span>
              <span className="ppath">{pathMap.get(l.categoryId)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
