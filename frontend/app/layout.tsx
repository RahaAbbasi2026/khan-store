import type { Metadata } from 'next';
import { safeJson } from '@/lib/safe-json';
import { SITE_NAME, SITE_URL as SEO_SITE_URL } from '@/lib/seo';
import { Vazirmatn, Aref_Ruqaa } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { CartProvider } from '@/lib/CartContext';

const vazir = Vazirmatn({
  subsets: ['arabic'],
  variable: '--font-vazir',
  weight: ['300', '400', '500', '600', '700', '800'],
});

const aref = Aref_Ruqaa({
  subsets: ['arabic'],
  variable: '--font-aref',
  weight: ['400', '700'],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://golekhan.ir';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'گل خان | فروشگاه ممتاز گل و گیاه',
    template: '%s | گل خان',
  },
  description:
    'گل خان، فروشگاه آنلاین ممتاز گل و گیاه — گل‌های شاخه‌بریده، گیاهان آپارتمانی، گل مناسبتی و ارسال سریع در تهران.',
  keywords: ['خرید گل آنلاین', 'گل فروشی آنلاین', 'گیاه آپارتمانی', 'گل مناسبتی', 'گل خان'],
  icons: { icon: '/icon.svg' },
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    siteName: 'گل خان',
    title: 'گل خان | فروشگاه ممتاز گل و گیاه',
    description: 'گل خان، فروشگاه آنلاین ممتاز گل و گیاه',
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SEO_SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SEO_SITE_URL,
      logo: `${SEO_SITE_URL}/khan-logo-stacked.svg`,
      contactPoint: [{ '@type': 'ContactPoint', telephone: '+989198302302', contactType: 'customer service', availableLanguage: ['fa'] }],
    },
    {
      '@type': 'WebSite',
      '@id': `${SEO_SITE_URL}/#website`,
      url: SEO_SITE_URL,
      name: SITE_NAME,
      inLanguage: 'fa-IR',
      publisher: { '@id': `${SEO_SITE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={`${vazir.variable} ${aref.variable}`}>
      <body className="font-body text-ink">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(organizationJsonLd) }} />
        <CartProvider>
          <div className="bg-ruby-deep text-bronze-light text-center text-xs py-2 tracking-wide">
            ارسال ویژه در تهران، امروز تا ساعت ۲۱:۰۰ | سفارش‌های ممتاز با بسته‌بندی اختصاصی گل خان
          </div>
          <Header />
          <main>{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
