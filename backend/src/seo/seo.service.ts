import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { fallbackDescription, normalizeForCompare } from './seo-utils';

type Kind = 'product' | 'article';
interface Page { type: Kind; id: string; slug: string; name: string; title: string; description: string }

@Injectable()
export class SeoService {
  constructor(private prisma: PrismaService) {}

  /** Current slug for an old one, or null. Unpublished articles are not revealed. */
  async resolveRedirect(type: Kind, slug: string) {
    const row = await this.prisma.slugRedirect.findUnique({
      where: { type_fromSlug: { type: type === 'product' ? 'PRODUCT' : 'ARTICLE', fromSlug: slug } },
    });
    if (!row) return null;
    if (type === 'product') {
      const product = await this.prisma.product.findUnique({ where: { id: row.targetId }, select: { slug: true } });
      return product?.slug ?? null;
    }
    const article = await this.prisma.article.findUnique({ where: { id: row.targetId }, select: { slug: true, status: true } });
    return article?.status === 'PUBLISHED' ? article.slug : null;
  }

  /** Products and articles whose effective search title or description equals the given text. */
  async findDuplicates(query: { title?: string; description?: string; excludeType?: Kind; excludeId?: string }) {
    const [products, articles] = await Promise.all([
      this.prisma.product.findMany({ select: { id: true, slug: true, nameFa: true, seoTitle: true, seoDescription: true, description: true } }),
      this.prisma.article.findMany({ select: { id: true, slug: true, title: true, seoTitle: true, seoDescription: true, excerpt: true } }),
    ]);
    const pages: Page[] = [
      ...products.map((p) => ({ type: 'product' as const, id: p.id, slug: p.slug, name: p.nameFa,
        title: p.seoTitle || p.nameFa, description: p.seoDescription || fallbackDescription(p.description) })),
      ...articles.map((a) => ({ type: 'article' as const, id: a.id, slug: a.slug, name: a.title,
        title: a.seoTitle || a.title, description: a.seoDescription || a.excerpt })),
    ].filter((p) => !(p.type === query.excludeType && p.id === query.excludeId));

    const match = (field: 'title' | 'description', text?: string) => {
      const wanted = text ? normalizeForCompare(text) : '';
      if (!wanted) return [];
      return pages.filter((p) => normalizeForCompare(p[field]) === wanted)
        .map(({ type, id, slug, name }) => ({ type, id, slug, name }));
    };
    return { title: match('title', query.title), description: match('description', query.description) };
  }
}
