import axios from 'axios';
import type {
  AdminUser,
  CategoryNode,
  LinkInput,
  LinkItem,
  Role,
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
export async function getLinks(params: { categoryId?: number; q?: string }): Promise<LinkItem[]> {
  const { data } = await api.get('/links', { params });
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

export async function setFavorite(id: number, isFavorite: boolean): Promise<LinkItem> {
  const { data } = await api.patch(`/links/${id}/favorite`, { isFavorite });
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
