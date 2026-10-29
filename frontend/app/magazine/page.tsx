import type { Metadata } from 'next';
import Link from 'next/link';
import { api } from '@/lib/api';
import PageLinks from '@/components/PageLinks';
import { pagedCanonical } from '@/lib/seo';

const DESCRIPTION = 'مقالات آموزشی نگهداری از گل و گیاه، از فروشگاه گل خان.';

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ page?: string }> }): Promise<Metadata> {
  const page = Math.min(10000, Math.max(1, Math.floor(Number((await searchParams).page) || 1)));
  return {
    title: page > 1 ? `مجله گل و گیاه | صفحه ${page.toLocaleString('fa-IR')}` : 'مجله گل و گیاه',
    description: DESCRIPTION,
    alternates: { canonical: pagedCanonical('/magazine', page) },
  };
}

export default async function MagazinePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.min(10000, Math.max(1, Math.floor(Number((await searchParams).page) || 1)));
  // A failed request must not look like an empty magazine: let the error page handle it.
  const articles = await api.getArticles(page);

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <div className="text-center mb-12">
        <div className="text-bronze text-xs tracking-[2.5px]">مجله گل خان</div>
        <h1 className="font-display text-3xl text-ruby mt-2">مجله گل و گیاه</h1>
        <p className="text-sm text-ink-soft mt-2">راهنما و نکات نگهداری از گل و گیاه</p>
      </div>

      {articles.length === 0 ? (
        <p className="text-center text-ink-soft text-sm py-16">هنوز مقاله‌ای منتشر نشده.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {articles.map((a) => (
            <Link
              key={a.id}
              href={`/magazine/${a.slug}`}
              className="border border-bronze/30 rounded-md overflow-hidden bg-white hover:shadow-lg transition"
            >
              {a.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.coverImage} alt={a.title} width={600} height={320} loading="lazy" decoding="async" className="w-full h-40 object-cover" />
              )}
              <div className="p-4">
                <h2 className="text-base mb-2">{a.title}</h2>
                <p className="text-xs text-ink-soft line-clamp-2">{a.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
      <PageLinks base="/magazine" page={page} hasNext={articles.length === 12} />
    </div>
  );
}
