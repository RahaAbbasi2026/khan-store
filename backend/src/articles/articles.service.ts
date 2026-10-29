import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { assertImage, mediaUrl } from '../media/media-utils';
import { cleanSeo, recordSlugChange } from '../seo/seo-utils';

type SeoInput = Partial<{
  seoTitle: string;
  seoDescription: string;
  noindex: boolean;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
}>;

@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) {}

  async findPublished(page = 1) {
    const articles = await this.prisma.article.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * 12, take: 12,
      select: { id: true, slug: true, title: true, excerpt: true, publishedAt: true, updatedAt: true, noindex: true, canonicalUrl: true },
    });
    return articles.map((article) => ({ ...article, coverImage: mediaUrl(`articles/${article.id}`) }));
  }

  async findPublishedBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({ where: { slug } });
    if (!article || article.status !== 'PUBLISHED') {
      throw new NotFoundException('مقاله یافت نشد');
    }
    return {
      ...article,
      coverImage: article.coverImage?.startsWith('data:') ? mediaUrl(`articles/${article.id}`) : article.coverImage,
      ogImage: article.ogImage?.startsWith('data:') ? mediaUrl(`articles/${article.id}/og`) : article.ogImage,
    };
  }

  findAllForAdmin() {
    return this.prisma.article.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOneForAdmin(id: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('مقاله یافت نشد');
    return article;
  }

  async create(data: {
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    coverImage?: string;
    status?: 'DRAFT' | 'PUBLISHED';
  } & SeoInput) {
    const existing = await this.prisma.article.findUnique({ where: { slug: data.slug } });
    if (data.coverImage) assertImage(data.coverImage);
    if (existing) throw new BadRequestException('این اسلاگ قبلاً استفاده شده است');
    data = cleanSeo(data);

    return this.prisma.$transaction(async (tx) => {
      // A live slug always wins over an old redirect with the same text.
      await tx.slugRedirect.deleteMany({ where: { type: 'ARTICLE', fromSlug: data.slug } });
      return tx.article.create({
        data: {
          ...data,
          status: data.status ?? 'DRAFT',
          publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
        },
      });
    });
  }

  async update(
    id: string,
    data: Partial<{
      slug: string;
      title: string;
      excerpt: string;
      content: string;
      coverImage: string;
      status: 'DRAFT' | 'PUBLISHED';
    }> & SeoInput,
  ) {
    const existing = await this.findOneForAdmin(id);
    if (data.coverImage) assertImage(data.coverImage);
    data = cleanSeo(data);
    const becomingPublished = data.status === 'PUBLISHED' && existing.status !== 'PUBLISHED';
    const newSlug = data.slug && data.slug !== existing.slug ? data.slug : null;
    if (newSlug && (await this.prisma.article.findUnique({ where: { slug: newSlug } }))) {
      throw new BadRequestException('این اسلاگ قبلاً استفاده شده است');
    }

    return this.prisma.$transaction(async (tx) => {
      // Once an article has been public its old address must keep working, as a permanent redirect.
      if (newSlug && existing.publishedAt) await recordSlugChange(tx, 'ARTICLE', id, existing.slug, newSlug);
      else if (newSlug) await tx.slugRedirect.deleteMany({ where: { type: 'ARTICLE', fromSlug: newSlug } });
      return tx.article.update({
        where: { id },
        data: {
          ...data,
          ...(becomingPublished ? { publishedAt: new Date() } : {}),
        },
      });
    });
  }

  async remove(id: string) {
    await this.findOneForAdmin(id);
    await this.prisma.$transaction([
      this.prisma.slugRedirect.deleteMany({ where: { type: 'ARTICLE', targetId: id } }),
      this.prisma.article.delete({ where: { id } }),
    ]);
    return { success: true };
  }
}
