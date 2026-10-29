import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

// Lowercase latin words separated by single hyphens, e.g. "monstera-deliciosa".
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MESSAGE = 'اسلاگ فقط می‌تواند حروف کوچک انگلیسی، عدد و خط تیره (بدون فاصله) داشته باشد.';

// Optional SEO overrides shared by products and articles. An empty string clears the override.
export class SeoFieldsDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoDescription?: string;

  @IsOptional()
  @IsBoolean()
  noindex?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  canonicalUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  ogTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ogDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4500000)
  ogImage?: string;
}
