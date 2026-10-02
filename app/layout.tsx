import type { Metadata } from 'next';
import { JetBrains_Mono, Onest, Unbounded } from 'next/font/google';
import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { themeInitScript } from '@/lib/theme';
import 'katex/dist/katex.min.css';
import './globals.css';

// Both faces carry Cyrillic: the UI is Russian, a Latin-only face falls back per glyph.
const sans = Onest({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans',
  display: 'swap',
});
const display = Unbounded({
  subsets: ['latin', 'cyrillic'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});
const mono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Python HSE Hub', template: '%s · Python HSE Hub' },
  description: 'Занятия, задачи, решения и доклады курса по Python',
  icons: { icon: '/favicon.svg' },
  robots: { index: false, follow: false },
  // Link previews (Telegram, VK…) land on /login for crawlers, so the card is site-wide.
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Python HSE Hub',
    title: 'Python HSE Hub',
    description: 'Занятия, задачи с семинаров, решения студентов и доклады по библиотекам Python',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <AmbientBackground />
        {children}
      </body>
    </html>
  );
}
