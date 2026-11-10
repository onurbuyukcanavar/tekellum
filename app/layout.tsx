import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/source-serif-4/wght-italic.css';
import '@fontsource-variable/inter';
import './globals.css';
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from '@/lib/constants';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${SITE_NAME} — Hukuk, düşünce, metin`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { type: 'website', locale: 'tr_TR', siteName: SITE_NAME, title: SITE_NAME, description: SITE_DESCRIPTION },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf7f0' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1321' },
  ],
};

// İlk boyamadan önce temayı uygular; böylece koyu temada beyaz yanıp sönme olmaz.
const themeScript = `(function(){try{var t=localStorage.getItem('muessir-tema');var d=t?t==='koyu':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
