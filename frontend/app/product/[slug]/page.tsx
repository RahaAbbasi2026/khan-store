import type { Metadata } from 'next';
import { api } from '@/lib/api';
import AddToCartBox from '@/components/AddToCartBox';
import ShopDisabledNotice from '@/components/ShopDisabledNotice';
import { SHOP_ENABLED } from '@/lib/site';
import StarRating from '@/components/StarRating';
import { safeJson } from '@/lib/safe-json';
import PageLinks from '@/components/PageLinks';
import Breadcrumb from '@/components/Breadcrumb';
import { absoluteUrl, availabilityUrl, breadcrumbJsonLd, orNull, orRedirect, SITE_NAME } from '@/lib/seo';
import { fallbackDescription, pageTitle } from '@/lib/seoText';

const lightLabel: Record<string, string> = {
  LOW: 'کم‌نور',
  INDIRECT: 'غیرمستقیم',
  DIRECT: 'مستقیم',
};
const difficultyLabel: Record<string, string> = {
  EASY: 'آسان',
  MEDIUM: 'متوسط',
  HARD: 'حرفه‌ای',
};
const stockLabel: Record<string, string> = {
  IN_STOCK: '● موجود در انبار',
  OUT_OF_STOCK: '● ناموجود',
  PREORDER: '● قابل پیش‌سفارش',
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await orNull(api.getProduct(slug));
  if (!product) return { robots: { index: false, follow: false } };

  const title = product.seoTitle || product.nameFa;
  const description = product.seoDescription || fallbackDescription(product.description);
  const ogTitle = product.ogTitle || title;
  const ogDescription = product.ogDescription || description;
  const image = [product.ogImage, product.images[0]].find((src) => src?.startsWith('http'));
  return {
    // The root layout title template appends the brand name unless the title already has it.
    title: pageTitle(title),
    description,
    alternates: { canonical: product.canonicalUrl || `/product/${product.slug}` },
    ...(product.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: 'website',
      locale: 'fa_IR',
      siteName: SITE_NAME,
      url: `/product/${product.slug}`,
      title: ogTitle,
      description: ogDescription,
      images: image ? [image] : undefined,
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: ogTitle, description: ogDescription, images: image ? [image] : undefined },
  };
}

