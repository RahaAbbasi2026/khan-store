import type { Metadata } from 'next';
import Link from 'next/link';
import { api } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { SHOP_ENABLED } from '@/lib/site';

export const metadata: Metadata = {
  title: { absolute: 'گل خان | فروشگاه آنلاین ممتاز گل و گیاه' },
  description: 'خرید آنلاین گل شاخه‌بریده، گل مناسبتی و گیاهان آپارتمانی از گل خان، همراه با راهنمای نگهداری و ارسال در تهران.',
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const [{ products }, categories] = await Promise.all([
    api.getProducts({ sort: 'newest' }),
    api.getCategories(),
  ]);

  const bestsellers = products.slice(0, 4);

  return (
    <div>
      <section className="relative bg-[radial-gradient(ellipse_at_30%_20%,_#8C1C41,_#45091F_75%)] text-ivory py-24 px-6 border-b border-bronze overflow-hidden">
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="text-bronze-light text-sm tracking-[3px]">فروشگاه اختصاصی گل و گیاه</div>
          <h1 className="font-display text-6xl mt-3 mb-2">گل خان</h1>
          <p className="max-w-xl mx-auto text-[#E7E0CC] mb-8">
            از دل باغ‌های اصیل ایرانی تا خانه شما؛ گل و گیاهی که شأن هدیه دادن را به‌جا می‌آورد.
          </p>
          <Link
            href="/catalog"
            className="inline-block border border-bronze bg-bronze text-ruby-deep px-8 py-3 rounded-sm font-medium hover:bg-bronze-light"
          >
            مشاهده کاتالوگ
          </Link>
        </div>
      </section>

      <section className="py-16 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-bronze text-xs tracking-[2.5px]">دسته‌بندی‌ها</div>
          <h2 className="font-display text-3xl text-ruby mt-2">از باغ تا اتاق نشیمن</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/catalog?category=${c.slug}`}
              className="h-44 rounded-md border border-bronze/30 flex items-end p-5 bg-ruby text-white hover:bg-ruby-light transition"
            >
              <h3 className="font-display text-xl">{c.nameFa}</h3>
            </Link>
          ))}
        </div>
      </section>

      <section className="py-16 px-6 max-w-6xl mx-auto bg-ivory-deep/60">
        <div className="text-center mb-10">
          <div className="text-bronze text-xs tracking-[2.5px]">پرفروش‌ترین‌ها</div>
          <h2 className="font-display text-3xl text-ruby mt-2">برگزیده‌های گل خان</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {bestsellers.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {SHOP_ENABLED && (
        <section className="py-16 px-6 max-w-6xl mx-auto">
          <div className="bg-gradient-to-l from-ruby to-ruby-light rounded-md p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-6 text-white">
            <div>
              <h2 className="font-display text-2xl md:text-3xl mb-2">هدیه‌ای که مناسبت را می‌شناسد</h2>
              <p className="text-sm text-white/85 max-w-md">
                کارت تبریک اختصاصی، متن دلخواه شما و امکان ارسال ناشناس؛ هدیه‌ی مناسبتی‌تان را با گل خان قدم‌به‌قدم بسازید.
              </p>
            </div>
            <Link
              href="/occasion"
              className="inline-block bg-bronze text-ruby-deep px-8 py-3 rounded-sm font-medium hover:bg-bronze-light whitespace-nowrap"
            >
              شروع سفارش مناسبتی
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
