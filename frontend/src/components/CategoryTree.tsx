import { useState } from 'react';
import type { CategoryNode } from '../types';
import { useTranslation } from '../i18n';

interface Props {
  nodes: CategoryNode[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  favoritesActive?: boolean;
  favoritesCount?: number;
  onSelectFavorites?: () => void;
  alertsActive?: boolean;
  alertsCount?: number;
  onSelectAlerts?: () => void;
  recentActive?: boolean;
  recentCount?: number;
  onSelectRecent?: () => void;
  trashActive?: boolean;
  trashCount?: number;
  onSelectTrash?: () => void;
}

function TreeNode({
  node,
  selectedId,
  onSelect,
  depth,
}: {
  node: CategoryNode;
  selectedId: number | null;
  onSelect: (id: number) => void;
  depth: number;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = node.children.length > 0;

  return (
    <div className="tree-node">
      <div
        className={`tree-row${selectedId === node.id ? ' active' : ''}`}
        onClick={() => onSelect(node.id)}
      >
        <span
          className="twisty"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setOpen((o) => !o);
          }}
        >
          {hasChildren ? (open ? '▾' : '▸') : '•'}
        </span>
        <span>{node.name}</span>
        <span className="count">{node.linkCount}</span>
      </div>
      {hasChildren && open && (
        <div className="tree-children">
          {node.children.map((c) => (
            <TreeNode key={c.id} node={c} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoryTree({
  nodes,
  selectedId,
  onSelect,
  favoritesActive,
  favoritesCount,
  onSelectFavorites,
  alertsActive,
  alertsCount,
  onSelectAlerts,
  recentActive,
  recentCount,
  onSelectRecent,
  trashActive,
  trashCount,
  onSelectTrash,
}: Props) {
  const { t } = useTranslation();
  // The Inbox catch-all category (name starts with 📥) is pinned right under
  // "All links" instead of appearing in its normal position further down.
  const inboxNode = nodes.find((n) => n.name.trim().startsWith('📥'));
  const treeNodes = inboxNode ? nodes.filter((n) => n.id !== inboxNode.id) : nodes;
  return (
    <div>
      {onSelectFavorites && (
        <div
          className={`tree-row${favoritesActive ? ' active' : ''}`}
          onClick={onSelectFavorites}
          style={{ fontWeight: 600 }}
        >
          <span className="twisty" style={{ color: '#e0a800' }}>★</span>
          <span>{t('tree.favorites')}</span>
          <span className="count">{favoritesCount ?? 0}</span>
        </div>
      )}
      <div
        className={`tree-row${!favoritesActive && !alertsActive && !recentActive && !trashActive && selectedId === null ? ' active' : ''}`}
        onClick={() => onSelect(null)}
        style={{ fontWeight: 600 }}
      >
        <span className="twisty">•</span>
        <span>{t('tree.allLinks')}</span>
      </div>
      {inboxNode && (
        <TreeNode node={inboxNode} selectedId={selectedId} onSelect={onSelect} depth={0} />
      )}
      {onSelectRecent && (
        <div
          className={`tree-row${recentActive ? ' active' : ''}`}
          onClick={onSelectRecent}
          style={{ fontWeight: 600 }}
        >
          <span className="twisty">🆕</span>
          <span>{t('tree.recentlyAdded')}</span>
          <span className="count">{recentCount ?? 0}</span>
        </div>
      )}
      {onSelectAlerts && (
        <div
          className={`tree-row${alertsActive ? ' active' : ''}`}
          onClick={onSelectAlerts}
          style={{ fontWeight: 600 }}
        >
          <span className="twisty" style={{ color: '#d33' }}>🔴</span>
          <span>{t('tree.monitorAlerts')}</span>
          <span className="count">{alertsCount ?? 0}</span>
        </div>
      )}
      {onSelectTrash && (
        <div
          className={`tree-row${trashActive ? ' active' : ''}`}
          onClick={onSelectTrash}
          style={{ fontWeight: 600 }}
        >
          <span className="twisty">🗑</span>
          <span>{t('tree.trash')}</span>
          <span className="count">{trashCount ?? 0}</span>
        </div>
      )}
      <div style={{ marginTop: '0.5rem' }}>
        {treeNodes.map((n) => (
          <TreeNode key={n.id} node={n} selectedId={selectedId} onSelect={onSelect} depth={0} />
        ))}
      </div>
    </div>
  );
}
