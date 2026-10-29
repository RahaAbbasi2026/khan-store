import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { SeoService } from './seo.service';

class DuplicatesQuery {
  @IsOptional() @IsString() @MaxLength(500) title?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsIn(['product', 'article']) excludeType?: 'product' | 'article';
  @IsOptional() @IsString() @MaxLength(128) excludeId?: string;
}

@Controller('redirects')
export class RedirectsController {
  constructor(private readonly seo: SeoService) {}

  @Get(':type/:slug')
  async find(@Param('type') type: string, @Param('slug') slug: string) {
    if (type !== 'product' && type !== 'article') throw new NotFoundException('آدرس یافت نشد');
    const target = await this.seo.resolveRedirect(type, slug);
    if (!target) throw new NotFoundException('آدرس یافت نشد');
    return { slug: target };
  }
}

@Controller('admin/seo')
@UseGuards(AdminAuthGuard)
export class AdminSeoController {
  constructor(private readonly seo: SeoService) {}

  @Get('duplicates')
  duplicates(@Query() query: DuplicatesQuery) {
    return this.seo.findDuplicates(query);
  }
}
