import { notFound } from 'next/navigation';
import { ApiError } from './api';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://golekhan.ir').replace(/\/$/, '');
export const SITE_NAME = 'گل خان';

/** Absolute URL for a site path. */
export function absoluteUrl(path: string) {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Canonical path for a paginated list: page 1 is the bare path, page N adds ?page=N. */
export function pagedCanonical(base: string, page: number) {
  return page > 1 ? `${base}?page=${page}` : base;
}

/**
 * Resolve a content request. Only a real 404 from the API becomes a 404 page;
 * any other failure (outage, timeout, 5xx) is rethrown so the user gets a server
 * error instead of a false "not found" that search engines could drop from the index.
 */
export async function orNotFound<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

/** Same as orNotFound but returns null for a real 404 (used by generateMetadata). */
export async function orNull<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Map a stock status to the schema.org availability URL. */
export function availabilityUrl(status: string) {
  switch (status) {
    case 'IN_STOCK':
      return 'https://schema.org/InStock';
    case 'PREORDER':
      return 'https://schema.org/PreOrder';
    default:
      return 'https://schema.org/OutOfStock';
  }
}
