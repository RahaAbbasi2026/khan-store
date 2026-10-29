import { getAdminToken } from './admin-token';
import type { Product, Order, Category, GreetingCard, Article } from './types';

export interface ContactMessage {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  status: 'NEW' | 'READ' | 'RESOLVED';
  createdAt: string;
}

export interface SeoDuplicate {
  type: 'product' | 'article';
  id: string;
  slug: string;
  name: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class AdminAuthError extends Error {}

async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    cache: 'no-store',
  });

  if (res.status === 401) {
    throw new AdminAuthError('نشست شما منقضی شده، دوباره وارد شوید');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `درخواست با خطا مواجه شد (${res.status})`);
  }
  return res.json();
}

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  statusCounts: Record<string, number>;
  topProducts: { name: string; quantity: number }[];
}

export const adminApi = {
  login: (password: string) =>
    fetch(`${API_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }).then(async (res) => {
      if (!res.ok) throw new Error('رمز عبور اشتباه است');
      return res.json() as Promise<{ token: string }>;
    }),

  getDashboard: () => adminRequest<DashboardStats>('/admin/dashboard'),

  getProducts: () => adminRequest<Product[]>('/admin/products'),

  createProduct: (data: Record<string, unknown>) =>
    adminRequest<Product>('/admin/products', { method: 'POST', body: JSON.stringify(data) }),

  updateProduct: (id: string, data: Record<string, unknown>) =>
    adminRequest<Product>(`/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteProduct: (id: string) =>
    adminRequest<{ success: boolean }>(`/admin/products/${id}`, { method: 'DELETE' }),

  getCategories: () => adminRequest<Category[]>('/categories'),

  getOrders: () => adminRequest<Order[]>('/admin/orders'),

  updateOrderStatus: (id: string, status: string) =>
    adminRequest<Order>(`/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getGreetingCards: (page = 1) => adminRequest<GreetingCard[]>(`/greeting-cards?page=${page}`),

  createGreetingCard: (imageData: string, label?: string) =>
    adminRequest<GreetingCard>('/admin/greeting-cards', {
      method: 'POST',
      body: JSON.stringify({ imageData, label }),
    }),

  deleteGreetingCard: (id: string) =>
    adminRequest<{ success: boolean }>(`/admin/greeting-cards/${id}`, { method: 'DELETE' }),

  getContactMessages: () => adminRequest<ContactMessage[]>('/admin/contact-messages'),

  updateContactMessageStatus: (id: string, status: string) =>
    adminRequest<ContactMessage>(`/admin/contact-messages/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getArticles: () => adminRequest<Article[]>('/admin/articles'),

  getArticle: (id: string) => adminRequest<Article>(`/admin/articles/${id}`),

  createArticle: (data: Record<string, unknown>) =>
    adminRequest<Article>('/admin/articles', { method: 'POST', body: JSON.stringify(data) }),

  updateArticle: (id: string, data: Record<string, unknown>) =>
    adminRequest<Article>(`/admin/articles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteArticle: (id: string) =>
    adminRequest<{ success: boolean }>(`/admin/articles/${id}`, { method: 'DELETE' }),

  generateArticleDraft: (topic: string) =>
    adminRequest<{ title: string; excerpt: string; content: string }>('/admin/articles/generate', {
      method: 'POST',
      body: JSON.stringify({ topic }),
    }),

  findSeoDuplicates: (params: { title?: string; description?: string; excludeType?: 'product' | 'article'; excludeId?: string }) =>
    adminRequest<{ title: SeoDuplicate[]; description: SeoDuplicate[] }>(
      `/admin/seo/duplicates?${new URLSearchParams(
        Object.entries(params).filter(([, v]) => v) as [string, string][],
      ).toString()}`,
    ),

  getSiteContent: (key: string) =>
    adminRequest<{ key: string; value: string | null }>(`/site-content/${key}`),

  saveSiteContent: (key: string, value: string) =>
    adminRequest<{ key: string; value: string }>(`/admin/site-content/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),
};
