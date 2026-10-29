import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'تماس با ما',
  description: 'راه‌های ارتباط با گل خان: شماره تماس و فرم ارسال پیام برای سفارش، پیگیری و راهنمایی خرید گل و گیاه.',
  alternates: { canonical: '/contact' },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
