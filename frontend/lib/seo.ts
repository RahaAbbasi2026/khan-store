import { notFound, permanentRedirect } from 'next/navigation';
import { api, ApiError } from './api';
import { SITE_URL } from './seoText';

export { SITE_NAME, SITE_URL } from './seoText';

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

/**
 * Like orNotFound, but a 404 for a renamed product or article becomes a permanent redirect
 * to its current address (the API keeps old slugs after a slug change).
 */
export async function orRedirect<T>(request: Promise<T>, type: 'product' | 'article', slug: string): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
    const target = await orNull(api.getRedirect(type, slug));
    if (target && target.slug !== slug) {
      permanentRedirect(type === 'product' ? `/product/${target.slug}` : `/magazine/${target.slug}`);
    }
    notFound();
  }
}

/** Whether a canonical override points at this page itself (empty means it does). */
export function isSelfCanonical(canonicalUrl: string | null | undefined, path: string) {
  if (!canonicalUrl) return true;
  return canonicalUrl === path || canonicalUrl === absoluteUrl(path);
}
