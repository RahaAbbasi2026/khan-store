import type { Metadata } from 'next';
import { api } from '@/lib/api';
import ArticleBody from '@/components/ArticleBody';
import { orNull, orRedirect, SITE_NAME } from '@/lib/seo';
import { pageTitle } from '@/lib/seoText';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await orNull(api.getArticle(slug));
  if (!article) return { robots: { index: false, follow: false } };
  const title = article.seoTitle || article.title;
  const description = article.seoDescription || article.excerpt;
  const ogTitle = article.ogTitle || title;
  const ogDescription = article.ogDescription || description;
  const image = [article.ogImage, article.coverImage].find((src) => src?.startsWith('http'));
  return {
    title: pageTitle(title),
    description,
    alternates: { canonical: article.canonicalUrl || `/magazine/${article.slug}` },
    ...(article.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: 'article',
      locale: 'fa_IR',
      siteName: SITE_NAME,
      url: `/magazine/${article.slug}`,
      title: ogTitle,
      description: ogDescription,
      publishedTime: article.publishedAt ?? undefined,
      modifiedTime: article.updatedAt ?? undefined,
      images: image ? [image] : undefined,
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: ogTitle, description: ogDescription, images: image ? [image] : undefined },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await orRedirect(api.getArticle(slug), 'article', slug);
  return <ArticleBody article={article} />;
}
