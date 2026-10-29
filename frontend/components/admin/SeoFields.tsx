'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, type SeoDuplicate } from '@/lib/adminApi';
import ImageUploadInput from './ImageUploadInput';
import {
  DESCRIPTION_RANGE,
  SITE_URL,
  TITLE_RANGE,
  canonicalProblem,
  lengthHint,
  renderedTitle,
} from '@/lib/seoText';
import type { SeoFields as SeoFieldsData } from '@/lib/types';

export interface SeoFormValues {
  seoTitle: string;
  seoDescription: string;
  noindex: boolean;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
}

export function toSeoFormValues(data?: SeoFieldsData): SeoFormValues {
  return {
    seoTitle: data?.seoTitle ?? '',
    seoDescription: data?.seoDescription ?? '',
    noindex: data?.noindex ?? false,
    canonicalUrl: data?.canonicalUrl ?? '',
    ogTitle: data?.ogTitle ?? '',
    ogDescription: data?.ogDescription ?? '',
    ogImage: data?.ogImage ?? '',
  };
}

const inputClass = 'w-full border border-bronze/30 rounded-md px-4 py-2.5 text-sm';

function Counter({ length, range }: { length: number; range: { min: number; max: number } }) {
  const ok = length >= range.min && length <= range.max;
  return (
    <span className={`text-xs ${length === 0 ? 'text-ink-soft' : ok ? 'text-green-700' : 'text-amber-700'}`}>
      {length.toLocaleString('fa-IR')} نویسه
    </span>
  );
}

