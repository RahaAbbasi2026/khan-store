import { Controller, Get, Module, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { decodeImage } from './media-utils';

@Controller('media')
class MediaController {
  constructor(private prisma: PrismaService) {}
  private send(value: string | null | undefined, res: Response) {
    if (!value) throw new NotFoundException('تصویر یافت نشد');
    if (!value.startsWith('data:')) {
      if (!/^https:\/\//.test(value) && !/^\/(?!\/)/.test(value)) throw new NotFoundException('تصویر یافت نشد');
      return res.redirect(value);
    }
    const { mime, bytes } = decodeImage(value);
    res.setHeader('Content-Type', mime);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.send(bytes);
  }
  @Get('products/:id/:index')
  async product(@Param('id') id: string, @Param('index') index: string, @Res() res: Response) {
    if (index === 'og') {
      const row = await this.prisma.product.findUnique({ where: { id }, select: { ogImage: true } });
      return this.send(row?.ogImage, res);
    }
    if (!/^[0-5]$/.test(index)) throw new NotFoundException('تصویر یافت نشد');
    const product = await this.prisma.product.findUnique({ where: { id }, select: { images: true } });
    return this.send(product?.images[Number(index)], res);
  }
  @Get('cards/:id')
  async card(@Param('id') id: string, @Res() res: Response) {
    const row = await this.prisma.greetingCard.findUnique({ where: { id }, select: { imageData: true } });
    return this.send(row?.imageData, res);
  }
  @Get('articles/:id')
  async article(@Param('id') id: string, @Res() res: Response) {
    const row = await this.prisma.article.findFirst({ where: { id, status: 'PUBLISHED' }, select: { coverImage: true } });
    return this.send(row?.coverImage, res);
  }
  @Get('articles/:id/og')
  async articleOg(@Param('id') id: string, @Res() res: Response) {
    const row = await this.prisma.article.findFirst({ where: { id, status: 'PUBLISHED' }, select: { ogImage: true } });
    return this.send(row?.ogImage, res);
  }
}
@Module({ controllers: [MediaController] })
export class MediaModule {}
