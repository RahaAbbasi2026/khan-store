import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminSeoController, RedirectsController } from './seo.controller';
import { SeoService } from './seo.service';

@Module({
  imports: [AuthModule],
  controllers: [RedirectsController, AdminSeoController],
  providers: [SeoService],
})
export class SeoModule {}
