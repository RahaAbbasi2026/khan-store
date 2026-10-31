'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/adminApi';
import ImageUploadInput from './ImageUploadInput';
import SeoFields, { toSeoFormValues, type SeoFormValues } from './SeoFields';
import { canonicalProblem } from '@/lib/seoText';
import type { Article } from '@/lib/types';

export default function ArticleForm({ article }: { article?: Article }) {
  const router = useRouter();
  const [slug, setSlug] = useState(article?.slug ?? '');
  const [title, setTitle] = useState(article?.title ?? '');
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? '');
  const [content, setContent] = useState(article?.content ?? '');
  const [coverImage, setCoverImage] = useState(article?.coverImage ?? '');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>(article?.status ?? 'DRAFT');
  const [seo, setSeo] = useState<SeoFormValues>(toSeoFormValues(article));

  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleGenerate() {
    if (!topic) return;
    setGenerating(true);
    setGenError('');
    try {
      const draft = await adminApi.generateArticleDraft(topic);
      setTitle(draft.title);
      setExcerpt(draft.excerpt);
      setContent(draft.content);
    } catch (err: any) {
      setGenError(err.message ?? 'تولید محتوا با خطا مواجه شد');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const canonicalError = canonicalProblem(seo.canonicalUrl);
    if (canonicalError) {
      setError(`آدرس canonical: ${canonicalError}`);
      return;
    }
    setSaving(true);
    setError('');
    const payload = { title, excerpt, content, coverImage: coverImage || undefined, status, ...seo };
    try {
      if (article) {
        const newSlug = slug.trim();
        await adminApi.updateArticle(article.id, { ...payload, ...(newSlug !== article.slug ? { slug: newSlug } : {}) });
      } else {
        await adminApi.createArticle({ ...payload, slug: slug.trim() });
      }
      router.push('/admin/articles');
    } catch (err: any) {
      setError(err.message ?? 'ذخیره‌سازی با خطا مواجه شد');
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      {!article && (
        <div className="bg-white border border-bronze/30 rounded-md p-6">
          <h4 className="text-sm text-ruby mb-1">تولید پیش‌نویس با هوش مصنوعی</h4>
          <p className="text-xs text-ink-soft mb-4">
            یک موضوع بنویسید (مثلاً «نگهداری از ارکیده در پاییز») تا یک پیش‌نویس کامل ساخته شود — بعد
            می‌توانید ویرایشش کنید.
          </p>
          <div className="flex gap-3">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="موضوع مقاله..."
              className="flex-1 border border-bronze/30 rounded-md px-4 py-2.5 text-sm"
            />
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!topic || generating}
              className="bg-bronze text-ruby-deep px-5 py-2.5 rounded-sm text-sm disabled:opacity-40 whitespace-nowrap"
            >
              {generating ? 'در حال تولید...' : 'تولید با AI'}
            </button>
          </div>
          {genError && <p className="text-xs text-red-600 mt-2">{genError}</p>}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm mb-1 text-ink-soft">اسلاگ (شناسه یکتا در آدرس، انگلیسی)</label>
          <input
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="example-article-slug"
            dir="ltr"
            className="w-full border border-bronze/30 rounded-md px-4 py-2.5 text-sm"
          />
          {article && slug.trim() !== article.slug && (
            <p className="text-xs text-amber-700 mt-1">
              {article.publishedAt
                ? <>آدرس قبلی (<bdi dir="ltr">/magazine/{article.slug}</bdi>) به‌صورت دائمی به آدرس جدید منتقل (ریدایرکت) می‌شود. اسلاگ را فقط در صورت لزوم تغییر دهید.</>
                : 'این مقاله هنوز منتشر نشده، پس آدرس قبلی نگه داشته نمی‌شود.'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm mb-1 text-ink-soft">عنوان</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-bronze/30 rounded-md px-4 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 text-ink-soft">خلاصه</label>
          <textarea
            required
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            className="w-full border border-bronze/30 rounded-md px-4 py-2.5 text-sm min-h-[60px]"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 text-ink-soft">متن کامل مقاله</label>
          <textarea
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border border-bronze/30 rounded-md px-4 py-2.5 text-sm min-h-[260px]"
          />
        </div>

        <ImageUploadInput value={coverImage} onChange={setCoverImage} label="تصویر کاور (اختیاری)" />

        <div>
          <label className="block text-sm mb-1 text-ink-soft">وضعیت</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'PUBLISHED')}
            className="w-full border border-bronze/30 rounded-md px-4 py-2.5 text-sm bg-white"
          >
            <option value="DRAFT">پیش‌نویس</option>
            <option value="PUBLISHED">منتشرشده</option>
          </select>
        </div>

        <SeoFields
          values={seo}
          onChange={(key, value) => setSeo((v) => ({ ...v, [key]: value }))}
          fallback={{ title, description: excerpt, image: coverImage }}
          path={`/magazine/${slug.trim() || 'slug'}`}
          entity={{ type: 'article', id: article?.id }}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-ruby text-white px-6 py-2.5 rounded-sm text-sm disabled:opacity-50"
          >
            {saving ? 'در حال ذخیره...' : 'ذخیره'}
          </button>
          {article && (
            <a
              href={`/admin/articles/${article.id}/preview`}
              target="_blank"
              rel="noopener"
              className="border border-bronze/30 px-6 py-2.5 rounded-sm text-sm"
            >
              پیش‌نمایش نسخه‌ی ذخیره‌شده
            </a>
          )}
          <button
            type="button"
            onClick={() => router.push('/admin/articles')}
            className="border border-bronze/30 px-6 py-2.5 rounded-sm text-sm"
          >
            انصراف
          </button>
        </div>
      </form>
    </div>
  );
}
