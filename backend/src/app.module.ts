import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RateLimitGuard } from './security/rate-limit.guard';
import { MediaModule } from './media/media.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentModule } from './payment/payment.module';
import { AuthModule } from './auth/auth.module';
import { GreetingCardsModule } from './greeting-cards/greeting-cards.module';
import { CustomersModule } from './customers/customers.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ContactModule } from './contact/contact.module';
import { SiteContentModule } from './site-content/site-content.module';
import { CaptchaModule } from './captcha/captcha.module';
import { ArticlesModule } from './articles/articles.module';
import { SeoModule } from './seo/seo.module';

@Module({
  providers: [{ provide: APP_GUARD, useClass: RateLimitGuard }],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MediaModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    PaymentModule,
    GreetingCardsModule,
    CustomersModule,
    ReviewsModule,
    ContactModule,
    SiteContentModule,
    CaptchaModule,
    ArticlesModule,
    SeoModule,
  ],
})
export class AppModule {}
