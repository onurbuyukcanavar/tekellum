import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Müessir — Hukuk, düşünce, metin', template: '%s | Müessir' },
  description: 'Hukuk, düşünce ve metin üzerine kişisel yayın platformu ve mevzuat kütüphanesi.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr"><body><header className="site-header"><Link className="brand" href="/">MÜESSİR<span>HUKUK · DÜŞÜNCE · METİN</span></Link><nav><Link href="/">Makaleler</Link><Link href="/laws">Mevzuat</Link><Link href="/admin">Yönetim</Link></nav></header><main>{children}</main><footer className="site-footer"><span>MÜESSİR</span><span>Hukuk üzerine notlar, metinler ve düşünceler.</span></footer></body></html>;
}
