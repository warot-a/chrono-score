import type { Metadata } from 'next';
import { Anton, Archivo } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anton',
  display: 'swap',
});

const archivo = Archivo({
  weight: ['400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'World Cup 2026 — Schedule, Standings & Bracket',
  description:
    'Follow every fixture, live group standings, and the road to the final across the United States, Canada and Mexico.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${anton.variable} ${archivo.variable}`} suppressHydrationWarning>
      <body>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('wc_theme');if(t!=='light')document.documentElement.classList.add('dark');})()` }}
        />
        {children}
      </body>
    </html>
  );
}