function DuplicateList({ items, label }: { items: SeoDuplicate[]; label: string }) {
  if (!items.length) return null;
  return (
    <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">
      {label} با این صفحه‌ها یکسان است:
      <ul className="list-disc pr-5 mt-1">
        {items.map((d) => (
          <li key={`${d.type}-${d.id}`}>
            <Link href={`/admin/${d.type === 'product' ? 'products' : 'articles'}/${d.id}`} className="underline" target="_blank">
              {d.type === 'product' ? 'محصول' : 'مقاله'}: {d.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SeoFields({
  values,
  onChange,
  fallback,
  path,
  entity,
}: {
  values: SeoFormValues;
  onChange: <K extends keyof SeoFormValues>(key: K, value: SeoFormValues[K]) => void;
  /** What search engines see when a field is left empty. */
  fallback: { title: string; description: string; image?: string };
  /** Public path of the page, e.g. /product/slug. */
  path: string;
  entity: { type: 'product' | 'article'; id?: string };
}) {
  const title = values.seoTitle.trim() || fallback.title.trim();
  const description = values.seoDescription.trim() || fallback.description.trim();
  const canonicalError = canonicalProblem(values.canonicalUrl);
  const [duplicates, setDuplicates] = useState<{ title: SeoDuplicate[]; description: SeoDuplicate[] }>({ title: [], description: [] });

  useEffect(() => {
    if (!title && !description) return;
    const timer = setTimeout(() => {
      adminApi
        .findSeoDuplicates({ title, description, excludeType: entity.type, excludeId: entity.id })
        .then(setDuplicates)
        .catch(() => setDuplicates({ title: [], description: [] }));
    }, 600);
    return () => clearTimeout(timer);
  }, [title, description, entity.type, entity.id]);

  const host = SITE_URL.replace(/^https?:\/\//, '');
  const crumbs = path.split('/').filter(Boolean).map(decodeURIComponent).join(' › ');
  const ogImage = values.ogImage || fallback.image || '';

  return (
    <fieldset className="border border-bronze/30 rounded-md p-5 space-y-5 bg-white">
      <legend className="px-2 text-sm text-ruby">سئو و اشتراک‌گذاری</legend>

      <div>
        <p className="text-xs text-ink-soft mb-2">پیش‌نمایش تقریبی در نتایج گوگل</p>
        <div className="border border-bronze/20 rounded-md p-4 bg-ivory-deep/40" dir="rtl">
          <div className="text-xs text-[#4d5156] truncate" dir="ltr" style={{ textAlign: 'right' }}>
            {host} › {crumbs}
          </div>
          <div className="text-lg text-[#1a0dab] leading-snug truncate">{title ? renderedTitle(title) : 'عنوان صفحه'}</div>
          <div className="text-sm text-[#4d5156] line-clamp-2">{description || 'توضیحات صفحه این‌جا نمایش داده می‌شود.'}</div>
          {values.noindex && <div className="text-xs text-red-700 mt-2">این صفحه در نتایج جستجو نمایش داده نمی‌شود (noindex).</div>}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm text-ink-soft">عنوان سئو (اختیاری)</label>
          <Counter length={title.length} range={TITLE_RANGE} />
        </div>
        <input
          value={values.seoTitle}
          onChange={(e) => onChange('seoTitle', e.target.value)}
          placeholder={fallback.title || 'اگر خالی بماند، عنوان صفحه استفاده می‌شود'}
          maxLength={200}
          className={inputClass}
        />
        <p className="text-xs text-ink-soft mt-1">
          عبارت «<bdi>| گل خان</bdi>» خودکار به انتهای عنوان اضافه می‌شود؛ اگر نام برند را خودتان نوشته باشید تکرار نمی‌شود.
        </p>
        {lengthHint(title.length, TITLE_RANGE) && <p className="text-xs text-amber-700 mt-1">{lengthHint(title.length, TITLE_RANGE)}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm text-ink-soft">توضیحات متا (اختیاری)</label>
          <Counter length={description.length} range={DESCRIPTION_RANGE} />
        </div>
        <textarea
          value={values.seoDescription}
          onChange={(e) => onChange('seoDescription', e.target.value)}
          placeholder={fallback.description || 'اگر خالی بماند، از ابتدای متن صفحه ساخته می‌شود'}
          maxLength={500}
          className={`${inputClass} min-h-[70px]`}
        />
        {lengthHint(description.length, DESCRIPTION_RANGE) && (
          <p className="text-xs text-amber-700 mt-1">{lengthHint(description.length, DESCRIPTION_RANGE)}</p>
        )}
      </div>

      <DuplicateList items={duplicates.title} label="عنوان سئو" />
      <DuplicateList items={duplicates.description} label="توضیحات متا" />

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={values.noindex} onChange={(e) => onChange('noindex', e.target.checked)} />
        <span>
          عدم نمایش در نتایج جستجو (noindex)
          <span className="block text-xs text-ink-soft">برای صفحه‌های کم‌محتوا، موقت یا غیرضروری. این صفحه از نقشه سایت هم حذف می‌شود.</span>
        </span>
      </label>

      <details className="border-t border-bronze/20 pt-4" open={Boolean(values.canonicalUrl || values.ogTitle || values.ogDescription || values.ogImage)}>
        <summary className="text-sm text-ruby cursor-pointer">تنظیمات پیشرفته</summary>
        <div className="space-y-5 mt-4">
          <div>
            <label className="block text-sm mb-1 text-ink-soft">آدرس canonical (اختیاری)</label>
            <input
              value={values.canonicalUrl}
              onChange={(e) => onChange('canonicalUrl', e.target.value)}
              placeholder={path}
              dir="ltr"
              maxLength={500}
              className={inputClass}
            />
            <p className="text-xs text-ink-soft mt-1">
              فقط وقتی این صفحه نسخه‌ی تکراری صفحه‌ی دیگری است پر شود. خالی = آدرس خود صفحه (<bdi dir="ltr">{path}</bdi>). صفحه‌ای که canonical آن
              به آدرس دیگری اشاره کند در نقشه سایت نمی‌آید.
            </p>
            {canonicalError && <p className="text-xs text-red-600 mt-1">{canonicalError}</p>}
          </div>

          <div>
            <label className="block text-sm mb-1 text-ink-soft">عنوان اشتراک‌گذاری (Open Graph، اختیاری)</label>
            <input
              value={values.ogTitle}
              onChange={(e) => onChange('ogTitle', e.target.value)}
              placeholder={title || 'خالی = عنوان سئو'}
              maxLength={200}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-ink-soft">توضیحات اشتراک‌گذاری (اختیاری)</label>
            <textarea
              value={values.ogDescription}
              onChange={(e) => onChange('ogDescription', e.target.value)}
              placeholder={description || 'خالی = توضیحات متا'}
              maxLength={500}
              className={`${inputClass} min-h-[60px]`}
            />
          </div>
          <ImageUploadInput
            value={values.ogImage}
            onChange={(v) => onChange('ogImage', v)}
            label="تصویر اشتراک‌گذاری (اختیاری؛ خالی = تصویر اصلی صفحه، ابعاد پیشنهادی ۱۲۰۰×۶۳۰)"
          />
          {values.ogImage && (
            <button type="button" onClick={() => onChange('ogImage', '')} className="text-xs text-red-600 hover:underline">
              حذف تصویر اشتراک‌گذاری
            </button>
          )}

          <div>
            <p className="text-xs text-ink-soft mb-2">پیش‌نمایش کارت در شبکه‌های اجتماعی</p>
            <div className="border border-bronze/20 rounded-md overflow-hidden max-w-sm">
              {ogImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ogImage} alt="" className="w-full aspect-[1200/630] object-cover bg-ivory-deep" />
              ) : (
                <div className="w-full aspect-[1200/630] bg-ivory-deep flex items-center justify-center text-xs text-ink-soft">بدون تصویر</div>
              )}
              <div className="p-3">
                <div className="text-xs text-ink-soft" dir="ltr" style={{ textAlign: 'right' }}>{host}</div>
                <div className="text-sm font-semibold truncate">{values.ogTitle.trim() || title}</div>
                <div className="text-xs text-ink-soft line-clamp-2">{values.ogDescription.trim() || description}</div>
              </div>
            </div>
          </div>
        </div>
      </details>
    </fieldset>
  );
}
