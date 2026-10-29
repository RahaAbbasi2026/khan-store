import { getCustomerToken } from './customer-token';
import { CustomerAuthError } from './customerApi';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.message || `درخواست با خطا مواجه شد (${res.status})`, res.status);
  }
  return res.json();
}

export const api = {
  getCategories: () => request<import('./types').Category[]>('/categories'),

  getGreetingCards: (page = 1) => request<import('./types').GreetingCard[]>(`/greeting-cards?page=${page}`),

  getProductReviews: (productId: string, page = 1) =>
    request<{ reviews: import('./types').Review[]; average: number; count: number }>(
      `/products/${productId}/reviews?page=${page}`,
    ),

  getArticles: (page = 1) => request<import('./types').Article[]>(`/articles?page=${page}`),

  getArticle: (slug: string) => request<import('./types').Article>(`/articles/${slug}`),

  getRedirect: (type: 'product' | 'article', slug: string) =>
    request<{ slug: string }>(`/redirects/${type}/${encodeURIComponent(slug)}`),

  getSiteContent: (key: string) =>
    request<{ key: string; value: string | null }>(`/site-content/${key}`),

  getProducts: (params: Record<string, string | undefined>) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '') as [string, string][],
    ).toString();
    return request<{ count: number; products: import('./types').Product[] }>(
      `/products${qs ? `?${qs}` : ''}`,
    );
  },

  getProduct: (slug: string) => request<import('./types').Product>(`/products/${slug}`),

  createCart: () => request<import('./types').Cart>('/cart', { method: 'POST' }),

  getCart: (token: string) => request<import('./types').Cart>(`/cart/${token}`),

  addCartItem: (
    token: string,
    productId: string,
    quantity = 1,
    gift?: {
      occasion?: import('./types').Occasion;
      greetingCard?: string;
      message?: string;
      isAnonymous?: boolean;
    },
  ) =>
    request<import('./types').Cart>(`/cart/${token}/items`, {
      method: 'POST',
      body: JSON.stringify({ productId, quantity, ...gift }),
    }),

  updateCartItem: (token: string, itemId: string, quantity: number) =>
    request<import('./types').Cart>(`/cart/${token}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }),

  removeCartItem: (token: string, itemId: string) =>
    request<import('./types').Cart>(`/cart/${token}/items/${itemId}`, { method: 'DELETE' }),

  createOrder: (payload: {
    cartToken: string;
    customerName: string;
    phone: string;
    address: string;
    city: string;
    deliveryDate: string;
    deliverySlot: string;
  }) => {
    const customerToken = getCustomerToken();
    return fetch('/api/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        ...(customerToken ? { Authorization: `Bearer ${customerToken}` } : {}),
      },
    }).then(async (res) => {
      if (res.status === 401) throw new CustomerAuthError('برای نهایی کردن سفارش دوباره وارد شوید.');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'ثبت سفارش ناموفق بود. لطفاً دوباره تلاش کنید.');
      }
      return res.json() as Promise<{ order: import('./types').Order; paymentUrl: string }>;
    });
  },

  getOrder: (orderNumber: string, receiptToken?: string) => {
    const token = receiptToken ?? getCustomerToken();
    return request<import('./types').OrderReceipt>(`/orders/${encodeURIComponent(orderNumber)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  retryPayment: async (orderNumber: string) => {
    const token = getCustomerToken();
    const response = await fetch('/api/checkout', { method: 'POST', headers: {
      'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }, body: JSON.stringify({ retryOrderNumber: orderNumber }) });
    if (response.status === 401) throw new CustomerAuthError('دوباره وارد حساب خود شوید.');
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || 'ادامه پرداخت ممکن نشد.');
    return body as { paymentUrl: string };
  },
};
