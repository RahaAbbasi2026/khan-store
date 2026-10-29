'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/adminApi';
import ImageUploadInput from './ImageUploadInput';
import type { Category, Product } from '@/lib/types';

export interface ProductFormValues {
  slug: string;
  nameFa: string;
  nameScientific: string;
  description: string;
  priceToman: string;
  images: string;
  categoryId: string;
  light: string;
  waterPerWeek: string;
  tempMinC: string;
  tempMaxC: string;
  careDifficulty: string;
  petSafe: boolean;
  airPurifying: boolean;
  suitableForOffice: boolean;
  stockStatus: string;
}

function toFormValues(p?: Product): ProductFormValues {
  return {
    slug: p?.slug ?? '',
    nameFa: p?.nameFa ?? '',
    nameScientific: p?.nameScientific ?? '',
    description: p?.description ?? '',
    priceToman: p ? String(p.priceToman) : '',
    images: p?.images?.[0] ?? '',
    categoryId: p?.category?.id ?? '',
    light: p?.light ?? '',
    waterPerWeek: p?.waterPerWeek != null ? String(p.waterPerWeek) : '',
    tempMinC: p?.tempMinC != null ? String(p.tempMinC) : '',
    tempMaxC: p?.tempMaxC != null ? String(p.tempMaxC) : '',
    careDifficulty: p?.careDifficulty ?? '',
    petSafe: p?.petSafe ?? false,
    airPurifying: p?.airPurifying ?? false,
    suitableForOffice: p?.suitableForOffice ?? false,
    stockStatus: p?.stockStatus ?? 'IN_STOCK',
  };
}

export default function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [values, setValues] = useState<ProductFormValues>(toFormValues(product));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.getCategories().then(setCategories);
  }, []);

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload: Record<string, unknown> = {
      nameFa: values.nameFa,
      nameScientific: values.nameScientific || undefined,
      description: values.description,
      priceToman: Number(values.priceToman),
      images: values.images ? [values.images] : [],
      categoryId: values.categoryId,
      light: values.light || undefined,
      waterPerWeek: values.waterPerWeek ? Number(values.waterPerWeek) : undefined,
      tempMinC: values.tempMinC ? Number(values.tempMinC) : undefined,
      tempMaxC: values.tempMaxC ? Number(values.tempMaxC) : undefined,
      careDifficulty: values.careDifficulty || undefined,
      petSafe: values.petSafe,
      airPurifying: values.airPurifying,
      suitableForOffice: values.suitableForOffice,
      stockStatus: values.stockStatus,
    };

    try {
      if (product) {
        await adminApi.updateProduct(product.id, payload);
      } else {
        await adminApi.createProduct({ ...payload, slug: values.slug });
      }
      router.push('/admin/products');
    } catch (err: any) {
      setError(err.message ?? 'ذخیره‌سازی با خطا مواجه شد');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      {!product && (
        <div>
          <label className="block text-sm mb-1 text-ink-soft">اسلاگ (شناسه یکتا در آدرس، انگلیسی)</label>
          <input
            required
            value={values.slug}
            onChange={(e) => set('slug', e.target.value)}
            placeholder="example-product-name"
            className="w-full border border-bronze/30 rounded-md px-4 py-2.5 text-sm"
          />
        </div>
      )}

      <div>
        <label className="block text-sm mb-1 text-ink-soft">نام فارسی</label>
        <input
          required
          value={values.nameFa}
          onChange={(e) => set('nameFa', e.target.value)}
          className="w-full border border-bronze/30 rounded-md px-4 py-2.5 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm mb-1 text-ink-soft">نام علمی (اختیاری)</label>
        <input
          value={values.nameScientific}
          onChange={(e) => set('nameScientific', e.target.value)}
          className="w-full border border-bronze/30 rounded-md px-4 py-2.5 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm mb-1 text-ink-soft">توضیحات</label>
        <textarea
          required
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          className="w-full border border-bronze/30 rounded-md px-4 py-2.5 text-sm min-h-[90px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1 text-ink-soft">قیمت (تومان)</label>
          <input
            required
            type="number"
            value={values.priceToman}
            onChange={(e) => set('priceToman', e.target.value)}
            className="w-full border border-bronze/30 rounded-md px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm mb-1 text-ink-soft">دسته‌بندی</label>
          <select
            required
            value={values.categoryId}
            onChange={(e) => set('categoryId', e.target.value)}
            className="w-full border border-bronze/30 rounded-md px-4 py-2.5 text-sm bg-white"
          >
            <option value="">انتخاب کنید</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameFa}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ImageUploadInput value={values.images} onChange={(v) => set('images', v)} label="عکس محصول" withBackground />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1 text-ink-soft">وضعیت موجودی</label>
          <select
            value={values.stockStatus}
            onChange={(e) => set('stockStatus', e.target.value)}
            className="w-full border border-bronze/30 rounded-md px-4 py-2.5 text-sm bg-white"
          >
            <option value="IN_STOCK">موجود</option>
            <option value="OUT_OF_STOCK">ناموجود</option>
            <option value="PREORDER">پیش‌سفارش</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1 text-ink-soft">سختی نگهداری (اختیاری)</label>
          <select
            value={values.careDifficulty}
            onChange={(e) => set('careDifficulty', e.target.value)}
            className="w-full border border-bronze/30 rounded-md px-4 py-2.5 text-sm bg-white"
          >
            <option value="">—</option>
            <option value="EASY">آسان</option>
            <option value="MEDIUM">متوسط</option>
            <option value="HARD">حرفه‌ای</option>
          </select>
        </div>
      </div>

      <div className="border-t border-bronze/20 pt-5">
        <p className="text-sm text-ink-soft mb-3">اطلاعات نگهداری (فقط برای گیاهان — اختیاری)</p>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs mb-1 text-ink-soft">نور</label>
            <select
              value={values.light}
              onChange={(e) => set('light', e.target.value)}
              className="w-full border border-bronze/30 rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="">—</option>
              <option value="LOW">کم‌نور</option>
              <option value="INDIRECT">غیرمستقیم</option>
              <option value="DIRECT">مستقیم</option>
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1 text-ink-soft">آبیاری (بار در هفته)</label>
            <input
              type="number"
              value={values.waterPerWeek}
              onChange={(e) => set('waterPerWeek', e.target.value)}
              className="w-full border border-bronze/30 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs mb-1 text-ink-soft">دمای کم</label>
              <input
                type="number"
                value={values.tempMinC}
                onChange={(e) => set('tempMinC', e.target.value)}
                className="w-full border border-bronze/30 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-ink-soft">دمای زیاد</label>
              <input
                type="number"
                value={values.tempMaxC}
                onChange={(e) => set('tempMaxC', e.target.value)}
                className="w-full border border-bronze/30 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={values.petSafe} onChange={(e) => set('petSafe', e.target.checked)} />
            مناسب حیوان خانگی
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={values.airPurifying}
              onChange={(e) => set('airPurifying', e.target.checked)}
            />
            تصفیه‌کننده هوا
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={values.suitableForOffice}
              onChange={(e) => set('suitableForOffice', e.target.checked)}
            />
            مناسب محل کار
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-ruby text-white px-6 py-2.5 rounded-sm text-sm disabled:opacity-50"
        >
          {saving ? 'در حال ذخیره...' : 'ذخیره'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/products')}
          className="border border-bronze/30 px-6 py-2.5 rounded-sm text-sm"
        >
          انصراف
        </button>
      </div>
    </form>
  );
}
