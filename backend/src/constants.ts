// Eftersom SQLite inte stöder Prisma-enums använder vi strängkonstanter + Zod.

export const Role = {
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];
export const ROLES = Object.values(Role) as [Role, ...Role[]];

export const Environment = {
  PROD: 'PROD',
  TEST: 'TEST',
  DEV: 'DEV',
  NA: 'NA',
} as const;
export type Environment = (typeof Environment)[keyof typeof Environment];
export const ENVIRONMENTS = Object.values(Environment) as [Environment, ...Environment[]];

export const LinkStatus = {
  ACTIVE: 'ACTIVE',
  DEPRECATED: 'DEPRECATED',
} as const;
export type LinkStatus = (typeof LinkStatus)[keyof typeof LinkStatus];
export const LINK_STATUSES = Object.values(LinkStatus) as [LinkStatus, ...LinkStatus[]];

// Rollhierarki för RBAC-jämförelser.
export const roleRank: Record<Role, number> = {
  VIEWER: 1,
  EDITOR: 2,
  ADMIN: 3,
};
