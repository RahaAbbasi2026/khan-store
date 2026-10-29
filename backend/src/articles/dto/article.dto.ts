import { Matches, MaxLength } from 'class-validator';
import { SeoFieldsDto, SLUG_MESSAGE, SLUG_PATTERN } from '../../seo/seo-fields.dto';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateArticleDto extends SeoFieldsDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(2000)
  excerpt: string;

  @IsString()
  @MinLength(10)
  @MaxLength(50000)
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(4500000)
  coverImage?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status?: 'DRAFT' | 'PUBLISHED';
}

export class UpdateArticleDto extends SeoFieldsDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  excerpt?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(50000)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4500000)
  coverImage?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status?: 'DRAFT' | 'PUBLISHED';
}

export class GenerateArticleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  topic: string;
}