export default async function ProductPage({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const product = await orRedirect(api.getProduct(slug), 'product', slug);

  const page = Math.min(10000, Math.max(1, Math.floor(Number((await searchParams).page) || 1)));
  const { reviews, count } = await api.getProductReviews(product.id, page).catch(() => ({ reviews: [], count: 0 }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${absoluteUrl(`/product/${product.slug}`)}#product`,
    url: absoluteUrl(`/product/${product.slug}`),
    name: product.nameFa,
    description: product.description,
    sku: product.id,
    category: product.category.nameFa,
    brand: { '@type': 'Brand', name: SITE_NAME },
    ...(product.images.length ? { image: product.images } : {}),
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(`/product/${product.slug}`),
      priceCurrency: 'IRR',
      price: product.priceToman * 10,
      availability: availabilityUrl(product.stockStatus),
    },
    ...(product.ratingCount
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.ratingAverage,
            reviewCount: product.ratingCount,
          },
        }
      : {}),
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(jsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJson(breadcrumbJsonLd([
            { name: 'خانه', path: '/' },
            { name: 'کاتالوگ', path: '/catalog' },
            { name: product.category.nameFa, path: `/catalog?category=${product.category.slug}` },
            { name: product.nameFa, path: `/product/${product.slug}` },
          ])),
        }}
      />
      <Breadcrumb
        items={[
          { name: 'خانه', href: '/' },
          { name: 'کاتالوگ', href: '/catalog' },
          { name: product.category.nameFa, href: `/catalog?category=${product.category.slug}` },
          { name: product.nameFa },
        ]}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.images[0] || '/images/placeholder.jpg'}
            alt={product.nameFa}
            width={800}
            height={800}
            fetchPriority="high"
            decoding="async"
            className="w-full aspect-square rounded-md border border-bronze/30 object-cover"
          />
        </div>

        <div>
          {product.nameScientific && (
            <div className="italic text-ink-soft mb-1">{product.nameScientific}</div>
          )}
          <h1 className="font-display text-4xl text-ruby mb-3">{product.nameFa}</h1>

          {product.ratingCount ? (
            <div className="flex items-center gap-2 mb-3">
              <StarRating value={Math.round(product.ratingAverage ?? 0)} readOnly size="text-base" />
              <span className="text-xs text-ink-soft">
                ({product.ratingCount.toLocaleString('fa-IR')} نظر)
              </span>
            </div>
          ) : null}

          <div className="inline-block text-sm px-4 py-1 rounded-full bg-[#E7F3EC] text-ruby mb-4">
            {stockLabel[product.stockStatus]}
          </div>
          <div className="text-2xl font-bold text-navy mb-3">
            {product.priceToman.toLocaleString('fa-IR')}{' '}
            <small className="font-normal text-ink-soft text-sm">تومان</small>
          </div>
          <p className="text-ink-soft text-sm">{product.description}</p>

          {(product.light || product.waterPerWeek || product.tempMinC || product.careDifficulty) && (
            <div className="grid grid-cols-2 gap-3 my-6">
              {product.light && (
                <div className="border border-bronze/30 rounded-lg p-3 text-center bg-white">
                  <div className="text-lg mb-1">☀️</div>
                  <div className="text-xs text-ink-soft">نور</div>
                  <div className="text-sm font-semibold text-ruby">{lightLabel[product.light]}</div>
                </div>
              )}
              {product.waterPerWeek && (
                <div className="border border-bronze/30 rounded-lg p-3 text-center bg-white">
                  <div className="text-lg mb-1">💧</div>
                  <div className="text-xs text-ink-soft">آبیاری</div>
                  <div className="text-sm font-semibold text-ruby">
                    هفته‌ای {product.waterPerWeek.toLocaleString('fa-IR')} بار
                  </div>
                </div>
              )}
              {product.tempMinC && product.tempMaxC && (
                <div className="border border-bronze/30 rounded-lg p-3 text-center bg-white">
                  <div className="text-lg mb-1">🌡️</div>
                  <div className="text-xs text-ink-soft">دمای مناسب</div>
                  <div className="text-sm font-semibold text-ruby">
                    {product.tempMinC.toLocaleString('fa-IR')} تا {product.tempMaxC.toLocaleString('fa-IR')} درجه
                  </div>
                </div>
              )}
              {product.careDifficulty && (
                <div className="border border-bronze/30 rounded-lg p-3 text-center bg-white">
                  <div className="text-lg mb-1">🪴</div>
                  <div className="text-xs text-ink-soft">سختی نگهداری</div>
                  <div className="text-sm font-semibold text-ruby">
                    {difficultyLabel[product.careDifficulty]}
                  </div>
                </div>
              )}
            </div>
          )}

          {product.petSafe && (
            <div className="flex items-center gap-2 text-sm text-ruby mb-2">
              🐾 مناسب برای خانه‌های دارای حیوان خانگی
            </div>
          )}

          {SHOP_ENABLED ? <AddToCartBox product={product} /> : <ShopDisabledNotice compact />}
        </div>
      </div>

      <div className="max-w-2xl mt-16">
        <h2 className="font-display text-2xl text-ruby mb-6">دیدگاه مشتریان</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-ink-soft">هنوز نظری برای این محصول ثبت نشده.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="border-b border-bronze/20 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">{r.customer.name}</span>
                  <StarRating value={r.rating} readOnly size="text-sm" />
                </div>
                {r.comment && <p className="text-sm text-ink-soft">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
        <PageLinks base={`/product/${slug}`} page={page} hasNext={page * 12 < count} />
      </div>
    </div>
  );
}
