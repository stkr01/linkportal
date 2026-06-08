export type Role = 'ADMIN' | 'EDITOR' | 'VIEWER';
export type Environment = 'PROD' | 'TEST' | 'DEV' | 'NA';
export type LinkStatus = 'ACTIVE' | 'DEPRECATED';

export interface User {
  id: number;
  username: string;
  displayName: string;
  role: Role;
  mustChangePassword: boolean;
}

export interface AdminUser extends User {
  isActive: boolean;
  createdAt: string;
}

export interface CategoryNode {
  id: number;
  name: string;
  parentId: number | null;
  sortOrder: number;
  linkCount: number;
  children: CategoryNode[];
}

export interface Tag {
  id: number;
  name: string;
}

export interface LinkItem {
  id: number;
  name: string;
  url: string;
  manageSoftware: string | null;
  description: string | null;
  environment: Environment;
  owningTeam: string | null;
  status: LinkStatus;
  categoryId: number;
  category: { id: number; name: string; parentId: number | null };
  tags: Tag[];
  dateAdded: string;
  dateModified: string;
  addedBy: { id: number; displayName: string; username: string } | null;
  modifiedBy: { id: number; displayName: string; username: string } | null;
}

export interface LinkInput {
  name: string;
  url: string;
  categoryId: number;
  manageSoftware?: string | null;
  description?: string | null;
  environment?: Environment;
  owningTeam?: string | null;
  status?: LinkStatus;
  tags?: string[];
}
