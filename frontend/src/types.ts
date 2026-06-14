export type Role = 'ADMIN' | 'EDITOR' | 'VIEWER';
export type Environment = 'PROD' | 'TEST' | 'DEV' | 'NA';
export type LinkStatus = 'ACTIVE' | 'DEPRECATED';
export type HealthStatus = 'UP' | 'DOWN' | 'UNKNOWN';

export type ThemeKey = 'primary' | 'primaryDark' | 'accent' | 'bg' | 'surface' | 'text';
export type Theme = Partial<Record<ThemeKey, string>>;

export interface BackendVersion {
  version: string;
  build: number;
  commit: string;
  commitDate: string;
  branch: string;
  dirty: boolean;
  display: string;
  generatedAt: string;
}

export interface User {
  id: number;
  username: string;
  displayName: string;
  role: Role;
  mustChangePassword: boolean;
  theme?: Theme | null;
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
  imageUrl: string | null;
  environment: Environment;
  owningTeam: string | null;
  status: LinkStatus;
  isFavorite: boolean;
  healthStatus: HealthStatus;
  lastCheckedAt: string | null;
  lastUpAt: string | null;
  lastStatusCode: number | null;
  lastLatencyMs: number | null;
  doNotMonitor: boolean;
  extraMonitor: boolean;
  extraMonitorMinutes: number | null;
  alertActive: boolean;
  clickCount: number;
  categoryId: number;
  category: { id: number; name: string; parentId: number | null };
  tags: Tag[];
  dateAdded: string;
  dateModified: string;
  deletedAt: string | null;
  addedBy: { id: number; displayName: string; username: string } | null;
  modifiedBy: { id: number; displayName: string; username: string } | null;
}

export interface LinkInput {
  name: string;
  url: string;
  categoryId: number;
  manageSoftware?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  environment?: Environment;
  owningTeam?: string | null;
  status?: LinkStatus;
  tags?: string[];
  doNotMonitor?: boolean;
  extraMonitor?: boolean;
  extraMonitorMinutes?: number | null;
}

export interface AppSettings {
  healthCheckEnabled: boolean;
  healthCheckIntervalHours: number;
  healthCheckTimeoutSec: number;
  healthRetentionDays: number;
  webAppUrl: string;
}

export interface LinkExportItem {
  name: string;
  url: string;
  categoryPath: string[];
  manageSoftware: string | null;
  description: string | null;
  imageUrl: string | null;
  environment: Environment;
  owningTeam: string | null;
  status: LinkStatus;
  tags: string[];
  doNotMonitor: boolean;
  extraMonitor: boolean;
  extraMonitorMinutes: number | null;
}

export interface LinkExport {
  version: number;
  exportedAt: string;
  count: number;
  links: LinkExportItem[];
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: { index: number; name: string; error: string }[];
}
