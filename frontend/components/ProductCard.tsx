'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Product } from '@/lib/types';
import { useCart } from '@/lib/CartContext';
import { SHOP_ENABLED } from '@/lib/site';

const badgeText: Record<string, string> = {
  OUT_OF_STOCK: 'ناموجود',
  PREORDER: 'پیش‌سفارش',
};
const badgeClass: Record<string, string> = {
  OUT_OF_STOCK: 'bg-[#8a8477]',
  PREORDER: 'bg-navy',
};

export default function ProductCard({ product }: { product: Product }) {
  const { addItem, pending, loading } = useCart();
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);

  async function handleAdd() {
    setError(''); setAdded(false);
    try { await addItem(product.id, 1); setAdded(true); setTimeout(() => setAdded(false), 1500); }
    catch (err) { setError(err instanceof Error ? err.message : 'افزودن کالا ناموفق بود.'); }
  }

  return (
    <div className="bg-white border border-bronze/30 rounded-sm overflow-hidden hover:shadow-lg hover:border-bronze transition group">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="h-48 relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.images[0] || '/images/placeholder.jpg'}
            alt={product.nameFa}
            width={400}
            height={400}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {product.stockStatus !== 'IN_STOCK' && (
            <span
              className={`absolute top-2 left-2 text-white text-[11px] px-3 py-1 rounded-full ${badgeClass[product.stockStatus]}`}
            >
              {badgeText[product.stockStatus]}
            </span>
          )}
        </div>
        <div className="p-4">
          {product.nameScientific && (
            <div className="text-xs italic text-ink-soft mb-1">{product.nameScientific}</div>
          )}
          <h3 className="text-base mb-3">{product.nameFa}</h3>
        </div>
      </Link>
      <div className="px-4 pb-4 flex items-center justify-between">
        <div className="font-bold text-ruby">
          {product.priceToman.toLocaleString('fa-IR')} <small className="font-normal text-ink-soft">تومان</small>
        </div>
        {SHOP_ENABLED && (
          <button
            onClick={handleAdd}
            disabled={product.stockStatus === 'OUT_OF_STOCK' || pending || loading}
            className="w-9 h-9 rounded-full bg-ruby text-white text-lg disabled:opacity-40 hover:bg-bronze hover:text-ruby-deep transition"
          >
            {added ? '✓' : '+'}
          </button>
        )}
      </div>
      {error && <p role="alert" className="px-4 pb-3 text-xs text-red-600">{error}</p>}
    </div>
  );
}
