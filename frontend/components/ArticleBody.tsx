import Breadcrumb from '@/components/Breadcrumb';
import { safeJson } from '@/lib/safe-json';
import { absoluteUrl, breadcrumbJsonLd } from '@/lib/seo';
import { SITE_NAME } from '@/lib/seoText';
import type { Article } from '@/lib/types';

/** Article layout shared by the public page and the admin preview. */
export default function ArticleBody({ article }: { article: Article }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: absoluteUrl(`/magazine/${article.slug}`),
    headline: article.title,
    description: article.excerpt,
    ...(article.coverImage ? { image: [article.coverImage] } : {}),
    ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
    dateModified: article.updatedAt ?? article.publishedAt ?? undefined,
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') },
    inLanguage: 'fa-IR',
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(jsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJson(breadcrumbJsonLd([
            { name: 'خانه', path: '/' },
            { name: 'مجله', path: '/magazine' },
            { name: article.title, path: `/magazine/${article.slug}` },
          ])),
        }}
      />
      <Breadcrumb items={[{ name: 'خانه', href: '/' }, { name: 'مجله', href: '/magazine' }, { name: article.title }]} />
      {article.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.coverImage}
          alt={article.title}
          width={1200}
          height={640}
          fetchPriority="high"
          decoding="async"
          className="w-full h-64 object-cover rounded-md mb-8 border border-bronze/30"
        />
      )}
      <div className="text-bronze text-xs tracking-[2.5px] mb-2">مجله گل خان</div>
      <h1 className="font-display text-3xl text-ruby mb-6">{article.title}</h1>
      <div className="text-sm text-ink-soft leading-8 whitespace-pre-line">{article.content}</div>
    </div>
  );
}
