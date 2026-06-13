import axios from 'axios';
import type {
  AdminUser,
  AppSettings,
  CategoryNode,
  ImportResult,
  LinkExport,
  LinkExportItem,
  LinkInput,
  LinkItem,
  Role,
  Tag,
  Theme,
  User,
} from '../types';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Auth
export async function login(username: string, password: string): Promise<{ user: User }> {
  const { data } = await api.post('/auth/login', { username, password });
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function getMe(): Promise<User> {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post('/auth/change-password', { currentPassword, newPassword });
}

export async function updateTheme(theme: Theme | null): Promise<{ theme: Theme | null }> {
  const { data } = await api.put('/auth/theme', { theme });
  return data;
}

// Categories
export async function getCategories(): Promise<CategoryNode[]> {
  const { data } = await api.get('/categories');
  return data;
}

export async function createCategory(input: { name: string; parentId: number | null }): Promise<void> {
  await api.post('/categories', input);
}

export async function updateCategory(
  id: number,
  input: { name?: string; parentId?: number | null }
): Promise<void> {
  await api.put(`/categories/${id}`, input);
}

export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/categories/${id}`);
}

// Links
export async function getLinks(params: {
  categoryId?: number;
  q?: string;
  tags?: number[];
  environment?: string[];
}): Promise<LinkItem[]> {
  const { tags, environment, ...rest } = params;
  const { data } = await api.get('/links', {
    params: {
      ...rest,
      tags: tags && tags.length ? tags.join(',') : undefined,
      environment: environment && environment.length ? environment.join(',') : undefined,
    },
  });
  return data;
}

// Tags (för filter)
export async function getTags(): Promise<Tag[]> {
  const { data } = await api.get('/tags');
  return data;
}

export async function createLink(input: LinkInput): Promise<LinkItem> {
  const { data } = await api.post('/links', input);
  return data;
}

export async function updateLink(id: number, input: LinkInput): Promise<LinkItem> {
  const { data } = await api.put(`/links/${id}`, input);
  return data;
}

export async function deleteLink(id: number): Promise<void> {
  await api.delete(`/links/${id}`);
}

export async function getDeletedLinks(): Promise<LinkItem[]> {
  const { data } = await api.get('/links/deleted');
  return data;
}

export async function restoreLink(id: number): Promise<LinkItem> {
  const { data } = await api.post(`/links/${id}/restore`);
  return data;
}

export async function permanentDeleteLink(id: number): Promise<void> {
  await api.delete(`/links/${id}/permanent`);
}

export async function setFavorite(id: number, isFavorite: boolean): Promise<LinkItem> {
  const { data } = await api.patch(`/links/${id}/favorite`, { isFavorite });
  return data;
}

// Health-check
export async function testLink(id: number): Promise<LinkItem> {
  const { data } = await api.post(`/links/${id}/test`);
  return data;
}

export async function testAllLinks(ids?: number[]): Promise<{ ok: boolean; tested: number }> {
  const { data } = await api.post('/links/test-all', ids && ids.length ? { ids } : {});
  return data;
}

// Import / export
export async function exportLinks(): Promise<LinkExport> {
  const { data } = await api.get('/links/export');
  return data;
}

export async function importLinks(payload: { links: LinkExportItem[] }): Promise<ImportResult> {
  const { data } = await api.post('/links/import', payload);
  return data;
}

export async function getSettings(): Promise<AppSettings> {
  const { data } = await api.get('/settings');
  return data;
}

export async function updateSettings(input: Partial<AppSettings>): Promise<AppSettings> {
  const { data } = await api.put('/settings', input);
  return data;
}

// Users (admin)
export async function getUsers(): Promise<AdminUser[]> {
  const { data } = await api.get('/users');
  return data;
}

export async function createUser(input: {
  username: string;
  displayName: string;
  password: string;
  role: Role;
}): Promise<void> {
  await api.post('/users', input);
}

export async function updateUser(
  id: number,
  input: { displayName?: string; role?: Role; isActive?: boolean; newPassword?: string }
): Promise<void> {
  await api.put(`/users/${id}`, input);
}
