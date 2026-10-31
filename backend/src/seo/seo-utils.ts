import { BadRequestException } from '@nestjs/common';
import { Prisma, RedirectType } from '@prisma/client';
import { assertImage } from '../media/media-utils';

const TEXT_FIELDS = ['seoTitle', 'seoDescription', 'canonicalUrl', 'ogTitle', 'ogDescription', 'ogImage'] as const;

/** Trim SEO overrides, store empty ones as null and validate canonical URL and OG image. */
export function cleanSeo<T extends Record<string, unknown>>(data: T): T {
  const out: Record<string, unknown> = { ...data };
  for (const key of TEXT_FIELDS) {
    if (typeof out[key] === 'string') out[key] = (out[key] as string).trim() || null;
  }
  if (out.canonicalUrl) assertCanonical(out.canonicalUrl as string);
  if (out.ogImage) assertImage(out.ogImage as string);
  return out as T;
}

/** A canonical is either a site path ("/product/x") or an absolute HTTPS URL without credentials. */
export function assertCanonical(value: string) {
  if (/^\/(?!\/)[^\s?#]*(\?[^\s#]*)?$/.test(value)) return;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password && !url.hash) return;
  } catch {}
  throw new BadRequestException('آدرس canonical باید با / شروع شود یا یک آدرس کامل HTTPS (بدون #) باشد.');
}

/** Record the old slug as a permanent redirect to this record and free the new slug if it was one. */
export async function recordSlugChange(
  tx: Prisma.TransactionClient,
  type: RedirectType,
  targetId: string,
  oldSlug: string,
  newSlug: string,
) {
  await tx.slugRedirect.deleteMany({ where: { type, fromSlug: newSlug } });
  await tx.slugRedirect.upsert({
    where: { type_fromSlug: { type, fromSlug: oldSlug } },
    create: { type, fromSlug: oldSlug, targetId },
    update: { targetId },
  });
}

/** Normalise text for duplicate detection: Arabic/Persian letter variants, ZWNJ, spacing, case. */
export function normalizeForCompare(value: string) {
  return value
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[‌‏‎]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Description shown to search engines when no override is set (mirrors the frontend). */
export function fallbackDescription(text: string) {
  return text.replace(/\s+/g, ' ').trim().slice(0, 160);
}
