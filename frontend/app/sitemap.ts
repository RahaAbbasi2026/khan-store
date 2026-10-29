import type { MetadataRoute } from 'next';
import { api } from '@/lib/api';
import { SHOP_ENABLED } from '@/lib/site';
import { isSelfCanonical, SITE_URL } from '@/lib/seo';

// The sitemap must list every indexable URL. The API caps a page at 12 items, so walk all pages.
// An API failure is thrown (the sitemap request fails and crawlers retry) instead of silently
// publishing an incomplete sitemap.
const MAX_PAGES = 1000;
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/catalog`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/magazine`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/story`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/values`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'monthly', priority: 0.4 },
  ];
  const routes: MetadataRoute.Sitemap = [...staticRoutes];
  if (SHOP_ENABLED) {
    routes.push({ url: `${SITE_URL}/occasion`, changeFrequency: 'weekly', priority: 0.6 });
  }

  const first = await api.getProducts({ page: '1', limit: '12' });
  const productPages = Math.min(MAX_PAGES, Math.ceil(first.count / 12));
  const productLists = [first.products];
  for (let page = 2; page <= productPages; page++) {
    productLists.push((await api.getProducts({ page: String(page), limit: '12' })).products);
  }
  // Pages marked noindex, or whose canonical points elsewhere, are not listed.
  for (const product of productLists.flat()) {
    const path = `/product/${product.slug}`;
    if (product.noindex || !isSelfCanonical(product.canonicalUrl, path)) continue;
    routes.push({ url: `${SITE_URL}${path}`, lastModified: product.updatedAt, changeFrequency: 'weekly', priority: 0.7 });
  }

  for (let page = 1; page <= MAX_PAGES; page++) {
    const articles = await api.getArticles(page);
    for (const article of articles) {
      const path = `/magazine/${article.slug}`;
      if (article.noindex || !isSelfCanonical(article.canonicalUrl, path)) continue;
      routes.push({
        url: `${SITE_URL}${path}`,
        lastModified: article.updatedAt ?? article.publishedAt ?? undefined,
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }
    if (articles.length < 12) break;
  }

  return routes;
}
