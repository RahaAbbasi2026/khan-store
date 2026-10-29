import { Max, ArrayMaxSize } from 'class-validator';
import { Matches, MaxLength } from 'class-validator';
import { SeoFieldsDto, SLUG_MESSAGE, SLUG_PATTERN } from '../../seo/seo-fields.dto';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto extends SeoFieldsDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nameFa: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameScientific?: string;

  @IsString()
  @MaxLength(20000)
  description: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000000)
  priceToman: number;

  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  images: string[];

  @IsString()
  @MaxLength(128)
  categoryId: string;

  @IsOptional()
  @IsIn(['LOW', 'INDIRECT', 'DIRECT'])
  light?: 'LOW' | 'INDIRECT' | 'DIRECT';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  waterPerWeek?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tempMinC?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tempMaxC?: number;

  @IsOptional()
  @IsIn(['EASY', 'MEDIUM', 'HARD'])
  careDifficulty?: 'EASY' | 'MEDIUM' | 'HARD';

  @IsOptional()
  @IsBoolean()
  petSafe?: boolean;

  @IsOptional()
  @IsBoolean()
  airPurifying?: boolean;

  @IsOptional()
  @IsBoolean()
  suitableForOffice?: boolean;

  @IsOptional()
  @IsIn(['IN_STOCK', 'OUT_OF_STOCK', 'PREORDER'])
  stockStatus?: 'IN_STOCK' | 'OUT_OF_STOCK' | 'PREORDER';
}

export class UpdateProductDto extends SeoFieldsDto {
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
  nameFa?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameScientific?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000000)
  priceToman?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(128)
  categoryId?: string;

  @IsOptional()
  @IsIn(['LOW', 'INDIRECT', 'DIRECT'])
  light?: 'LOW' | 'INDIRECT' | 'DIRECT';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  waterPerWeek?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tempMinC?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tempMaxC?: number;

  @IsOptional()
  @IsIn(['EASY', 'MEDIUM', 'HARD'])
  careDifficulty?: 'EASY' | 'MEDIUM' | 'HARD';

  @IsOptional()
  @IsBoolean()
  petSafe?: boolean;

  @IsOptional()
  @IsBoolean()
  airPurifying?: boolean;

  @IsOptional()
  @IsBoolean()
  suitableForOffice?: boolean;

  @IsOptional()
  @IsIn(['IN_STOCK', 'OUT_OF_STOCK', 'PREORDER'])
  stockStatus?: 'IN_STOCK' | 'OUT_OF_STOCK' | 'PREORDER';
}
