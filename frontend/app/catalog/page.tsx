import type { Metadata } from 'next';
import { api } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import FilterSidebar from '@/components/FilterSidebar';
import PageLinks from '@/components/PageLinks';
import Breadcrumb from '@/components/Breadcrumb';
import { pagedCanonical } from '@/lib/seo';

type Search = Record<string, string | string[] | undefined>;
const DESCRIPTION = 'خرید آنلاین گل شاخه‌بریده، گیاهان آپارتمانی و تجهیزات باغبانی از فروشگاه گل خان.';

// Index policy: the plain catalog and its numbered pages are indexable. Any filter, search or
// sort combination is a duplicate view of the same products, so it is noindex and points to /catalog.
export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }): Promise<Metadata> {
  const query = await searchParams;
  const page = Math.min(10000, Math.max(1, Math.floor(Number(Array.isArray(query.page) ? query.page[0] : query.page) || 1)));
  const filtered = Object.entries(query).some(([key, value]) => key !== 'page' && value !== undefined && value !== '');
  if (filtered) {
    return { title: 'کاتالوگ محصولات', description: DESCRIPTION, alternates: { canonical: '/catalog' }, robots: { index: false, follow: true } };
  }
  return {
    title: page > 1 ? `کاتالوگ محصولات | صفحه ${page.toLocaleString('fa-IR')}` : 'کاتالوگ محصولات',
    description: DESCRIPTION,
    alternates: { canonical: pagedCanonical('/catalog', page) },
  };
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const query = Object.fromEntries(
    Object.entries(await searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  const page = Math.min(10000, Math.max(1, Number(query.page) || 1));
  query.page = String(Math.floor(page)); query.limit = '12';
  const [categories, { products, count }] = await Promise.all([
    api.getCategories(),
    api.getProducts(query),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <Breadcrumb items={[{ name: 'خانه', href: '/' }, { name: 'کاتالوگ' }]} />
      <div className="text-center mb-8">
        <div className="text-bronze text-xs tracking-[2.5px]">کاتالوگ کامل</div>
        <h1 className="font-display text-3xl text-ruby mt-2">محصولات گل خان</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-8">
        <FilterSidebar categories={categories} />

        <div>
          <div className="flex items-center justify-between mb-4 text-sm text-ink-soft">
            <span>{count.toLocaleString('fa-IR')} محصول</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          {products.length === 0 && (
            <p className="text-center text-ink-soft py-16">محصولی مطابق این فیلترها یافت نشد.</p>
          )}
          <PageLinks base="/catalog" page={Math.floor(page)} hasNext={page * 12 < count} query={query} />
        </div>
      </div>
    </div>
  );
}
