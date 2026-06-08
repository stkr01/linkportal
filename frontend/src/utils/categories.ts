import type { CategoryNode } from '../types';

export interface FlatCategory {
  id: number;
  name: string;
  path: string;
  depth: number;
}

// Platta ut trädet till en lista med full sökväg (för dropdowns och breadcrumbs).
export function flattenCategories(nodes: CategoryNode[], parentPath = '', depth = 0): FlatCategory[] {
  const result: FlatCategory[] = [];
  for (const node of nodes) {
    const path = parentPath ? `${parentPath} › ${node.name}` : node.name;
    result.push({ id: node.id, name: node.name, path, depth });
    if (node.children.length) {
      result.push(...flattenCategories(node.children, path, depth + 1));
    }
  }
  return result;
}

export function categoryPathMap(nodes: CategoryNode[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const c of flattenCategories(nodes)) {
    map.set(c.id, c.path);
  }
  return map;
}
