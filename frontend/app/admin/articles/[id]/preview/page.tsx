'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ArticleBody from '@/components/ArticleBody';
import { adminApi, AdminAuthError } from '@/lib/adminApi';
import { renderedTitle } from '@/lib/seoText';
import type { Article } from '@/lib/types';

// Renders the saved article exactly like the public page, including drafts that are not public yet.
export default function ArticlePreviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .getArticle(params.id)
      .then(setArticle)
      .catch((err) => {
        if (err instanceof AdminAuthError) router.replace('/admin/login');
        else setError(err.message);
      });
  }, [params.id, router]);

  return (
    <div>
      <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-md p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
        <span>
          پیش‌نمایش نسخه‌ی ذخیره‌شده
          {article && (
            <>
              {' '}— {article.status === 'PUBLISHED' ? 'منتشرشده' : 'پیش‌نویس (برای عموم قابل مشاهده نیست)'}
              {article.noindex && ' — noindex'}
              <span className="block text-xs mt-1">عنوان در مرورگر و گوگل: {renderedTitle(article.seoTitle || article.title)}</span>
            </>
          )}
        </span>
        <Link href={`/admin/articles/${params.id}`} className="underline">بازگشت به ویرایش</Link>
      </div>
      {error && <p className="text-red-600">{error}</p>}
      {!article && !error && <p className="text-ink-soft">در حال بارگذاری...</p>}
      {article && <ArticleBody article={article} />}
    </div>
  );
}
