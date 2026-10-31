// Pure SEO text helpers shared by public pages and the admin SEO editor (no server-only imports).

export const SITE_NAME = 'گل خان';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://golekhan.ir').replace(/\/$/, '');
export const TITLE_SUFFIX = ` | ${SITE_NAME}`;

/** Soft length guidance (characters). Google truncates by pixel width, so these are only hints. */
export const TITLE_RANGE = { min: 30, max: 60 };
export const DESCRIPTION_RANGE = { min: 70, max: 160 };

/** Description used when no override is set: the start of the body text on one line. */
export function fallbackDescription(text: string) {
  return text.replace(/\s+/g, ' ').trim().slice(0, 160);
}

/**
 * Title metadata for a page. The root layout template appends " | گل خان"; a title that already
 * names the brand is used as-is so the brand is not repeated.
 */
export function pageTitle(title: string): string | { absolute: string } {
  return title.includes(SITE_NAME) ? { absolute: title } : title;
}

/** The final <title> text, as rendered after the layout template. */
export function renderedTitle(title: string) {
  return title.includes(SITE_NAME) ? title : `${title}${TITLE_SUFFIX}`;
}

/** Problem with a canonical override, or null if it is acceptable. Mirrors the API validation. */
export function canonicalProblem(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (/^\/(?!\/)[^\s?#]*(\?[^\s#]*)?$/.test(v)) return null;
  try {
    const url = new URL(v);
    if (url.protocol === 'https:' && !url.username && !url.password && !url.hash) return null;
  } catch {}
  return 'باید با / شروع شود (مثل /product/name) یا یک آدرس کامل HTTPS بدون # باشد.';
}

/** Length hint for a field, or null when inside the recommended range. */
export function lengthHint(length: number, range: { min: number; max: number }) {
  if (length === 0) return null;
  if (length < range.min) return `کوتاه است؛ پیشنهاد ${range.min.toLocaleString('fa-IR')} تا ${range.max.toLocaleString('fa-IR')} نویسه.`;
  if (length > range.max) return `بلند است و احتمالاً در نتایج جستجو کوتاه می‌شود؛ پیشنهاد حداکثر ${range.max.toLocaleString('fa-IR')} نویسه.`;
  return null;
}
